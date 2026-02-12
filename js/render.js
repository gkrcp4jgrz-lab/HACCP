// =====================================================================
// RENDER ENGINE
// =====================================================================

function render() {
  var app = $('app');
  if (!app) return;

  if (!S.user) { app.innerHTML = renderAuth(); return; }

  if (S.loading) {
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;gap:12px"><div class="loading" style="width:32px;height:32px;border-width:3px"></div><span style="color:#666">Chargement...</span></div>';
    return;
  }

  if (S.sites.length === 0 && !isSuperAdmin()) {
    app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div class="card" style="max-width:500px;margin:20px"><div class="card-body"><div class="empty"><div class="empty-icon">🏢</div><div class="empty-title">Aucun site assigné</div><div class="empty-text">Contactez votre administrateur pour être ajouté à un site.</div></div></div></div></div>';
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
    '<div class="auth-logo"><h1>HACCP Pro</h1><p>Gestion de la sécurité alimentaire</p></div>' +
    '<div id="authForm">' + renderLoginForm() + '</div>' +
    '<p style="text-align:center;font-size:11px;color:var(--muted);margin-top:20px">Contactez votre administrateur pour obtenir vos identifiants.</p>' +
    '</div></div>';
}

function renderLoginForm() {
  return '<form onsubmit="handleLogin(event)">' +
    '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="loginEmail" required placeholder="votre@email.com"></div>' +
    '<div class="form-group"><label class="form-label">Mot de passe</label><input type="password" class="form-input" id="loginPass" required placeholder="••••••••"></div>' +
    '<div id="loginError" class="form-error" style="display:none"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg" id="loginBtn">Se connecter</button></form>';
}

function renderRegisterForm() {
  return '<form onsubmit="handleRegister(event)">' +
    '<div class="form-group"><label class="form-label">Nom complet</label><input type="text" class="form-input" id="regName" required placeholder="Jean Dupont"></div>' +
    '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="regEmail" required placeholder="votre@email.com"></div>' +
    '<div class="form-group"><label class="form-label">Mot de passe</label><input type="password" class="form-input" id="regPass" required minlength="6" placeholder="6 caractères minimum"></div>' +
    '<div id="regError" class="form-error" style="display:none"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg" id="regBtn">Créer un compte</button></form>';
}

function renderChangePassword() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="pwd-overlay" id="pwdOverlay"><div class="pwd-card">' +
    '<h2>🔐 Changement de mot de passe requis</h2>' +
    '<p>Votre mot de passe provisoire doit être changé avant de continuer.</p>' +
    '<form onsubmit="handleChangePassword(event)">' +
    '<div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" class="form-input" id="newPass1" required minlength="6" placeholder="6 caractères minimum"></div>' +
    '<div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input type="password" class="form-input" id="newPass2" required minlength="6" placeholder="Confirmez votre mot de passe"></div>' +
    '<div id="pwdError" class="form-error" style="display:none"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg">Valider le nouveau mot de passe</button></form></div></div>'
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

  return '<nav class="sidebar' + (S.sidebarOpen?' open':'') + '">' +
    '<div class="sidebar-header"><div class="sidebar-brand"><span>🛡️</span><h2>HACCP Pro</h2></div></div>' +
    siteSelector +
    '<div class="sidebar-nav">' + navHtml + '</div>' +
    '<div class="sidebar-user">' +
    '<div class="avatar">' + userInitials() + '</div>' +
    '<div class="user-info"><div class="user-name">' + esc(userName()) + '</div><div class="user-role">' + roleName + '</div></div>' +
    '<button class="btn btn-ghost btn-sm" onclick="doLogout()" title="Déconnexion">🚪</button>' +
    '</div></nav>';
}

// ── MAIN CONTENT ROUTER ──

function renderMainContent() {
  var titles = {
    dashboard:'Tableau de bord', temperatures:'Températures', dlc:'DLC & Traçabilité',
    lots:'DLC & Traçabilité', orders:'Commandes', consignes:'Consignes',
    reports:'Rapports PDF', settings:'Paramètres du site', sites:'Gestion des sites',
    admin:'Gestion utilisateurs', profile:'Mon profil', team:'Personnel',
    notifications:'Notifications'
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
    default: content = renderDashboard();
  }

  return '<div class="main-content">' +
    '<header class="main-header"><button class="burger" onclick="toggleSidebar()">☰</button><h1>' + (titles[S.page] || 'HACCP Pro') + '</h1></header>' +
    '<div class="main-body">' + content + '</div></div>';
}
