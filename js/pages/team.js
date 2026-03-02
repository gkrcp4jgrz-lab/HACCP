function renderTeam() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">' + IC.shield + '</div><div class="empty-title">Accès réservé aux gérants</div></div></div></div>';
  }

  var site = currentSite();
  if (!site) return '<div class="card"><div class="card-body">Aucun site sélectionné.</div></div>';

  var h = '';

  // Create employee form
  h += '<div class="card card-accent"><div class="card-header"><span class="v2-icon-wrap v2-icon-wrap--teal">' + IC.userPlus + '</span> Ajouter un membre à ' + esc(site.name) + '</div><div class="card-body"><form onsubmit="handleTeamAddUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="teamName" required placeholder="Jean Renard" oninput="previewTeamLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="teamLoginPreview">—</div></div></div>';
  if (!S._teamTempPass) S._teamTempPass = generateTempPassword();
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="password" class="form-input" id="teamPass" required value="' + S._teamTempPass + '"><button type="button" class="btn btn-ghost btn-sm v2-mt-4" onclick="S._teamTempPass=generateTempPassword();$(\'teamPass\').value=S._teamTempPass">Régénérer</button></div>';
  h += '<div class="form-group"><label class="form-label">Rôle</label><select class="form-select" id="teamRole"><option value="employee">Employé</option><option value="manager">Gérant</option></select></div></div>';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera généré automatiquement. Communiquez l\'identifiant et le mot de passe à l\'employé.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" id="teamAddBtn">Ajouter au site</button></form></div></div>';

  // Team list
  h += '<div class="card"><div class="card-header"><span class="v2-icon-wrap v2-icon-wrap--primary">' + IC.users + '</span> Équipe de ' + esc(site.name) + '</div>';
  h += '<div id="teamListContainer"><div class="card-body"><div class="v2-loading-inline"><div class="loading" style="width:28px;height:28px;border-width:3px"></div></div></div></div></div>';

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

  // Fallback: load all profiles in case relation fails
  var profileMap = {};
  if (siteUsers.length > 0) {
    var allProfiles = await loadAllUsers();
    allProfiles.forEach(function(u) { profileMap[u.id] = u; });
  }

  var html = '';

  if (siteUsers.length === 0) {
    html = '<div class="card-body"><div class="empty"><div class="empty-icon">' + IC.users + '</div><div class="empty-title">Aucun membre</div><div class="empty-text">Ajoutez des employés avec le formulaire ci-dessus.</div></div></div>';
  } else {
    siteUsers.forEach(function(us) {
      var p = us.profiles || profileMap[us.user_id];
      if (!p) return;
      var siteRoleLabel = {admin:'Admin',manager:'Gérant',employee:'Employé'}[us.site_role] || us.site_role;
      var loginId = p.login_id || '—';
      var isSelf = S.user && S.user.id === p.id;

      html += '<div class="list-item" style="flex-wrap:wrap;gap:10px">';
      html += '<div class="list-icon v2-list-icon--info">' + IC.user + '</div>';
      html += '<div class="list-content" style="min-width:140px">';
      html += '<div class="list-title">' + esc(p.full_name||'—') + '</div>';
      html += '<div class="list-sub"><span class="v2-login-badge" style="font-size:11px">' + esc(loginId) + '</span>';
      if (isManager()) {
        html += ' <button onclick="handleEditLoginId(\'' + p.id + '\',\'' + esc(loginId) + '\')" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--af-teal)">modifier</button>';
      }
      html += '</div>';
      if (p.phone) html += '<div class="list-sub">' + esc(p.phone) + '</div>';
      html += '</div>';

      // Role select
      html += '<div class="v2-flex v2-gap-6 v2-items-center">';
      html += '<select onchange="handleTeamRoleChange(\'' + p.id + '\',this.value)" class="form-select" style="padding:4px 8px;min-height:32px;font-size:12px;width:auto">';
      html += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employé</option>';
      html += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gérant</option>';
      if (isSuperAdmin()) html += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>Admin</option>';
      html += '</select>';

      if (isSelf) {
        html += '<span class="badge badge-blue">Vous</span>';
      } else {
        html += '<button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="handleTeamRemove(\'' + p.id + '\')" title="Retirer">' + IC.userX + '</button>';
      }
      html += '</div></div>';
    });
  }

  container.innerHTML = html;
}

window.handleTeamAddUser = async function(e) {
  e.preventDefault();
  var btn = $('teamAddBtn');
  var origText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Création...';

  try {
    var name = $('teamName').value;
    var pass = $('teamPass').value;
    var siteRole = $('teamRole').value;

    var loginId = await generateUniqueLoginId(name);
    var user = await createUser(loginId, pass, name, 'employee');
    if (!user) throw new Error('Utilisateur non créé');

    await assignUserToSite(user.id, S.currentSiteId, siteRole);

    showToast('Membre ajouté — ID : ' + loginId, 'success', 5000);
    openModal('<div class="modal-header"><div class="modal-title">' + IC.check + ' Membre ajouté</div><button class="modal-close" onclick="closeModal()">' + IC.x + '</button></div><div class="modal-body"><div class="v2-text-center v2-mb-18"><div style="width:64px;height:64px;background:var(--af-ok-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--af-ok);margin:0 auto"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div></div><p class="v2-text-md v2-font-600 v2-mb-14">Communiquez ces informations à l\'employé :</p><div style="padding:16px;background:var(--bg-off);border-radius:var(--radius-sm);margin-bottom:12px"><div class="v2-text-sm v2-text-muted v2-mb-4">Identifiant</div><div class="v2-text-xl v2-font-800 v2-font-mono" style="letter-spacing:2px;color:var(--af-teal)">' + esc(loginId) + '</div></div><div style="padding:16px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-sm v2-text-muted v2-mb-4">Mot de passe (cliquez pour copier)</div><input type="text" readonly value="' + esc(pass) + '" style="width:100%;border:none;background:transparent;font-size:18px;font-weight:800;text-align:center;cursor:pointer" onclick="navigator.clipboard.writeText(this.value);showToast(\'Copié !\',\'success\',1500)"></div></div><div class="modal-footer"><button class="btn btn-primary btn-lg" onclick="closeModal()">Compris</button></div>');
    $('teamName').value = ''; S._teamTempPass = generateTempPassword(); $('teamPass').value = S._teamTempPass;
    if ($('teamLoginPreview')) $('teamLoginPreview').textContent = '—';
    loadAndRenderTeam();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
  btn.disabled = false; btn.innerHTML = origText;
};

window.handleTeamRoleChange = async function(userId, newRole) {
  try {
    await assignUserToSite(userId, S.currentSiteId, newRole);
    showToast('Rôle modifié', 'success');
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.handleTeamRemove = async function(userId) {
  if (!(await appConfirm('Retirer du site', 'Retirer cet utilisateur du site ?<br>Il ne pourra plus y accéder.', {danger:true,icon:IC.userX,confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, S.currentSiteId);
    showToast('Utilisateur retiré du site', 'success');
    loadAndRenderTeam();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
