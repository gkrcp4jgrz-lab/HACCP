// =====================================================================
// DLC & TRAÇABILITÉ — Unified Reception Form
// =====================================================================

function renderDLC() {
  var h = '';
  var activeTab = S.dlcTab || 'reception';

  h += '<div class="tabs" style="overflow-x:auto;overflow-y:visible;flex-wrap:nowrap;-webkit-overflow-scrolling:touch">';
  h += '<button class="tab' + (activeTab === 'reception' ? ' active' : '') + '" onclick="S.dlcTab=\'reception\';render()" style="flex:1 0 auto;white-space:nowrap">📥 Réception</button>';
  h += '<button class="tab' + (activeTab === 'conso' ? ' active' : '') + '" onclick="S.dlcTab=\'conso\';render()" style="flex:1 0 auto;white-space:nowrap">🍽️ Conso</button>';
  h += '<button class="tab' + (activeTab === 'dlc' ? ' active' : '') + '" onclick="S.dlcTab=\'dlc\';render()" style="flex:1 0 auto;white-space:nowrap">📅 DLC</button>';
  h += '<button class="tab' + (activeTab === 'lots' ? ' active' : '') + '" onclick="S.dlcTab=\'lots\';render()" style="flex:1 0 auto;white-space:nowrap">📦 Lots</button>';
  h += '</div>';

  if (activeTab === 'reception') {
    h += renderReceptionForm();
  } else if (activeTab === 'conso') {
    h += renderConsommationTab();
  } else if (activeTab === 'lots') {
    h += renderLotsTabContent();
  } else {
    h += renderDlcTabContent();
  }

  return h;
}

// ── CONSOMMATION — Deux modes : entier vs entamé ──

