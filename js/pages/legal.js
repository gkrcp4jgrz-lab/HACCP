// =====================================================================
// PAGES: MENTIONS LÉGALES & À PROPOS
// =====================================================================

function renderLegal() {
  var h = '';
  h += '<div class="card"><div class="card-header">📜 Mentions légales</div><div class="card-body" style="line-height:1.8;font-size:14px">';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">1. Éditeur de l\'application</h3>';
  h += '<p class="v2-mb-16">HACCP Pro est une application de gestion de la sécurité alimentaire conforme au règlement européen CE 852/2004 et au Paquet Hygiène.</p>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">2. Hébergement</h3>';
  h += '<p class="v2-mb-16">L\'application est hébergée par <strong>Vercel Inc.</strong> (San Francisco, USA) et les données sont stockées par <strong>Supabase Inc.</strong> sur des serveurs sécurisés.</p>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">3. Protection des données personnelles (RGPD)</h3>';
  h += '<p class="v2-mb-8">Conformément au Règlement Général sur la Protection des Données (RGPD) :</p>';
  h += '<ul style="padding-left:20px;margin-bottom:16px">';
  h += '<li>Les données collectées sont strictement limitées à la gestion HACCP (noms, relevés, signatures)</li>';
  h += '<li>Aucune donnée n\'est partagée avec des tiers à des fins commerciales</li>';
  h += '<li>Les mots de passe sont chiffrés et jamais stockés en clair</li>';
  h += '<li>Les données de températures et traçabilité sont conservées 2 ans minimum (obligation réglementaire)</li>';
  h += '<li>Vous pouvez demander la suppression de vos données personnelles à tout moment</li>';
  h += '</ul>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">4. Cookies et stockage local</h3>';
  h += '<p class="v2-mb-16">L\'application utilise le stockage local du navigateur (localStorage/sessionStorage) uniquement pour les préférences d\'affichage et la session d\'authentification. Aucun cookie tiers n\'est utilisé.</p>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">5. Cadre réglementaire HACCP</h3>';
  h += '<p class="v2-mb-8">Cette application aide à la conformité avec :</p>';
  h += '<ul style="padding-left:20px;margin-bottom:16px">';
  h += '<li><strong>Règlement CE 852/2004</strong> — Hygiène des denrées alimentaires</li>';
  h += '<li><strong>Règlement CE 853/2004</strong> — Règles d\'hygiène applicables aux denrées d\'origine animale</li>';
  h += '<li><strong>Arrêté du 21 décembre 2009</strong> — Règles sanitaires du commerce de détail</li>';
  h += '<li><strong>Codex Alimentarius</strong> — Principes généraux d\'hygiène alimentaire</li>';
  h += '</ul>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">6. Limitation de responsabilité</h3>';
  h += '<p class="v2-mb-16">HACCP Pro est un outil d\'aide à la gestion. L\'utilisateur reste responsable de la conformité de ses pratiques HACCP et de la véracité des données enregistrées. L\'application ne se substitue pas au Plan de Maîtrise Sanitaire (PMS) de l\'établissement.</p>';

  h += '<h3 class="v2-text-lg v2-font-700 v2-mb-8">7. Contact</h3>';
  h += '<p>Pour toute question relative à vos données ou à l\'utilisation de l\'application, contactez l\'administrateur de votre établissement.</p>';

  h += '</div></div>';

  h += '<div class="v2-text-center v2-mt-16"><button class="btn btn-ghost" onclick="navigate(\'profile\')">← Retour au profil</button></div>';

  return h;
}

function renderAbout() {
  var h = '';

  h += '<div class="card"><div class="card-body" style="text-align:center;padding:36px 24px">';
  h += '<div style="width:80px;height:80px;margin:0 auto 16px"><img src="/icon.svg" alt="HACCP Pro" style="width:100%;height:100%;border-radius:18px"></div>';
  h += '<h2 class="v2-text-2xl v2-font-800 v2-mb-4">HACCP Pro</h2>';
  h += '<p class="v2-text-muted v2-font-600 v2-mb-16">Version 3.0 — Arctic Frost</p>';
  h += '<p class="v2-text-base v2-mb-20" style="max-width:500px;margin-left:auto;margin-right:auto;line-height:1.7">Application professionnelle de gestion de la sécurité alimentaire. Relevés de températures, contrôle DLC, traçabilité des lots, gestion des commandes et rapports conformes.</p>';
  h += '</div></div>';

  h += '<div class="card"><div class="card-header">Fonctionnalités</div><div class="card-body">';
  var features = [
    {icon:'🌡️', title:'Relevés de températures', desc:'Suivi en temps réel avec alertes de non-conformité et actions correctives'},
    {icon:'📅', title:'Contrôle DLC', desc:'Gestion des dates limites avec alertes automatiques avant expiration'},
    {icon:'📦', title:'Traçabilité des lots', desc:'Enregistrement complet des lots avec OCR photo automatique'},
    {icon:'🛒', title:'Gestion des commandes', desc:'Suivi des commandes par fournisseur avec photo des bons de livraison'},
    {icon:'📄', title:'Rapports PDF', desc:'Génération de rapports conformes CE 852/2004 avec signature électronique'},
    {icon:'🔔', title:'Centre d\'alertes', desc:'Notifications en temps réel pour les anomalies et signalements'},
    {icon:'👥', title:'Multi-sites & équipes', desc:'Gestion multi-sites avec rôles et permissions granulaires'},
    {icon:'🌙', title:'Mode sombre', desc:'Interface adaptative avec détection automatique des préférences système'}
  ];
  features.forEach(function(f) {
    h += '<div class="list-item"><div class="list-icon v2-list-icon--primary" style="font-size:20px">' + f.icon + '</div>';
    h += '<div class="list-content"><div class="list-title">' + f.title + '</div><div class="list-sub">' + f.desc + '</div></div></div>';
  });
  h += '</div></div>';

  h += '<div class="card"><div class="card-header">Conformité</div><div class="card-body">';
  h += '<div class="list-item"><div class="list-icon v2-list-icon--ok" style="font-size:18px">✅</div><div class="list-content"><div class="list-title">CE 852/2004</div><div class="list-sub">Règlement européen relatif à l\'hygiène des denrées alimentaires</div></div></div>';
  h += '<div class="list-item"><div class="list-icon v2-list-icon--ok" style="font-size:18px">✅</div><div class="list-content"><div class="list-title">RGPD</div><div class="list-sub">Protection des données personnelles conforme au règlement européen</div></div></div>';
  h += '<div class="list-item"><div class="list-icon v2-list-icon--ok" style="font-size:18px">✅</div><div class="list-content"><div class="list-title">Archivage 2 ans</div><div class="list-sub">Conservation réglementaire des relevés et documents HACCP</div></div></div>';
  h += '</div></div>';

  h += '<div class="v2-text-center v2-mt-16 v2-mb-20"><button class="btn btn-ghost" onclick="navigate(\'profile\')">← Retour au profil</button></div>';

  return h;
}
