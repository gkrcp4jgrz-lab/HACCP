function renderTeam() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès réservé aux gérants</div></div></div></div>';
  }

  var site = currentSite();
  if (!site) return '<div class="card"><div class="card-body">Aucun site sélectionné.</div></div>';

  var h = '';

  // Create employee form
  h += '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">👤</span> Ajouter un membre à ' + esc(site.name) + '</div><div class="card-body"><form onsubmit="handleTeamAddUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="teamName" required placeholder="Jean Renard" oninput="previewTeamLoginId(this.value)"></div>';
  h += '<div class="form-group"><label class="form-label">Identifiant (auto)</label><div class="v2-login-preview" id="teamLoginPreview">—</div></div></div>';
  if (!S._teamTempPass) S._teamTempPass = generateTempPassword();
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="password" class="form-input" id="teamPass" required value="' + S._teamTempPass + '"><button type="button" class="btn btn-ghost btn-sm v2-mt-4" onclick="S._teamTempPass=generateTempPassword();$(\'teamPass\').value=S._teamTempPass">Régénérer</button></div>';
  h += '<div class="form-group"><label class="form-label">Rôle sur le site</label><select class="form-select" id="teamRole"><option value="employee">Employé</option><option value="manager">Gérant</option></select></div></div>';
  h += '<div class="v2-callout v2-callout--info v2-mb-16"><strong>Info :</strong> L\'identifiant sera généré automatiquement. Communiquez l\'identifiant et le mot de passe à l\'employé pour qu\'il puisse se connecter.</div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" id="teamAddBtn">Ajouter au site</button></form></div></div>';

  // Team list
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">👥</span> Équipe de ' + esc(site.name) + '</div><div class="card-body" id="teamListContainer"><div class="v2-loading-inline"><div class="loading" style="width:28px;height:28px;border-width:3px"></div></div></div></div>';

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
    html = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">Aucun membre</div><div class="empty-text">Ajoutez des employés avec le formulaire ci-dessus.</div></div>';
  } else {
    html = '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Nom</th><th>Identifiant</th><th>Téléphone</th><th>Rôle global</th><th>Rôle site</th><th>Actions</th></tr></thead><tbody>';
    siteUsers.forEach(function(us) {
      var p = us.profiles;
      if (!p) return;
      var globalRole = {super_admin:'Super Admin',manager:'Gérant',employee:'Employé'}[p.role] || p.role;
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
      html += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>Employé</option>';
      html += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>Gérant</option>';
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
    html += '</tbody></table></div>';
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

    // Auto-generate login_id
    var loginId = await generateUniqueLoginId(name);

    // Use centralized createUser (auth.js) — handles signUp + session restore + profile
    var user = await createUser(loginId, pass, name, 'employee');
    if (!user) throw new Error('Utilisateur non créé');

    // Assign to current site with chosen role
    await assignUserToSite(user.id, S.currentSiteId, siteRole);

    showToast('Membre ajouté — ID : ' + loginId, 'success', 5000);
    openModal('<div class="modal-header"><div class="modal-title">✅ Membre ajouté</div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="v2-text-center v2-mb-18"><div style="width:64px;height:64px;background:var(--af-ok-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto">✅</div></div><p class="v2-text-md v2-font-600 v2-mb-14">Communiquez ces informations à l\'employé :</p><div style="padding:16px;background:var(--bg-off);border-radius:var(--radius-sm);margin-bottom:12px"><div class="v2-text-sm v2-text-muted v2-mb-4">Identifiant</div><div class="v2-text-xl v2-font-800 v2-font-mono" style="letter-spacing:2px;color:var(--af-teal)">' + esc(loginId) + '</div></div><div style="padding:16px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-sm v2-text-muted v2-mb-4">Mot de passe (cliquez pour copier)</div><input type="text" readonly value="' + esc(pass) + '" style="width:100%;border:none;background:transparent;font-size:18px;font-weight:800;text-align:center;cursor:pointer" onclick="navigator.clipboard.writeText(this.value);showToast(\'Copié !\',\'success\',1500)"></div></div><div class="modal-footer"><button class="btn btn-primary btn-lg" onclick="closeModal()">Compris</button></div>');
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
    showToast('Rôle modifié !', 'success');
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.handleTeamRemove = async function(userId) {
  if (!(await appConfirm('Retirer du site', 'Retirer cet utilisateur du site ?<br>Il ne pourra plus y accéder.', {danger:true,icon:'👤',confirmLabel:'Retirer'}))) return;
  try {
    await removeUserFromSite(userId, S.currentSiteId);
    showToast('Utilisateur retiré du site', 'success');
    loadAndRenderTeam();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
