// =====================================================================
// HACCP PRO V1 — CONFIGURATION & STATE
// =====================================================================

// ── CONFIG SUPABASE ──
var SB_URL = 'https://lqwdhbevylmgrrgkdoxn.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2RoYmV2eWxtZ3JyZ2tkb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODU2MzksImV4cCI6MjA4NTk2MTYzOX0.YjglruiKzMAwlF0xje8zenidlYUXbyeYY4bAziL7FXU';

var sb;
try { sb = supabase.createClient(SB_URL, SB_KEY); } catch(e) { console.error('Supabase init error:', e); }

// ── HELPER DOM ──
function $(id) { return document.getElementById(id); }
function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtD(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR'); } catch(e) { return d; } }
function fmtDT(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('fr-FR'); } catch(e) { return d; } }
function today() {
  // Timezone-aware: use local date, not UTC
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function daysUntil(d) { return Math.ceil((new Date(d) - new Date(today())) / 86400000); }

// ── SVG ICONS (18x18, stroke style — shared across all pages) ──
var IC = {
  edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  userPlus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  userX: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>',
  user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  building: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 18h6v4H9z"/></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  mapPin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  thermo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  calendarDlc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  broomClean: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="M6 10h12l-1 12H7L6 10z"/><path d="M9 10V6"/><path d="M15 10V6"/></svg>',
  cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  msgBubble: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  fileText: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  barChart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  logOut: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  clipboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  alertTriangle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
};

// ── APPLICATION STATE ──
var S = {
  user: null,
  profile: null,
  page: 'dashboard',
  sites: [],
  currentSiteId: null,
  siteConfig: { equipment: [], products: [], suppliers: [], modules: [] },
  data: { temperatures: [], dlcs: [], lots: [], orders: [], consignes: [], incident_reports: [], cleaning_schedules: [], cleaning_logs: [], consumption_logs: [] },
  cleaningFilter: 'today',
  photoCleaningData: null,
  filter: 'all',
  dlcTab: 'dlc',
  showClosedLots: false,
  adminTab: 'users',
  settingsTab: 'equipment',
  notifTab: 'alerts',
  photoDlcData: null,
  photoLotData: null,
  sigData: null,
  sidebarOpen: false,
  loading: true
};

// ── HELPERS ──
function currentSite() {
  return S.sites.find(function(s) { return s.id === S.currentSiteId; }) || null;
}

function isSuperAdmin() { return S.profile && S.profile.role === 'super_admin'; }
function isManager() { return S.profile && (S.profile.role === 'super_admin' || S.profile.role === 'manager'); }
function userName() { return S.profile ? (S.profile.full_name || S.profile.email) : 'Utilisateur'; }
function userInitials() { var n = userName(); return n.split(' ').map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase(); }

function moduleEnabled(key) {
  var m = S.siteConfig.modules.find(function(mod) { return mod.module_key === key; });
  return m ? m.enabled : true;
}

// ── RATE LIMITING (login brute-force protection) ──
var _loginAttempts = { count: 0, lastAttempt: 0, lockUntil: 0 };
var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_LOCKOUT_MS = 60000; // 1 minute lockout

function checkLoginRateLimit() {
  var now = Date.now();
  if (_loginAttempts.lockUntil > now) {
    var secs = Math.ceil((_loginAttempts.lockUntil - now) / 1000);
    return { allowed: false, message: 'Trop de tentatives. Reessayez dans ' + secs + 's.' };
  }
  // Reset after lockout period
  if (now - _loginAttempts.lastAttempt > LOGIN_LOCKOUT_MS) {
    _loginAttempts.count = 0;
  }
  return { allowed: true };
}

function recordLoginAttempt(success) {
  var now = Date.now();
  if (success) {
    _loginAttempts.count = 0;
    _loginAttempts.lockUntil = 0;
  } else {
    _loginAttempts.count++;
    _loginAttempts.lastAttempt = now;
    if (_loginAttempts.count >= LOGIN_MAX_ATTEMPTS) {
      _loginAttempts.lockUntil = now + LOGIN_LOCKOUT_MS;
      _loginAttempts.count = 0;
    }
  }
}

// ── SESSION TIMEOUT (auto-logout after inactivity) ──
var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
var _sessionTimer = null;
var _lastActivity = Date.now();

function resetSessionTimer() {
  _lastActivity = Date.now();
  if (_sessionTimer) clearTimeout(_sessionTimer);
  if (S.user) {
    _sessionTimer = setTimeout(function() {
      if (Date.now() - _lastActivity >= SESSION_TIMEOUT_MS) {
        showToast('Session expirée par inactivité', 'warning');
        doLogout();
      }
    }, SESSION_TIMEOUT_MS);
  }
}

// Activity listener for session timeout
['click', 'keydown', 'touchstart', 'scroll'].forEach(function(evt) {
  document.addEventListener(evt, function() { resetSessionTimer(); }, { passive: true });
});

// ── TOAST NOTIFICATIONS (better UX than alert) ──
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3500;
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = '<span>' + (icons[type] || '') + ' ' + esc(message) + '</span>';
  container.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}

