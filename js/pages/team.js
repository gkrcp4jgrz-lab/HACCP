function renderTeam() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Acces reserve aux gerants</div></div></div></div>';
  }

  var site = currentSite();
  if (!site) return '<div class="card"><div class="card-body">Aucun site selectionne.</div></div>';

  var h = '';

  // Create employee form
  h += '<div class="card"><div class="card-header">Ajouter un membre a ' + esc(site.name) + '</div><div class="card-body"><form onsubmit="handleTeamAddUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="teamName" required placeholder="Jean Renard" oninput="previewTeamLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="teamLoginPreview">—</div></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="text" class="form-input" id="teamPass" required value="Haccp2026!"></div>';
  h += '<div class="form-group"><label class="form-label">Role sur le site</label><select class="form-select" id="teamRole"><option value="employee">Employe</option><option value="manager">Gerant</option></select></div></div>';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera genere automatiquement. Communiquez l\'identifiant et le mot de passe a l\'employe pour qu\'il puisse se connecter.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" id="teamAddBtn">Ajouter au site</button></form></div></div>';

  // Team list
  h += '<div class="card"><div class="card-header">Equipe de ' + esc(site.name) + '</div><div class="card-body" id="teamListContainer"><div class="v2-loading-inline"><div class="loading"></div></div></div></div>';

  setTimeout(function() { loadAndRenderTeam(); }, 50);

  return h;
}

// Preview login_id in team form
window.previewTeamLoginId = function(name) {
  var el = $('teamLoginPreview');
  if (!el) return;
  if (!name || name.trim().length < 2) { el.textContent = '—'; return; }
  var initials = getLoginIdInitials(name);
  el.textContent = initials + '****';
};

async function loadAndRenderTeam() {
  var container = $('teamListContainer');
  if (!container) return;

  var siteUsers = await loadSiteUsers(S.currentSiteId);
  var html = '';

  if (siteUsers.length === 0) {
    html = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">Aucun membre</div><div class="empty-text">Ajoutez des employes avec le formulaire ci-dessus.</div></div>';
  } else {
    html = '<table class="data-table"><thead><tr><th>Nom</th><th>Identifiant</th><th>Telephone</th><th>Role global</th><th>Role site</th><th>Actions</th></tr></thead><tbody>';
    siteUsers.forEach(function(us) {
      var p = us.profiles;
      if (!p) return;
      var globalRole = {super_admin:'Super Admin',manager:'Gerant',employee:'Employe'}[p.role] || p.role;
      var loginId = p.login_id || '—';
      html += '<tr>';
      html += '<td><strong>' + esc(p.full_name||'—') + '</strong></td>';
      html += '<td><span class="v2-login-badge v2-text-xs">' + esc(loginId) + '</span>';
      if (isManager()) {
        html += ' <button onclick="handleEditLoginId(\'' + p.id + '\',\'' + esc(loginId) + '\')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--brand-primary,var(--primary))">modifier</button>';
      }
      html += '</td>';
      html += '<td style="font-size:12px">' + esc(p.phone||'—') + '</td>';
      html += '<td>' + globalRole + '</td>';
      html += '<td><select onchange="handleTeamRoleChange(\'' + p.id + '\',this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border,#ddd);font-size:13px">';
      html += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employe</option>';
      html += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gerant</option>';
      if (isSuperAdmin()) html += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>Admin</option>';
      html += '</select></td>';
      html += '<td>';
      if (p.id !== S.user.id) {
        html += '<button class="btn btn-danger btn-sm" onclick="handleTeamRemove(\'' + p.id + '\')">Retirer</button>';
      } else {
        html += '<span class="badge badge-blue">Vous</span>';
      }
      html += '</td></tr>';
    });
    html += '</tbody></table>';
  }

  container.innerHTML = html;
}

window.handleTeamAddUser = async function(e) {
  e.preventDefault();
  var btn = $('teamAddBtn');
  var origText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Creation...';

  try {
    var name = $('teamName').value;
    var pass = $('teamPass').value;
    var siteRole = $('teamRole').value;

    // Auto-generate login_id
    var loginId = await generateUniqueLoginId(name);

    // Create the user account
    var currentSession = await sb.auth.getSession();
    var savedToken = currentSession.data.session;

    var internalEmail = loginIdToEmail(loginId);
    var r = await sb.auth.signUp({
      email: internalEmail,
      password: pass,
      options: { data: { full_name: name } }
    });
    if (r.error) throw r.error;
    var userId = r.data.user ? r.data.user.id : null;
    if (!userId) throw new Error('Utilisateur non cree');

    // Restore manager session
    if (savedToken) {
      await sb.auth.setSession({ access_token: savedToken.access_token, refresh_token: savedToken.refresh_token });
    }

    // Wait for trigger
    await new Promise(function(resolve) { setTimeout(resolve, 1500); });

    // Set profile fields
    await sb.from('profiles').update({
      login_id: loginId.toUpperCase(),
      email: internalEmail,
      full_name: name,
      must_change_password: true
    }).eq('id', userId);

    // Assign to site
    await assignUserToSite(userId, S.currentSiteId, siteRole);

    alert('Membre ajoute !\nIdentifiant : ' + loginId + '\nMot de passe : ' + pass + '\n\nCommuniquez ces informations a l\'employe.');
    $('teamName').value = ''; $('teamPass').value = 'Haccp2026!';
    if ($('teamLoginPreview')) $('teamLoginPreview').textContent = '—';
    loadAndRenderTeam();
  } catch(ex) {
    alert('Erreur: ' + (ex.message || ex));
  }
  btn.disabled = false; btn.innerHTML = origText;
};

window.handleTeamRoleChange = async function(userId, newRole) {
  try {
    await assignUserToSite(userId, S.currentSiteId, newRole);
    showToast('Role modifie !', 'success');
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.handleTeamRemove = async function(userId) {
  if (!confirm('Retirer cet utilisateur du site ? Il ne pourra plus y acceder.')) return;
  try {
    await removeUserFromSite(userId, S.currentSiteId);
    showToast('Utilisateur retire du site', 'success');
    loadAndRenderTeam();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
