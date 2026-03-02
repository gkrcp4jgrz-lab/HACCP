function renderSiteManagement() {
  if (!isSuperAdmin()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">' + IC.shield + '</div><div class="empty-title">Accès Super Admin requis</div></div></div></div>';
  }

  var h = '';

  // Create site form (collapsible)
  h += '<div class="card"><div class="card-header" style="cursor:pointer" onclick="var el=document.getElementById(\'newSiteForm\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">';
  h += '<span class="v2-icon-wrap v2-icon-wrap--teal">' + IC.plus + '</span> Créer un nouveau site</div>';
  h += '<div class="card-body" id="newSiteForm" style="display:none"><form onsubmit="handleCreateSite(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="sName" required placeholder="Ex: B&B Hôtel Brest"></div>';
  h += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="sType"><option value="hotel">Hôtel</option><option value="restaurant">Restaurant</option><option value="cuisine_centrale">Cuisine centrale</option><option value="autre">Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Adresse</label><input type="text" class="form-input" id="sAddr" placeholder="123 rue Principale"></div>';
  h += '<div class="form-group"><label class="form-label">Ville</label><input type="text" class="form-input" id="sCity" placeholder="Brest"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="sPhone"></div>';
  h += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sEmail"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">N° Agrément</label><input type="text" class="form-input" id="sAgr"></div>';
  h += '<div class="form-group"><label class="form-label">Responsable</label><input type="text" class="form-input" id="sResp"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg">Créer le site</button></form></div></div>';

  // Sites list
  h += '<div class="card"><div class="card-header"><span class="v2-icon-wrap v2-icon-wrap--primary">' + IC.building + '</span> Tous les sites <span class="badge badge-blue v2-ml-auto">' + S.sites.length + '</span></div>';
  if (S.sites.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">' + IC.building + '</div><div class="empty-title">Aucun site</div></div></div>';
  } else {
    h += '<div id="siteListContainer"><div class="card-body"><div class="v2-loading-inline"><div class="loading"></div></div></div></div>';
  }
  h += '</div>';

  if (S.sites.length > 0) {
    setTimeout(function() { loadSiteListWithCounts(); }, 50);
  }

  return h;
}

// Load site list with employee counts + names
window.loadSiteListWithCounts = async function() {
  var container = $('siteListContainer');
  if (!container) return;

  // Load all user_sites WITH profile names in one query
  var r = await sb.from('user_sites').select('site_id, user_id, site_role, profiles(full_name, email)');
  var allAssignments = r.data || [];

  // If profiles join failed, load separately
  var profileMap = {};
  var needFallback = allAssignments.length > 0 && !allAssignments[0].profiles;
  if (needFallback) {
    var pRes = await sb.from('profiles').select('id, full_name, email');
    (pRes.data || []).forEach(function(p) { profileMap[p.id] = p; });
  }

  // Group by site
  var siteMembers = {};
  allAssignments.forEach(function(a) {
    if (!siteMembers[a.site_id]) siteMembers[a.site_id] = [];
    var p = a.profiles || profileMap[a.user_id];
    siteMembers[a.site_id].push({
      name: p ? (p.full_name || p.email || '?') : '?',
      role: a.site_role
    });
  });

  var h = '';
  S.sites.forEach(function(s) {
    var members = siteMembers[s.id] || [];
    var addr = (s.address ? esc(s.address) : '') + (s.city ? ', ' + esc(s.city) : '');

    h += '<div class="list-item" style="flex-wrap:wrap">';
    h += '<div class="list-icon v2-list-icon--primary">' + IC.building + '</div>';
    h += '<div class="list-content">';
    h += '<div class="list-title">' + esc(s.name);
    // Discreet admin badge
    h += ' <span class="v2-role-tag v2-role-tag--admin">Admin</span>';
    h += '</div>';
    h += '<div class="list-sub">';
    if (addr) h += addr;
    if (s.responsable) h += (addr ? ' · ' : '') + esc(s.responsable);
    h += '</div>';

    // Show members preview (max 4 names)
    if (members.length > 0) {
      h += '<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">';
      var shown = members.slice(0, 4);
      shown.forEach(function(m) {
        var roleTag = {admin:'v2-role-tag--admin',manager:'v2-role-tag--manager',employee:'v2-role-tag--employee'}[m.role] || 'v2-role-tag--employee';
        var roleShort = {admin:'A',manager:'G',employee:'E'}[m.role] || '';
        h += '<span class="v2-member-chip"><span class="v2-role-dot ' + roleTag + '">' + roleShort + '</span>' + esc(m.name.split(' ')[0]) + '</span>';
      });
      if (members.length > 4) h += '<span class="v2-member-chip">+' + (members.length - 4) + '</span>';
      h += '</div>';
    } else {
      h += '<div style="margin-top:4px;font-size:11px;color:var(--ink-muted)">Aucun membre</div>';
    }
    h += '</div>';

    h += '<div class="list-actions">';
    h += '<button class="btn btn-ghost btn-sm v2-icon-btn" onclick="openEditSiteModal(\'' + s.id + '\')" title="Modifier">' + IC.edit + '</button>';
    h += '<button class="btn btn-primary btn-sm" onclick="openSiteAccessModal(\'' + s.id + '\')" style="gap:4px">' + IC.users + ' Accès</button>';
    h += '<button class="btn btn-ghost btn-sm v2-icon-btn" onclick="switchSite(\'' + s.id + '\');navigate(\'settings\')" title="Paramètres">' + IC.gear + '</button>';
    h += '<button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="deleteSite(\'' + s.id + '\')" title="Supprimer">' + IC.trash + '</button>';
    h += '</div></div>';
  });
  container.innerHTML = h;
};

