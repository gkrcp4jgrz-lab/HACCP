// =====================================================================
// DLC & TRAÇABILITÉ — Unified Reception Form
// =====================================================================

function renderDLC() {
  var h = '';
  var activeTab = S.dlcTab || 'reception';

  h += '<div class="tabs" style="overflow:visible;flex-wrap:wrap">';
  h += '<button class="tab' + (activeTab === 'reception' ? ' active' : '') + '" onclick="S.dlcTab=\'reception\';render()" style="flex:1;text-align:center;min-width:80px">📥 Réception</button>';
  h += '<button class="tab' + (activeTab === 'conso' ? ' active' : '') + '" onclick="S.dlcTab=\'conso\';render()" style="flex:1;text-align:center;min-width:80px">🍽️ Conso</button>';
  h += '<button class="tab' + (activeTab === 'dlc' ? ' active' : '') + '" onclick="S.dlcTab=\'dlc\';render()" style="flex:1;text-align:center;min-width:80px">📅 DLC</button>';
  h += '<button class="tab' + (activeTab === 'lots' ? ' active' : '') + '" onclick="S.dlcTab=\'lots\';render()" style="flex:1;text-align:center;min-width:80px">📦 Lots</button>';
  h += '<button class="tab' + (activeTab === 'stock' ? ' active' : '') + '" onclick="S.dlcTab=\'stock\';render()" style="flex:1;text-align:center;min-width:80px">📊 Stock</button>';
  h += '</div>';

  if (activeTab === 'reception') {
    h += renderReceptionForm();
  } else if (activeTab === 'conso') {
    h += renderConsommationTab();
  } else if (activeTab === 'lots') {
    h += renderLotsTabContent();
  } else if (activeTab === 'stock') {
    h += renderStockTabContent();
  } else {
    h += renderDlcTabContent();
  }

  return h;
}

// ── CONSOMMATION QUOTIDIENNE (FIFO) ──

function renderConsommationTab() {
  var h = '';
  var products = getProductSuggestions();

  // Formulaire de saisie rapide
  h += '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">🍽️</span> Saisir une consommation</div><div class="card-body">';
  h += '<form onsubmit="handleConsommation(event)">';

  h += '<div class="form-row">';
  h += '<div class="form-group" style="flex:2"><label class="form-label">Produit <span class="req">*</span></label>';
  h += '<input type="text" class="form-input" id="consoProduct" list="consoProductList" required placeholder="Ex: Œufs, Saucisses..." autocomplete="off" oninput="updateConsoPreview()">';
  h += '<datalist id="consoProductList">';
  products.forEach(function(p) { h += '<option value="' + esc(p) + '">'; });
  h += '</datalist></div>';
  h += '<div class="form-group" style="flex:1"><label class="form-label">Quantité <span class="req">*</span></label>';
  h += '<input type="number" class="form-input" id="consoQty" min="0.1" step="0.1" value="1" required oninput="updateConsoPreview()"></div>';
  h += '<div class="form-group" style="flex:1"><label class="form-label">Unité</label>';
  h += '<select class="form-select" id="consoUnit"><option>unité</option><option>kg</option><option>g</option><option>L</option><option>boîte</option><option>paquet</option><option>portion</option></select></div>';
  h += '</div>';

  h += '<div class="form-group"><label class="form-label">Notes (optionnel)</label>';
  h += '<input type="text" class="form-input" id="consoNotes" placeholder="Ex: Service du midi, petit-déjeuner..."></div>';

  // Preview FIFO
  h += '<div id="consoFifoPreview"></div>';

  h += '<button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">🍽️ Enregistrer la consommation</button>';
  h += '</form></div></div>';

  // Journal des consommations du jour
  var logs = S.data.consumption_logs || [];
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Consommations du jour <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + logs.length + '</span></div>';

  if (logs.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🍽️</div><div class="empty-title">Aucune consommation saisie aujourd\'hui</div></div></div>';
  } else {
    // Total par produit
    var totals = {};
    logs.forEach(function(l) {
      var k = l.product_name + '|' + l.unit;
      if (!totals[k]) totals[k] = { name: l.product_name, unit: l.unit, qty: 0 };
      totals[k].qty += (l.quantity_consumed || 0);
    });
    h += '<div class="card-body v2-card-body--compact" style="padding:10px 16px;background:var(--bg-off);border-bottom:1px solid var(--border)">';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    Object.values(totals).forEach(function(t) {
      h += '<span class="badge badge-blue" style="font-size:13px;padding:6px 12px">' + esc(t.name) + ' : <strong>' + t.qty + ' ' + esc(t.unit) + '</strong></span>';
    });
    h += '</div></div>';

    logs.forEach(function(l) {
      var entries = l.dlc_entries || [];
      h += '<div class="list-item"><div class="list-icon" style="font-size:22px">🍽️</div>';
      h += '<div class="list-content"><div class="list-title">' + esc(l.product_name) + ' — <strong>' + l.quantity_consumed + ' ' + esc(l.unit) + '</strong></div>';
      h += '<div class="list-sub">Par ' + esc(l.consumed_by_name) + ' à ' + fmtTime(l.consumed_at);
      if (l.notes) h += ' · ' + esc(l.notes);
      h += '</div>';
      if (entries.length > 0) {
        h += '<div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">';
        entries.forEach(function(e) {
          h += '<span class="badge badge-gray" style="font-size:11px">';
          if (e.lot_number) h += 'Lot ' + esc(e.lot_number) + ' · ';
          h += 'DLC ' + fmtD(e.dlc_date) + ' · ' + e.qty_taken + ' ' + esc(l.unit) + '</span>';
        });
        h += '</div>';
      }
      h += '</div></div>';
    });
  }
  h += '</div>';

  return h;
}

