function renderProfile() {
  var p = S.profile;
  if (!p) return '';
  var roleLabel = {super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[p.role] || p.role;
  var roleColor = {super_admin:'var(--af-err)',manager:'var(--af-teal)',employee:'var(--af-info)'}[p.role] || 'var(--ink-muted)';
  var loginId = p.login_id || '—';

  var h = '';

  // ── Apple ID-style hero card ──
  h += '<div class="card card-accent"><div class="card-body" style="padding:32px;text-align:center">';
  h += '<div style="width:80px;height:80px;border-radius:50%;background:var(--af-gradient);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;margin:0 auto 16px;box-shadow:var(--shadow-teal-lg)">' + userInitials() + '</div>';
  h += '<div class="v2-text-3xl v2-font-800" style="letter-spacing:-.3px">' + esc(p.full_name) + '</div>';
  h += '<div class="v2-flex v2-items-center v2-gap-10 v2-mt-8" style="justify-content:center">';
  h += '<span class="v2-login-badge">' + esc(loginId) + '</span>';
  h += '<span class="badge" style="background:' + roleColor + ';color:#fff;border:none">' + roleLabel + '</span>';
  h += '</div>';
  if (p.phone) h += '<div class="v2-text-sm v2-text-muted v2-mt-8">📞 ' + esc(p.phone) + '</div>';
  h += '</div></div>';

  // ── Informations personnelles ──
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">👤</span> Informations personnelles</div><div class="card-body">';
  h += '<form onsubmit="handleUpdateProfile(event)">';
  var nameDisabled = p.role === 'employee' ? ' disabled style="background:var(--bg-off)"' : '';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet' + (p.role === 'employee' ? ' <span class="v2-text-xs v2-text-muted">(modifiable par le gérant)</span>' : '') + '</label><input type="text" class="form-input" id="profName" value="' + esc(p.full_name||'') + '" required' + nameDisabled + '></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant <span class="v2-text-xs v2-text-muted">(non modifiable)</span></label><input type="text" class="form-input" value="' + esc(loginId) + '" disabled style="background:var(--bg-off);letter-spacing:1.5px;font-weight:700;font-family:\'SF Mono\',\'Fira Code\',monospace"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="profPhone" value="' + esc(p.phone||'') + '" placeholder="06 12 34 56 78"></div>';
  h += '<div class="form-group"><label class="form-label">Rôle</label><input type="text" class="form-input" value="' + roleLabel + '" disabled style="background:var(--bg-off)"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg v2-mt-4">Enregistrer les modifications</button>';
  h += '</form></div></div>';

  // ── Sécurité ──
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">🔐</span> Sécurité</div><div class="card-body">';
  h += '<form onsubmit="handleProfilePassword(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" class="form-input" id="profPass1" required minlength="8" placeholder="8 caractères minimum"></div>';
  h += '<div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input type="password" class="form-input" id="profPass2" required minlength="8" placeholder="Confirmez"></div></div>';
  h += '<div id="profPassError" class="form-error"></div>';
  h += '<button type="submit" class="btn btn-warning btn-lg v2-mt-4">Modifier le mot de passe</button>';
  h += '</form></div></div>';

  // ── 2FA (manager/super_admin uniquement) ──
  if (p.role === 'super_admin' || p.role === 'manager') {
    h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">🛡️</span> Authentification a deux facteurs (2FA)</div><div class="card-body">';
    h += '<div id="mfa2FASection"><div style="text-align:center;padding:12px"><div class="loading"></div></div></div>';
    h += '</div></div>';
  }

  // ── Sites assignés ──
  if (S.sites.length > 0) {
    h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">🏢</span> Mes sites <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + S.sites.length + '</span></div>';
    S.sites.forEach(function(s) {
      var typeEmoji = {hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[s.type] || '🏢';
      var isActive = s.id === S.currentSiteId;
      h += '<div class="list-item' + (isActive ? ' v2-list-item--border-left-ok' : '') + '" style="cursor:pointer" onclick="switchSite(\'' + s.id + '\');navigate(\'dashboard\')">';
      h += '<div class="list-icon v2-list-icon--primary">' + typeEmoji + '</div>';
      h += '<div class="list-content"><div class="list-title">' + esc(s.name) + (isActive ? ' <span class="badge badge-green" style="font-size:10px">Actif</span>' : '') + '</div>';
      h += '<div class="list-sub">' + (s.address||'') + (s.city ? ', ' + s.city : '') + '</div></div>';
      h += '<span class="v2-text-muted" style="font-size:18px">›</span></div>';
    });
    h += '</div>';
  }

  // ── Apparence ──
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">' + (isDark ? '☀️' : '🌙') + '</span> Apparence</div><div class="card-body">';
  h += '<div class="v2-flex v2-items-center v2-justify-between">';
  h += '<div><div class="v2-text-md v2-font-700">Mode sombre</div><div class="v2-text-sm v2-text-muted v2-mt-2">Adapte l\'interface pour un confort visuel optimal</div></div>';
  h += '<label class="toggle"><input type="checkbox" ' + (isDark ? 'checked' : '') + ' onchange="toggleDarkMode()"><span class="toggle-slider"></span></label>';
  h += '</div></div></div>';

  // ── Informations & Légal ──
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">ℹ️</span> Informations</div>';
  h += '<div class="list-item" style="cursor:pointer" onclick="navigate(\'about\')"><div class="list-icon v2-list-icon--info" style="font-size:18px">📱</div><div class="list-content"><div class="list-title">À propos de CONI</div><div class="list-sub">Version 3.0 — Arctic Frost</div></div><span class="v2-text-muted" style="font-size:18px">›</span></div>';
  h += '<div class="list-item" style="cursor:pointer" onclick="navigate(\'legal\')"><div class="list-icon v2-list-icon--info" style="font-size:18px">📜</div><div class="list-content"><div class="list-title">Mentions légales</div><div class="list-sub">RGPD, conditions d\'utilisation, conformité</div></div><span class="v2-text-muted" style="font-size:18px">›</span></div>';
  h += '</div>';

  // ── Déconnexion ──
  h += '<div class="v2-text-center v2-mt-20 v2-mb-20"><button class="btn btn-danger btn-lg" onclick="doLogout()" style="min-width:200px">Se déconnecter</button></div>';

  return h;
}

window.handleUpdateProfile = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    var updates = {};
    // Employees cannot change their own name
    if (S.profile.role !== 'employee') {
      updates.full_name = $('profName').value;
    }
    var phone = $('profPhone') ? $('profPhone').value : '';
    updates.phone = phone || '';
    var r = await sb.from('profiles').update(updates).eq('id', S.user.id);
    if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); return; }
    if (updates.full_name) S.profile.full_name = updates.full_name;
    S.profile.phone = updates.phone;
    showToast('Profil mis à jour', 'success');
    render();
  });
};

