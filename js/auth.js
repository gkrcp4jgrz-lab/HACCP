// =====================================================================
// AUTH — Identifier-based login (no email needed)
// =====================================================================

async function checkAuth() {
  try {
    var sess = await sb.auth.getSession();
    if (sess.data.session) {
      S.user = sess.data.session.user;
      await loadProfile();
      resetSessionTimer();
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

// Login by identifier: lookup login_id -> get internal email -> authenticate
async function doLoginById(loginId, pass) {
  // Rate limit check
  var rl = checkLoginRateLimit();
  if (!rl.allowed) throw new Error(rl.message);

  // Lookup the email via secure RPC function (works for anon)
  var email = null;
  var rpcAvailable = true;
  try {
    var lookup = await sb.rpc('lookup_login_id', { p_login_id: loginId.toUpperCase() });
    if (lookup.error) rpcAvailable = false;
    if (lookup.data && lookup.data.length > 0) {
      email = lookup.data[0].email;
    }
  } catch(e) {
    rpcAvailable = false;
    console.warn('lookup_login_id RPC not available');
  }

  // Fallback 1: input looks like an email — use it directly
  if (!email && loginId.indexOf('@') > -1) {
    email = loginId;
  }

  // Fallback 2: no email found (RPC unavailable OR login_id not yet set in profile)
  if (!email) {
    // Try direct Supabase auth with input as email (migration period)
    var directR = await sb.auth.signInWithPassword({ email: loginId, password: pass });
    if (!directR.error) {
      recordLoginAttempt(true);
      S.user = directR.data.user;
      await loadProfile();
      resetSessionTimer();
      if (S.profile && S.profile.must_change_password) {
        renderChangePassword();
        return;
      }
      await postLoginFlow();
      return;
    }
    // Also try as internal email format
    var internalEmail = loginIdToEmail(loginId);
    var directR2 = await sb.auth.signInWithPassword({ email: internalEmail, password: pass });
    if (!directR2.error) {
      recordLoginAttempt(true);
      S.user = directR2.data.user;
      await loadProfile();
      resetSessionTimer();
      if (S.profile && S.profile.must_change_password) {
        renderChangePassword();
        return;
      }
      await postLoginFlow();
      return;
    }
    recordLoginAttempt(false);
    throw new Error('Identifiant ou mot de passe incorrect');
  }

  var r = await sb.auth.signInWithPassword({ email: email, password: pass });
  if (r.error) {
    recordLoginAttempt(false);
    throw new Error('Mot de passe incorrect');
  }

  recordLoginAttempt(true);
  S.user = r.data.user;
  await loadProfile();
  resetSessionTimer();

  if (S.profile && S.profile.must_change_password) {
    renderChangePassword();
    return;
  }
  await postLoginFlow();
}

async function doLogout() {
  if (_sessionTimer) clearTimeout(_sessionTimer);
  await sb.auth.signOut();
  // Clean sensitive data from storage
  sessionStorage.removeItem('haccp_claude_key');
  localStorage.removeItem('haccp_email_enabled');
  localStorage.removeItem('haccp_email_to');
  localStorage.removeItem('haccp_email_events');
  S.user = null;
  S.profile = null;
  S.sites = [];
  S.currentSiteId = null;
  S.claudeApiKey = '';
  render();
}

// ── MFA (2FA TOTP) for managers & super_admins ──

async function postLoginFlow() {
  // Check MFA requirement for admin/manager roles
  if (S.profile && (S.profile.role === 'super_admin' || S.profile.role === 'manager')) {
    try {
      var factors = await sb.auth.mfa.listFactors();
      var totpFactors = (factors.data && factors.data.totp) ? factors.data.totp : [];
      var verified = totpFactors.filter(function(f) { return f.status === 'verified'; });

      if (verified.length > 0) {
        // User has MFA enrolled — show challenge screen
        renderMFAChallenge(verified[0].id);
        return;
      }
      // No MFA enrolled — proceed (enrollment available in profile)
    } catch (e) {
      console.warn('MFA check failed, proceeding without:', e);
    }
  }
  await initApp();
}

function renderMFAChallenge(factorId) {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="pwd-overlay" id="mfaOverlay"><div class="pwd-card">' +
    '<h2>🔐 Verification 2FA</h2>' +
    '<p>Entrez le code a 6 chiffres de votre application d\'authentification.</p>' +
    '<form onsubmit="handleMFAVerify(event,\'' + factorId + '\')">' +
    '<div class="form-group"><label class="form-label">Code TOTP</label>' +
    '<input type="text" class="form-input" id="mfaCode" required maxlength="6" pattern="[0-9]{6}" placeholder="000000" autocomplete="one-time-code" inputmode="numeric" style="text-align:center;font-size:24px;letter-spacing:8px;font-weight:800"></div>' +
    '<div id="mfaError" class="form-error"></div>' +
    '<button type="submit" class="btn btn-primary btn-block btn-lg v2-mt-8" id="mfaBtn">Verifier</button>' +
    '</form>' +
    '<button class="btn btn-ghost v2-mt-8" onclick="doLogout()" style="width:100%">Se deconnecter</button>' +
    '</div></div>'
  );
  setTimeout(function() { var el = $('mfaCode'); if (el) el.focus(); }, 100);
}

window.handleMFAVerify = async function(e, factorId) {
  e.preventDefault();
  var code = $('mfaCode').value.trim();
  var err = $('mfaError');
  var btn = $('mfaBtn');

  if (!/^\d{6}$/.test(code)) {
    err.textContent = 'Entrez un code a 6 chiffres';
    err.classList.add('show');
    return;
  }

  var origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verification...';
  err.classList.remove('show');

  try {
    var challenge = await sb.auth.mfa.challenge({ factorId: factorId });
    if (challenge.error) throw challenge.error;

    var verify = await sb.auth.mfa.verify({
      factorId: factorId,
      challengeId: challenge.data.id,
      code: code
    });
    if (verify.error) throw verify.error;

    // MFA verified — remove overlay and proceed
    var overlay = $('mfaOverlay');
    if (overlay) overlay.remove();
    await initApp();
  } catch (ex) {
    err.textContent = 'Code incorrect. Reessayez.';
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = origText;
    $('mfaCode').value = '';
    $('mfaCode').focus();
  }
};

async function changePassword(newPass) {
  var v = validatePassword(newPass);
  if (!v.valid) throw new Error(v.message);
  var r = await sb.auth.updateUser({ password: newPass });
  if (r.error) throw r.error;
  await sb.from('profiles').update({ must_change_password: false }).eq('id', S.user.id);
  S.profile.must_change_password = false;
  await initApp();
}

// Create user with auto-generated login_id and internal email
async function createUser(loginId, tempPass, fullName, role) {
  var currentSession = await sb.auth.getSession();
  var savedToken = currentSession.data.session;

  var internalEmail = loginIdToEmail(loginId);

  var r = await sb.auth.signUp({
    email: internalEmail,
    password: tempPass,
    options: { data: { full_name: fullName } }
  });
  if (r.error) throw r.error;
  var newUser = r.data.user;
  if (!newUser) throw new Error('Utilisateur non cree');

  // Restore admin session
  if (savedToken) {
    await sb.auth.setSession({ access_token: savedToken.access_token, refresh_token: savedToken.refresh_token });
  }

  // Wait for the trigger to create the profile
  await new Promise(function(resolve) { setTimeout(resolve, 1500); });

  // Set login_id and email on the profile
  await sb.from('profiles').update({
    login_id: loginId.toUpperCase(),
    email: internalEmail,
    must_change_password: true
  }).eq('id', newUser.id);

  if (role && role !== 'employee') {
    var r2 = await sb.rpc('admin_set_user_role', { p_target_user_id: newUser.id, p_new_role: role });
    if (r2.error) throw r2.error;
  }

  return newUser;
}

// Update login_id for an existing user (super_admin/manager only)
async function updateLoginId(userId, newLoginId) {
  var upper = newLoginId.toUpperCase();
  // Check uniqueness
  var existing = await sb.from('profiles').select('id').eq('login_id', upper).neq('id', userId).maybeSingle();
  if (existing.data) throw new Error('Cet identifiant est deja utilise');

  await sb.from('profiles').update({ login_id: upper }).eq('id', userId);
}

// Listen for auth state changes (session refresh, etc.)
if (sb) {
  sb.auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_OUT') {
      S.user = null;
      S.profile = null;
      S.sites = [];
      S.currentSiteId = null;
      S.siteConfig = { equipment:[], products:[], suppliers:[], modules:[] };
      S.data = { temperatures:[], dlcs:[], lots:[], orders:[], consignes:[], incident_reports:[], cleaning_schedules:[], cleaning_logs:[], consumption_logs:[] };
      S.claudeApiKey = '';
      render();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      S.user = session.user;
      resetSessionTimer();
    }
  });
}
