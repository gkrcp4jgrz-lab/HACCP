function renderTeam() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès réservé aux gérants</div></div></div></div>';
  }

  var site = currentSite();
  if (!site) return '<div class="card"><div class="card-body">Aucun site sélectionné.</div></div>';

  var h = '';

  // Create employee form
  h += '<div class="card"><div class="card-header">➕ Ajouter un membre à ' + esc(site.name) + '</div><div class="card-body"><form onsubmit="handleTeamAddUser(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom complet <span class="req">*</span></label><input type="text" class="form-input" id="teamName" required placeholder="Jean Dupont"></div>';
  h += '<div class="form-group"><label class="form-label">Email <span class="req">*</span></label><input type="email" class="form-input" id="teamEmail" required placeholder="jean@exemple.com"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Mot de passe provisoire <span class="req">*</span></label><input type="text" class="form-input" id="teamPass" required value="Haccp2026!"></div>';
  h += '<div class="form-group"><label class="form-label">Rôle sur le site</label><select class="form-select" id="teamRole"><option value="employee">👷 Employé</option><option value="manager">👔 Gérant</option></select></div></div>';
  h += '<div style="background:var(--primary-light);padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px"><strong>💡</strong> L\'utilisateur pourra se connecter directement avec ces identifiants et accédera uniquement à ce site.</div>';
  h += '<button type="submit" class="btn btn-success btn-lg" id="teamAddBtn">✓ Ajouter au site</button></form></div></div>';

  // Team list (loaded async)
  h += '<div class="card"><div class="card-header">👥 Équipe de ' + esc(site.name) + '</div><div class="card-body" id="teamListContainer"><div style="text-align:center;padding:20px"><div class="loading"></div></div></div></div>';

  setTimeout(function() { loadAndRenderTeam(); }, 50);

  return h;
}

async function loadAndRenderTeam() {
  var container = $('teamListContainer');
  if (!container) return;

  var siteUsers = await loadSiteUsers(S.currentSiteId);
  var html = '';

  if (siteUsers.length === 0) {
    html = '<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">Aucun membre</div><div class="empty-text">Ajoutez des employés avec le formulaire ci-dessus.</div></div>';
  } else {
    html = '<table class="data-table"><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Rôle global</th><th>Rôle site</th><th>Actions</th></tr></thead><tbody>';
    siteUsers.forEach(function(us) {
      var p = us.profiles;
      if (!p) return;
      var globalRole = {super_admin:'👑 Super Admin',manager:'👔 Gérant',employee:'👷 Employé'}[p.role] || p.role;
      html += '<tr>';
      html += '<td><strong>' + esc(p.full_name||'—') + '</strong></td>';
      html += '<td style="font-size:12px">' + esc(p.email) + '</td>';
      html += '<td style="font-size:12px">' + esc(p.phone||'—') + '</td>';
      html += '<td>' + globalRole + '</td>';
      html += '<td><select onchange="handleTeamRoleChange(\'' + p.id + '\',this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ddd;font-size:13px">';
      html += '<option value="employee"' + (us.site_role==='employee'?' selected':'') + '>👷 Employé</option>';
      html += '<option value="manager"' + (us.site_role==='manager'?' selected':'') + '>👔 Gérant</option>';
      if (isSuperAdmin()) html += '<option value="admin"' + (us.site_role==='admin'?' selected':'') + '>🔑 Admin</option>';
      html += '</select></td>';
      html += '<td>';
      // Ne pas pouvoir se retirer soi-même
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
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Création...';

  try {
    var email = $('teamEmail').value;
    var name = $('teamName').value;
    var pass = $('teamPass').value;
    var siteRole = $('teamRole').value;

    // Vérifier si l'utilisateur existe déjà
    var existing = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
    
    var userId;
    if (existing && existing.data) {
      // L'utilisateur existe déjà — l'assigner au site
      userId = existing.data.id;
    } else {
      // Créer le compte
      var currentSession = await sb.auth.getSession();
      var savedToken = currentSession.data.session;

      var r = await sb.auth.signUp({
        email: email,
        password: pass,
        options: { data: { full_name: name } }
      });
      if (r.error) throw r.error;
      userId = r.data.user ? r.data.user.id : null;
      if (!userId) throw new Error('Utilisateur non créé');

      // Restaurer la session du gérant
      if (savedToken) {
        await sb.auth.setSession({ access_token: savedToken.access_token, refresh_token: savedToken.refresh_token });
      }

      // Attendre le trigger
      await new Promise(function(resolve) { setTimeout(resolve, 1500); });

      // Désactiver must_change_password
      await sb.from('profiles').update({ must_change_password: false, full_name: name }).eq('id', userId);
    }

    // Assigner au site
    await assignUserToSite(userId, S.currentSiteId, siteRole);

    alert('✅ ' + name + ' ajouté(e) au site !\n🔑 Email : ' + email + '\n🔑 Mot de passe : ' + pass);
    $('teamName').value = ''; $('teamEmail').value = ''; $('teamPass').value = 'Haccp2026!';
    loadAndRenderTeam();
  } catch(ex) {
    alert('❌ Erreur: ' + (ex.message || ex));
  }
  btn.disabled = false; btn.innerHTML = origText;
};

window.handleTeamRoleChange = async function(userId, newRole) {
  try {
    await assignUserToSite(userId, S.currentSiteId, newRole);
    alert('✅ Rôle modifié !');
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};

window.handleTeamRemove = async function(userId) {
  if (!confirm('Retirer cet utilisateur du site ? Il ne pourra plus y accéder.')) return;
  try {
    await removeUserFromSite(userId, S.currentSiteId);
    alert('✅ Utilisateur retiré du site');
    loadAndRenderTeam();
  } catch(e) { alert('❌ Erreur: ' + (e.message||e)); }
};
