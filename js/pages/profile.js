function renderProfile() {
  var p = S.profile;
  if (!p) return '';
  var roleLabel = {super_admin:'Super Admin',manager:'Gerant',employee:'Employe'}[p.role] || p.role;
  var loginId = p.login_id || '—';

  var h = '';

  // Info profil
  h += '<div class="card"><div class="card-header">Informations personnelles</div><div class="card-body">';
  h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">';
  h += '<div style="width:64px;height:64px;border-radius:50%;background:var(--primary-light,#f0fdf4);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--brand-primary,var(--primary))">' + userInitials() + '</div>';
  h += '<div><div style="font-size:18px;font-weight:700">' + esc(p.full_name) + '</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">';
  h += '<span style="background:var(--brand-primary,var(--primary));color:#fff;padding:3px 12px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:1px">' + esc(loginId) + '</span>';
  h += '<span style="color:var(--muted);font-size:14px">' + roleLabel + '</span>';
  h += '</div></div></div>';

  h += '<form onsubmit="handleUpdateProfile(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet</label><input type="text" class="form-input" id="profName" value="' + esc(p.full_name||'') + '" required></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant <span style="font-size:11px;color:var(--muted)">(non modifiable)</span></label><input type="text" class="form-input" value="' + esc(loginId) + '" disabled style="background:var(--bg-off);letter-spacing:1px;font-weight:700"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Telephone</label><input type="tel" class="form-input" id="profPhone" value="' + esc(p.phone||'') + '" placeholder="06 12 34 56 78"></div>';
  h += '<div class="form-group"><label class="form-label">Role</label><input type="text" class="form-input" value="' + roleLabel + '" disabled style="background:var(--bg-off)"></div></div>';
  h += '<button type="submit" class="btn btn-primary">Enregistrer les modifications</button>';
  h += '</form></div></div>';

  // Changement de mot de passe
  h += '<div class="card"><div class="card-header">Changer le mot de passe</div><div class="card-body">';
  h += '<form onsubmit="handleProfilePassword(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" class="form-input" id="profPass1" required minlength="8" placeholder="8 caracteres minimum"></div>';
  h += '<div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input type="password" class="form-input" id="profPass2" required minlength="8" placeholder="Confirmez"></div></div>';
  h += '<div id="profPassError" class="form-error" style="display:none"></div>';
  h += '<button type="submit" class="btn btn-warning">Modifier le mot de passe</button>';
  h += '</form></div></div>';

  // Sites assignes
  if (S.sites.length > 0) {
    h += '<div class="card"><div class="card-header">Mes sites</div><div class="card-body">';
    S.sites.forEach(function(s) {
      var typeEmoji = {hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[s.type] || '🏢';
      h += '<div class="list-item"><div class="list-icon" style="background:var(--primary-light,#f0fdf4)">' + typeEmoji + '</div><div class="list-content"><div class="list-title">' + esc(s.name) + '</div><div class="list-sub">' + (s.address||'') + (s.city ? ', ' + s.city : '') + '</div></div></div>';
    });
    h += '</div></div>';
  }

  // Deconnexion
  h += '<div style="text-align:center;margin-top:20px"><button class="btn btn-danger" onclick="doLogout()">Se deconnecter</button></div>';

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
    err.style.display = 'block';
    return;
  }
  try {
    await changePassword(p1);
    showToast('Mot de passe modifie !', 'success');
    $('profPass1').value = ''; $('profPass2').value = '';
    err.style.display = 'none';
  } catch(ex) {
    err.textContent = ex.message || 'Erreur';
    err.style.display = 'block';
  }
};
