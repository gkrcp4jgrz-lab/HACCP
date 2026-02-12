function renderDLC() {
  var h = '';
  
  // DLC section
  h += renderDlcTab();
  
  // Separator
  h += '<div style="margin:20px 0;border-top:1px solid var(--border)"></div>';
  
  // Lots/Traçabilité section
  h += renderLotsTab();

  return h;
}

function renderDlcTab() {
  var h = '';

  // Form
  h += '<div class="card"><div class="card-header">➕ Nouveau contrôle DLC</div><div class="card-body"><form onsubmit="handleDlc(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Produit <span class="req">*</span></label><input type="text" class="form-input" id="dlcProd" required placeholder="Nom du produit"></div>';
  h += '<div class="form-group"><label class="form-label">Date DLC <span class="req">*</span></label><input type="date" class="form-input" id="dlcDate" required></div></div>';
  h += '<div class="form-group"><label class="form-label">N° de lot</label><input type="text" class="form-input" id="dlcLot" placeholder="Optionnel" style="text-transform:uppercase"></div>';

  // Photo zone DLC
  h += '<div class="form-group"><label class="form-label">📸 Photo de l\'étiquette</label>';
  if (S.photoDlcData) {
    h += '<div style="text-align:center;padding:12px;border:2px solid var(--success);border-radius:var(--radius);background:var(--success-bg)"><img src="' + S.photoDlcData + '" class="photo-preview"><br><button type="button" class="btn btn-ghost btn-sm" onclick="clearPhotoDlc()">✕ Supprimer la photo</button></div>';
  } else {
    h += '<label class="photo-box" for="photoDlcInput"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo de l\'étiquette</div><div class="photo-hint">La date DLC sera détectée automatiquement</div></label><input type="file" id="photoDlcInput" accept="image/*" capture="environment" onchange="handlePhotoFor(\'photoDlcInput\',\'dlc\')" style="display:none">';
  }
  h += '<div id="ocrStatusDlc"></div>';
  h += '</div>';

  h += '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="dlcNotes" rows="2" placeholder="Observations..."></textarea></div>';
  h += '<button type="submit" class="btn btn-success btn-block">✓ Enregistrer le contrôle DLC</button></form></div></div>';

  // Filters
  h += '<div class="filters">';
  ['all','warning','expired'].forEach(function(f) {
    var labels = {all:'Tous',warning:'⚠️ À surveiller',expired:'❌ Expirés'};
    h += '<button class="filter-btn' + (S.filter===f?' active':'') + '" onclick="S.filter=\'' + f + '\';render()">' + labels[f] + '</button>';
  });
  h += '</div>';

  // List
  var dlcs = S.data.dlcs.filter(function(d) {
    if (d.status === 'consumed' || d.status === 'discarded') return false;
    if (S.filter === 'warning') return daysUntil(d.dlc_date) <= 2 && daysUntil(d.dlc_date) >= 0;
    if (S.filter === 'expired') return daysUntil(d.dlc_date) < 0;
    return true;
  });

  h += '<div class="card"><div class="card-header">📅 Suivi DLC <span class="badge badge-gray" style="margin-left:auto">' + dlcs.length + '</span></div>';
  if (dlcs.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📅</div><div class="empty-title">Aucun contrôle DLC</div></div></div>';
  } else {
    dlcs.forEach(function(d) {
      var days = daysUntil(d.dlc_date);
      var status = days < 0 ? 'expired' : days <= 2 ? 'warning' : 'valid';
      var statusLabel = days < 0 ? 'Expiré (J' + days + ')' : days === 0 ? 'Expire aujourd\'hui' : days <= 2 ? 'J-' + days : 'OK (J-' + days + ')';
      var badgeClass = {valid:'badge-green',warning:'badge-yellow',expired:'badge-red'}[status];
      var borderColor = {valid:'var(--success)',warning:'var(--warning)',expired:'var(--danger)'}[status];
      h += '<div class="list-item" style="border-left:3px solid ' + borderColor + '"><div class="list-content"><div class="list-title">' + esc(d.product_name) + '</div><div class="list-sub">DLC : <strong>' + fmtD(d.dlc_date) + '</strong> <span class="badge ' + badgeClass + '">' + statusLabel + '</span></div>';
      if (d.lot_number) h += '<div class="list-sub">Lot : ' + esc(d.lot_number) + '</div>';
      h += '</div><div class="list-actions">';
      if (status === 'expired') h += '<button class="btn btn-danger btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">Jeté</button>';
      h += '<button class="btn btn-success btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utilisé</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="deleteDlc(\'' + d.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  return h;
}

function renderLotsTab() {
  var h = '';

  h += '<div class="card"><div class="card-header">➕ Enregistrer un lot</div><div class="card-body"><form onsubmit="handleLot(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Produit <span class="req">*</span></label><input type="text" class="form-input" id="lotProd" required placeholder="Nom du produit"></div>';
  h += '<div class="form-group"><label class="form-label">N° de lot <span class="req">*</span></label><input type="text" class="form-input" id="lotNum" required placeholder="Ex: LOT-2026-001" style="text-transform:uppercase"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Fournisseur</label><select class="form-select" id="lotSupp"><option value="">Sélectionner...</option>';
  S.siteConfig.suppliers.forEach(function(s) { h += '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label class="form-label">DLC</label><input type="date" class="form-input" id="lotDlc"></div></div>';

  // Photo zone Lot
  h += '<div class="form-group"><label class="form-label">📸 Photo de l\'étiquette</label>';
  if (S.photoLotData) {
    h += '<div style="text-align:center;padding:12px;border:2px solid var(--success);border-radius:var(--radius);background:var(--success-bg)"><img src="' + S.photoLotData + '" class="photo-preview"><br><button type="button" class="btn btn-ghost btn-sm" onclick="clearPhotoLot()">✕ Supprimer la photo</button></div>';
  } else {
    h += '<label class="photo-box" for="photoLotInput"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo de l\'étiquette</div><div class="photo-hint">Le N° de lot sera détecté automatiquement</div></label><input type="file" id="photoLotInput" accept="image/*" capture="environment" onchange="handlePhotoFor(\'photoLotInput\',\'lot\')" style="display:none">';
  }
  h += '<div id="ocrStatusLot"></div>';
  h += '</div>';

  h += '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="lotNotes" rows="2" placeholder="Observations..."></textarea></div>';
  h += '<button type="submit" class="btn btn-success btn-block">✓ Enregistrer le lot</button></form></div></div>';

  // List
  h += '<div class="card"><div class="card-header">📦 Lots enregistrés <span class="badge badge-gray" style="margin-left:auto">' + S.data.lots.length + '</span></div>';
  if (S.data.lots.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📦</div><div class="empty-title">Aucun lot enregistré</div></div></div>';
  } else {
    S.data.lots.forEach(function(l) {
      h += '<div class="list-item"><div class="list-icon" style="background:var(--primary-light)">📦</div><div class="list-content"><div class="list-title">' + esc(l.product_name) + ' — <span style="font-family:monospace">' + esc(l.lot_number) + '</span></div><div class="list-sub">';
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

