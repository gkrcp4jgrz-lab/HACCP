// =====================================================================
// AUTH
// =====================================================================

async function checkAuth() {
  try {
    var sess = await sb.auth.getSession();
    if (sess.data.session) {
      S.user = sess.data.session.user;
      await loadProfile();
      return true;
    }
  } catch(e) { console.error('Auth check error:', e); }
  return false;
}

async function loadProfile() {
  if (!S.user) return;
  try {
    var r = await sb.from('profiles').select('*').eq('id', S.user.id).single();
    if (r.data) {
      S.profile = r.data;
    } else {
      await new Promise(function(resolve) { setTimeout(resolve, 1000); });
      var r2 = await sb.from('profiles').select('*').eq('id', S.user.id).single();
      if (r2.data) S.profile = r2.data;
      else console.error('Profil introuvable pour', S.user.id);
    }
  } catch(e) { console.error('Load profile error:', e); }
}

async function doLogin(email, pass) {
  var r = await sb.auth.signInWithPassword({ email: email, password: pass });
  if (r.error) throw r.error;
  S.user = r.data.user;
  await loadProfile();
  if (S.profile && S.profile.must_change_password) {
    renderChangePassword();
    return;
  }
  await initApp();
}

async function doRegister(email, pass, name) {
  var r = await sb.auth.signUp({
    email: email,
    password: pass,
    options: { data: { full_name: name } }
  });
  if (r.error) throw r.error;
  alert('Inscription réussie ! Vérifiez votre email pour confirmer votre compte, puis connectez-vous.');
}

async function doLogout() {
  await sb.auth.signOut();
  S.user = null;
  S.profile = null;
  S.sites = [];
  S.currentSiteId = null;
  render();
}

async function changePassword(newPass) {
  var r = await sb.auth.updateUser({ password: newPass });
  if (r.error) throw r.error;
  await sb.from('profiles').update({ must_change_password: false }).eq('id', S.user.id);
  S.profile.must_change_password = false;
  await initApp();
}

async function createUser(email, tempPass, fullName, role) {
  var currentSession = await sb.auth.getSession();
  var savedToken = currentSession.data.session;

  var r = await sb.auth.signUp({
    email: email,
    password: tempPass,
    options: { data: { full_name: fullName } }
  });
  if (r.error) throw r.error;
  var newUser = r.data.user;
  if (!newUser) throw new Error('Utilisateur non créé');

  if (savedToken) {
    await sb.auth.setSession({ access_token: savedToken.access_token, refresh_token: savedToken.refresh_token });
  }

  await new Promise(function(resolve) { setTimeout(resolve, 1500); });

  if (role && role !== 'employee') {
    var r2 = await sb.rpc('admin_set_user_role', { p_target_user_id: newUser.id, p_new_role: role });
    if (r2.error) throw r2.error;
  }

  await sb.from('profiles').update({ must_change_password: false }).eq('id', newUser.id);

  return newUser;
}