function renderConsommationTab() {
  var h = '';
  var now = new Date();
  var todayStr = today();
  var logs = S.data.consumption_logs || [];

  // Packages ouverts (colis entamés, multi-jours)
  var openPkgs = S.data.dlcs.filter(function(d) { return d.opened_at; });

  // Stock non entamé, groupé par produit, trié FIFO
  var unopened = S.data.dlcs.filter(function(d) { return !d.opened_at; });
  var prodGroups = {};
  unopened.forEach(function(d) {
    if (!prodGroups[d.product_name]) prodGroups[d.product_name] = [];
    prodGroups[d.product_name].push(d);
  });
  Object.keys(prodGroups).forEach(function(p) {
    prodGroups[p].sort(function(a, b) { return a.dlc_date < b.dlc_date ? -1 : 1; });
  });

  // Index logs du jour : par produit (pour "Utilisé entier") et par dlc_id (pour buffet)
  var usedWholeByProd = {};  // productName → [logs]
  var confirmedBuffet = {};  // dlcId → log
  logs.forEach(function(l) {
    if (l.notes === 'Utilisé entier') {
      if (!usedWholeByProd[l.product_name]) usedWholeByProd[l.product_name] = [];
      usedWholeByProd[l.product_name].push(l);
    }
    var entries = Array.isArray(l.dlc_entries) ? l.dlc_entries : [];
    entries.forEach(function(e) {
      if (!confirmedBuffet[e.dlc_id]) confirmedBuffet[e.dlc_id] = l;
    });
  });

  // ══ SECTION 1 : Produits utilisés entiers (œufs, saucisses…) ══
  var prodNames = Object.keys(prodGroups).sort();
  h += '<div class="card card-accent">';
  h += '<div class="card-header"><span class="v2-text-2xl">🍳</span> Produits utilisés entiers';
  h += '<span class="badge badge-blue v2-badge-lg v2-ml-auto">' + prodNames.length + '</span></div>';

  if (prodNames.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📭</div>';
    h += '<div class="empty-title">Aucun stock disponible</div>';
    h += '<div class="empty-text">Enregistrez des produits dans l\'onglet <strong>Réception</strong> pour commencer.</div>';
    h += '<button class="btn btn-primary v2-mt-12" onclick="S.dlcTab=\'reception\';render()">📥 Aller à Réception</button></div></div>';
  } else {
    // Store product list for handler lookup (avoids quoting issues with product names)
    S._consoProds = prodGroups;

    prodNames.forEach(function(prod, idx) {
      var group = prodGroups[prod];
      var oldest = group[0];
      var totalQty = group.reduce(function(s, d) { return s + (d.quantity || 1); }, 0);
      var unit = oldest.unit || 'unité';
      var dlcExpired = oldest.dlc_date < todayStr;
      var inputId = 'useWhole_' + idx;
      var usedLogs = usedWholeByProd[prod] || [];
      var totalUsedToday = usedLogs.reduce(function(s, l) { return s + (l.quantity_consumed || 0); }, 0);

      h += '<div style="padding:12px 16px;border-bottom:1px solid var(--border)">';
      // Header: product name + stock
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">';
      h += '<div>';
      h += '<div style="font-weight:700;font-size:15px">' + esc(prod) + '</div>';
      h += '<div style="font-size:12px;color:var(--muted)">Stock : ' + totalQty + ' ' + esc(unit) + '</div>';
      h += '</div>';
      h += '<div style="text-align:right;font-size:12px;color:' + (dlcExpired ? 'var(--err)' : 'var(--muted)') + '">';
      h += (dlcExpired ? '🚫 ' : '📅 ') + 'DLC ' + fmtD(oldest.dlc_date);
      if (oldest.lot_number) h += '<br><span style="color:var(--muted)">Lot ' + esc(oldest.lot_number) + '</span>';
      h += '</div></div>';
      // Indicateur FIFO si plusieurs lots
      if (group.length > 1) {
        h += '<div style="background:var(--bg-off);border:1px solid var(--border);border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;display:flex;gap:6px;align-items:center">';
        h += '<span>📌</span><span><strong>Premier entré, premier sorti</strong> — ' + group.length + ' lots · Commencer par ';
        h += oldest.lot_number ? '<strong>Lot ' + esc(oldest.lot_number) + '</strong> (DLC ' + fmtD(oldest.dlc_date) + ')' : 'le plus ancien (DLC ' + fmtD(oldest.dlc_date) + ')';
        h += '</span></div>';
      }

      if (usedLogs.length > 0) {
        // Déjà loggué aujourd'hui : confirmation simple, pas de re-saisie
        h += '<div style="background:var(--success-bg,#f0fdf4);border:1px solid var(--ok,#16a34a);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:13px;color:var(--ok,#16a34a);font-weight:600">';
        h += '✅ ' + totalUsedToday + ' ' + esc(unit) + ' utilisé(s) ce matin';
        if (usedLogs[0]) h += ' · ' + fmtTime(usedLogs[0].consumed_at) + ' · ' + esc(usedLogs[0].consumed_by_name);
        h += '</div>';
        h += '<button class="btn btn-outline btn-sm" onclick="openPackageModal(\'' + oldest.id + '\')">📂 Entamer</button>';
      } else {
        h += '<div style="display:flex;gap:8px;align-items:center">';
        h += '<input type="number" id="' + inputId + '" class="form-input" style="flex:0 0 70px" min="1" step="1" value="1">';
        h += '<span style="font-size:13px;color:var(--muted);flex-shrink:0">' + esc(unit) + '</span>';
        h += '<button class="btn btn-primary" style="flex:1" onclick="handleUseWhole(' + idx + ',\'' + inputId + '\')">✅ Utilisé ce matin</button>';
        h += '<button class="btn btn-outline btn-sm" onclick="openPackageModal(\'' + oldest.id + '\')">📂 Entamer</button>';
        h += '</div>';
      }
      h += '</div>';
    });
  }
  h += '</div>';

  // ══ SECTION 2 : Colis entamés (rosette, dinde, fromage…) ══
  h += '<div class="card">';
  h += '<div class="card-header"><span class="v2-text-2xl">🍽️</span> Produits entamés';
  h += '<span class="badge ' + (openPkgs.length ? 'badge-red' : 'badge-blue') + ' v2-badge-lg v2-ml-auto">' + openPkgs.length + '</span></div>';

  if (openPkgs.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📦</div>';
    h += '<div class="empty-title">Aucun produit entamé</div>';
    h += '<div class="empty-sub">Utilisez le bouton 📂 Entamer sur un produit ci-dessus</div></div></div>';
  } else {
    openPkgs.forEach(function(d) {
      var effDlc = dlcApresOuverture(d);
      var daysLeft = effDlc ? Math.ceil((effDlc - now) / 86400000) : null;
      var effDlcStr = effDlc ? effDlc.toLocaleDateString('fr-FR') : fmtD(d.dlc_date);
      var isExpired = daysLeft !== null && daysLeft < 0;
      var isWarning = !isExpired && daysLeft !== null && daysLeft <= 1;
      var statusColor = isExpired ? 'var(--err)' : (isWarning ? '#f59e0b' : 'var(--ok,#16a34a)');
      var borderLeft = isExpired ? 'border-left:4px solid var(--err)' : (isWarning ? 'border-left:4px solid #f59e0b' : 'border-left:4px solid var(--ok,#16a34a)');
      var confirmed = confirmedBuffet[d.id];

      h += '<div style="padding:14px 16px;border-bottom:1px solid var(--border);' + borderLeft + '">';

      // ── Ligne 1 : Nom + Lot ──
      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
      h += '<span style="font-weight:700;font-size:16px">' + esc(d.product_name) + '</span>';
      if (d.lot_number) h += '<span class="badge badge-gray" style="font-size:12px;padding:3px 8px">Lot ' + esc(d.lot_number) + '</span>';
      h += '</div>';

      // ── Ligne 2 : Traçabilité DLC ──
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:10px;font-size:12px">';
      h += '<div style="color:var(--muted)">📅 DLC fabricant</div>';
      h += '<div style="color:var(--muted)">🕐 Ouvert le</div>';
      h += '<div style="font-weight:600">' + fmtD(d.dlc_date) + '</div>';
      h += '<div style="font-weight:600">' + fmtD(d.opened_at) + ' (' + (d.shelf_life_days || 3) + 'j)</div>';
      h += '<div style="color:var(--muted)">⏳ DLC après ouverture</div>';
      h += '<div></div>';
      h += '<div style="font-weight:700;color:' + statusColor + ';font-size:13px">' + effDlcStr;
      if (daysLeft !== null) {
        h += '  <span style="font-weight:400;font-size:11px">' + (isExpired ? '— EXPIRÉ' : (daysLeft === 0 ? '— expire aujourd\'hui' : '— ' + daysLeft + 'j restant' + (daysLeft > 1 ? 's' : ''))) + '</span>';
      }
      h += '</div>';
      h += '</div>';

      // ── Ligne 3 : Actions ──
      if (isExpired) {
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
        h += '<div style="flex:1;background:#fef2f2;border:1px solid var(--err);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--err);font-weight:600">🚫 Expiré — ne pas servir</div>';
        h += '<button class="btn btn-danger" onclick="discardPackage(\'' + d.id + '\')">🗑️ Jeter</button>';
        h += '</div>';
      } else if (confirmed) {
        h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        h += '<div style="flex:1;background:var(--success-bg,#f0fdf4);border:1px solid var(--ok,#16a34a);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--ok,#16a34a);font-weight:600">';
        h += '✅ Servi à ' + fmtTime(confirmed.consumed_at) + ' par ' + esc(confirmed.consumed_by_name) + '</div>';
        h += '<button class="btn btn-outline btn-sm" onclick="markPackageEmpty(\'' + d.id + '\')">📦 Vide</button>';
        h += '</div>';
      } else {
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
        h += '<button class="btn btn-primary" style="flex:1" onclick="confirmBuffetRefill(\'' + d.id + '\')">✅ Servi ce matin</button>';
        h += '<button class="btn btn-outline" onclick="markPackageEmpty(\'' + d.id + '\')">📦 Paquet vide</button>';
        h += '</div>';
      }
      h += '</div>';
    });
  }
  h += '</div>';

  // ══ SECTION 3 : Journal du jour ══
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Journal du jour';
  h += '<span class="badge badge-blue v2-badge-lg v2-ml-auto">' + logs.length + '</span></div>';
  if (logs.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucune action enregistrée</div></div></div>';
  } else {
    logs.forEach(function(l) {
      var entries = Array.isArray(l.dlc_entries) ? l.dlc_entries : [];
      var icon = l.notes === 'Paquet vide' ? '📦' : (l.notes === 'Jeté' ? '🗑️' : (l.notes === 'Utilisé entier' ? '🍳' : '✅'));
      h += '<div class="list-item"><div class="list-icon" style="font-size:20px">' + icon + '</div>';
      h += '<div class="list-content"><div class="list-title">' + esc(l.product_name);
      if (l.notes === 'Utilisé entier') h += ' <span class="badge badge-gray" style="font-size:11px">' + l.quantity_consumed + ' ' + esc(l.unit) + '</span>';
      h += '</div>';
      h += '<div class="list-sub">' + esc(l.notes || 'Buffet remis') + ' · ' + esc(l.consumed_by_name) + ' · ' + fmtTime(l.consumed_at);
      if (entries[0] && entries[0].lot_number) h += ' · Lot ' + esc(entries[0].lot_number);
      if (entries[0]) h += ' · DLC ' + fmtD(entries[0].dlc_date);
      h += '</div></div></div>';
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
          dlc2Info = ' <span class="badge badge-red">Ouvert — expiré (J+' + daysSinceOpen + ')</span>';
          dlc2Expired = true;
        } else if (daysLeft <= 1) {
          dlc2Info = ' <span class="badge badge-yellow">Ouvert J+' + daysSinceOpen + '/' + d.shelf_life_days + 'j</span>';
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
      h += '<button class="btn btn-outline btn-sm" onclick="openEditDlcModal(\'' + d.id + '\')" title="Modifier">✏️</button>';
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
  showToast('Produit marqué ouvert — DLC après ouverture : ' + days + ' jours', 'success');
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

// ── ÉDITION DLC ──

window.openEditDlcModal = function(dlcId) {
  var d = S.data.dlcs.find(function(x) { return x.id === dlcId; });
  if (!d) return;
  var h = '<div class="modal-header"><div class="modal-title">✏️ Modifier DLC</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<div class="form-group"><label class="form-label">Produit</label><input type="text" class="form-input" id="editDlcProduct" value="' + esc(d.product_name) + '"></div>';
  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Date DLC</label><input type="date" class="form-input" id="editDlcDate" value="' + (d.dlc_date || '') + '"></div>';
  h += '<div class="form-group"><label class="form-label">N° de lot</label><input type="text" class="form-input" id="editDlcLot" value="' + esc(d.lot_number || '') + '" style="text-transform:uppercase"></div>';
  h += '</div>';
  h += '<div class="form-group"><label class="form-label">Quantité</label><input type="number" class="form-input" id="editDlcQty" value="' + (d.quantity || 1) + '" min="1"></div>';
  h += '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="editDlcNotes" rows="2">' + esc(d.notes || '') + '</textarea></div>';
  h += '</div>';
  h += '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button>';
  h += '<button class="btn btn-primary btn-lg" onclick="confirmEditDlc(\'' + dlcId + '\')">Enregistrer</button></div>';
  openModal(h);
};

window.confirmEditDlc = async function(dlcId) {
  var product = $('editDlcProduct') ? $('editDlcProduct').value.trim() : '';
  var dlcDate = $('editDlcDate') ? $('editDlcDate').value : '';
  if (!product || !dlcDate) { showToast('Produit et date DLC requis', 'error'); return; }
  var updates = {
    product_name: product,
    dlc_date: dlcDate,
    lot_number: ($('editDlcLot') ? $('editDlcLot').value.trim() : ''),
    quantity: parseInt($('editDlcQty') ? $('editDlcQty').value : '1') || 1,
    notes: ($('editDlcNotes') ? $('editDlcNotes').value.trim() : '')
  };
  closeModal();
  await updateDlc(dlcId, updates);
};

// renderLots kept as alias for backward compatibility
function renderLots() { S.dlcTab = 'lots'; return renderDLC(); }