// ── 2FA Management ──

window.loadMFA2FASection = async function() {
  var container = $('mfa2FASection');
  if (!container) return;

  try {
    var factors = await sb.auth.mfa.listFactors();
    var totpFactors = (factors.data && factors.data.totp) ? factors.data.totp : [];
    var verified = totpFactors.filter(function(f) { return f.status === 'verified'; });
    var unverified = totpFactors.filter(function(f) { return f.status === 'unverified'; });

    var h = '';
    if (verified.length > 0) {
      // 2FA is enabled
      h += '<div class="v2-flex v2-items-center v2-justify-between v2-mb-14">';
      h += '<div><div class="v2-text-md v2-font-700" style="color:var(--ok,#16a34a)">2FA active</div>';
      h += '<div class="v2-text-sm v2-text-muted v2-mt-2">Votre compte est protege par l\'authentification TOTP.</div></div>';
      h += '<span class="badge badge-green" style="font-size:12px;padding:6px 14px">Active</span>';
      h += '</div>';
      h += '<button class="btn btn-danger" onclick="disableMFA(\'' + verified[0].id + '\')">Desactiver la 2FA</button>';
    } else {
      // 2FA not enabled
      h += '<div class="v2-mb-14">';
      h += '<div class="v2-text-md v2-font-700">Protegez votre compte</div>';
      h += '<div class="v2-text-sm v2-text-muted v2-mt-2">Ajoutez une couche de securite supplementaire avec une application d\'authentification (Google Authenticator, Authy, etc.)</div>';
      h += '</div>';
      h += '<button class="btn btn-primary btn-lg" onclick="startMFAEnrollment()">Activer la 2FA</button>';
    }
    container.innerHTML = h;
  } catch (e) {
    container.innerHTML = '<div class="v2-text-sm v2-text-muted">2FA non disponible.</div>';
    console.error('MFA load error:', e);
  }
};

