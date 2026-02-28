// =====================================================================
// BOTTOM NAV + RIGHT SIDEBAR (Mobile) — Style Instagram/X
// =====================================================================

// ── SVG ICONS (24x24, stroke style) ──
var NAV_ICONS = {
  home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  homeFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="12" width="6" height="10" fill="var(--af-bg-page,#F9FAFB)"/></svg>',
  thermo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  thermoFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  calendarFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="4" width="18" height="18" rx="2"/><rect x="3" y="4" width="18" height="6" rx="2" fill="currentColor"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  message: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  messageFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  building: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 18h6v4H9z"/></svg>',
  buildingFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="9" cy="6" r="1" fill="var(--af-bg-page,#F9FAFB)"/><circle cx="15" cy="6" r="1" fill="var(--af-bg-page,#F9FAFB)"/><circle cx="9" cy="10" r="1" fill="var(--af-bg-page,#F9FAFB)"/><circle cx="15" cy="10" r="1" fill="var(--af-bg-page,#F9FAFB)"/><circle cx="9" cy="14" r="1" fill="var(--af-bg-page,#F9FAFB)"/><circle cx="15" cy="14" r="1" fill="var(--af-bg-page,#F9FAFB)"/><rect x="9" y="18" width="6" height="4" fill="var(--af-bg-page,#F9FAFB)"/></svg>',
  users: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  usersFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2h16z"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><circle cx="17" cy="7" r="3" opacity=".6"/></svg>',
  gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  gearFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/><circle cx="12" cy="12" r="3" fill="var(--af-bg-page,#F9FAFB)"/></svg>',
  broom: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 10"/><path d="M6 10h12l-1 12H7L6 10z"/><path d="M9 10V6"/><path d="M15 10V6"/></svg>',
  broomFill: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.25 2a.75.75 0 0 1 1.5 0v4h2.25V4a.75.75 0 0 1 1.5 0v6h-9V4a.75.75 0 0 1 1.5 0v2h2.25V2z"/><path d="M6 10h12l-1 12H7L6 10z"/></svg>'
};

function renderBottomNav() {
  var alertCount = (typeof getAlertCount === 'function') ? getAlertCount() : 0;
  var h = '';

  // Right sidebar backdrop
  h += '<div class="rsidebar-backdrop" id="rsidebarBackdrop" onclick="closeRightSidebar()"></div>';

  // Right sidebar
  h += renderRightSidebar(alertCount);

  // Bottom nav
  h += '<nav class="bottom-nav" aria-label="Navigation principale"><div class="bottom-nav-inner">';

  if (isSuperAdmin()) {
    h += bnavItem('dashboard', 'home', 'Accueil');
    h += bnavItem('sites', 'building', 'Sites');
    h += bnavItem('admin', 'users', 'Utilisateurs');
    h += bnavItem('settings', 'gear', 'Paramètres');
  } else {
    h += bnavItem('dashboard', 'home', 'Accueil');
    h += bnavItem('temperatures', 'thermo', 'Temp.');
    h += bnavItem('dlc', 'calendar', 'DLC');
    h += bnavItem('cleaning', 'broom', 'Nettoyage');
  }

  // Avatar tab (5th)
  var initials = (typeof userInitials === 'function') ? userInitials() : '?';
  var avatarActive = false; // never "active" in the nav sense
  h += '<button class="bnav-item" onclick="toggleRightSidebar()">';
  h += '<span class="bnav-avatar">' + initials + '</span>';
  if (alertCount > 0) h += '<span class="bnav-badge">' + alertCount + '</span>';
  h += 'Menu</button>';

  h += '</div></nav>';
  return h;
}

function bnavItem(page, iconKey, label) {
  var active = S.page === page;
  var icon = active ? (NAV_ICONS[iconKey + 'Fill'] || NAV_ICONS[iconKey]) : NAV_ICONS[iconKey];
  return '<button class="bnav-item' + (active ? ' active' : '') + '" onclick="navigate(\'' + page + '\')">' +
    '<span class="bnav-icon">' + icon + '</span>' + label + '</button>';
}

// ── RIGHT SIDEBAR (Mobile menu) ──