// ── PASSWORD STRENGTH VALIDATION ──
function validatePassword(pass) {
  if (pass.length < 8) return { valid: false, message: 'Minimum 8 caractères' };
  if (!/[A-Z]/.test(pass)) return { valid: false, message: 'Au moins une majuscule requise' };
  if (!/[a-z]/.test(pass)) return { valid: false, message: 'Au moins une minuscule requise' };
  if (!/[0-9]/.test(pass)) return { valid: false, message: 'Au moins un chiffre requis' };
  return { valid: true, message: 'Mot de passe fort' };
}

// ── ANTI DOUBLE-CLICK ──
function withLoading(btnOrId, asyncFn) {
  var btn = typeof btnOrId === 'string' ? $(btnOrId) : btnOrId;
  if (!btn || btn.disabled) return;
  var orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> ' + (btn.textContent || '').trim().substring(0, 15) + '...';
  asyncFn().then(function() {
    btn.disabled = false; btn.innerHTML = orig;
  }).catch(function(e) {
    btn.disabled = false; btn.innerHTML = orig;
    showToast(e.message || 'Erreur', 'error');
  });
}

// ── INPUT SANITIZATION ──
function sanitizeNumeric(val) {
  var n = parseFloat(val);
  if (isNaN(n) || !isFinite(n)) return null;
  return n;
}

// ── CSV EXPORT HELPER ──
function exportCSV(filename, headers, rows) {
  var bom = '\uFEFF'; // UTF-8 BOM for Excel
  var csv = bom + headers.join(';') + '\n';
  rows.forEach(function(row) {
    csv += row.map(function(cell) {
      var s = String(cell == null ? '' : cell).replace(/"/g, '""');
      return '"' + s + '"';
    }).join(';') + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé', 'success');
}

// ── RANDOM PASSWORD GENERATION ──
function generateTempPassword() {
  var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var lower = 'abcdefghjkmnpqrstuvwxyz';
  var digits = '23456789';
  var special = '!@#$';
  // Ensure at least one of each required type
  var pass = '';
  var arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  pass += upper[arr[0] % upper.length];
  pass += lower[arr[1] % lower.length];
  pass += digits[arr[2] % digits.length];
  pass += special[arr[3] % special.length];
  var all = upper + lower + digits + special;
  for (var i = 4; i < 10; i++) pass += all[arr[i] % all.length];
  // Shuffle
  pass = pass.split('').sort(function() { return 0.5 - Math.random(); }).join('');
  return pass;
}

// ── LOGIN ID GENERATION ──

function getLoginIdInitials(fullName) {
  var parts = (fullName || '').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0]) {
    return (parts[0][0] + (parts[0][1] || 'X')).toUpperCase();
  }
  return 'XX';
}

async function generateUniqueLoginId(fullName) {
  var initials = getLoginIdInitials(fullName);
  // Fetch all existing login_ids
  var r = await sb.from('profiles').select('login_id');
  var existing = (r.data || []).map(function(p) { return (p.login_id || '').toUpperCase(); });

  // Find next available number for these initials
  var maxNum = 0;
  existing.forEach(function(lid) {
    if (lid.substring(0, 2) === initials) {
      var num = parseInt(lid.substring(2), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  return initials + String(maxNum + 1).padStart(4, '0');
}

function loginIdToEmail(loginId) {
  return (loginId || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '@haccp.internal';
}

// ── PRODUCT & SUPPLIER SUGGESTIONS ──

// ── DARK MODE ──
function initDarkMode() {
  var saved = localStorage.getItem('haccp_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
initDarkMode();

window.toggleDarkMode = function() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.body.classList.add('theme-transitioning');
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('haccp_theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('haccp_theme', 'dark');
  }
  setTimeout(function() { document.body.classList.remove('theme-transitioning'); }, 350);
  if (S.user) render();
};

function getProductSuggestions() {
  var names = {};
  S.siteConfig.products.forEach(function(p) { if (p.name) names[p.name] = true; });
  S.data.dlcs.forEach(function(d) { if (d.product_name) names[d.product_name] = true; });
  S.data.lots.forEach(function(l) { if (l.product_name) names[l.product_name] = true; });
  return Object.keys(names).sort();
}

function getSupplierSuggestions() {
  var names = {};
  S.siteConfig.suppliers.forEach(function(s) { if (s.name) names[s.name] = true; });
  S.data.lots.forEach(function(l) { if (l.supplier_name) names[l.supplier_name] = true; });
  return Object.keys(names).sort();
}
