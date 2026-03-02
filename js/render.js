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

  S._renderToken = (S._renderToken || 0) + 1;
  app.innerHTML = renderSidebar() + renderMainContent() + renderBottomNav();

  if (S.page === 'temperatures') {
    setTimeout(function() { initSignature(); }, 50);
  }
  if (S.page === 'profile' && typeof loadMFA2FASection === 'function') {
    setTimeout(function() { loadMFA2FASection(); }, 100);
  }
}

// ── AUTH ──

function renderAuth() {
  return '<div class="auth-wrapper"><div class="auth-card">' +
    '<div class="auth-logo"><div class="auth-logo-icon">🛡️</div><h1>CONI</h1><p>Sécurité alimentaire professionnelle</p></div>' +
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
    '<p>Votre mot de passe provisoire doit être changé avant de continuer.</p>' +
    '<form onsubmit="handleChangePassword(event)">' +
    '<div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" class="form-input" id="newPass1" required minlength="8" placeholder="8 caractères minimum" autocomplete="new-password" oninput="updatePwdStrength(this.value)"></div>' +
    '<div id="pwdStrength"></div>' +
    '<div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input type="password" class="form-input" id="newPass2" required minlength="8" placeholder="Confirmez votre mot de passe" autocomplete="new-password"></div>' +
    '<div id="pwdError" class="form-error"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg v2-mt-8">Valider le nouveau mot de passe</button></form>' +
    '<div class="pwd-hint">Le mot de passe doit contenir : 8+ caractères, une majuscule, une minuscule, un chiffre</div>' +
    '</div></div>'
  );
}

// ── SIDEBAR HELPERS ──

if (!S.navGroups) S.navGroups = { operations: true, gestion: false, suivi: false, admin: false };

