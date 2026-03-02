function renderUserManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Acces Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create user form
  h += '<div class="card"><div class="card-header" style="cursor:pointer" onclick="var el=document.getElementById(\'newUserForm\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">➕ Créer un utilisateur <span style="float:right;font-size:12px;color:var(--gray)">▼</span></div><div class="card-body" id="newUserForm" style="display:none"><form onsubmit="handleCreateUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="nuName" required placeholder="Jean Renard" oninput="previewLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="nuLoginPreview">—</div></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="password" class="form-input" id="nuPass" required value="' + generateTempPassword() + '"><button type="button" class="btn btn-ghost btn-sm v2-mt-4" onclick="$(\'nuPass\').value=generateTempPassword()">Regénérer</button></div>';
  h += '<div class="form-group"><label class="form-label">Assigner a un site</label><select class="form-select" id="nuSite"><option value="">— Aucun site —</option>';
  S.sites.forEach(function(s) { h += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; });
  h += '</select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Rôle sur le site</label><select class="form-select" id="nuSiteRole"><option value="employee">Employé</option><option value="manager">Gérant</option></select></div></div>';
  h += '<input type="hidden" id="nuRole" value="employee">';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera généré automatiquement (initiales + code). Communiquez l\'identifiant et le mot de passe provisoire a l\'employé.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg">Créer l\'utilisateur</button></form></div></div>';

  // User list
  h += '<div class="card"><div class="card-header">👥 Tous les utilisateurs</div><div class="card-body" id="userListContainer"><div class="v2-loading-inline"><div class="loading"></div></div></div></div>';

  setTimeout(function() { loadAndDisplayUsersDetailed(); }, 50);

  return h;
}

// Preview login_id as user types name
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
    html = '<div class="empty"><div class="empty-title">Aucun utilisateur</div></div>';
  } else {
    users.forEach(function(u) {
      var roleIcon = {super_admin:'👑',manager:'👔',employee:'👷'}[u.role] || '👤';
      var userSites = allAssignments.filter(function(a){return a.user_id===u.id;});
      var loginId = u.login_id || '—';
      var isSelf = S.user && S.user.id === u.id;

      html += '<div class="v2-user-card">';
      html += '<div class="v2-flex v2-justify-between v2-items-center v2-flex-wrap v2-gap-8">';
      html += '<div>';
      html += '<strong>' + roleIcon + ' ' + esc(u.full_name||'—') + '</strong>';
      html += '<span class="v2-login-badge">' + esc(loginId) + '</span>';
      html += '</div>';
      html += '<div class="v2-flex v2-gap-6 v2-items-center">';

      // Edit login ID
      html += '<button class="btn btn-ghost btn-sm" onclick="handleEditLoginId(\'' + u.id + '\',\'' + esc(loginId) + '\')" title="Modifier identifiant" style="font-size:12px">ID</button>';

      // Reset password
      html += '<button class="btn btn-ghost btn-sm" onclick="handleResetUserPassword(\'' + u.id + '\')" title="Réinitialiser mot de passe" style="font-size:12px">🔑</button>';

      // Delete (only for non-self, non-super_admin users)
      if (!isSelf && u.role !== 'super_admin') {
        html += '<button class="btn btn-danger btn-sm" onclick="handleDeleteUser(\'' + u.id + '\',\'' + esc(u.full_name||u.email) + '\')" title="Supprimer" style="font-size:12px;padding:3px 8px">🗑️</button>';
      }
      html += '</div></div>';

      // Sites + role on each site
      if (userSites.length > 0) {
        html += '<div class="v2-flex v2-flex-wrap v2-gap-6 v2-mt-10">';
        userSites.forEach(function(us) {
          var siteRoleLabel = {admin:'Admin',manager:'Gérant',employee:'Employé'}[us.site_role]||us.site_role;
          var siteRoleIcon = {admin:'🔑',manager:'👔',employee:'👷'}[us.site_role]||'';
          html += '<span class="badge badge-blue" style="font-size:12px">' + siteRoleIcon + ' ' + esc(us.sites?us.sites.name:'?') + ' (' + siteRoleLabel + ') <button onclick="removeSiteAccessFromUserList(\'' + u.id + '\',\'' + us.site_id + '\')" style="background:none;border:none;cursor:pointer;color:var(--err,#ef4444);font-weight:bold;margin-left:4px">✕</button></span>';
        });
        html += '</div>';
      } else {
        html += '<div class="v2-mt-8 v2-text-sm v2-text-muted">Aucun site assigné</div>';
      }
      html += '</div>';
    });
  }
  container.innerHTML = html;
}

// Delete user (remove from all sites + delete profile)
window.handleDeleteUser = async function(userId, userName) {
  if (!(await appConfirm('Supprimer l\'utilisateur', 'Supprimer <strong>' + userName + '</strong> ? L\'utilisateur sera retiré de tous les sites et son profil sera supprimé.', {danger:true,icon:'🗑️',confirmLabel:'Supprimer'}))) return;

  try {
    // 1. Remove from all sites
    var r1 = await sb.from('user_sites').delete().eq('user_id', userId);
    if (r1.error) throw r1.error;

    // 2. Delete profile
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
    showToast('Role modifie !', 'success');
    loadAndDisplayUsersDetailed();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.removeSiteAccessFromUserList = async function(userId, siteId) {
  if (!(await appConfirm('Retirer l\'accès', 'Retirer l\'accès de cet utilisateur à ce site ?', {danger:true,icon:'👤',confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, siteId);
    showToast('Accès retiré', 'success');
    loadAndDisplayUsersDetailed();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

async function loadAndDisplayUsers() { loadAndDisplayUsersDetailed(); }