function renderRightSidebar(alertCount) {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  var initials = (typeof userInitials === 'function') ? userInitials() : '?';
  var name = (typeof userName === 'function') ? userName() : '';
  var roleName = S.profile ? ({super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[S.profile.role] || '') : '';

  var h = '<div class="rsidebar" id="rsidebar">';

  // Header with avatar
  h += '<div class="rsidebar-header">';
  h += '<div class="rsidebar-profile">';
  h += '<div class="rsidebar-avatar">' + initials + '</div>';
  h += '<div class="rsidebar-info"><div class="rsidebar-name">' + esc(name) + '</div><div class="rsidebar-role">' + roleName + '</div></div>';
  h += '</div>';
  h += '<button class="rsidebar-close" onclick="closeRightSidebar()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  h += '</div>';

  // Navigation items (pages NOT in bottom nav)
  h += '<div class="rsidebar-nav">';

  if (isSuperAdmin()) {
    h += rsidebarItem('reports', '📄', 'Rapports PDF');
    h += rsidebarItem('notifications', '🔔', 'Notifications', alertCount);
    h += rsidebarItem('profile', '👤', 'Mon profil');
  } else if (isManager()) {
    h += rsidebarItem('orders', '🛒', 'Commandes');
    if (moduleEnabled('consignes')) h += rsidebarItem('consignes', '💬', 'Consignes');
    h += rsidebarItem('reports', '📄', 'Rapports');
    h += '<div class="rsidebar-divider"></div>';
    h += rsidebarItem('team', '👥', 'Personnel');
    h += rsidebarItem('notifications', '🔔', 'Notifications', alertCount);
    h += rsidebarItem('settings', '⚙️', 'Paramètres');
    h += '<div class="rsidebar-divider"></div>';
    h += rsidebarItem('profile', '👤', 'Mon profil');
  } else {
    // Employee
    h += rsidebarItem('orders', '🛒', 'Commandes');
    if (moduleEnabled('consignes')) h += rsidebarItem('consignes', '💬', 'Consignes');
    h += rsidebarItem('reports', '📄', 'Rapports');
    h += rsidebarItem('notifications', '🔔', 'Notifications', alertCount);
    h += '<div class="rsidebar-divider"></div>';
    h += rsidebarItem('profile', '👤', 'Mon profil');
  }

  h += '</div>';

  // Site selector (if multi-site)
  if (S.sites.length > 1) {
    h += '<div class="rsidebar-section">';
    h += '<div class="rsidebar-section-title">Site</div>';
    var sOpts = '';
    S.sites.forEach(function(s) {
      sOpts += '<option value="' + s.id + '"' + (s.id === S.currentSiteId ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    h += '<select class="rsidebar-select" onchange="closeRightSidebar();switchSite(this.value)">' + sOpts + '</select>';
    h += '</div>';
  }

  // Footer actions
  h += '<div class="rsidebar-footer">';
  h += '<button class="rsidebar-footer-btn" onclick="closeRightSidebar();toggleDarkMode()"><span>' + (isDark ? '☀️' : '🌙') + '</span>' + (isDark ? 'Mode clair' : 'Mode sombre') + '</button>';
  h += '<button class="rsidebar-footer-btn" onclick="closeRightSidebar();navigate(\'legal\')"><span>📋</span>Mentions légales</button>';
  h += '<button class="rsidebar-footer-btn rsidebar-logout" onclick="closeRightSidebar();doLogout()"><span>🚪</span>Déconnexion</button>';
  h += '</div>';

  h += '</div>';
  return h;
}

function rsidebarItem(page, icon, label, badge) {
  var active = S.page === page ? ' rsidebar-item--active' : '';
  var badgeHtml = badge ? '<span class="rsidebar-badge">' + badge + '</span>' : '';
  return '<button class="rsidebar-item' + active + '" onclick="closeRightSidebar();navigate(\'' + page + '\')">' +
    '<span class="rsidebar-icon">' + icon + '</span>' + label + badgeHtml + '</button>';
}

// ── TOGGLE ──

window.toggleRightSidebar = function() {
  var sidebar = $('rsidebar');
  var backdrop = $('rsidebarBackdrop');
  if (!sidebar) return;
  var isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeRightSidebar();
  } else {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
  }
};

window.closeRightSidebar = function() {
  var sidebar = $('rsidebar');
  var backdrop = $('rsidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
};
