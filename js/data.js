// =====================================================================
// DATA LOADING
// =====================================================================

async function loadSites() {
  if (!S.user) return;
  try {
    if (isSuperAdmin()) {
      var r = await sb.from('sites').select('*').order('name');
      S.sites = r.data || [];
    } else {
      var r = await sb.from('user_sites').select('site_id, site_role, sites(*)').eq('user_id', S.user.id);
      S.sites = (r.data || []).map(function(us) { var site = us.sites; site._role = us.site_role; return site; });
    }
    if (S.sites.length > 0 && !S.currentSiteId) {
      S.currentSiteId = S.sites[0].id;
    }
  } catch(e) { console.error('Load sites error:', e); }
}

async function loadSiteConfig() {
  if (!S.currentSiteId) return;
  try {
    var results = await Promise.all([
      sb.from('site_equipment').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('sort_order'),
      sb.from('site_products').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('sort_order'),
      sb.from('site_suppliers').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('name'),
      sb.from('site_modules').select('*').eq('site_id', S.currentSiteId)
    ]);
    S.siteConfig.equipment = results[0].data || [];
    S.siteConfig.products = results[1].data || [];
    S.siteConfig.suppliers = results[2].data || [];
    S.siteConfig.modules = results[3].data || [];
  } catch(e) { console.error('Load config error:', e); }
}

async function loadSiteData() {
  if (!S.currentSiteId) return;
  var sid = S.currentSiteId;
  var todayStr = today();
  var localMidnightISO = new Date(todayStr + 'T00:00:00').toISOString();
  try {
    var results = await Promise.all([
      sb.from('temperatures').select('*').eq('site_id', sid).gte('recorded_at', localMidnightISO).order('recorded_at', {ascending:false}),
      sb.from('dlcs').select('*').eq('site_id', sid).not('status', 'in', '("consumed","discarded")').order('dlc_date').limit(500),
      sb.from('lots').select('*').eq('site_id', sid).not('status', 'in', '("consumed","discarded")').order('recorded_at', {ascending:false}).limit(100),
      sb.from('orders').select('*').eq('site_id', sid).in('status', ['to_order','ordered']).order('ordered_at', {ascending:false}),
      sb.from('consignes').select('*').eq('site_id', sid).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at', {ascending:false}).limit(50),
      sb.from('incident_reports').select('*').eq('site_id', sid).in('status', ['open','in_progress']).order('created_at', {ascending:false}),
      sb.from('cleaning_schedules').select('*').eq('site_id', sid).eq('active', true).order('name'),
      sb.from('cleaning_logs').select('*').eq('site_id', sid).gte('performed_at', localMidnightISO).order('performed_at', {ascending:false}),
      sb.from('consumption_logs').select('*').eq('site_id', sid).gte('consumed_at', localMidnightISO).order('consumed_at', {ascending:false})
    ]);
    S.data.temperatures = results[0].data || [];
    S.data.dlcs = results[1].data || [];
    S.data.lots = results[2].data || [];
    S.data.orders = results[3].data || [];

    var dismissed = [];
    var dismissKey = 'haccp_dismissed_consignes_' + sid;
    try { dismissed = JSON.parse(localStorage.getItem(dismissKey) || '[]'); } catch(e) {}
    // Also read legacy global key for backward compat
    try { var legacy = JSON.parse(localStorage.getItem('haccp_dismissed_consignes') || '[]'); dismissed = dismissed.concat(legacy); } catch(e) {}
    S.data.consignes = (results[4].data || []).filter(function(con) { return dismissed.indexOf(con.id) === -1 && con.is_read !== true; });

    S.data.incident_reports = results[5].data || [];
    S.data.cleaning_schedules = results[6].data || [];
    S.data.cleaning_logs = results[7].data || [];
    S.data.consumption_logs = results[8].data || [];
  } catch(e) { console.error('Load data error:', e); }
}

async function switchSite(siteId) {
  S.currentSiteId = siteId;
  await Promise.all([loadSiteConfig(), loadSiteData()]);
  render();
}