// Modal : Modifier un site
window.openEditSiteModal = function(siteId) {
  var site = S.sites.find(function(s){return s.id===siteId;});
  if (!site) return;
  var html = '<div class="modal-header"><div class="modal-title">' + IC.edit + ' Modifier : ' + esc(site.name) + '</div><button class="modal-close" onclick="closeModal()">' + IC.x + '</button></div>';
  html += '<div class="modal-body"><form onsubmit="handleUpdateSite(event,\'' + siteId + '\')">';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Nom</label><input type="text" class="form-input" id="esName" value="' + esc(site.name) + '" required></div>';
  html += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="esType"><option value="hotel"' + (site.type==='hotel'?' selected':'') + '>Hôtel</option><option value="restaurant"' + (site.type==='restaurant'?' selected':'') + '>Restaurant</option><option value="cuisine_centrale"' + (site.type==='cuisine_centrale'?' selected':'') + '>Cuisine centrale</option><option value="autre"' + (site.type==='autre'?' selected':'') + '>Autre</option></select></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Adresse</label><input type="text" class="form-input" id="esAddr" value="' + esc(site.address||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Ville</label><input type="text" class="form-input" id="esCity" value="' + esc(site.city||'') + '"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="esPhone" value="' + esc(site.phone||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="esEmail" value="' + esc(site.email||'') + '"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label class="form-label">N° Agrément</label><input type="text" class="form-input" id="esAgr" value="' + esc(site.agrement||'') + '"></div>';
  html += '<div class="form-group"><label class="form-label">Responsable</label><input type="text" class="form-input" id="esResp" value="' + esc(site.responsable||'') + '"></div></div>';
  html += '<button type="submit" class="btn btn-primary btn-lg v2-mt-12">Enregistrer</button></form></div>';
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
  showToast('Site mis à jour', 'success');
};

