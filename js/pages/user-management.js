function renderUserManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">' + IC.shield + '</div><div class="empty-title">Accès Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create user form (collapsible)
  h += '<div class="card"><div class="card-header" style="cursor:pointer" onclick="var el=document.getElementById(\'newUserForm\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">';
  h += '<span class="v2-icon-wrap v2-icon-wrap--teal">' + IC.userPlus + '</span> Créer un utilisateur</div>';
  h += '<div class="card-body" id="newUserForm" style="display:none"><form onsubmit="handleCreateUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="nuName" required placeholder="Jean Renard" oninput="previewLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="nuLoginPreview">—</div></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="password" class="form-input" id="nuPass" required value="' + generateTempPassword() + '"><button type="button" class="btn btn-ghost btn-sm v2-mt-4" onclick="$(\'nuPass\').value=generateTempPassword()">Regénérer</button></div>';
  h += '<div class="form-group"><label class="form-label">Assigner à un site</label><select class="form-select" id="nuSite"><option value="">— Aucun site —</option>';
  S.sites.forEach(function(s) { h += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; });
  h += '</select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Rôle sur le site</label><select class="form-select" id="nuSiteRole"><option value="employee">Employé</option><option value="manager">Gérant</option></select></div></div>';
  h += '<input type="hidden" id="nuRole" value="employee">';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera généré automatiquement. Communiquez-le avec le mot de passe provisoire à l\'employé.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg">Créer l\'utilisateur</button></form></div></div>';

  // User list
  h += '<div class="card"><div class="card-header"><span class="v2-icon-wrap v2-icon-wrap--primary">' + IC.users + '</span> Tous les utilisateurs</div>';
  h += '<div id="userListContainer"><div class="card-body"><div class="v2-loading-inline"><div class="loading"></div></div></div></div></div>';

  setTimeout(function() { loadAndDisplayUsersDetailed(); }, 50);

  return h;
}

window.previewLoginId = function(name) {
  var el = $('nuLoginPreview');
  if (!el) return;
  if (!name || name.trim().length < 2) { el.textContent = '—'; return; }
  var initials = getLoginIdInitials(name);
  el.textContent = initials + '****';
};

async function loadAndDisplayUsersDetailed() {
  var container = $('userListContainer');
  if (!container) return;

  var users = await loadAllUsers();
  var allAssignments = [];
  try {
    var r = await sb.from('user_sites').select('*, sites(name)');
    allAssignments = r.data || [];
  } catch(e) { console.error(e); }

  var html = '';
  if (users.length === 0) {
    html = '<div class="card-body"><div class="empty"><div class="empty-icon">' + IC.users + '</div><div class="empty-title">Aucun utilisateur</div></div></div>';
  } else {
    users.forEach(function(u) {
      var userSites = allAssignments.filter(function(a){return a.user_id===u.id;});
      var loginId = u.login_id || '—';
      var isSelf = S.user && S.user.id === u.id;
      var isAdmin = u.role === 'super_admin';

      html += '<div class="list-item" style="flex-wrap:wrap;gap:10px">';
      html += '<div class="list-icon ' + (isAdmin ? 'v2-list-icon--warning' : 'v2-list-icon--info') + '">' + (isAdmin ? IC.shield : IC.user) + '</div>';
      html += '<div class="list-content" style="min-width:140px">';
      html += '<div class="list-title">' + esc(u.full_name||'—') + '</div>';
      html += '<div class="list-sub"><span class="v2-login-badge" style="font-size:11px">' + esc(loginId) + '</span>';
      if (isAdmin) html += ' <span class="badge badge-yellow" style="font-size:10px">Admin</span>';
      html += '</div>';

      // Sites badges
      if (userSites.length > 0) {
        html += '<div class="v2-flex v2-flex-wrap v2-gap-4" style="margin-top:6px">';
        userSites.forEach(function(us) {
          var siteRoleLabel = {admin:'Admin',manager:'Gérant',employee:'Employé'}[us.site_role]||us.site_role;
          html += '<span class="badge badge-blue" style="font-size:11px;gap:2px">' + esc(us.sites?us.sites.name:'?') + ' · ' + siteRoleLabel;
          html += ' <button onclick="removeSiteAccessFromUserList(\'' + u.id + '\',\'' + us.site_id + '\')" class="v2-badge-x" title="Retirer du site">' + IC.x + '</button></span>';
        });
        html += '</div>';
      } else {
        html += '<div style="margin-top:4px;font-size:12px;color:var(--ink-muted)">Aucun site assigné</div>';
      }
      html += '</div>';

      // Actions
      html += '<div class="list-actions" style="gap:4px">';
      html += '<button class="btn btn-ghost btn-sm v2-icon-btn" onclick="handleEditLoginId(\'' + u.id + '\',\'' + esc(loginId) + '\')" title="Modifier identifiant">' + IC.edit + '</button>';
      html += '<button class="btn btn-ghost btn-sm v2-icon-btn" onclick="handleResetUserPassword(\'' + u.id + '\')" title="Réinitialiser mot de passe">' + IC.key + '</button>';
      if (!isSelf && !isAdmin) {
        html += '<button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="handleDeleteUser(\'' + u.id + '\',\'' + esc(u.full_name||u.email) + '\')" title="Supprimer">' + IC.trash + '</button>';
      }
      html += '</div></div>';
    });
  }
  container.innerHTML = html;
}

window.handleDeleteUser = async function(userId, userName) {
  if (!(await appConfirm('Supprimer l\'utilisateur', 'Supprimer <strong>' + userName + '</strong> ? L\'utilisateur sera retiré de tous les sites et son profil sera supprimé.', {danger:true,icon:IC.trash,confirmLabel:'Supprimer'}))) return;
  try {
    var r1 = await sb.from('user_sites').delete().eq('user_id', userId);
    if (r1.error) throw r1.error;
    var r2 = await sb.from('profiles').delete().eq('id', userId);
    if (r2.error) throw r2.error;
    showToast('Utilisateur supprimé', 'success');
    loadAndDisplayUsersDetailed();
  } catch(e) {
    showToast('Erreur: ' + (e.message||e), 'error');
  }
};

window.changeGlobalRole = async function(userId, newRole) {
  try {
    await updateUserRole(userId, newRole);
    showToast('Rôle modifié', 'success');
    loadAndDisplayUsersDetailed();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.removeSiteAccessFromUserList = async function(userId, siteId) {
  if (!(await appConfirm('Retirer l\'accès', 'Retirer l\'accès de cet utilisateur à ce site ?', {danger:true,icon:IC.userX,confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, siteId);
    showToast('Accès retiré', 'success');
    loadAndDisplayUsersDetailed();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

async function loadAndDisplayUsers() { loadAndDisplayUsersDetailed(); }
