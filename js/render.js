// =====================================================================
// RENDER ENGINE
// =====================================================================

function render() {
  var app = $('app');
  if (!app) return;

  if (!S.user) { app.innerHTML = renderAuth(); return; }

  if (S.loading) {
    app.innerHTML = '<div class="v2-loading-screen"><div class="loading"></div><span>Chargement...</span></div>';
    return;
  }

  if (S.sites.length === 0 && !isSuperAdmin()) {
    app.innerHTML = '<div class="v2-no-sites"><div class="card v2-max-w-500 v2-mb-20"><div class="card-body"><div class="empty"><div class="empty-icon">🏢</div><div class="empty-title">Aucun site assigné</div><div class="empty-text">Contactez votre administrateur pour être ajouté à un site.</div></div></div></div></div>';
    return;
  }

  app.innerHTML = renderSidebar() + renderMainContent() + renderBottomNav();

  if (S.page === 'temperatures') {
    setTimeout(function() { initSignature(); }, 50);
  }
}

// ── AUTH ──

function renderAuth() {
  return '<div class="auth-wrapper"><div class="auth-card">' +
    '<div class="auth-logo"><div class="auth-logo-icon">🛡️</div><h1>HACCP Pro</h1><p>Sécurité alimentaire professionnelle</p></div>' +
    '<div id="authForm">' + renderLoginForm() + '</div>' +
    '<p class="auth-footer">Contactez votre administrateur pour obtenir vos identifiants.</p>' +
    '</div></div>';
}

function renderLoginForm() {
  return '<form onsubmit="handleLogin(event)">' +
    '<div class="form-group"><label class="form-label">Identifiant</label><input type="text" class="form-input v2-tracking-wide v2-font-600" id="loginId" required placeholder="Ex : JR0001 ou email" autocomplete="username"></div>' +
    '<div class="form-group"><label class="form-label">Mot de passe</label><input type="password" class="form-input" id="loginPass" required placeholder="••••••••" autocomplete="current-password"></div>' +
    '<div id="loginError" class="form-error"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg v2-mt-8" id="loginBtn">Se connecter</button></form>';
}

function renderChangePassword() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="pwd-overlay" id="pwdOverlay"><div class="pwd-card">' +
    '<h2>🔐 Changement de mot de passe requis</h2>' +
    '<p>Votre mot de passe provisoire doit etre change avant de continuer.</p>' +
    '<form onsubmit="handleChangePassword(event)">' +
    '<div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" class="form-input" id="newPass1" required minlength="8" placeholder="8 caracteres minimum" autocomplete="new-password" oninput="updatePwdStrength(this.value)"></div>' +
    '<div id="pwdStrength"></div>' +
    '<div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input type="password" class="form-input" id="newPass2" required minlength="8" placeholder="Confirmez votre mot de passe" autocomplete="new-password"></div>' +
    '<div id="pwdError" class="form-error"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg v2-mt-8">Valider le nouveau mot de passe</button></form>' +
    '<div class="pwd-hint">Le mot de passe doit contenir : 8+ caracteres, une majuscule, une minuscule, un chiffre</div>' +
    '</div></div>'
  );
}

// ── SIDEBAR ──

