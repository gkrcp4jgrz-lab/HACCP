// =====================================================================
// BOTTOM NAV (Mobile) — Adaptatif par rôle
// =====================================================================

function renderBottomNav() {
  // 5 onglets fixes selon le rôle :
  // Employé    : Accueil | Températures | DLC | Consignes | Compte
  // Gérant     : Accueil | Températures | DLC | Consignes | Plus (→ commandes, notifications, personnel, paramètres, profil)
  // SuperAdmin : Accueil | Sites | Utilisateurs | Paramètres | Plus (→ profil)

  var alertCount = (typeof getAlertCount === 'function') ? getAlertCount() : 0;
  var h = '';

  h += '<div class="bnav-more-backdrop" id="bnavMoreBackdrop" onclick="closeBnavMore()"></div>';
  h += '<div id="bnavMoreMenu" class="bnav-more-menu" style="display:none"></div>';

  h += '<nav class="bottom-nav"><div class="bottom-nav-inner">';

  if (isSuperAdmin()) {
    h += bnavItem('dashboard', '📊', 'Accueil');
    h += bnavItem('sites', '🏢', 'Sites');
    h += bnavItem('admin', '👥', 'Utilisateurs');
    h += bnavItem('settings', '⚙️', 'Paramètres');
    h += bnavItemMore(alertCount);
  } else if (isManager()) {
    h += bnavItem('dashboard', '📊', 'Accueil');
    h += bnavItem('temperatures', '🌡️', 'Temp.');
    h += bnavItem('dlc', '📋', 'DLC');
    h += bnavItem('consignes', '💬', 'Consignes');
    h += bnavItemMore(alertCount);
  } else {
    // Employé
    h += bnavItem('dashboard', '📊', 'Accueil');
    h += bnavItem('temperatures', '🌡️', 'Temp.');
    h += bnavItem('dlc', '📋', 'DLC');
    h += bnavItem('consignes', '💬', 'Consignes');
    h += bnavItem('profile', '👤', 'Compte');
  }

  h += '</div></nav>';
  return h;
}

function bnavItem(page, icon, label) {
  var active = S.page === page ? ' active' : '';
  return '<button class="bnav-item' + active + '" onclick="navigate(\'' + page + '\')">' +
    '<span class="bnav-icon">' + icon + '</span>' + label + '</button>';
}

function bnavItemMore(alertCount) {
  var active = ['orders','notifications','reports','team','settings','profile'].indexOf(S.page) >= 0 ? ' active' : '';
  var badge = alertCount > 0 ? '<span class="bnav-badge">' + alertCount + '</span>' : '';
  return '<button class="bnav-item' + active + '" onclick="toggleBnavMore()">' +
    '<span class="bnav-icon">☰</span>' + badge + 'Plus</button>';
}

// ── MENU "PLUS" ──

window.toggleBnavMore = function() {
  var menu = $('bnavMoreMenu');
  var backdrop = $('bnavMoreBackdrop');
  if (!menu) return;

  if (menu.style.display === 'none' || !menu.style.display) {
    // Build menu content based on role
    var h = '';
    var alertCount = (typeof getAlertCount === 'function') ? getAlertCount() : 0;

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isSuperAdmin()) {
      h += bnavMenuItem('notifications', '🔔', 'Notifications' + (alertCount > 0 ? ' (' + alertCount + ')' : ''));
      h += bnavMenuItem('profile', '👤', 'Mon profil');
      h += '<div class="bnav-menu-section">Outils</div>';
      h += bnavMenuItem('reports', '📄', 'Rapports PDF');
    } else if (isManager()) {
      h += bnavMenuItem('orders', '🛒', 'Commandes');
      h += bnavMenuItem('notifications', '🔔', 'Notifications' + (alertCount > 0 ? ' (' + alertCount + ')' : ''));
      h += bnavMenuItem('reports', '📄', 'Rapports PDF');
      h += '<div class="bnav-menu-section">Administration</div>';
      h += bnavMenuItem('team', '👥', 'Personnel');
      h += bnavMenuItem('settings', '⚙️', 'Paramètres site');
      h += '<div class="bnav-menu-section">Compte</div>';
      h += bnavMenuItem('profile', '👤', 'Mon profil');
    } else {
      h += bnavMenuItem('profile', '👤', 'Mon profil');
      h += bnavMenuItem('notifications', '🔔', 'Notifications');
    }
    // Dark mode toggle
    h += '<div class="bnav-menu-section">Apparence</div>';
    h += '<div class="bnav-menu-item" onclick="closeBnavMore();toggleDarkMode()"><span class="bnav-menu-icon">' + (isDark ? '☀️' : '🌙') + '</span>' + (isDark ? 'Mode clair' : 'Mode sombre') + '</div>';

    menu.innerHTML = h;
    menu.style.display = 'block';
    if (backdrop) backdrop.classList.add('show');
  } else {
    closeBnavMore();
  }
};

window.closeBnavMore = function() {
  var menu = $('bnavMoreMenu');
  var backdrop = $('bnavMoreBackdrop');
  if (menu) menu.style.display = 'none';
  if (backdrop) backdrop.classList.remove('show');
};

function bnavMenuItem(page, icon, label) {
  return '<div class="bnav-menu-item" onclick="closeBnavMore();navigate(\'' + page + '\')">' +
    '<span class="bnav-menu-icon">' + icon + '</span>' + label + '</div>';
}