// ── UNIFIED RECEPTION FORM ──

function renderReceptionForm() {
  var h = '';
  var products = getProductSuggestions();
  var suppliers = getSupplierSuggestions();

  h += '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">📥</span> Réception produit</div><div class="card-body">';
  h += '<form onsubmit="handleReception(event)">';

  // Row 1: Product + Lot
  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Produit <span class="req">*</span></label>';
  h += '<div style="display:flex;gap:8px"><div style="flex:1"><input type="text" class="form-input" id="recProduct" list="productList" required placeholder="Nom du produit" autocomplete="off"></div>';
  h += '<button type="button" class="btn btn-outline" style="flex-shrink:0;height:var(--input-h)" onclick="openQuickAddProductModal()">+</button></div>';
  h += '<datalist id="productList">';
  products.forEach(function(p) { h += '<option value="' + esc(p) + '">'; });
  h += '</datalist></div>';
  h += '<div class="form-group"><label class="form-label">N° de lot</label><input type="text" class="form-input" id="recLotNum" placeholder="Ex: LOT-2026-001" style="text-transform:uppercase"></div>';
  h += '</div>';

  // Row 2: Quantity + DLC date
  h += '<div class="form-row">';
  h += '<div class="form-group" style="flex:0 0 90px"><label class="form-label">Quantité</label><input type="number" class="form-input" id="recQty" min="1" value="1" placeholder="1"></div>';
  h += '<div class="form-group"><label class="form-label">Date DLC <span class="req">*</span></label><input type="date" class="form-input" id="recDlcDate" required></div>';
  h += '</div>';

  // Row 3: Supplier
  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Fournisseur</label>';
  h += '<div class="product-input-wrapper"><input type="text" class="form-input" id="recSupplier" list="supplierList" placeholder="Sélectionner ou saisir" autocomplete="off"></div>';
  h += '<datalist id="supplierList">';
  suppliers.forEach(function(s) { h += '<option value="' + esc(s) + '">'; });
  h += '</datalist></div>';
  h += '</div>';

  // Photo zone
  h += '<div class="form-group"><label class="form-label">📸 Photo de l\'étiquette</label>';
  if (S.photoDlcData) {
    h += '<div style="text-align:center;padding:14px;border:2px solid var(--success);border-radius:var(--radius);background:var(--success-bg)">';
    h += '<img src="' + S.photoDlcData + '" alt="Photo du produit" class="photo-preview" id="photoDlcImg">';
    h += '<div class="v2-flex v2-gap-8" style="justify-content:center;margin-top:10px">';
    h += '<label for="photoDlcInput" class="btn btn-primary btn-sm" style="cursor:pointer">📷 Reprendre</label>';
    h += '<button type="button" class="btn btn-ghost btn-sm" onclick="clearPhotoDlc()">✕ Supprimer</button>';
    h += '</div></div>';
    h += '<input type="file" id="photoDlcInput" accept="image/*" capture="environment" onchange="handlePhotoFor(\'photoDlcInput\',\'dlc\')" style="display:none">';
  } else {
    h += '<label class="photo-box" for="photoDlcInput"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo de l\'étiquette</div><div class="photo-hint">Les champs se remplissent automatiquement</div></label>';
    h += '<input type="file" id="photoDlcInput" accept="image/*" capture="environment" onchange="handlePhotoFor(\'photoDlcInput\',\'dlc\')" style="display:none">';
  }
  h += '<div id="ocrStatusDlc"></div>';
  h += '</div>';

  // Notes
  h += '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="recNotes" rows="2" placeholder="Observations..."></textarea></div>';

  // Checkboxes
  h += '<div class="v2-flex v2-gap-24 v2-flex-wrap v2-mb-18">';
  h += '<div class="form-check"><input type="checkbox" id="recSaveDlc" checked><label for="recSaveDlc">Enregistrer dans DLC</label></div>';
  h += '<div class="form-check"><input type="checkbox" id="recSaveLot" checked><label for="recSaveLot">Enregistrer dans Traçabilité</label></div>';
  h += '</div>';

  h += '<button type="submit" class="btn btn-primary btn-lg btn-block">✓ Enregistrer la réception</button>';
  h += '</form></div></div>';

  return h;
}

