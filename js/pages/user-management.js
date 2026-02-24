function renderUserManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Acces Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create user form
  h += '<div class="card"><div class="card-header">Creer un utilisateur</div><div class="card-body"><form onsubmit="handleCreateUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="nuName" required placeholder="Jean Renard" oninput="previewLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="nuLoginPreview">—</div></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="password" class="form-input" id="nuPass" required value="' + generateTempPassword() + '"><button type="button" class="btn btn-ghost btn-sm v2-mt-4" onclick="$(\'nuPass\').value=generateTempPassword()">Regénérer</button></div>';
  h += '<div class="form-group"><label class="form-label">Role global</label><select class="form-select" id="nuRole"><option value="employee">Employe</option><option value="manager">Gerant</option><option value="super_admin">Super Admin</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Assigner a un site</label><select class="form-select" id="nuSite"><option value="">— Aucun site —</option>';
  S.sites.forEach(function(s) { h += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label class="form-label">Role sur le site</label><select class="form-select" id="nuSiteRole"><option value="employee">Employe</option><option value="manager">Gerant</option><option value="admin">Administrateur</option></select></div></div>';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera genere automatiquement (initiales + code). Communiquez l\'identifiant et le mot de passe a l\'employe.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg">Creer l\'utilisateur</button></form></div></div>';

  // User list
  h += '<div class="card"><div class="card-header">Tous les utilisateurs</div><div class="card-body" id="userListContainer"><div class="v2-loading-inline"><div class="loading"></div></div></div></div>';

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
      var roleLabel = {super_admin:'Super Admin',manager:'Gerant',employee:'Employe'}[u.role] || u.role;
      var userSites = allAssignments.filter(function(a){return a.user_id===u.id;});
      var loginId = u.login_id || '—';

      html += '<div class="v2-user-card">';
      html += '<div class="v2-flex v2-justify-between v2-items-center v2-flex-wrap v2-gap-8">';
      html += '<div>';
      html += '<strong>' + roleIcon + ' ' + esc(u.full_name||'—') + '</strong>';
      html += '<span class="v2-login-badge">' + esc(loginId) + '</span>';
      html += '</div>';
      html += '<div class="v2-flex v2-gap-6 v2-items-center">';
      html += '<button class="btn btn-ghost btn-sm" onclick="handleEditLoginId(\'' + u.id + '\',\'' + esc(loginId) + '\')" title="Modifier identifiant">Modifier ID</button>';
      html += '<select onchange="changeGlobalRole(\'' + u.id + '\',this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border,#ddd);font-size:13px">';
      html += '<option value="employee"' + (u.role==='employee'?' selected':'') + '>Employe</option>';
      html += '<option value="manager"' + (u.role==='manager'?' selected':'') + '>Gerant</option>';
      html += '<option value="super_admin"' + (u.role==='super_admin'?' selected':'') + '>Super Admin</option>';
      html += '</select></div></div>';

      // Sites
      if (userSites.length > 0) {
        html += '<div class="v2-flex v2-flex-wrap v2-gap-6 v2-mt-10">';
        userSites.forEach(function(us) {
          var siteRoleIcon = {admin:'🔑',manager:'👔',employee:'👷'}[us.site_role]||'';
          html += '<span class="badge badge-blue" style="font-size:12px">' + siteRoleIcon + ' ' + esc(us.sites?us.sites.name:'?') + ' <button onclick="removeSiteAccessFromUserList(\'' + u.id + '\',\'' + us.site_id + '\')" style="background:none;border:none;cursor:pointer;color:var(--err,#ef4444);font-weight:bold;margin-left:4px">✕</button></span>';
        });
        html += '</div>';
      } else {
        html += '<div class="v2-mt-8 v2-text-sm v2-text-muted">Aucun site assigne</div>';
      }
      html += '</div>';
    });
  }
  container.innerHTML = html;
}

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
