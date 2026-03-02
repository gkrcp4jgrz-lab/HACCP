function renderSiteManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create site form (collapsible)
  h += '<div class="card"><div class="card-header" style="cursor:pointer" onclick="var el=document.getElementById(\'newSiteForm\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">➕ Créer un nouveau site <span style="float:right;font-size:12px;color:var(--gray)">▼</span></div><div class="card-body" id="newSiteForm" style="display:none"><form onsubmit="handleCreateSite(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="sName" required placeholder="Ex: B&B Hôtel Brest"></div>';
  h += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sType"><option value="hotel">🏨 Hôtel</option><option value="restaurant">🍽️ Restaurant</option><option value="cuisine_centrale">🏭 Cuisine centrale</option><option value="autre">🏢 Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Adresse</label><input type="text" class="form-input" id="sAddr" placeholder="123 rue Principale"></div>';
  h += '<div class="form-group"><label class="form-label">Ville</label><input type="text" class="form-input" id="sCity" placeholder="Brest"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="sPhone"></div>';
  h += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sEmail"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">N° Agrément</label><input type="text" class="form-input" id="sAgr"></div>';
  h += '<div class="form-group"><label class="form-label">Responsable</label><input type="text" class="form-input" id="sResp"></div></div>';
  h += '<button type="submit" class="btn btn-success btn-lg">✓ Créer le site</button></form></div></div>';

  // Sites list with details
  h += '<div class="card"><div class="card-header">🏢 Tous les sites <span class="badge badge-blue v2-ml-auto">' + S.sites.length + '</span></div>';
  if (S.sites.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🏢</div><div class="empty-title">Aucun site</div></div></div>';
  } else {
    h += '<div id="siteListContainer"><div class="card-body"><div class="v2-loading-inline"><div class="loading"></div></div></div></div>';
  }
  h += '</div>';

  // Load employee counts async
  if (S.sites.length > 0) {
    setTimeout(function() { loadSiteListWithCounts(); }, 50);
  }

  return h;
}

