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

      var borderClass = (status === 'valid' && !dlc2Expired) ? 'v2-list-item--border-left-ok' : 'v2-list-item--border-left-nok';
      h += '<div class="list-item ' + borderClass + '"><div class="list-content"><div class="list-title">' + esc(d.product_name) + '</div><div class="list-sub">DLC : <strong>' + fmtD(d.dlc_date) + '</strong> <span class="badge ' + badgeClass + '">' + statusLabel + '</span>' + dlc2Info + '</div>';
      if (d.lot_number) h += '<div class="list-sub">Lot : ' + esc(d.lot_number) + '</div>';
      h += '</div><div class="list-actions" style="flex-wrap:wrap;gap:4px">';
      if (!d.opened_at) {
        h += '<button class="btn btn-outline btn-sm" onclick="openDlcOpenModal(\'' + d.id + '\')">📂 Ouvrir</button>';
      }
      if (status === 'expired' || dlc2Expired) h += '<button class="btn btn-danger btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">🗑️ Jeté</button>';
      h += '<button class="btn btn-success btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utilisé</button>';
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
  var activeLots = S.data.lots.filter(function(l) { return !l.status || l.status === 'active'; });
  var closedLots = S.data.lots.filter(function(l) { return l.status === 'consumed' || l.status === 'discarded'; });

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📦</span> Lots actifs <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + activeLots.length + '</span></div>';
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
      h += '<button class="btn btn-success btn-sm" onclick="updateLotStatus(\'' + l.id + '\',\'consumed\')">Utilisé</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="updateLotStatus(\'' + l.id + '\',\'discarded\')">Jeté</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="deleteLot(\'' + l.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  // Closed lots (consumed/discarded)
  if (closedLots.length > 0) {
    h += '<div class="card v2-mt-16"><div class="card-header" style="cursor:pointer" onclick="S.showClosedLots=!S.showClosedLots;render()"><span class="v2-text-2xl">📋</span> Consommés / Jetés <span class="badge badge-gray v2-badge-lg v2-ml-auto">' + closedLots.length + '</span> <span style="margin-left:auto;font-size:12px;color:var(--ink-muted)">' + (S.showClosedLots ? '▲ Masquer' : '▼ Afficher') + '</span></div>';
    if (S.showClosedLots) {
      closedLots.forEach(function(l) {
        var statusIcon = l.status === 'consumed' ? '✅' : '🗑️';
        var statusLabel = l.status === 'consumed' ? 'Utilisé' : 'Jeté';
        var badgeClass = l.status === 'consumed' ? 'badge-green' : 'badge-red';
        var qty = l.quantity && l.quantity > 1 ? ' x' + l.quantity : '';
        h += '<div class="list-item" style="opacity:.7"><div class="list-icon">' + statusIcon + '</div><div class="list-content"><div class="list-title">' + esc(l.product_name) + qty + ' — ' + esc(l.lot_number) + ' <span class="badge ' + badgeClass + '">' + statusLabel + '</span></div><div class="list-sub">';
        if (l.supplier_name) h += '🏭 ' + esc(l.supplier_name) + ' · ';
        if (l.dlc_date) h += '📅 DLC: ' + fmtD(l.dlc_date);
        h += '</div></div></div>';
      });
    }
    h += '</div>';
  }

  return h;
}

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

// renderLots kept as alias for backward compatibility
function renderLots() { S.dlcTab = 'lots'; return renderDLC(); }
