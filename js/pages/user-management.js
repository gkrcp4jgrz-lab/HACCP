function renderUserManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create user form
  h += '<div class="card"><div class="card-header">➕ Créer un utilisateur</div><div class="card-body"><form onsubmit="handleCreateUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="nuName" required placeholder="Jean Dupont"></div>';
  h += '<div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input type="email" class="form-input" id="nuEmail" required placeholder="jean@hotel.com"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe <span class="req">*</span></label><input type="text" class="form-input" id="nuPass" required value="Haccp2026!"></div>';
  h += '<div class="form-group"><label class="form-label">Rôle global</label><select class="form-select" id="nuRole"><option value="employee">👷 Employé</option><option value="manager">👔 Gérant</option><option value="super_admin">👑 Super Admin</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Assigner à un site</label><select class="form-select" id="nuSite"><option value="">— Aucun site —</option>';
  S.sites.forEach(function(s) { h += '<option value="' + s.id + '">' + esc(s.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label class="form-label">Rôle sur le site</label><select class="form-select" id="nuSiteRole"><option value="employee">Employé</option><option value="manager">Gérant</option><option value="admin">Administrateur</option></select></div></div>';
  h += '<div style="background:var(--primary-light);padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px"><strong>💡</strong> L\'utilisateur pourra se connecter directement avec ces identifiants.</div>';
  h += '<button type="submit" class="btn btn-success btn-lg">✓ Créer l\'utilisateur</button></form></div></div>';

  // User list with access details
  h += '<div class="card"><div class="card-header">👥 Tous les utilisateurs</div><div class="card-body" id="userListContainer"><div style="text-align:center;padding:20px"><div class="loading"></div></div></div></div>';

  // Auto-load users
  setTimeout(function() { loadAndDisplayUsersDetailed(); }, 50);

  return h;
}

async function loadAndDisplayUsersDetailed() {
  var container = $('userListContainer');
  if (!container) return;

  var users = await loadAllUsers();
  // Charger toutes les assignations
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
      var roleLabel = {super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[u.role] || u.role;
      var userSites = allAssignments.filter(function(a){return a.user_id===u.id;});

      html += '<div style="background:#fff;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid var(--gray-border)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
      html += '<div><strong>' + roleIcon + ' ' + esc(u.full_name||'—') + '</strong><span style="color:var(--gray);font-size:13px;margin-left:8px">' + esc(u.email) + '</span></div>';
      html += '<div style="display:flex;gap:6px;align-items:center">';
      html += '<select onchange="changeGlobalRole(\'' + u.id + '\',this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd;font-size:13px">';
      html += '<option value="employee"' + (u.role==='employee'?' selected':'') + '>👷 Employé</option>';
      html += '<option value="manager"' + (u.role==='manager'?' selected':'') + '>👔 Gérant</option>';
      html += '<option value="super_admin"' + (u.role==='super_admin'?' selected':'') + '>👑 Super Admin</option>';
      html += '</select></div></div>';

      // Sites assignés
      if (userSites.length > 0) {
        html += '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">';
        userSites.forEach(function(us) {
          var siteRoleIcon = {admin:'🔑',manager:'👔',employee:'👷'}[us.site_role]||'';
          html += '<span class="badge badge-blue" style="font-size:12px">' + siteRoleIcon + ' ' + esc(us.sites?us.sites.name:'?') + ' <button onclick="removeSiteAccess(\'' + u.id + '\',\'' + us.site_id + '\');setTimeout(loadAndDisplayUsersDetailed,500)" style="background:none;border:none;cursor:pointer;color:var(--danger);font-weight:bold;margin-left:4px">✕</button></span>';
        });
        html += '</div>';
      } else {
        html += '<div style="margin-top:8px;font-size:12px;color:var(--gray)">⚠️ Aucun site assigné</div>';
      }
      html += '</div>';
    });
  }
  container.innerHTML = html;
}

window.changeGlobalRole = async function(userId, newRole) {
  try {
    await updateUserRole(userId, newRole);
    alert('✅ Rôle modifié !');
    loadAndDisplayUsersDetailed();
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};

async function loadAndDisplayUsers() { loadAndDisplayUsersDetailed(); }