// Load site list with employee counts
window.loadSiteListWithCounts = async function() {
  var container = $('siteListContainer');
  if (!container) return;

  // Load all user_sites assignments in one query
  var r = await sb.from('user_sites').select('site_id, user_id');
  var assignments = r.data || [];

  // Count per site
  var countMap = {};
  assignments.forEach(function(a) {
    countMap[a.site_id] = (countMap[a.site_id] || 0) + 1;
  });

  var h = '';
  S.sites.forEach(function(s) {
    var typeEmoji = {hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[s.type] || '🏢';
    var empCount = countMap[s.id] || 0;
    h += '<div class="list-item v2-flex-wrap">';
    h += '<div class="list-icon v2-list-icon--primary">' + typeEmoji + '</div>';
    h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div><div class="list-sub">' + (s.address ? esc(s.address) : '') + (s.city ? ', ' + esc(s.city) : '') + (s.responsable ? ' — ' + esc(s.responsable) : '') + '</div>';
    h += '<div class="list-sub" style="margin-top:2px"><span class="badge badge-blue" style="font-size:11px">👥 ' + empCount + ' membre' + (empCount > 1 ? 's' : '') + '</span></div></div>';
    h += '<div class="list-actions">';
    h += '<button class="btn btn-ghost btn-sm" onclick="openEditSiteModal(\'' + s.id + '\')" style="font-size:12px;padding:4px 10px">✏️</button>';
    h += '<button class="btn btn-warning btn-sm" onclick="openSiteAccessModal(\'' + s.id + '\')">👥 Accès</button>';
    h += '<button class="btn btn-ghost btn-sm" onclick="switchSite(\'' + s.id + '\');navigate(\'settings\')">⚙️</button>';
    h += '<button class="btn btn-danger btn-sm" onclick="deleteSite(\'' + s.id + '\')" style="font-size:12px;padding:4px 8px">🗑️</button>';
    h += '</div></div>';
  });
  container.innerHTML = h;
};

// Modal : Modifier un site
window.openEditSiteModal = function(siteId) {
  var site = S.sites.find(function(s){return s.id===siteId;});
  if (!site) return;
  var html = '<div class="modal-header"><div class="modal-title">✏️ Modifier : ' + esc(site.name) + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  html += '<div class="modal-body"><form onsubmit="handleUpdateSite(event,\'' + siteId + '\')">';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Nom</label><input type="text" class="form-input" id="esName" value="' + esc(site.name) + '" required></div>';
  html += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="esType"><option value="hotel"' + (site.type==='hotel'?' selected':'') + '>🏨 Hôtel</option><option value="restaurant"' + (site.type==='restaurant'?' selected':'') + '>🍽️ Restaurant</option><option value="cuisine_centrale"' + (site.type==='cuisine_centrale'?' selected':'') + '>🏭 Cuisine centrale</option><option value="autre"' + (site.type==='autre'?' selected':'') + '>🏢 Autre</option></select></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Adresse</label><input type="text" class="form-input" id="esAddr" value="' + esc(site.address||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Ville</label><input type="text" class="form-input" id="esCity" value="' + esc(site.city||'') + '"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="esPhone" value="' + esc(site.phone||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="esEmail" value="' + esc(site.email||'') + '"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">N° Agrément</label><input type="text" class="form-input" id="esAgr" value="' + esc(site.agrement||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Responsable</label><input type="text" class="form-input" id="esResp" value="' + esc(site.responsable||'') + '"></div></div>';
  html += '<button type="submit" class="btn btn-primary btn-lg v2-mt-12">✓ Enregistrer</button></form></div>';
  openModal(html);
};

window.handleUpdateSite = async function(e, siteId) {
  e.preventDefault();
  await updateSite(siteId, {
    name: $('esName').value, type: $('esType').value,
    address: $('esAddr').value, city: $('esCity').value,
    phone: $('esPhone').value, email: $('esEmail').value,
    agrement: $('esAgr').value, responsable: $('esResp').value
  });
  closeModal();
  showToast('Site mis à jour !', 'success');
};

// Modal : Gérer les accès d'un site
window.openSiteAccessModal = async function(siteId) {
  var site = S.sites.find(function(s){return s.id===siteId;});
  if (!site) return;

  var html = '<div class="modal-header"><div class="modal-title">👥 Accès : ' + esc(site.name) + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  html += '<div class="modal-body" id="siteAccessBody"><div class="v2-loading-inline"><div class="loading"></div></div></div>';
  openModal(html);

  // Charger les utilisateurs du site + tous les profils séparément (robuste)
  var siteUsersRaw = await loadSiteUsers(siteId);
  var allUsers = await loadAllUsers();

  // Build a profile lookup map for reliability
  var profileMap = {};
  allUsers.forEach(function(u) { profileMap[u.id] = u; });

  var body = '';

  // Utilisateurs actuels du site
  body += '<h3 class="v2-text-lg v2-font-700 v2-mb-12">Membres du site <span class="badge badge-blue">' + siteUsersRaw.length + '</span></h3>';
  if (siteUsersRaw.length === 0) {
    body += '<p class="v2-text-base v2-text-muted v2-mb-16">Aucun utilisateur assigné à ce site.</p>';
  } else {
    body += '<div class="v2-site-members-list v2-mb-16">';
    siteUsersRaw.forEach(function(us) {
      // Use embedded profile OR fallback to profileMap
      var p = us.profiles || profileMap[us.user_id];
      var userName = p ? (p.full_name || p.email || '—') : 'Utilisateur #' + us.user_id.substring(0,8);
      var userEmail = p ? (p.email || '') : '';
      var siteRoleLabel = {admin:'🔑 Admin',manager:'👔 Gérant',employee:'👷 Employé'}[us.site_role] || us.site_role;
      var uid = p ? p.id : us.user_id;

      body += '<div class="list-item" style="padding:10px 12px">';
      body += '<div class="list-content" style="min-width:0">';
      body += '<div class="list-title" style="font-size:14px">' + esc(userName) + '</div>';
      if (userEmail) body += '<div class="list-sub">' + esc(userEmail) + '</div>';
      body += '</div>';
      body += '<div class="v2-flex v2-gap-6 v2-items-center">';
      body += '<select onchange="changeSiteRole(\'' + uid + '\',\'' + siteId + '\',this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border,#ddd);font-size:12px">';
      body += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employé</option>';
      body += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gérant</option>';
      body += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>Admin</option>';
      body += '</select>';
      body += '<span class="badge" style="font-size:11px;background:var(--bg-off);padding:3px 8px">' + siteRoleLabel + '</span>';
      body += '<button class="btn btn-danger btn-sm" onclick="removeSiteAccess(\'' + uid + '\',\'' + siteId + '\')" style="font-size:11px;padding:3px 8px">Retirer</button>';
      body += '</div></div>';
    });
    body += '</div>';
  }

  // Ajouter un utilisateur existant
  var existingIds = siteUsersRaw.map(function(us){return us.user_id;});
  var available = allUsers.filter(function(u){return existingIds.indexOf(u.id) === -1;});

  body += '<h3 class="v2-text-lg v2-font-700 v2-mt-16 v2-mb-12">Ajouter un membre</h3>';
  if (available.length === 0) {
    body += '<p class="v2-text-base v2-text-muted">Tous les utilisateurs sont déjà assignés à ce site.</p>';
  } else {
    body += '<div class="v2-flex v2-gap-8 v2-items-end v2-flex-wrap">';
    body += '<select id="addUserSelect" class="form-select" style="flex:1;min-width:200px">';
    available.forEach(function(u) {
      body += '<option value="' + u.id + '">' + esc(u.full_name||u.email) + '</option>';
    });
    body += '</select>';
    body += '<select id="addUserRole" class="form-select" style="max-width:140px;width:100%"><option value="employee">Employé</option><option value="manager">Gérant</option></select>';
    body += '<button class="btn btn-success btn-sm" onclick="addSiteAccess(\'' + siteId + '\')">+ Ajouter</button>';
    body += '</div>';
  }

  $('siteAccessBody').innerHTML = body;
};

window.changeSiteRole = async function(userId, siteId, newRole) {
  try {
    await assignUserToSite(userId, siteId, newRole);
    showToast('Rôle modifié !', 'success');
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.removeSiteAccess = async function(userId, siteId) {
  if (!(await appConfirm('Retirer l\'accès', 'Retirer cet utilisateur du site ?', {danger:true,icon:'👤',confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, siteId);
    showToast('Utilisateur retiré du site', 'success');
    openSiteAccessModal(siteId); // Recharger
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.addSiteAccess = async function(siteId) {
  var userId = $('addUserSelect').value;
  var role = $('addUserRole').value;
  if (!userId) return;
  try {
    await assignUserToSite(userId, siteId, role);
    showToast('Utilisateur ajouté au site !', 'success');
    openSiteAccessModal(siteId); // Recharger
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
