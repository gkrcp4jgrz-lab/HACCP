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
  h += '<div class="card"><div class="card-header">🏢 Tous les sites <span class="badge badge-blue" style="margin-left:auto">' + S.sites.length + '</span></div>';
  if (S.sites.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🏢</div><div class="empty-title">Aucun site</div></div></div>';
  } else {
    S.sites.forEach(function(s) {
      var typeEmoji = {hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[s.type] || '🏢';
      h += '<div class="list-item" style="flex-wrap:wrap">';
      h += '<div class="list-icon" style="background:var(--primary-light)">' + typeEmoji + '</div>';
      h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div><div class="list-sub">' + (s.address ? esc(s.address) : '') + (s.city ? ', ' + esc(s.city) : '') + (s.responsable ? ' — ' + esc(s.responsable) : '') + '</div></div>';
      h += '<div class="list-actions">';
      h += '<button class="btn btn-primary btn-sm" onclick="openEditSiteModal(\'' + s.id + '\')">✏️ Modifier</button>';
      h += '<button class="btn btn-warning btn-sm" onclick="openSiteAccessModal(\'' + s.id + '\')">👥 Accès</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="switchSite(\'' + s.id + '\');navigate(\'settings\')">⚙️ Config</button>';
      h += '<button class="btn btn-danger btn-sm" onclick="deleteSite(\'' + s.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  return h;
}

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
  html += '<button type="submit" class="btn btn-primary btn-lg" style="margin-top:12px">✓ Enregistrer</button></form></div>';
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
  alert('✅ Site mis à jour !');
};

// Modal : Gérer les accès d'un site
window.openSiteAccessModal = async function(siteId) {
  var site = S.sites.find(function(s){return s.id===siteId;});
  if (!site) return;

  var html = '<div class="modal-header"><div class="modal-title">👥 Accès : ' + esc(site.name) + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  html += '<div class="modal-body" id="siteAccessBody"><div style="text-align:center;padding:20px"><div class="loading"></div></div></div>';
  openModal(html);

  // Charger les utilisateurs du site
  var siteUsers = await loadSiteUsers(siteId);
  var allUsers = await loadAllUsers();

  var body = '';

  // Utilisateurs actuels du site
  body += '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Membres actuels</h3>';
  if (siteUsers.length === 0) {
    body += '<p style="color:var(--gray);font-size:13px;margin-bottom:16px">Aucun utilisateur assigné.</p>';
  } else {
    body += '<table class="data-table" style="margin-bottom:16px"><thead><tr><th>Nom</th><th>Email</th><th>Rôle global</th><th>Rôle site</th><th>Actions</th></tr></thead><tbody>';
    siteUsers.forEach(function(us) {
      var p = us.profiles;
      if (!p) return;
      var globalRole = {super_admin:'👑 Super Admin',manager:'👔 Gérant',employee:'👷 Employé'}[p.role] || p.role;
      var siteRoleLabel = {admin:'🔑 Admin',manager:'👔 Gérant',employee:'👷 Employé'}[us.site_role] || us.site_role;
      body += '<tr><td>' + esc(p.full_name||'—') + '</td><td style="font-size:12px">' + esc(p.email) + '</td><td>' + globalRole + '</td><td>';
      body += '<select onchange="changeSiteRole(\'' + p.id + '\',\'' + siteId + '\',this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd">';
      body += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employé</option>';
      body += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gérant</option>';
      body += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>Admin</option>';
      body += '</select></td>';
      body += '<td><button class="btn btn-danger btn-sm" onclick="removeSiteAccess(\'' + p.id + '\',\'' + siteId + '\')">Retirer</button></td></tr>';
    });
    body += '</tbody></table>';
  }

  // Ajouter un utilisateur existant
  var existingIds = siteUsers.map(function(us){return us.user_id;});
  var available = allUsers.filter(function(u){return existingIds.indexOf(u.id) === -1;});

  body += '<h3 style="font-size:15px;font-weight:700;margin:16px 0 12px">Ajouter un membre</h3>';
  if (available.length === 0) {
    body += '<p style="color:var(--gray);font-size:13px">Tous les utilisateurs sont déjà assignés à ce site.</p>';
  } else {
    body += '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">';
    body += '<select id="addUserSelect" class="form-select" style="flex:1;min-width:200px">';
    available.forEach(function(u) {
      var rl = {super_admin:'👑',manager:'👔',employee:'👷'}[u.role] || '';
      body += '<option value="' + u.id + '">' + rl + ' ' + esc(u.full_name||u.email) + ' (' + esc(u.email) + ')</option>';
    });
    body += '</select>';
    body += '<select id="addUserRole" class="form-select" style="width:140px"><option value="employee">Employé</option><option value="manager">Gérant</option><option value="admin">Admin</option></select>';
    body += '<button class="btn btn-success btn-sm" onclick="addSiteAccess(\'' + siteId + '\')">+ Ajouter</button>';
    body += '</div>';
  }

  $('siteAccessBody').innerHTML = body;
};

window.changeSiteRole = async function(userId, siteId, newRole) {
  try {
    await assignUserToSite(userId, siteId, newRole);
    alert('✅ Rôle modifié !');
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};

window.removeSiteAccess = async function(userId, siteId) {
  if (!confirm('Retirer cet utilisateur du site ?')) return;
  try {
    await removeUserFromSite(userId, siteId);
    alert('✅ Utilisateur retiré du site');
    openSiteAccessModal(siteId); // Recharger
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};

window.addSiteAccess = async function(siteId) {
  var userId = $('addUserSelect').value;
  var role = $('addUserRole').value;
  if (!userId) return;
  try {
    await assignUserToSite(userId, siteId, role);
    alert('✅ Utilisateur ajouté au site !');
    openSiteAccessModal(siteId); // Recharger
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};