async function initApp() {
  S.loading = true;
  render();
  // Charger les clés sauvegardées
  S.claudeApiKey = sessionStorage.getItem('haccp_claude_key') || '';
  await loadSites();
  if (S.currentSiteId) {
    await Promise.all([loadSiteConfig(), loadSiteData()]);
  }
  S.loading = false;
  S.page = 'dashboard';
  render();
}

// =====================================================================
// CRUD OPERATIONS
// =====================================================================

// -- Temperatures --
async function addTemperature(type, refId, value, corrAction, corrNote) {
  var equip = type === 'equipment' ? S.siteConfig.equipment.find(function(e){return e.id===refId;}) : null;
  var prod = type === 'product' ? S.siteConfig.products.find(function(p){return p.id===refId;}) : null;
  var rawMin = equip ? equip.temp_min : (prod ? prod.temp_min : null);
  var rawMax = equip ? equip.temp_max : (prod ? prod.temp_max : null);
  var minT = (rawMin != null && rawMin !== '') ? Number(rawMin) : -999;
  var maxT = (rawMax != null && rawMax !== '') ? Number(rawMax) : 999;
  var conform = value >= minT && value <= maxT;
  var rec = {
    site_id: S.currentSiteId, record_type: type,
    equipment_id: type === 'equipment' ? refId : null,
    product_id: type === 'product' ? refId : null,
    value: parseFloat(value), is_conform: conform,
    corrective_action: corrAction || null, corrective_note: corrNote || null,
    recorded_by: S.user.id, recorded_by_name: userName(),
    signature_data: S.sigData || null
  };
  var r = await sb.from('temperatures').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Température enregistrée' + (conform ? '' : ' (non conforme)'), conform ? 'success' : 'warning');

  // Email si non conforme
  if (!conform) {
    triggerEmailNotification('temp_nonconform', {
      site: currentSite() ? currentSite().name : '',
      user: userName(),
      equipment: equip ? equip.name : (prod ? prod.name : ''),
      value: value,
      min: minT, max: maxT,
      action: corrAction || ''
    });
  }

  await loadSiteData(); render();
}

// -- Internal insert helpers (no loadSiteData/render) --
async function _insertDlcRecord(productName, dlcDate, lotNumber, notes, photoData, quantity) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName, dlc_date: dlcDate,
    lot_number: lotNumber || '', photo_data: photoData || null,
    notes: notes || '', quantity: parseInt(quantity) || 1,
    recorded_by: S.user.id, recorded_by_name: userName()
  };
  var r = await sb.from('dlcs').insert(rec);
  if (r.error) throw new Error(r.error.message);
  return r;
}

async function _insertLotRecord(productName, lotNumber, supplierName, dlcDate, notes, photoData, quantity) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName, lot_number: lotNumber,
    supplier_name: supplierName || '', dlc_date: dlcDate || null,
    photo_data: photoData || null, notes: notes || '',
    quantity: parseInt(quantity) || 1,
    recorded_by: S.user.id, recorded_by_name: userName()
  };
  var r = await sb.from('lots').insert(rec);
  if (r.error) throw new Error(r.error.message);
  return r;
}

// -- DLC --
async function addDlc(productName, dlcDate, lotNumber, notes) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName, dlc_date: dlcDate,
    lot_number: lotNumber || '', photo_data: S.photoDlcData || null,
    notes: notes || '', recorded_by: S.user.id, recorded_by_name: userName()
  };
  var r = await sb.from('dlcs').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('DLC enregistrée', 'success');
  S.photoDlcData = null; await loadSiteData(); render();
}

