// =====================================================================
// HACCP PRO V1 — INIT
// =====================================================================

(async function() {
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