// Modal : Gérer les accès d'un site
window.openSiteAccessModal = async function(siteId) {
  var site = S.sites.find(function(s){return s.id===siteId;});
  if (!site) return;

  var html = '<div class="modal-header"><div class="modal-title">' + IC.users + ' Accès : ' + esc(site.name) + '</div><button class="modal-close" onclick="closeModal()">' + IC.x + '</button></div>';
  html += '<div class="modal-body" id="siteAccessBody"><div class="v2-loading-inline"><div class="loading"></div></div></div>';
  openModal(html);

  // Load user_sites for this site
  var usRes = await sb.from('user_sites').select('user_id, site_role').eq('site_id', siteId);
  var siteUsersRaw = usRes.data || [];

  // Load ALL profiles separately (more reliable than join)
  var allUsers = await loadAllUsers();
  var profileMap = {};
  allUsers.forEach(function(u) { profileMap[u.id] = u; });

  var body = '';

  // Members
  body += '<h3 class="v2-section-title">' + IC.users + ' Membres du site <span class="badge badge-blue">' + siteUsersRaw.length + '</span></h3>';
  if (siteUsersRaw.length === 0) {
    body += '<p class="v2-text-base v2-text-muted v2-mb-16">Aucun utilisateur assigné à ce site.</p>';
  } else {
    siteUsersRaw.forEach(function(us) {
      var p = profileMap[us.user_id];
      var uName = p ? (p.full_name || p.email || '—') : 'ID: ' + us.user_id.substring(0,8);
      var uEmail = p ? (p.email || '') : '';
      var roleTag = {admin:'v2-role-tag--admin',manager:'v2-role-tag--manager',employee:'v2-role-tag--employee'}[us.site_role] || '';
      var roleLabel = {admin:'Admin',manager:'Gérant',employee:'Employé'}[us.site_role] || us.site_role;
      var uid = us.user_id;

      body += '<div class="list-item" style="padding:10px 12px">';
      body += '<div class="list-icon v2-list-icon--info" style="width:36px;height:36px">' + IC.user + '</div>';
      body += '<div class="list-content" style="min-width:0">';
      body += '<div class="list-title" style="font-size:14px">' + esc(uName) + ' <span class="v2-role-tag ' + roleTag + '">' + roleLabel + '</span></div>';
      if (uEmail) body += '<div class="list-sub">' + esc(uEmail) + '</div>';
      body += '</div>';
      body += '<div class="v2-flex v2-gap-6 v2-items-center">';
      body += '<select onchange="changeSiteRole(\'' + uid + '\',\'' + siteId + '\',this.value)" class="form-select" style="padding:4px 8px;min-height:32px;font-size:12px;width:auto">';
      body += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employé</option>';
      body += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gérant</option>';
      body += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>Admin</option>';
      body += '</select>';
      body += '<button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="removeSiteAccess(\'' + uid + '\',\'' + siteId + '\')" title="Retirer l\'accès">' + IC.userX + '</button>';
      body += '</div></div>';
    });
  }

  // Add member
  var existingIds = siteUsersRaw.map(function(us){return us.user_id;});
  var available = allUsers.filter(function(u){return existingIds.indexOf(u.id) === -1;});

  body += '<h3 class="v2-section-title v2-mt-16">' + IC.userPlus + ' Ajouter un membre</h3>';
  if (available.length === 0) {
    body += '<p class="v2-text-base v2-text-muted">Tous les utilisateurs sont déjà assignés.</p>';
  } else {
    body += '<div class="v2-flex v2-gap-8 v2-items-end v2-flex-wrap">';
    body += '<select id="addUserSelect" class="form-select" style="flex:1;min-width:180px">';
    available.forEach(function(u) {
      body += '<option value="' + u.id + '">' + esc(u.full_name||u.email) + '</option>';
    });
    body += '</select>';
    body += '<select id="addUserRole" class="form-select" style="max-width:130px;width:100%"><option value="employee">Employé</option><option value="manager">Gérant</option></select>';
    body += '<button class="btn btn-primary btn-sm" onclick="addSiteAccess(\'' + siteId + '\')" style="gap:4px">' + IC.plus + ' Ajouter</button>';
    body += '</div>';
  }

  $('siteAccessBody').innerHTML = body;
};

window.changeSiteRole = async function(userId, siteId, newRole) {
  try {
    await assignUserToSite(userId, siteId, newRole);
    showToast('Rôle modifié', 'success');
    openSiteAccessModal(siteId); // Refresh
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.removeSiteAccess = async function(userId, siteId) {
  if (!(await appConfirm('Retirer l\'accès', 'Retirer cet utilisateur du site ?', {danger:true,icon:IC.userX,confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, siteId);
    showToast('Utilisateur retiré du site', 'success');
    openSiteAccessModal(siteId); // Refresh
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.addSiteAccess = async function(siteId) {
  var userId = $('addUserSelect').value;
  var role = $('addUserRole').value;
  if (!userId) return;
  try {
    await assignUserToSite(userId, siteId, role);
    showToast('Utilisateur ajouté au site', 'success');
    openSiteAccessModal(siteId); // Refresh
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
