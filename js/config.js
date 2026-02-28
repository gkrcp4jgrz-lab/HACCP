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

// ── APPLICATION STATE ──
var S = {
  user: null,
  profile: null,
  page: 'dashboard',
  sites: [],
  currentSiteId: null,
  siteConfig: { equipment: [], products: [], suppliers: [], modules: [] },
  data: { temperatures: [], dlcs: [], lots: [], orders: [], consignes: [], incident_reports: [], cleaning_schedules: [], cleaning_records: [] },
  cleaningFilter: 'today',
  photoCleaningData: null,
  filter: 'all',
  dlcTab: 'dlc',
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
