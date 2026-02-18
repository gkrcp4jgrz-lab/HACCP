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
    h += '<div class="card v2-card--danger-left"><div class="card-header v2-text-danger">🔴 Consignes urgentes <span class="badge badge-red v2-ml-auto">' + urgents.length + '</span></div>';
    urgents.forEach(function(c) {
      h += '<div class="list-item"><div class="list-content"><div class="list-title v2-text-danger">' + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions">';
      if (isManager()) h += '<button class="btn btn-success btn-sm" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button> ';
      if (isManager()) h += '<button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
    h += '</div>';
  }

  // Journal du jour
  h += '<div class="card"><div class="card-header">📋 Journal du jour — ' + fmtD(todayStr) + ' <span class="badge badge-blue v2-ml-auto">' + todayConsignes.length + '</span></div>';
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
      var prioClass = c.priority === 'urgent' ? ' v2-text-danger' : c.priority === 'high' ? ' v2-text-warning' : '';
      h += '<div class="list-item"><div class="list-content"><div class="list-title' + prioClass + '">' + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      if (isManager()) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
      h += '</div>';
    });
    if (olderConsignes.length > 15) h += '<div class="v2-text-center" style="padding:10px"><span class="v2-text-sm v2-text-muted">' + (olderConsignes.length - 15) + ' consignes plus anciennes...</span></div>';
    h += '</div>';
  }

  return h;
}
