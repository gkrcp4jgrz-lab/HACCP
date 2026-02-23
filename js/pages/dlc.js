// =====================================================================
// DLC & TRAÇABILITÉ — Unified Reception Form
// =====================================================================

function renderDLC() {
  var h = '';

  // Unified reception form
  h += renderReceptionForm();

  // Tabbed view: DLC / Lots
  var activeTab = S.dlcTab || 'dlc';
  h += '<div class="tabs">';
  h += '<button class="tab' + (activeTab === 'dlc' ? ' active' : '') + '" onclick="S.dlcTab=\'dlc\';render()">📅 DLC en cours</button>';
  h += '<button class="tab' + (activeTab === 'lots' ? ' active' : '') + '" onclick="S.dlcTab=\'lots\';render()">📦 Traçabilité</button>';
  h += '</div>';

  if (activeTab === 'lots') {
    h += renderLotsTabContent();
  } else {
    h += renderDlcTabContent();
  }

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
  h += '<div class="product-input-wrapper"><input type="text" class="form-input" id="recProduct" list="productList" required placeholder="Nom du produit" autocomplete="off"></div>';
  h += '<datalist id="productList">';
  products.forEach(function(p) { h += '<option value="' + esc(p) + '">'; });
  h += '</datalist></div>';
  h += '<div class="form-group"><label class="form-label">N° de lot</label><input type="text" class="form-input" id="recLotNum" placeholder="Ex: LOT-2026-001" style="text-transform:uppercase"></div>';
  h += '</div>';

  // Row 2: DLC date + Supplier
  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Date DLC <span class="req">*</span></label><input type="date" class="form-input" id="recDlcDate" required></div>';
  h += '<div class="form-group"><label class="form-label">Fournisseur</label>';
  h += '<div class="product-input-wrapper"><input type="text" class="form-input" id="recSupplier" list="supplierList" placeholder="Sélectionner ou saisir" autocomplete="off"></div>';
  h += '<datalist id="supplierList">';
  suppliers.forEach(function(s) { h += '<option value="' + esc(s) + '">'; });
  h += '</datalist></div>';
  h += '</div>';

  // Photo zone
  h += '<div class="form-group"><label class="form-label">📸 Photo de l\'étiquette</label>';
  if (S.photoDlcData) {
    h += '<div style="text-align:center;padding:14px;border:2px solid var(--success);border-radius:var(--radius);background:var(--success-bg)"><img src="' + S.photoDlcData + '" alt="Photo du produit" class="photo-preview"><br><button type="button" class="btn btn-ghost" onclick="clearPhotoDlc()">✕ Supprimer la photo</button></div>';
  } else {
    h += '<label class="photo-box" for="photoDlcInput"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo de l\'étiquette</div><div class="photo-hint">DLC et N° de lot détectés automatiquement</div></label>';
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
      var borderColor = { valid: 'var(--success)', warning: 'var(--warning)', expired: 'var(--danger)' }[status];
      h += '<div class="list-item ' + (status === 'valid' ? 'v2-list-item--border-left-ok' : 'v2-list-item--border-left-nok') + '"><div class="list-content"><div class="list-title">' + esc(d.product_name) + '</div><div class="list-sub">DLC : <strong>' + fmtD(d.dlc_date) + '</strong> <span class="badge ' + badgeClass + '">' + statusLabel + '</span></div>';
      if (d.lot_number) h += '<div class="list-sub">Lot : ' + esc(d.lot_number) + '</div>';
      h += '</div><div class="list-actions">';
      if (status === 'expired') h += '<button class="btn btn-danger" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">🗑️ Jeté</button>';
      h += '<button class="btn btn-success" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">✓ Utilisé</button>';
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

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📦</span> Lots enregistrés <span class="badge badge-gray v2-badge-lg v2-ml-auto">' + S.data.lots.length + '</span></div>';
  if (S.data.lots.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📦</div><div class="empty-title">Aucun lot enregistré</div><div class="empty-text">Enregistrez vos lots via le formulaire de réception.</div></div></div>';
  } else {
    S.data.lots.forEach(function(l) {
      h += '<div class="list-item"><div class="list-icon v2-list-icon--primary">📦</div><div class="list-content"><div class="list-title">' + esc(l.product_name) + ' — <span class="v2-font-mono v2-font-800">' + esc(l.lot_number) + '</span></div><div class="list-sub">';
      if (l.supplier_name) h += '🏭 ' + esc(l.supplier_name) + ' · ';
      if (l.dlc_date) h += '📅 DLC: ' + fmtD(l.dlc_date) + ' · ';
      h += '⏰ ' + fmtDT(l.recorded_at) + ' par ' + esc(l.recorded_by_name);
      h += '</div></div><div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteLot(\'' + l.id + '\')">🗑️</button></div></div>';
    });
  }
  h += '</div>';

  return h;
}

// renderLots kept as alias for backward compatibility
function renderLots() { S.dlcTab = 'lots'; return renderDLC(); }
