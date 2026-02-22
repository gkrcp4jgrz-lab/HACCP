// =====================================================================
// HACCP PRO — INIT (with offline detection, auto-refresh)
// =====================================================================

(async function() {
  // Migrate legacy Claude key from localStorage -> sessionStorage (session-only)
  try {
    var legacy = localStorage.getItem('haccp_claude_key');
    if (legacy && !sessionStorage.getItem('haccp_claude_key')) {
      sessionStorage.setItem('haccp_claude_key', legacy);
    }
    if (legacy) localStorage.removeItem('haccp_claude_key');
  } catch (e) { /* ignore */ }

  var isAuth = await checkAuth();
  if (isAuth) {
    if (S.profile && S.profile.must_change_password) {
      render();
      renderChangePassword();
    } else {
      await initApp();
    }
  } else {
    S.loading = false;
    render();
  }
})();

// ── ONLINE/OFFLINE DETECTION ──
window.addEventListener('online', function() {
  var banner = document.getElementById('offlineBanner');
  if (banner) banner.remove();
  showToast('Connexion retablie', 'success');
  if (S.user) { loadSiteData().then(function() { render(); }); }
});

window.addEventListener('offline', function() {
  if (!document.getElementById('offlineBanner')) {
    var banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.className = 'offline-banner';
    banner.textContent = 'Hors ligne — Les donnees ne sont pas synchronisees';
    document.body.prepend(banner);
  }
});

// ── AUTO-REFRESH DATA (every 5 minutes) ──
var _autoRefreshInterval = null;
function startAutoRefresh() {
  if (_autoRefreshInterval) clearInterval(_autoRefreshInterval);
  _autoRefreshInterval = setInterval(async function() {
    if (S.user && S.currentSiteId && document.visibilityState === 'visible') {
      await loadSiteData();
      render();
    }
  }, 5 * 60 * 1000);
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && S.user && S.currentSiteId) {
    loadSiteData().then(function() { render(); });
  }
});

// Start auto-refresh when logged in
var _origInitApp = initApp;
initApp = async function() {
  await _origInitApp();
  startAutoRefresh();
};

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      // Auto-update check
      reg.addEventListener('updatefound', function() {
        var newSW = reg.installing;
        newSW.addEventListener('statechange', function() {
          if (newSW.state === 'activated') {
            showToast('Mise à jour installée', 'info');
          }
        });
      });
    }).catch(function(err) {
      console.warn('SW registration failed:', err);
    });
  });
}
