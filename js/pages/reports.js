// =====================================================================
// PAGE: RAPPORTS PDF
// =====================================================================

function renderReports() {
  var h = '';
  var site = currentSite();
  var siteName = site ? esc(site.name) : 'Site';

  h += '<div style="margin-bottom:20px"><p style="font-size:14px;color:var(--gray)">Générez et imprimez vos rapports HACCP pour <strong>' + siteName + '</strong>. Tous les rapports s\'ouvrent prêts pour impression ou enregistrement PDF.</p></div>';

  // ── RAPPORT 1 : Températures ──
  h += '<div class="card"><div class="card-header">🌡️ Rapport Températures</div><div class="card-body">';
  h += '<p style="font-size:13px;color:var(--gray);margin-bottom:12px">Relevés de température avec conformité, actions correctives et signature.</p>';
  h += '<div class="form-row" style="margin-bottom:12px">';
  h += '<div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="rptTempDate" value="' + today() + '"></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary" onclick="generateTempPDF()">📋 Générer</button></div>';
  h += '</div></div></div>';

  // ── RAPPORT 2 : DLC & Traçabilité ──
  h += '<div class="card"><div class="card-header">📅 Rapport DLC & Traçabilité</div><div class="card-body">';
  h += '<p style="font-size:13px;color:var(--gray);margin-bottom:12px">État des DLC (expirées, à surveiller, conformes) et registre de traçabilité des lots.</p>';
  h += '<div class="form-row" style="margin-bottom:12px">';
  h += '<div class="form-group"><label class="form-label">Inclure</label>';
  h += '<select class="form-select" id="rptDlcScope"><option value="all">Tout (DLC + Lots)</option><option value="dlc">DLC uniquement</option><option value="lots">Traçabilité uniquement</option></select></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary" onclick="generateDlcPDF()">📋 Générer</button></div>';
  h += '</div></div></div>';

  // ── RAPPORT 3 : Signalements ──
  h += '<div class="card"><div class="card-header">🚨 Rapport Signalements</div><div class="card-body">';
  h += '<p style="font-size:13px;color:var(--gray);margin-bottom:12px">Historique des signalements d\'incidents avec statut, catégorie et responsables.</p>';
  h += '<div class="form-row" style="margin-bottom:12px">';
  h += '<div class="form-group"><label class="form-label">Période</label>';
  h += '<select class="form-select" id="rptIncidentPeriod"><option value="7">7 derniers jours</option><option value="30" selected>30 derniers jours</option><option value="90">3 mois</option></select></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary" onclick="generateIncidentPDF()">📋 Générer</button></div>';
  h += '</div></div></div>';

  // ── RAPPORT 4 : Synthèse complète ──
  h += '<div class="card" style="border:2px solid var(--primary)"><div class="card-header" style="background:var(--primary-bg)">🛡️ Synthèse HACCP Complète</div><div class="card-body">';
  h += '<p style="font-size:13px;color:var(--gray);margin-bottom:12px">Rapport complet : températures, DLC, traçabilité, commandes et signalements. Idéal pour les contrôles officiels.</p>';
  h += '<div class="form-row" style="margin-bottom:12px">';
  h += '<div class="form-group"><label class="form-label">Date du rapport</label><input type="date" class="form-input" id="rptFullDate" value="' + today() + '"></div>';
  h += '<div class="form-group" style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-lg" onclick="generateFullPDF()">🛡️ Synthèse complète</button></div>';
  h += '</div></div></div>';

  // Info légale
  h += '<div style="margin-top:16px;padding:16px;background:var(--gray-light);border-radius:var(--radius);font-size:12px;color:var(--gray)">';
  h += '📌 <strong>Rappel réglementaire :</strong> Les documents HACCP doivent être conservés minimum 2 ans (Règlement CE 852/2004). Enregistrez chaque rapport en PDF.';
  h += '</div>';

  return h;
}
