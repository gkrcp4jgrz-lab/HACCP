function renderReports() {
  var h = '';
  var site = currentSite();
  var siteName = site ? esc(site.name) : 'Site';

  // Header card with accent
  h += '<div class="card v2-card--primary-left">';
  h += '<div class="card-header" style="background:var(--accent-bg)"><span class="v2-text-3xl">🛡️</span> Synthese HACCP du jour</div>';
  h += '<div class="card-body">';
  h += '<p class="v2-text-md v2-text-muted v2-mb-18 v2-font-500" style="line-height:1.6">Rapport complet : temperatures, DLC, tracabilite, commandes et signalements pour <strong style="color:var(--ink)">' + siteName + '</strong>.</p>';
  h += '<div class="form-row v2-mb-18">';
  h += '<div class="form-group"><label class="form-label">Date du rapport</label><input type="date" class="form-input" id="rptFullDate" value="' + today() + '"></div>';
  h += '<div class="form-group v2-flex v2-items-end"><button class="btn btn-primary btn-lg btn-block" onclick="generateFullPDF()">🛡️ Generer la synthese HACCP</button></div>';
  h += '</div></div></div>';

  // Rapports individuels
  h += '<div class="card"><div class="card-header">Rapports individuels</div><div class="card-body">';
  h += '<div class="v2-grid-2">';
  h += '<button class="btn btn-ghost" onclick="generateTempPDF()">Temperatures (PDF)</button>';
  h += '<button class="btn btn-ghost" onclick="generateDlcPDF()">DLC & Tracabilite (PDF)</button>';
  h += '<button class="btn btn-ghost" onclick="generateIncidentPDF()">Signalements (PDF)</button>';
  h += '</div>';
  h += '<div class="v2-mt-10"><label class="form-label">Periode signalements</label><input type="number" class="form-input" id="rptIncidentPeriod" value="30" min="1" max="365" style="width:120px"> <span class="v2-text-sm v2-text-muted">jours</span></div>';
  h += '<div class="v2-mt-10"><label class="form-label">Date temperatures</label><input type="date" class="form-input" id="rptTempDate" value="' + today() + '" style="width:200px"></div>';
  h += '</div></div>';

  // Export CSV
  h += '<div class="card"><div class="card-header">Export CSV (tableur)</div><div class="card-body">';
  h += '<p class="v2-text-sm v2-text-muted v2-mb-12">Exportez vos donnees au format CSV pour analyse dans Excel ou Google Sheets.</p>';
  h += '<div class="v2-grid-2">';
  h += '<button class="btn btn-ghost" onclick="exportTemperaturesCSV()">Temperatures (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportDlcCSV()">DLC (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportLotsCSV()">Lots / Tracabilite (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportOrdersCSV()">Commandes (CSV)</button>';
  h += '</div></div></div>';

  // Rappel reglementaire
  h += '<div class="card"><div class="card-body v2-flex v2-items-start v2-gap-14">';
  h += '<div style="width:40px;height:40px;background:var(--accent-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📌</div>';
  h += '<div><p class="v2-text-base v2-font-700 v2-mb-4">Rappel reglementaire</p>';
  h += '<p class="v2-text-base v2-text-muted v2-font-500" style="line-height:1.5">Les documents HACCP doivent etre conserves minimum 2 ans (Reglement CE 852/2004). Enregistrez le rapport en PDF depuis votre navigateur.</p>';
  h += '</div></div></div>';

  return h;
}