window.startMFAEnrollment = async function() {
  var container = $('mfa2FASection');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:12px"><div class="loading"></div><div class="v2-text-sm v2-text-muted v2-mt-8">Generation du QR code...</div></div>';

  try {
    var enroll = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CONI HACCP' });
    if (enroll.error) throw enroll.error;

    var factorId = enroll.data.id;
    var qrCode = enroll.data.totp.qr_code;
    var secret = enroll.data.totp.secret;

    var h = '';
    h += '<div style="text-align:center;margin-bottom:16px">';
    h += '<p class="v2-text-md v2-font-700 v2-mb-8">1. Scannez ce QR code</p>';
    h += '<p class="v2-text-sm v2-text-muted v2-mb-14">Ouvrez Google Authenticator ou Authy et scannez ce code.</p>';
    h += '<div style="display:inline-block;padding:16px;background:#fff;border-radius:12px;border:2px solid var(--border)">';
    h += '<img src="' + qrCode + '" alt="QR Code 2FA" style="width:200px;height:200px;display:block">';
    h += '</div>';
    h += '<div class="v2-mt-8"><div class="v2-text-xs v2-text-muted">Cle manuelle :</div>';
    h += '<code style="font-size:12px;background:var(--bg-off);padding:4px 10px;border-radius:6px;letter-spacing:2px;user-select:all">' + esc(secret) + '</code></div>';
    h += '</div>';

    h += '<div style="margin-top:16px">';
    h += '<p class="v2-text-md v2-font-700 v2-mb-8">2. Entrez le code de verification</p>';
    h += '<form onsubmit="verifyMFAEnrollment(event,\'' + factorId + '\')">';
    h += '<div class="form-group"><input type="text" class="form-input" id="mfaEnrollCode" maxlength="6" pattern="[0-9]{6}" placeholder="000000" autocomplete="one-time-code" inputmode="numeric" style="text-align:center;font-size:20px;letter-spacing:6px;font-weight:700;max-width:200px;margin:0 auto;display:block"></div>';
    h += '<div id="mfaEnrollError" class="form-error"></div>';
    h += '<div class="v2-flex v2-gap-8 v2-justify-center">';
    h += '<button type="submit" class="btn btn-primary btn-lg">Verifier et activer</button>';
    h += '<button type="button" class="btn btn-ghost" onclick="cancelMFAEnrollment(\'' + factorId + '\')">Annuler</button>';
    h += '</div></form></div>';

    container.innerHTML = h;
    setTimeout(function() { var el = $('mfaEnrollCode'); if (el) el.focus(); }, 100);
  } catch (e) {
    container.innerHTML = '<div class="v2-text-sm" style="color:var(--err)">Erreur : ' + esc(e.message) + '</div>';
    console.error('MFA enroll error:', e);
  }
};

window.verifyMFAEnrollment = async function(e, factorId) {
  e.preventDefault();
  var code = $('mfaEnrollCode').value.trim();
  var err = $('mfaEnrollError');

  if (!/^\d{6}$/.test(code)) {
    err.textContent = 'Entrez un code a 6 chiffres';
    err.classList.add('show');
    return;
  }

  try {
    var challenge = await sb.auth.mfa.challenge({ factorId: factorId });
    if (challenge.error) throw challenge.error;

    var verify = await sb.auth.mfa.verify({
      factorId: factorId,
      challengeId: challenge.data.id,
      code: code
    });
    if (verify.error) throw verify.error;

    showToast('2FA activee avec succes !', 'success');
    loadMFA2FASection();
  } catch (ex) {
    err.textContent = 'Code incorrect. Reessayez avec un nouveau code.';
    err.classList.add('show');
    $('mfaEnrollCode').value = '';
    $('mfaEnrollCode').focus();
  }
};

window.cancelMFAEnrollment = async function(factorId) {
  try {
    await sb.auth.mfa.unenroll({ factorId: factorId });
  } catch (e) { /* ignore */ }
  loadMFA2FASection();
};

window.disableMFA = async function(factorId) {
  if (!confirm('Desactiver la 2FA ? Votre compte sera moins securise.')) return;
  try {
    var r = await sb.auth.mfa.unenroll({ factorId: factorId });
    if (r.error) throw r.error;
    showToast('2FA desactivee', 'warning');
    loadMFA2FASection();
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
  }
};

window.handleProfilePassword = async function(e) {
  e.preventDefault();
  var p1 = $('profPass1').value, p2 = $('profPass2').value;
  var err = $('profPassError');
  if (p1 !== p2) {
    err.textContent = 'Les mots de passe ne correspondent pas';
    err.classList.add('show');
    return;
  }
  var v = validatePassword(p1);
  if (!v.valid) { err.textContent = v.message; err.classList.add('show'); return; }
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await changePassword(p1);
    showToast('Mot de passe modifié', 'success');
    $('profPass1').value = ''; $('profPass2').value = '';
    err.classList.remove('show');
  });
};
