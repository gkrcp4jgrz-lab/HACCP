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
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet</label><input type="text" class="form-input" id="profName" value="' + esc(p.full_name||'') + '" required></div>';
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
  h += '<div class="list-item" style="cursor:pointer" onclick="navigate(\'about\')"><div class="list-icon v2-list-icon--info" style="font-size:18px">📱</div><div class="list-content"><div class="list-title">À propos de HACCP Pro</div><div class="list-sub">Version 3.0 — Arctic Frost</div></div><span class="v2-text-muted" style="font-size:18px">›</span></div>';
  h += '<div class="list-item" style="cursor:pointer" onclick="navigate(\'legal\')"><div class="list-icon v2-list-icon--info" style="font-size:18px">📜</div><div class="list-content"><div class="list-title">Mentions légales</div><div class="list-sub">RGPD, conditions d\'utilisation, conformité</div></div><span class="v2-text-muted" style="font-size:18px">›</span></div>';
  h += '</div>';

  // ── Déconnexion ──
  h += '<div class="v2-text-center v2-mt-20 v2-mb-20"><button class="btn btn-danger btn-lg" onclick="doLogout()" style="min-width:200px">Se déconnecter</button></div>';

  return h;
}

window.handleUpdateProfile = async function(e) {
  e.preventDefault();
  try {
    var updates = { full_name: $('profName').value };
    var phone = $('profPhone').value;
    if (phone !== undefined) updates.phone = phone;
    await sb.from('profiles').update(updates).eq('id', S.user.id);
    S.profile.full_name = updates.full_name;
    if (updates.phone) S.profile.phone = updates.phone;
    showToast('Profil mis a jour !', 'success');
    render();
  } catch(ex) { showToast('Erreur: ' + (ex.message||ex), 'error'); }
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
  try {
    await changePassword(p1);
    showToast('Mot de passe modifie !', 'success');
    $('profPass1').value = ''; $('profPass2').value = '';
    err.classList.remove('show');
  } catch(ex) {
    err.textContent = ex.message || 'Erreur';
    err.classList.add('show');
  }
};
