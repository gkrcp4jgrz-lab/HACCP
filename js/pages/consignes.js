function renderConsignes() {
  var h = '';

  // Form nouvelle consigne
  h += '<div class="card"><div class="card-header">➕ Nouvelle consigne</div><div class="card-body"><form onsubmit="handleConsigne(event)">';
  h += '<div class="form-group"><label class="form-label">Message <span class="req">*</span></label><textarea class="form-textarea" id="conMsg" rows="3" required placeholder="Écrire une consigne pour l\'équipe..."></textarea></div>';
  h += '<div class="form-group"><label class="form-label">Priorité</label><select class="form-select" id="conPrio"><option value="normal">🟢 Normal</option><option value="high">🟡 Important</option><option value="urgent">🔴 Urgent</option></select></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Publier</button></form></div></div>';

  // Journal du jour
  var todayStr = today();
  var todayConsignes = S.data.consignes.filter(function(c) { return c.created_at && c.created_at.startsWith(todayStr); });
  var olderConsignes = S.data.consignes.filter(function(c) { return !c.created_at || !c.created_at.startsWith(todayStr); });

  // Consignes urgentes en premier (toutes dates)
  var urgents = S.data.consignes.filter(function(c) { return c.priority === 'urgent'; });
  if (urgents.length > 0) {
    h += '<div class="card" style="border-left:3px solid var(--danger)"><div class="card-header" style="color:var(--danger)">🔴 Consignes urgentes <span class="badge badge-red" style="margin-left:auto">' + urgents.length + '</span></div>';
    urgents.forEach(function(c) {
      h += '<div class="list-item"><div class="list-content"><div class="list-title" style="color:var(--danger)">' + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions">';
      if (isManager()) h += '<button class="btn btn-success btn-sm" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button> ';
      if (isManager()) h += '<button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
    h += '</div>';
  }

  // Journal du jour
  h += '<div class="card"><div class="card-header">📋 Journal du jour — ' + fmtD(todayStr) + ' <span class="badge badge-blue" style="margin-left:auto">' + todayConsignes.length + '</span></div>';
  if (todayConsignes.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucune consigne aujourd\'hui</div></div></div>';
  } else {
    todayConsignes.filter(function(c) { return c.priority !== 'urgent'; }).forEach(function(c) {
      var prioIcon = c.priority === 'high' ? '🟡 ' : '';
      h += '<div class="list-item"><div class="list-content"><div class="list-title">' + prioIcon + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      if (isManager()) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
      h += '</div>';
    });
  }
  h += '</div>';

  // Historique (jours précédents)
  if (olderConsignes.length > 0) {
    h += '<div class="card"><div class="card-header">📜 Historique</div>';
    olderConsignes.slice(0, 15).forEach(function(c) {
      var prioStyle = c.priority === 'urgent' ? 'color:var(--danger)' : c.priority === 'high' ? 'color:var(--warning)' : '';
      h += '<div class="list-item"><div class="list-content"><div class="list-title" style="' + prioStyle + '">' + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      if (isManager()) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
      h += '</div>';
    });
    if (olderConsignes.length > 15) h += '<div style="text-align:center;padding:10px"><span style="font-size:12px;color:var(--muted)">' + (olderConsignes.length - 15) + ' consignes plus anciennes...</span></div>';
    h += '</div>';
  }

  return h;
}
