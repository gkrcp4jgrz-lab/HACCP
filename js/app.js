// =====================================================================
// HACCP PRO V1 — INIT
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
