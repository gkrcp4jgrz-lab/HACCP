function renderReports() {
  var h = '';
  var site = currentSite();
  var siteName = site ? esc(site.name) : 'Site';

  h += '<div class="card" style="border-left:3px solid var(--accent)"><div class="card-header">🛡️ Synthèse HACCP du jour</div><div class="card-body">';
  h += '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Rapport complet : températures, DLC, traçabilité, commandes réceptionnées et signalements pour <strong>' + siteName + '</strong>.</p>';
  h += '<div class="form-row" style="margin-bottom:14px">';
  h += '<div class="form-group"><label class="form-label">Date du rapport</label><input type="date" class="form-input" id="rptFullDate" value="' + today() + '"></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-lg" onclick="generateFullPDF()">🛡️ Générer la synthèse</button></div>';
  h += '</div></div></div>';

  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius);font-size:12px;color:var(--muted)">';
  h += '📌 <strong>Rappel :</strong> Les documents HACCP doivent être conservés minimum 2 ans (Règlement CE 852/2004). Enregistrez le rapport en PDF depuis votre navigateur.';
  h += '</div>';

  return h;
}