function renderSidebar() {
  var site = currentSite();
  var pages = [];
  var navHtml = '';

  if (isSuperAdmin()) {
    pages.push({ id:'dashboard', icon:'📊', label:'Tableau de bord' });
    pages.forEach(function(p) {
      navHtml += '<div class="nav-item' + (S.page===p.id?' active':'') + '" onclick="navigate(\'' + p.id + '\')"><span class="nav-icon">' + p.icon + '</span>' + p.label + '</div>';
    });
    navHtml += '<div class="nav-section">Administration</div>';
    navHtml += '<div class="nav-item' + (S.page==='sites'?' active':'') + '" onclick="navigate(\'sites\')"><span class="nav-icon">🏢</span>Gestion sites</div>';
    navHtml += '<div class="nav-item' + (S.page==='admin'?' active':'') + '" onclick="navigate(\'admin\')"><span class="nav-icon">👥</span>Utilisateurs</div>';
    if (S.currentSiteId) {
      navHtml += '<div class="nav-item' + (S.page==='settings'?' active':'') + '" onclick="navigate(\'settings\')"><span class="nav-icon">⚙️</span>Paramètres site</div>';
    }
    navHtml += '<div class="nav-section">Mon compte</div>';
    navHtml += '<div class="nav-item' + (S.page==='profile'?' active':'') + '" onclick="navigate(\'profile\')"><span class="nav-icon">👤</span>Mon profil</div>';
  } else {
    pages.push({ id:'dashboard', icon:'📊', label:'Tableau de bord' });
    if (moduleEnabled('temperatures')) pages.push({ id:'temperatures', icon:'🌡️', label:'Températures' });
    if (moduleEnabled('dlc') || moduleEnabled('lots')) pages.push({ id:'dlc', icon:'📋', label:'DLC & Traçabilité' });
    if (moduleEnabled('orders')) pages.push({ id:'orders', icon:'🛒', label:'Commandes' });
    if (moduleEnabled('consignes')) pages.push({ id:'consignes', icon:'💬', label:'Consignes' });
    pages.push({ id:'reports', icon:'📄', label:'Rapports PDF' });

    pages.forEach(function(p) {
      navHtml += '<div class="nav-item' + (S.page===p.id?' active':'') + '" onclick="navigate(\'' + p.id + '\')"><span class="nav-icon">' + p.icon + '</span>' + p.label + '</div>';
    });

    // Notifications avec badge
    var alertCount = (typeof getAlertCount === 'function') ? getAlertCount() : 0;
    navHtml += '<div class="nav-item' + (S.page==='notifications'?' active':'') + '" onclick="navigate(\'notifications\')"><span class="nav-icon">🔔</span>Notifications';
    if (alertCount > 0) navHtml += '<span class="nav-badge">' + alertCount + '</span>';
    navHtml += '</div>';

    if (isManager()) {
      navHtml += '<div class="nav-section">Administration</div>';
      navHtml += '<div class="nav-item' + (S.page==='team'?' active':'') + '" onclick="navigate(\'team\')"><span class="nav-icon">👥</span>Personnel</div>';
      navHtml += '<div class="nav-item' + (S.page==='settings'?' active':'') + '" onclick="navigate(\'settings\')"><span class="nav-icon">⚙️</span>Paramètres site</div>';
    }

    navHtml += '<div class="nav-section">Mon compte</div>';
    navHtml += '<div class="nav-item' + (S.page==='profile'?' active':'') + '" onclick="navigate(\'profile\')"><span class="nav-icon">👤</span>Mon profil</div>';
  }

  var siteOpts = '';
  S.sites.forEach(function(s) {
    siteOpts += '<option value="' + s.id + '"' + (s.id===S.currentSiteId?' selected':'') + '>' + esc(s.name) + '</option>';
  });
  var siteSelector = S.sites.length > 1 ?
    '<div class="site-selector"><select onchange="switchSite(this.value)">' + siteOpts + '</select></div>' : '';

  var roleName = S.profile ? ({super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[S.profile.role] || 'Utilisateur') : '';
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return '<nav class="sidebar' + (S.sidebarOpen?' open':'') + '">' +
    '<div class="sidebar-header"><div class="sidebar-brand"><span>🛡️</span><h2 class="brand-text">HACCP Pro</h2></div></div>' +
    siteSelector +
    '<div class="sidebar-nav">' + navHtml + '</div>' +
    '<div class="sidebar-user">' +
    '<div class="avatar">' + userInitials() + '</div>' +
    '<div class="user-info"><div class="user-name">' + esc(userName()) + '</div><div class="user-role">' + roleName + '</div></div>' +
    '<div class="sidebar-user-actions">' +
    '<button class="sidebar-action-btn" onclick="toggleDarkMode()" title="' + (isDark ? 'Mode clair' : 'Mode sombre') + '">' + (isDark ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>') + '</button>' +
    '<button class="sidebar-action-btn sidebar-logout-btn" onclick="doLogout()" title="Déconnexion"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>' +
    '</div></div></nav>';
}

// ── MAIN CONTENT ROUTER ──

function renderMainContent() {
  var titles = {
    dashboard:'Tableau de bord', temperatures:'Températures', dlc:'DLC & Traçabilité',
    lots:'DLC & Traçabilité', orders:'Commandes', consignes:'Consignes',
    reports:'Rapports PDF', settings:'Paramètres du site', sites:'Gestion des sites',
    admin:'Gestion utilisateurs', profile:'Mon profil', team:'Personnel',
    notifications:'Notifications', legal:'Mentions légales', about:'À propos'
  };

  var content = '';
  switch(S.page) {
    case 'dashboard': content = renderDashboard(); break;
    case 'temperatures': content = renderTemperatures(); break;
    case 'dlc': content = renderDLC(); break;
    case 'lots': content = renderLots(); break;
    case 'orders': content = renderOrders(); break;
    case 'consignes': content = renderConsignes(); break;
    case 'reports': content = renderReports(); break;
    case 'settings': content = renderSettings(); break;
    case 'sites': content = renderSiteManagement(); break;
    case 'admin': content = renderUserManagement(); break;
    case 'profile': content = renderProfile(); break;
    case 'team': content = renderTeam(); break;
    case 'notifications': content = renderNotifications(); break;
    case 'legal': content = renderLegal(); break;
    case 'about': content = renderAbout(); break;
    default: content = renderDashboard();
  }

  // Site dropdown in header for multi-site users (not on dashboard since it has its own)
  var headerSiteDropdown = '';
  if (S.sites.length > 1 && S.page !== 'dashboard') {
    var sOpts = '';
    S.sites.forEach(function(s) {
      sOpts += '<option value="' + s.id + '"' + (s.id === S.currentSiteId ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    headerSiteDropdown = '<div class="site-dropdown"><select onchange="switchSite(this.value)">' + sOpts + '</select></div>';
  }

  return '<div class="main-content">' +
    '<header class="main-header"><button class="burger" onclick="toggleSidebar()">☰</button><h1>' + (titles[S.page] || 'HACCP Pro') + '</h1>' + headerSiteDropdown + '</header>' +
    '<div class="main-body">' + content + '</div></div>';
}
