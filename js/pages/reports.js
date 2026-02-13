function renderReports() {
  var h = '';
  var site = currentSite();
  var siteName = site ? esc(site.name) : 'Site';

  // Header card with accent
  h += '<div class="card" style="border-left:4px solid var(--accent);overflow:visible">';
  h += '<div class="card-header" style="background:var(--accent-bg)"><span style="font-size:20px">🛡️</span> Synthese HACCP du jour</div>';
  h += '<div class="card-body">';
  h += '<p style="font-size:14px;color:var(--muted);margin-bottom:18px;font-weight:500;line-height:1.6">Rapport complet : temperatures, DLC, tracabilite, commandes et signalements pour <strong style="color:var(--ink)">' + siteName + '</strong>.</p>';
  h += '<div class="form-row" style="margin-bottom:18px">';
  h += '<div class="form-group"><label class="form-label">Date du rapport</label><input type="date" class="form-input" id="rptFullDate" value="' + today() + '"></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-lg btn-block" onclick="generateFullPDF()">🛡️ Generer la synthese HACCP</button></div>';
  h += '</div></div></div>';

  // Rapports individuels
  h += '<div class="card"><div class="card-header">Rapports individuels</div><div class="card-body">';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<button class="btn btn-ghost" onclick="generateTempPDF()">Temperatures (PDF)</button>';
  h += '<button class="btn btn-ghost" onclick="generateDlcPDF()">DLC & Tracabilite (PDF)</button>';
  h += '<button class="btn btn-ghost" onclick="generateIncidentPDF()">Signalements (PDF)</button>';
  h += '</div>';
  h += '<div style="margin-top:10px"><label class="form-label">Periode signalements</label><input type="number" class="form-input" id="rptIncidentPeriod" value="30" min="1" max="365" style="width:120px"> <span style="font-size:12px;color:var(--muted)">jours</span></div>';
  h += '<div style="margin-top:10px"><label class="form-label">Date temperatures</label><input type="date" class="form-input" id="rptTempDate" value="' + today() + '" style="width:200px"></div>';
  h += '</div></div>';

  // Export CSV
  h += '<div class="card"><div class="card-header">Export CSV (tableur)</div><div class="card-body">';
  h += '<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Exportez vos donnees au format CSV pour analyse dans Excel ou Google Sheets.</p>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<button class="btn btn-ghost" onclick="exportTemperaturesCSV()">Temperatures (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportDlcCSV()">DLC (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportLotsCSV()">Lots / Tracabilite (CSV)</button>';
  h += '<button class="btn btn-ghost" onclick="exportOrdersCSV()">Commandes (CSV)</button>';
  h += '</div></div></div>';

  // Rappel reglementaire
  h += '<div class="card"><div class="card-body" style="display:flex;align-items:flex-start;gap:14px">';
  h += '<div style="width:40px;height:40px;background:var(--accent-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📌</div>';
  h += '<div><p style="font-size:13px;color:var(--ink);font-weight:700;margin-bottom:4px">Rappel reglementaire</p>';
  h += '<p style="font-size:13px;color:var(--muted);font-weight:500;line-height:1.5">Les documents HACCP doivent etre conserves minimum 2 ans (Reglement CE 852/2004). Enregistrez le rapport en PDF depuis votre navigateur.</p>';
  h += '</div></div></div>';

  return h;
}