// ── DLC TAB CONTENT ──

function renderDlcTabContent() {
  var h = '';

  // Filters
  h += '<div class="filters">';
  ['all', 'warning', 'expired'].forEach(function(f) {
    var labels = { all: 'Tous', warning: '⚠️ À surveiller', expired: '❌ Expirés' };
    h += '<button class="filter-btn' + (S.filter === f ? ' active' : '') + '" onclick="S.filter=\'' + f + '\';render()">' + labels[f] + '</button>';
  });
  h += '</div>';

  // List
  var dlcs = S.data.dlcs.filter(function(d) {
    if (d.status === 'consumed' || d.status === 'discarded') return false;
    if (S.filter === 'warning') return daysUntil(d.dlc_date) <= 2 && daysUntil(d.dlc_date) >= 0;
    if (S.filter === 'expired') return daysUntil(d.dlc_date) < 0;
    return true;
  });

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📅</span> Suivi DLC <span class="badge badge-gray v2-badge-lg v2-ml-auto">' + dlcs.length + '</span></div>';
  if (dlcs.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📅</div><div class="empty-title">Aucun contrôle DLC</div><div class="empty-text">Enregistrez un produit avec le formulaire ci-dessus.</div></div></div>';
  } else {
    dlcs.forEach(function(d) {
      var days = daysUntil(d.dlc_date);
      var status = days < 0 ? 'expired' : days <= 2 ? 'warning' : 'valid';
      var statusLabel = days < 0 ? 'Expiré (J' + days + ')' : days === 0 ? 'Expire aujourd\'hui' : days <= 2 ? 'J-' + days : 'OK (J-' + days + ')';
      var badgeClass = { valid: 'badge-green', warning: 'badge-yellow', expired: 'badge-red' }[status];

      // DLC secondaire (shelf life after opening)
      var dlc2Info = '';
      var dlc2Expired = false;
      if (d.opened_at && d.shelf_life_days) {
        var openDate = new Date(d.opened_at + 'T00:00:00');
        var expiryDate = new Date(openDate.getTime() + d.shelf_life_days * 86400000);
        var todayDate = new Date(today() + 'T00:00:00');
        var daysLeft = Math.ceil((expiryDate - todayDate) / 86400000);
        var daysSinceOpen = Math.ceil((todayDate - openDate) / 86400000);
        if (daysLeft < 0) {
          dlc2Info = ' <span class="badge badge-red">DLC2 expirée (J+' + daysSinceOpen + ')</span>';
          dlc2Expired = true;
        } else if (daysLeft <= 1) {
          dlc2Info = ' <span class="badge badge-yellow">DLC2 J+' + daysSinceOpen + '/' + d.shelf_life_days + 'j</span>';
        } else {
          dlc2Info = ' <span class="badge badge-blue">Ouvert J+' + daysSinceOpen + '/' + d.shelf_life_days + 'j</span>';
        }
      }

      var dQty = d.quantity && d.quantity > 1 ? ' x' + d.quantity : '';
      var borderClass = (status === 'valid' && !dlc2Expired) ? 'v2-list-item--border-left-ok' : 'v2-list-item--border-left-nok';
      h += '<div class="list-item ' + borderClass + '"><div class="list-content"><div class="list-title">' + esc(d.product_name) + dQty + '</div><div class="list-sub">DLC : <strong>' + fmtD(d.dlc_date) + '</strong> <span class="badge ' + badgeClass + '">' + statusLabel + '</span>' + dlc2Info + '</div>';
      if (d.lot_number) h += '<div class="list-sub">Lot : ' + esc(d.lot_number) + '</div>';
      h += '</div><div class="list-actions" style="flex-wrap:wrap;gap:4px">';
      if (!d.opened_at) {
        h += '<button class="btn btn-outline btn-sm" onclick="openDlcOpenModal(\'' + d.id + '\')">📂 Ouvrir</button>';
      }
      if (status === 'expired' || dlc2Expired) h += '<button class="btn btn-danger btn-sm" onclick="openConsumeModal(\'dlc\',\'' + d.id + '\',' + (d.quantity||1) + ',\'discarded\')">🗑️ Jeté</button>';
      h += '<button class="btn btn-success btn-sm" onclick="openConsumeModal(\'dlc\',\'' + d.id + '\',' + (d.quantity||1) + ',\'consumed\')">Utilisé</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="deleteDlc(\'' + d.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  return h;
}

// ── LOTS TAB CONTENT ──

function renderLotsTabContent() {
  var h = '';
  // S.data.lots only contains active lots (filtered at DB level)
  var activeLots = S.data.lots;

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📦</span> Lots en cours <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + activeLots.length + '</span></div>';
  if (activeLots.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📦</div><div class="empty-title">Aucun lot actif</div><div class="empty-text">Enregistrez vos lots via le formulaire de réception.</div></div></div>';
  } else {
    activeLots.forEach(function(l) {
      var qty = l.quantity && l.quantity > 1 ? ' x' + l.quantity : '';
      h += '<div class="list-item"><div class="list-icon v2-list-icon--primary">📦</div><div class="list-content"><div class="list-title">' + esc(l.product_name) + qty + ' — <span class="v2-font-mono v2-font-800">' + esc(l.lot_number) + '</span></div><div class="list-sub">';
      if (l.supplier_name) h += '🏭 ' + esc(l.supplier_name) + ' · ';
      if (l.dlc_date) h += '📅 DLC: ' + fmtD(l.dlc_date) + ' · ';
      h += '⏰ ' + fmtDT(l.recorded_at) + ' par ' + esc(l.recorded_by_name);
      h += '</div></div><div class="list-actions">';
      h += '<button class="btn btn-success btn-sm" onclick="openConsumeModal(\'lot\',\'' + l.id + '\',' + (l.quantity||1) + ',\'consumed\')">Utilisé</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="openConsumeModal(\'lot\',\'' + l.id + '\',' + (l.quantity||1) + ',\'discarded\')">Jeté</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="deleteLot(\'' + l.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  // History button — loads consumed/discarded on demand
  h += '<div class="card v2-mt-16"><div class="card-header" style="cursor:pointer" onclick="loadLotsHistory()">';
  h += '<span class="v2-text-2xl">📋</span> Historique (consommés / jetés)';
  h += '<span style="margin-left:auto;font-size:13px;color:var(--ink-muted);font-weight:600">Voir →</span></div>';
  h += '<div id="lotsHistoryContainer"></div></div>';

  return h;
}

window.loadLotsHistory = async function() {
  var container = document.getElementById('lotsHistoryContainer');
  if (!container) return;
  if (container.dataset.loaded) {
    container.style.display = container.style.display === 'none' ? '' : 'none';
    return;
  }
  container.innerHTML = '<div class="card-body" style="text-align:center;padding:20px"><div class="loading" style="width:24px;height:24px;border-width:3px;display:inline-block"></div></div>';
  container.style.display = '';
  var r;
  try {
    r = await sb.from('lots').select('*').eq('site_id', S.currentSiteId).in('status', ['consumed','discarded']).order('recorded_at', {ascending:false}).limit(100);
  } catch(e) {
    container.innerHTML = '<div class="card-body"><div class="empty"><div class="empty-title">Erreur de chargement</div></div></div>';
    return;
  }
  var lots = r.data || [];
  if (lots.length === 0) {
    container.innerHTML = '<div class="card-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucun lot dans l\'historique</div><div class="empty-text">Les lots consommés ou jetés apparaissent ici. Ils sont inclus dans le rapport quotidien.</div></div></div>';
  } else {
    var html = '';
    lots.forEach(function(l) {
      var statusIcon = l.status === 'consumed' ? '✅' : '🗑️';
      var statusLabel = l.status === 'consumed' ? 'Utilisé' : 'Jeté';
      var badgeClass = l.status === 'consumed' ? 'badge-green' : 'badge-red';
      var qty = l.quantity && l.quantity > 1 ? ' x' + l.quantity : '';
      html += '<div class="list-item" style="opacity:.75"><div class="list-icon">' + statusIcon + '</div><div class="list-content">';
      html += '<div class="list-title">' + esc(l.product_name) + qty + ' — <span class="v2-font-mono">' + esc(l.lot_number) + '</span> <span class="badge ' + badgeClass + '">' + statusLabel + '</span></div>';
      html += '<div class="list-sub">';
      if (l.supplier_name) html += '🏭 ' + esc(l.supplier_name) + ' · ';
      if (l.dlc_date) html += '📅 DLC: ' + fmtD(l.dlc_date) + ' · ';
      html += '⏰ ' + fmtDT(l.recorded_at);
      html += '</div></div></div>';
    });
    container.innerHTML = html;
  }
  container.dataset.loaded = '1';
};

// ── DLC SECONDAIRE (ouverture) ──

window.openDlcOpenModal = function(dlcId) {
  var h = '<div class="modal-header"><div class="modal-title">📂 Ouvrir le produit</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<p style="margin-bottom:16px;color:var(--ink-muted)">Indiquez la durée de vie après ouverture (DLC secondaire).</p>';
  h += '<div class="form-group"><label class="form-label">Durée de vie après ouverture (jours) <span class="req">*</span></label>';
  h += '<input type="number" class="form-input" id="dlcShelfDays" min="1" max="30" value="3" required></div>';
  h += '</div>';
  h += '<div class="modal-footer">';
  h += '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>';
  h += '<button class="btn btn-primary btn-lg" onclick="confirmDlcOpen(\'' + dlcId + '\')">Confirmer l\'ouverture</button>';
  h += '</div>';
  openModal(h);
};

window.confirmDlcOpen = async function(dlcId) {
  var days = parseInt($('dlcShelfDays') ? $('dlcShelfDays').value : '3');
  if (!days || days < 1) { showToast('Durée invalide', 'error'); return; }
  var r = await sbExec(sb.from('dlcs').update({
    opened_at: today(),
    shelf_life_days: days
  }).eq('id', dlcId), 'Ouverture DLC');
  if (!r) return;
  closeModal();
  showToast('Produit marqué ouvert — DLC2 : ' + days + ' jours', 'success');
  await loadSiteData(); render();
};

// ── STOCK (calculé depuis DLC uniquement — source de vérité) ──

function renderStockTabContent() {
  var h = '';
  var stock = {};

  // Source unique : table dlcs (lots = traçabilité uniquement, pas du stock)
  S.data.dlcs.forEach(function(d) {
    if (d.status === 'consumed' || d.status === 'discarded') return;
    var name = d.product_name;
    if (!stock[name]) stock[name] = { qty: 0, dlcMin: null, lastEntry: null, unit: d.unit || 'unité' };
    stock[name].qty += (d.quantity || 1);
    if (d.dlc_date && (!stock[name].dlcMin || d.dlc_date < stock[name].dlcMin)) stock[name].dlcMin = d.dlc_date;
    if (d.recorded_at && (!stock[name].lastEntry || d.recorded_at > stock[name].lastEntry)) stock[name].lastEntry = d.recorded_at;
  });

  var products = Object.keys(stock).sort();
  var totalItems = products.reduce(function(sum, p) { return sum + stock[p].qty; }, 0);

  // Summary card
  h += '<div class="stats-grid v2-mb-16">';
  h += '<div class="stat-card"><div class="stat-value">' + products.length + '</div><div class="stat-label">Produits</div></div>';
  h += '<div class="stat-card"><div class="stat-value">' + totalItems + '</div><div class="stat-label">Unités en stock</div></div>';
  h += '</div>';

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📊</span> Stock actuel <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + products.length + '</span></div>';

  if (products.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📊</div><div class="empty-title">Aucun stock</div><div class="empty-text">Ajoutez des produits via le formulaire de réception.</div></div></div>';
  } else {
    products.forEach(function(name) {
      var s = stock[name];
      var badgeClass = s.qty > 0 ? 'badge-green' : 'badge-red';
      var dlcInfo = '';
      if (s.dlcMin) {
        var days = daysUntil(s.dlcMin);
        if (days < 0) dlcInfo = ' <span class="badge badge-red">DLC expirée</span>';
        else if (days <= 2) dlcInfo = ' <span class="badge badge-yellow">DLC J-' + days + '</span>';
      }
      h += '<div class="list-item"><div class="list-content"><div class="list-title">' + esc(name) + '</div>';
      h += '<div class="list-sub">';
      if (s.dlcMin) h += 'DLC la plus proche : ' + fmtD(s.dlcMin);
      if (s.lastEntry) h += (s.dlcMin ? ' · ' : '') + 'Dernière entrée : ' + fmtDT(s.lastEntry);
      h += dlcInfo + '</div></div>';
      h += '<div class="list-actions"><span class="badge ' + badgeClass + '" style="font-size:14px;padding:6px 14px">' + s.qty + '</span></div>';
      h += '</div>';
    });
  }
  h += '</div>';

  return h;
}

// ── CONSOMMATION PARTIELLE ──

window.openConsumeModal = function(type, id, currentQty, action) {
  var actionLabel = action === 'consumed' ? 'utiliser' : 'jeter';
  var actionBtn = action === 'consumed' ? 'Utiliser' : 'Jeter';
  var btnClass = action === 'consumed' ? 'btn-success' : 'btn-danger';

  // If quantity is 1, just do it directly
  if (currentQty <= 1) {
    if (type === 'dlc') updateDlcStatus(id, action);
    else updateLotStatus(id, action);
    return;
  }

  var h = '<div class="modal-header"><div class="modal-title">Combien ' + actionLabel + ' ?</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<p style="margin-bottom:12px;color:var(--ink-muted)">Quantité actuelle : <strong>' + currentQty + '</strong></p>';
  h += '<div class="form-group"><label class="form-label">Quantité à ' + actionLabel + '</label>';
  h += '<input type="number" class="form-input" id="consumeQty" min="1" max="' + currentQty + '" value="' + currentQty + '"></div>';
  h += '</div>';
  h += '<div class="modal-footer">';
  h += '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>';
  h += '<button class="btn ' + btnClass + ' btn-lg" onclick="confirmConsume(\'' + type + '\',\'' + id + '\',' + currentQty + ',\'' + action + '\')">' + actionBtn + '</button>';
  h += '</div>';
  openModal(h);
};

window.confirmConsume = function(type, id, maxQty, action) {
  var qty = parseInt($('consumeQty') ? $('consumeQty').value : maxQty);
  if (!qty || qty < 1) { showToast('Quantité invalide', 'error'); return; }
  if (qty > maxQty) qty = maxQty;
  closeModal();
  if (type === 'dlc') partialConsumeDlc(id, qty, action);
  else partialConsumeLot(id, qty, action);
};

// ── AJOUT RAPIDE PRODUIT ──

window.openQuickAddProductModal = function() {
  var h = '<div class="modal-header"><div class="modal-title">📦 Nouveau produit</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<div class="form-group"><label class="form-label">Nom du produit <span class="req">*</span></label>';
  h += '<input type="text" class="form-input" id="quickProductName" required placeholder="Ex: Dinde, Saumon fumé..."></div>';
  h += '</div>';
  h += '<div class="modal-footer">';
  h += '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>';
  h += '<button class="btn btn-primary btn-lg" onclick="confirmQuickAddProduct()">Ajouter</button>';
  h += '</div>';
  openModal(h);
  setTimeout(function() { var el = $('quickProductName'); if (el) el.focus(); }, 100);
};

window.confirmQuickAddProduct = async function() {
  var name = $('quickProductName') ? $('quickProductName').value.trim() : '';
  if (!name) { showToast('Nom requis', 'error'); return; }
  try {
    await addProduct(name, 'autre', null, null, '📦');
    closeModal();
    // Set the product name in the reception form
    setTimeout(function() { var el = $('recProduct'); if (el) el.value = name; }, 100);
  } catch(e) {
    showToast('Erreur: ' + (e.message || e), 'error');
  }
};

// renderLots kept as alias for backward compatibility
function renderLots() { S.dlcTab = 'lots'; return renderDLC(); }
