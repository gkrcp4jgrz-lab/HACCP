function renderConsignes() {
  var h = '';

  h += '<div class="card"><div class="card-header">➕ Nouvelle consigne</div><div class="card-body"><form onsubmit="handleConsigne(event)">';
  h += '<div class="form-group"><label class="form-label">Message <span class="req">*</span></label><textarea class="form-textarea" id="conMsg" rows="3" required placeholder="Écrire une consigne pour l\'équipe..."></textarea></div>';
  h += '<div class="form-group"><label class="form-label">Priorité</label><select class="form-select" id="conPrio"><option value="normal">🟢 Normal</option><option value="urgent">🔴 Urgent</option></select></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Publier</button></form></div></div>';

  h += '<div class="card"><div class="card-header">💬 Consignes récentes</div>';
  if (S.data.consignes.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">💬</div><div class="empty-title">Aucune consigne</div></div></div>';
  } else {
    S.data.consignes.forEach(function(c) {
      var border = c.priority === 'urgent' ? 'var(--danger)' : 'var(--gray-border)';
      h += '<div class="list-item" style="border-left:3px solid ' + border + '"><div class="list-content"><div class="list-title">' + (c.priority === 'urgent' ? '🔴 ' : '') + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      if (isManager()) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
      h += '</div>';
    });
  }
  h += '</div>';

  return h;
}