async function deleteDlc(id) {
  if (!(await appConfirm('Supprimer', 'Supprimer ce contrôle DLC ?', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;
  var r = await sbExec(sb.from('dlcs').delete().eq('id', id), 'Suppression DLC');
  if (!r) return;
  showToast('DLC supprimée', 'success');
  await loadSiteData(); render();
}

async function updateDlcStatus(id, status) {
  var r = await sbExec(sb.from('dlcs').update({ status: status }).eq('id', id), 'Mise à jour DLC');
  if (!r) return;
  showToast(status === 'consumed' ? 'Produit marqué utilisé' : 'Produit marqué jeté', 'success');
  await loadSiteData(); render();
}

// -- Lots --
async function addLot(productName, lotNumber, supplierName, dlcDate, notes) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName, lot_number: lotNumber,
    supplier_name: supplierName || '', dlc_date: dlcDate || null,
    photo_data: S.photoLotData || null, notes: notes || '',
    recorded_by: S.user.id, recorded_by_name: userName()
  };
  var r = await sb.from('lots').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Lot enregistré', 'success');
  S.photoLotData = null; await loadSiteData(); render();
}

async function updateLotStatus(id, status) {
  var r = await sbExec(sb.from('lots').update({ status: status }).eq('id', id), 'Mise à jour lot');
  if (!r) return;
  showToast(status === 'consumed' ? 'Lot marqué utilisé' : 'Lot marqué jeté', 'success');
  await loadSiteData(); render();
}

// -- Partial consumption (DLC + Lots) --
async function partialConsumeDlc(id, qty, status) {
  var dlc = S.data.dlcs.find(function(d) { return d.id === id; });
  if (!dlc) return;
  var currentQty = dlc.quantity || 1;
  if (qty >= currentQty) { return updateDlcStatus(id, status); }
  // Reduce original
  var r1 = await sbExec(sb.from('dlcs').update({ quantity: currentQty - qty }).eq('id', id), 'Mise à jour quantité DLC');
  if (!r1) return;
  // Insert consumed/discarded copy
  var rec = {
    site_id: dlc.site_id, product_name: dlc.product_name, dlc_date: dlc.dlc_date,
    lot_number: dlc.lot_number || '', notes: dlc.notes || '',
    quantity: qty, status: status,
    opened_at: dlc.opened_at || null, shelf_life_days: dlc.shelf_life_days || null,
    recorded_by: S.user.id, recorded_by_name: userName()
  };
  await sbExec(sb.from('dlcs').insert(rec), 'Insert DLC partiel');
  showToast(qty + ' unité(s) ' + (status === 'consumed' ? 'utilisée(s)' : 'jetée(s)'), 'success');
  await loadSiteData(); render();
}

async function partialConsumeLot(id, qty, status) {
  var lot = S.data.lots.find(function(l) { return l.id === id; });
  if (!lot) return;
  var currentQty = lot.quantity || 1;
  if (qty >= currentQty) { return updateLotStatus(id, status); }
  // Reduce original
  var r1 = await sbExec(sb.from('lots').update({ quantity: currentQty - qty }).eq('id', id), 'Mise à jour quantité lot');
  if (!r1) return;
  // Insert consumed/discarded copy
  var rec = {
    site_id: lot.site_id, product_name: lot.product_name, lot_number: lot.lot_number,
    supplier_name: lot.supplier_name || '', dlc_date: lot.dlc_date || null,
    notes: lot.notes || '', quantity: qty, status: status,
    recorded_by: S.user.id, recorded_by_name: userName()
  };
  await sbExec(sb.from('lots').insert(rec), 'Insert lot partiel');
  showToast(qty + ' unité(s) ' + (status === 'consumed' ? 'utilisée(s)' : 'jetée(s)'), 'success');
  await loadSiteData(); render();
}

async function deleteLot(id) {
  if (!(await appConfirm('Supprimer', 'Supprimer ce lot ?', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;
  var r = await sbExec(sb.from('lots').delete().eq('id', id), 'Suppression lot');
  if (!r) return;
  showToast('Lot supprimé', 'success');
  await loadSiteData(); render();
}

// -- Consommation : colis entamés --

// Calcule la DLC effective après ouverture (retourne une Date ou null)
function dlcApresOuverture(d) {
  if (!d.opened_at) return null;
  var openDate = new Date(d.opened_at);
  var days = d.shelf_life_days || 3;
  var dlcAfterOpen = new Date(openDate);
  dlcAfterOpen.setDate(dlcAfterOpen.getDate() + days);
  var originalDlc = new Date(d.dlc_date + 'T23:59:59');
  return dlcAfterOpen < originalDlc ? dlcAfterOpen : originalDlc;
}
window.dlcApresOuverture = dlcApresOuverture;

// Marquer un colis comme ouvert
async function openPackage(dlcId, shelfLifeDays) {
  var r = await sbExec(
    sb.from('dlcs').update({ opened_at: new Date().toISOString(), shelf_life_days: shelfLifeDays || 3 }).eq('id', dlcId),
    'Ouverture colis'
  );
  if (!r) return;
  showToast('Colis ouvert ✓', 'success');
  await loadSiteData(); render();
}
window.openPackage = openPackage;

// Confirmer que le buffet a été remis ce matin (sans quantité)
async function confirmBuffetRefill(dlcId) {
  var d = S.data.dlcs.find(function(x) { return x.id === dlcId; });
  if (!d) { showToast('Produit introuvable', 'error'); return; }
  var rec = {
    site_id: S.currentSiteId,
    product_name: d.product_name,
    quantity_consumed: 1,
    unit: 'service',
    consumed_by: S.user.id,
    consumed_by_name: userName(),
    consumed_at: new Date().toISOString(),
    notes: 'Buffet remis',
    dlc_entries: [{ dlc_id: d.id, lot_number: d.lot_number || '', dlc_date: d.dlc_date, qty_taken: 1 }]
  };
  var r = await sbExec(sb.from('consumption_logs').insert(rec), 'Confirmation buffet');
  if (!r) return;
  showToast('Buffet confirmé ✓', 'success');
  await loadSiteData(); render();
}
window.confirmBuffetRefill = confirmBuffetRefill;

// Marquer un colis comme vide (consommé)
async function markPackageEmpty(dlcId) {
  var d = S.data.dlcs.find(function(x) { return x.id === dlcId; });
  if (!d) return;
  var r = await sbExec(sb.from('dlcs').update({ status: 'consumed' }).eq('id', dlcId), 'Paquet vide');
  if (!r) return;
  // Log l'événement "paquet vide"
  var rec = {
    site_id: S.currentSiteId,
    product_name: d.product_name,
    quantity_consumed: 0,
    unit: 'service',
    consumed_by: S.user.id,
    consumed_by_name: userName(),
    consumed_at: new Date().toISOString(),
    notes: 'Paquet vide',
    dlc_entries: [{ dlc_id: d.id, lot_number: d.lot_number || '', dlc_date: d.dlc_date, qty_taken: 0 }]
  };
  await sbExec(sb.from('consumption_logs').insert(rec), 'Enregistrement paquet vide');
  showToast('Paquet marqué vide ✓', 'success');
  await loadSiteData(); render();
}
window.markPackageEmpty = markPackageEmpty;

// Consommer une quantité depuis un colis déjà ouvert (ciblé par ID)
async function consumeFromPackage(dlcId, qty, notes) {
  var d = S.data.dlcs.find(function(x) { return x.id === dlcId; });
  if (!d) { showToast('Produit introuvable', 'error'); return; }
  var available = d.quantity || 1;
  if (qty > available) { showToast('Quantité insuffisante — reste : ' + available + ' ' + (d.unit || ''), 'warning'); return; }
  var newQty = available - qty;
  if (newQty <= 0) {
    var r1 = await sbExec(sb.from('dlcs').update({ status: 'consumed' }).eq('id', dlcId), 'Clôture colis');
    if (!r1) return;
  } else {
    var r2 = await sbExec(sb.from('dlcs').update({ quantity: newQty }).eq('id', dlcId), 'Mise à jour quantité');
    if (!r2) return;
  }
  var rec = {
    site_id: S.currentSiteId,
    product_name: d.product_name,
    quantity_consumed: qty,
    unit: d.unit || 'unité',
    consumed_by: S.user.id,
    consumed_by_name: userName(),
    consumed_at: new Date().toISOString(),
    notes: notes || '',
    dlc_entries: [{ dlc_id: d.id, lot_number: d.lot_number || '', dlc_date: d.dlc_date, qty_taken: qty }]
  };
  await sbExec(sb.from('consumption_logs').insert(rec), 'Enregistrement consommation');
  showToast('Consommation enregistrée ✓', 'success');
  await loadSiteData(); render();
}
window.consumeFromPackage = consumeFromPackage;

// -- Consommation FIFO (produits consommés en 1 fois, sans notion de colis ouvert) --
async function recordConsumption(productName, qtyToConsume, unit, notes) {
  // 1. Trouver les entrées DLC actives pour ce produit, triées par DLC (FIFO = plus ancienne en premier)
  var matches = S.data.dlcs
    .filter(function(d) { return d.product_name === productName; })
    .sort(function(a, b) { return a.dlc_date < b.dlc_date ? -1 : 1; });

  var totalAvailable = matches.reduce(function(sum, d) { return sum + (d.quantity || 1); }, 0);
  if (totalAvailable < qtyToConsume) {
    throw new Error('Stock insuffisant — disponible : ' + totalAvailable + ' ' + unit);
  }

  // 2. Déduire en FIFO
  var remaining = qtyToConsume;
  var dlcEntries = [];
  for (var i = 0; i < matches.length; i++) {
    if (remaining <= 0) break;
    var d = matches[i];
    var available = d.quantity || 1;
    var taken = Math.min(available, remaining);
    var newQty = available - taken;
    if (newQty <= 0) {
      var r1 = await sbExec(sb.from('dlcs').update({ status: 'consumed' }).eq('id', d.id), 'Mise à jour DLC');
      if (!r1) throw new Error('Erreur mise à jour DLC');
    } else {
      var r2 = await sbExec(sb.from('dlcs').update({ quantity: newQty }).eq('id', d.id), 'Mise à jour quantité DLC');
      if (!r2) throw new Error('Erreur mise à jour quantité DLC');
    }
    dlcEntries.push({ dlc_id: d.id, lot_number: d.lot_number || '', dlc_date: d.dlc_date, qty_taken: taken });
    remaining -= taken;
  }

  // 3. Enregistrer la consommation
  var rec = {
    site_id: S.currentSiteId,
    product_name: productName,
    quantity_consumed: qtyToConsume,
    unit: unit || 'unité',
    consumed_by: S.user.id,
    consumed_by_name: userName(),
    consumed_at: new Date().toISOString(),
    notes: notes || '',
    dlc_entries: dlcEntries
  };
  var r3 = await sbExec(sb.from('consumption_logs').insert(rec), 'Enregistrement consommation');
  if (!r3) throw new Error('Erreur enregistrement consommation');

  showToast('Consommation enregistrée ✓', 'success');
  await loadSiteData(); render();
}
window.recordConsumption = recordConsumption;

// Calcule l'aperçu FIFO sans modifier les données (pour preview)
function previewFifo(productName, qtyToConsume) {
  var matches = S.data.dlcs
    .filter(function(d) { return d.product_name === productName; })
    .sort(function(a, b) { return a.dlc_date < b.dlc_date ? -1 : 1; });
  var totalAvailable = matches.reduce(function(sum, d) { return sum + (d.quantity || 1); }, 0);
  var preview = [];
  var remaining = qtyToConsume;
  for (var i = 0; i < matches.length; i++) {
    if (remaining <= 0) break;
    var d = matches[i];
    var taken = Math.min(d.quantity || 1, remaining);
    preview.push({ lot_number: d.lot_number, dlc_date: d.dlc_date, qty_taken: taken, supplier_name: d.supplier_name });
    remaining -= taken;
  }
  return { preview: preview, totalAvailable: totalAvailable, ok: remaining <= 0 };
}
window.previewFifo = previewFifo;

// -- Orders --
async function addOrder(productName, qty, unit, supplierName, notes) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName,
    quantity: parseFloat(qty) || 1, unit: unit || 'unité',
    supplier_name: supplierName || '', notes: notes || '',
    status: 'to_order', ordered_by: S.user.id, ordered_by_name: userName()
  };
  var r = await sb.from('orders').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Commande ajoutée', 'success');
  await loadSiteData(); render();
}

async function updateOrderStatus(id, status) {
  var upd = { status: status };
  if (status === 'received') upd.received_at = new Date().toISOString();
  if (status === 'ordered') upd.ordered_at = new Date().toISOString();
  var r = await sbExec(sb.from('orders').update(upd).eq('id', id).select(), 'Mise à jour commande');
  if (!r) return;
  var labels = {ordered:'Commande passée', received:'Commande reçue', to_order:'Remis en attente'};
  showToast(labels[status] || 'Statut mis à jour', 'success');
  await loadSiteData(); render();
}

async function deleteOrder(id) {
  if (!(await appConfirm('Supprimer', 'Supprimer cette commande ?', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;
  var r = await sbExec(sb.from('orders').delete().eq('id', id), 'Suppression commande');
  if (!r) return;
  showToast('Commande supprimée', 'success');
  await loadSiteData(); render();
}

// -- Consignes --
async function addConsigne(message, priority) {
  var rec = {
    site_id: S.currentSiteId, message: message, priority: priority || 'normal',
    created_by: S.user.id, created_by_name: userName()
  };
  var r = await sb.from('consignes').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Consigne publiée', 'success');
  await loadSiteData(); render();
}

async function deleteConsigne(id) {
  if (!(await appConfirm('Supprimer', 'Supprimer cette consigne ?', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;
  var r = await sbExec(sb.from('consignes').delete().eq('id', id), 'Suppression consigne');
  if (!r) return;
  showToast('Consigne supprimée', 'success');
  await loadSiteData(); render();
}
// -- Cleaning Schedules --
async function addCleaningSchedule(name, zone, frequency, opts) {
  opts = opts || {};
  var rec = {
    site_id: S.currentSiteId, name: name, zone: zone || '',
    frequency: frequency || 'daily'
  };
  if (opts.day_of_week != null) rec.day_of_week = parseInt(opts.day_of_week);
  if (opts.day_of_month != null) rec.day_of_month = parseInt(opts.day_of_month);
  if (opts.one_time_date) rec.one_time_date = opts.one_time_date;
  var r = await sb.from('cleaning_schedules').insert(rec);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Tâche de nettoyage ajoutée', 'success');
  await loadSiteData(); render();
}

async function deleteCleaningSchedule(id) {
  if (!(await appConfirm('Supprimer', 'Supprimer cette tâche de nettoyage ?', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;
  var r = await sb.from('cleaning_schedules').update({active: false}).eq('id', id);
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Tâche supprimée', 'success');
  await loadSiteData(); render();
}

async function addCleaningLog(scheduleId, status, notes) {
  var rec = {
    site_id: S.currentSiteId, schedule_id: scheduleId,
    status: status || 'completed', notes: notes || '',
    performed_by: S.user.id, performed_by_name: userName(),
    performed_at: new Date().toISOString()
  };
  var r = await sb.from('cleaning_logs').insert(rec).select();
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast(status === 'skipped' ? 'Tâche passée' : 'Nettoyage enregistré ✓', 'success');
  await loadSiteData(); render();
}

// Window bindings for cleaning functions (needed for onclick in dynamic HTML)
window.addCleaningLog = addCleaningLog;
window.deleteCleaningSchedule = deleteCleaningSchedule;
window.addCleaningSchedule = addCleaningSchedule;

// ── SUPABASE HELPERS (safe) ──
function notifyError(title, err) {
  console.error(title, err);
  var msg = (err && err.message) ? err.message : String(err || '');
  showToast((title || 'Erreur') + (msg ? (' : ' + msg) : ''), 'error');
}

// sbExec: exécute une requête supabase et gère l'erreur proprement
async function sbExec(promise, title) {
  var r;
  try {
    r = await promise;
  } catch (e) {
    notifyError(title || 'Erreur réseau', e);
    return null;
  }
  if (r && r.error) {
    notifyError(title || 'Erreur Supabase', r.error);
    return null;
  }
  return r;
}