function navItem(pageId, icon, label) {
  return '<div class="nav-item' + (S.page===pageId?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'' + pageId + '\')" onkeydown="if(event.key===\'Enter\')navigate(\'' + pageId + '\')"><span class="nav-icon">' + icon + '</span>' + label + '</div>';
}

function navGroup(groupKey, title, pages, hasActivePage) {
  var isOpen = S.navGroups[groupKey] || hasActivePage;
  var h = '<div class="nav-group">';
  h += '<div class="nav-group-header' + (hasActivePage ? ' active' : '') + '" onclick="toggleNavGroup(\'' + groupKey + '\')" role="button" tabindex="0"><span>' + title + '</span><span class="nav-chevron' + (isOpen ? ' open' : '') + '">›</span></div>';
  h += '<div class="nav-group-items" style="' + (isOpen ? '' : 'display:none') + '">';
  pages.forEach(function(p) { h += navItem(p.id, p.icon, p.label); });
  h += '</div></div>';
  return h;
}

window.toggleNavGroup = function(key) {
  S.navGroups[key] = !S.navGroups[key];
  render();
};

// ── SIDEBAR ──

function renderSidebar() {
  var site = currentSite();
  var pages = [];
  var navHtml = '';

  if (isSuperAdmin()) {
    pages.push({ id:'dashboard', icon:'📊', label:'Tableau de bord' });
    pages.forEach(function(p) {
      navHtml += '<div class="nav-item' + (S.page===p.id?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'' + p.id + '\')" onkeydown="if(event.key===\'Enter\')navigate(\'' + p.id + '\')"><span class="nav-icon">' + p.icon + '</span>' + p.label + '</div>';
    });
    navHtml += '<div class="nav-section">Administration</div>';
    navHtml += '<div class="nav-item' + (S.page==='sites'?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'sites\')" onkeydown="if(event.key===\'Enter\')navigate(\'sites\')"><span class="nav-icon">🏢</span>Gestion sites</div>';
    navHtml += '<div class="nav-item' + (S.page==='admin'?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'admin\')" onkeydown="if(event.key===\'Enter\')navigate(\'admin\')"><span class="nav-icon">👥</span>Utilisateurs</div>';
    if (S.currentSiteId) {
      navHtml += '<div class="nav-item' + (S.page==='settings'?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'settings\')" onkeydown="if(event.key===\'Enter\')navigate(\'settings\')"><span class="nav-icon">⚙️</span>Paramètres site</div>';
    }
    navHtml += '<div class="nav-section">Mon compte</div>';
    navHtml += '<div class="nav-item' + (S.page==='profile'?' active':'') + '" role="button" tabindex="0" onclick="navigate(\'profile\')" onkeydown="if(event.key===\'Enter\')navigate(\'profile\')"><span class="nav-icon">👤</span>Mon profil</div>';
  } else {
    // Dashboard (toujours visible)
    navHtml += navItem('dashboard', '📊', 'Tableau de bord');

    // Groupe : Operations
    var opsPages = [];
    if (moduleEnabled('temperatures')) opsPages.push({ id:'temperatures', icon:'🌡️', label:'Temperatures' });
    if (moduleEnabled('dlc') || moduleEnabled('lots')) opsPages.push({ id:'dlc', icon:'📋', label:'DLC & Tracabilite' });
    if (moduleEnabled('cleaning')) opsPages.push({ id:'cleaning', icon:'🧹', label:'Nettoyage' });
    if (opsPages.length > 0) {
      var opsActive = opsPages.some(function(p) { return S.page === p.id; });
      navHtml += navGroup('operations', 'Operations', opsPages, opsActive);
    }

    // Groupe : Gestion
    var gestPages = [];
    if (moduleEnabled('orders')) gestPages.push({ id:'orders', icon:'🛒', label:'Commandes' });
    if (moduleEnabled('consignes')) gestPages.push({ id:'consignes', icon:'💬', label:'Consignes' });
    if (gestPages.length > 0) {
      var gestActive = gestPages.some(function(p) { return S.page === p.id; });
      navHtml += navGroup('gestion', 'Gestion', gestPages, gestActive);
    }

    // Groupe : Suivi
    var alertCount = (typeof getAlertCount === 'function') ? getAlertCount() : 0;
    var suiviHtml = navItem('notifications', '🔔', 'Notifications' + (alertCount > 0 ? '<span class="nav-badge">' + alertCount + '</span>' : ''));
    suiviHtml += navItem('reports', '📄', 'Rapports');
    var suiviActive = S.page === 'notifications' || S.page === 'reports';
    navHtml += '<div class="nav-group">';
    navHtml += '<div class="nav-group-header' + (suiviActive ? ' active' : '') + '" onclick="toggleNavGroup(\'suivi\')" role="button" tabindex="0"><span>Suivi</span><span class="nav-chevron' + (S.navGroups && S.navGroups.suivi ? ' open' : '') + '">›</span></div>';
    navHtml += '<div class="nav-group-items" style="' + ((!S.navGroups || S.navGroups.suivi || suiviActive) ? '' : 'display:none') + '">' + suiviHtml + '</div></div>';

    // Groupe : Administration (manager+)
    if (isManager()) {
      var adminPages = [
        { id:'team', icon:'👥', label:'Personnel' },
        { id:'settings', icon:'⚙️', label:'Parametres' }
      ];
      var adminActive = adminPages.some(function(p) { return S.page === p.id; });
      navHtml += navGroup('admin', 'Administration', adminPages, adminActive);
    }

    // Mon compte
    navHtml += '<div class="nav-section">Mon compte</div>';
    navHtml += navItem('profile', '👤', 'Mon profil');
  }

  var siteOpts = '';
  S.sites.forEach(function(s) {
    siteOpts += '<option value="' + s.id + '"' + (s.id===S.currentSiteId?' selected':'') + '>' + esc(s.name) + '</option>';
  });
  var siteSelector = S.sites.length > 1 ?
    '<div class="site-selector"><select onchange="switchSite(this.value)">' + siteOpts + '</select></div>' : '';

  var roleName = S.profile ? ({super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[S.profile.role] || 'Utilisateur') : '';
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return '<nav class="sidebar' + (S.sidebarOpen?' open':'') + '" role="navigation" aria-label="Menu principal">' +
    '<div class="sidebar-header"><div class="sidebar-brand"><h2 class="brand-text">CONI</h2><span class="brand-sub">HACCP</span></div></div>' +
    siteSelector +
    '<div class="sidebar-nav">' + navHtml + '</div>' +
    '<div class="sidebar-user">' +
    '<div class="avatar">' + userInitials() + '</div>' +
    '<div class="user-info"><div class="user-name">' + esc(userName()) + '</div><div class="user-role">' + roleName + '</div></div>' +
    '<div class="sidebar-user-actions">' +
    '<button class="sidebar-action-btn" onclick="toggleDarkMode()" title="' + (isDark ? 'Mode clair' : 'Mode sombre') + '" aria-label="' + (isDark ? 'Activer le mode clair' : 'Activer le mode sombre') + '">' + (isDark ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>') + '</button>' +
    '<button class="sidebar-action-btn sidebar-logout-btn" onclick="doLogout()" title="Déconnexion" aria-label="Se déconnecter"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>' +
    '</div></div></nav>';
}

// ── MAIN CONTENT ROUTER ──

function renderMainContent() {
  var titles = {
    dashboard:'Tableau de bord', temperatures:'Températures', dlc:'DLC & Traçabilité',
    lots:'DLC & Traçabilité', stock:'Stock', orders:'Liste de courses', consignes:'Consignes',
    reports:'Rapports PDF', settings:'Paramètres du site', sites:'Gestion des sites',
    admin:'Gestion utilisateurs', profile:'Mon profil', team:'Personnel',
    cleaning:'Plan de nettoyage', notifications:'Notifications', legal:'Mentions légales', about:'À propos'
  };

  var content = '';
  switch(S.page) {
    case 'dashboard': content = renderDashboard(); break;
    case 'temperatures': content = renderTemperatures(); break;
    case 'dlc': content = renderDLC(); break;
    case 'lots': content = renderLots(); break;
    case 'stock': content = renderStockTabContent(); break;
    case 'orders': content = renderOrders(); break;
    case 'consignes': content = renderConsignes(); break;
    case 'cleaning': content = renderCleaning(); break;
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
    '<header class="main-header"><button class="burger" onclick="toggleSidebar()" aria-label="Ouvrir le menu">☰</button><h1>' + (titles[S.page] || 'CONI') + '</h1>' + headerSiteDropdown + '</header>' +
    '<div class="main-body">' + content + '</div></div>';
}
