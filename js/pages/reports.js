function renderReports() {
  var h = '';
  var site = currentSite();
  var siteName = site ? esc(site.name) : 'Site';

  // ── Hero: Synthèse HACCP ──
  h += '<div class="card card-accent">';
  h += '<div class="card-body" style="padding:28px">';
  h += '<div class="v2-flex v2-items-center v2-gap-16 v2-mb-18">';
  h += '<div style="width:56px;height:56px;background:var(--af-gradient);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;box-shadow:var(--shadow-teal)">🛡️</div>';
  h += '<div><h3 class="v2-text-2xl v2-font-800" style="margin:0;letter-spacing:-.3px">Synthèse HACCP</h3>';
  h += '<p class="v2-text-sm v2-text-muted v2-font-500 v2-mt-4">Rapport complet pour <strong class="v2-text-teal">' + siteName + '</strong></p></div></div>';
  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Date du rapport</label><input type="date" class="form-input" id="rptFullDate" value="' + today() + '"></div>';
  h += '<div class="form-group v2-flex v2-items-end"><button class="btn btn-primary btn-lg btn-block" onclick="generateFullPDF()">🛡️ Générer la synthèse</button></div>';
  h += '</div></div></div>';

  // ── Rapports individuels — card grid ──
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📄</span> Rapports individuels</div><div class="card-body">';

  var reports = [
    {icon:'🌡️',label:'Températures',desc:'Relevés du jour',action:'generateTempPDF()',color:'var(--af-teal-bg)'},
    {icon:'📅',label:'DLC & Traçabilité',desc:'Contrôles DLC et lots',action:'generateDlcPDF()',color:'var(--af-warn-bg)'},
    {icon:'⚠️',label:'Signalements',desc:'Incidents & alertes',action:'generateIncidentPDF()',color:'var(--af-err-bg)'}
  ];
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px">';
  reports.forEach(function(r) {
    h += '<button class="v2-clickable" onclick="' + r.action + '" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 14px;border-radius:var(--radius);background:var(--bg);border:1px solid rgba(0,0,0,.06);cursor:pointer;box-shadow:var(--shadow-card);transition:all .3s var(--ease-apple)">';
    h += '<div style="width:44px;height:44px;background:' + r.color + ';border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px">' + r.icon + '</div>';
    h += '<div class="v2-text-sm v2-font-700" style="color:var(--ink)">' + r.label + '</div>';
    h += '<div class="v2-text-xs v2-text-muted">' + r.desc + '</div>';
    h += '</button>';
  });
  h += '</div>';

  h += '<div class="v2-flex v2-gap-12 v2-flex-wrap">';
  h += '<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Période signalements</label><div class="v2-flex v2-items-center v2-gap-8"><input type="number" class="form-input" id="rptIncidentPeriod" value="30" min="1" max="365" style="width:100px"><span class="v2-text-sm v2-text-muted">jours</span></div></div>';
  h += '<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Date températures</label><input type="date" class="form-input" id="rptTempDate" value="' + today() + '"></div>';
  h += '</div>';
  h += '</div></div>';

  // ── Export CSV ──
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📊</span> Export CSV</div><div class="card-body">';
  h += '<p class="v2-text-sm v2-text-muted v2-mb-14">Exportez pour analyse dans Excel ou Google Sheets.</p>';
  var csvExports = [
    {icon:'🌡️',label:'Températures',action:'exportTemperaturesCSV()'},
    {icon:'📅',label:'DLC',action:'exportDlcCSV()'},
    {icon:'📦',label:'Traçabilité',action:'exportLotsCSV()'},
    {icon:'🛒',label:'Commandes',action:'exportOrdersCSV()'}
  ];
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  csvExports.forEach(function(e) {
    h += '<button class="btn btn-ghost" onclick="' + e.action + '" style="justify-content:flex-start;gap:10px">' + e.icon + ' ' + e.label + '</button>';
  });
  h += '</div></div></div>';

  // ── Rappel réglementaire ──
  h += '<div class="card"><div class="card-body v2-flex v2-items-start v2-gap-14">';
  h += '<div style="width:44px;height:44px;background:var(--af-info-bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📌</div>';
  h += '<div><p class="v2-text-md v2-font-700 v2-mb-4">Rappel réglementaire</p>';
  h += '<p class="v2-text-sm v2-text-muted v2-font-500" style="line-height:1.6">Les documents HACCP doivent être conservés <strong class="v2-text-ink">minimum 2 ans</strong> (Règlement CE 852/2004). Enregistrez le rapport en PDF depuis votre navigateur.</p>';
  h += '</div></div></div>';

  return h;
}
