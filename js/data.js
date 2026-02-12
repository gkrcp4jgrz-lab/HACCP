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
    var eq = await sb.from('site_equipment').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('sort_order');
    S.siteConfig.equipment = eq.data || [];

    var pr = await sb.from('site_products').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('sort_order');
    S.siteConfig.products = pr.data || [];

    var su = await sb.from('site_suppliers').select('*').eq('site_id', S.currentSiteId).eq('active', true).order('name');
    S.siteConfig.suppliers = su.data || [];

    var mo = await sb.from('site_modules').select('*').eq('site_id', S.currentSiteId);
    S.siteConfig.modules = mo.data || [];
  } catch(e) { console.error('Load config error:', e); }
}

async function loadSiteData() {
  if (!S.currentSiteId) return;
  var sid = S.currentSiteId;
  var todayStr = today();
  var localMidnightISO = new Date(todayStr + 'T00:00:00').toISOString();
  try {
    var t = await sb.from('temperatures').select('*').eq('site_id', sid).gte('recorded_at', localMidnightISO).order('recorded_at', {ascending:false});
    S.data.temperatures = t.data || [];

    var d = await sb.from('dlcs').select('*').eq('site_id', sid).order('dlc_date');
    S.data.dlcs = d.data || [];

    var l = await sb.from('lots').select('*').eq('site_id', sid).order('recorded_at', {ascending:false}).limit(50);
    S.data.lots = l.data || [];

    var o = await sb.from('orders').select('*').eq('site_id', sid).in('status', ['to_order','ordered']).order('ordered_at', {ascending:false});
    S.data.orders = o.data || [];

    var c = await sb.from('consignes').select('*').eq('site_id', sid).order('created_at', {ascending:false}).limit(20);
    S.data.consignes = c.data || [];

    var ir = await sb.from('incident_reports').select('*').eq('site_id', sid).in('status', ['open','in_progress']).order('created_at', {ascending:false});
    S.data.incident_reports = ir.data || [];
  } catch(e) { console.error('Load data error:', e); }
}

async function switchSite(siteId) {
  S.currentSiteId = siteId;
  await loadSiteConfig();
  await loadSiteData();
  render();
}

async function initApp() {
  S.loading = true;
  render();
  // Charger les clés sauvegardées
  S.claudeApiKey = sessionStorage.getItem('haccp_claude_key') || '';
  await loadSites();
  if (S.currentSiteId) {
    await loadSiteConfig();
    await loadSiteData();
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
  var minT = equip ? equip.temp_min : (prod ? prod.temp_min : -999);
  var maxT = equip ? equip.temp_max : (prod ? prod.temp_max : 999);
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
  if (r.error) { alert('Erreur: ' + r.error.message); return; }

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

// -- DLC --
async function addDlc(productName, dlcDate, lotNumber, notes) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName, dlc_date: dlcDate,
    lot_number: lotNumber || '', photo_data: S.photoDlcData || null,
    notes: notes || '', recorded_by: S.user.id, recorded_by_name: userName()
  };
  var r = await sb.from('dlcs').insert(rec);
  if (r.error) { alert('Erreur: ' + r.error.message); return; }
  S.photoDlcData = null; await loadSiteData(); render();
}

async function deleteDlc(id) {
  if (!confirm('Supprimer ce contrôle DLC ?')) return;
  var r = await sbExec(sb.from('dlcs').delete().eq('id', id), 'Suppression DLC');
if (!r) return; await loadSiteData(); render();
}

async function updateDlcStatus(id, status) {
  var r = await sbExec(sb.from('dlcs').update({ status: status }).eq('id', id), 'Mise à jour DLC');
if (!r) return; await loadSiteData(); render();
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
  if (r.error) { alert('Erreur: ' + r.error.message); return; }
  S.photoLotData = null; await loadSiteData(); render();
}

async function deleteLot(id) {
  if (!confirm('Supprimer ce lot ?')) return;
  var r = await sbExec(sb.from('lots').delete().eq('id', id), 'Suppression lot');
if (!r) return; await loadSiteData(); render();
}

// -- Orders --
async function addOrder(productName, qty, unit, supplierName, notes) {
  var rec = {
    site_id: S.currentSiteId, product_name: productName,
    quantity: parseFloat(qty) || 1, unit: unit || 'unité',
    supplier_name: supplierName || '', notes: notes || '',
    status: 'to_order', ordered_by: S.user.id, ordered_by_name: userName()
  };
  var r = await sb.from('orders').insert(rec);
  if (r.error) { alert('Erreur: ' + r.error.message); return; }
  await loadSiteData(); render();
}

async function updateOrderStatus(id, status) {
  var upd = { status: status };
  if (status === 'received') upd.received_at = new Date().toISOString();
  var r = await sbExec(sb.from('orders').update(upd).eq('id', id), 'Mise à jour commande');
if (!r) return; await loadSiteData(); render();
}

async function deleteOrder(id) {
  if (!confirm('Supprimer cette commande ?')) return;
  var r = await sbExec(sb.from('orders').delete().eq('id', id), 'Suppression commande');
if (!r) return; await loadSiteData(); render();
}

// -- Consignes --
async function addConsigne(message, priority) {
  var rec = {
    site_id: S.currentSiteId, message: message, priority: priority || 'normal',
    created_by: S.user.id, created_by_name: userName()
  };
  var r = await sb.from('consignes').insert(rec);
  if (r.error) { alert('Erreur: ' + r.error.message); return; }
  await loadSiteData(); render();
}

async function deleteConsigne(id) {
  var r = await sbExec(sb.from('consignes').delete().eq('id', id), 'Suppression consigne');
if (!r) return; await loadSiteData(); render();
}
// ── SUPABASE HELPERS (safe) ──
function notifyError(title, err) {
  console.error(title, err);
  var msg = (err && err.message) ? err.message : String(err || '');
  alert((title || 'Erreur') + (msg ? (' : ' + msg) : ''));
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
