function renderConsignes() {
  var h = '';

  // Form nouvelle consigne
  h += '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">💬</span> Nouvelle consigne</div><div class="card-body"><form onsubmit="handleConsigne(event)">';
  h += '<div class="form-group"><label class="form-label">Message <span class="req">*</span></label><textarea class="form-textarea" id="conMsg" rows="3" required placeholder="Écrire une consigne pour l\'équipe..." style="font-size:15px"></textarea></div>';
  h += '<div class="v2-flex v2-items-end v2-gap-12"><div class="form-group" style="flex:1"><label class="form-label">Priorité</label><select class="form-select" id="conPrio"><option value="normal">🟢 Normal</option><option value="high">🟡 Important</option><option value="urgent">🔴 Urgent</option></select></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="margin-bottom:22px">✓ Publier</button></div></form></div></div>';

  // Search bar
  h += '<div class="card" style="margin-bottom:0;border-bottom:0;border-radius:var(--radius) var(--radius) 0 0"><div class="card-body" style="padding:10px 18px"><input type="text" class="form-input" id="consigneSearch" placeholder="Rechercher une consigne..." oninput="S._consigneSearch=this.value;render()" value="' + esc(S._consigneSearch || '') + '"></div></div>';

  // Journal du jour
  var todayStr = today();
  var searchQ = (S._consigneSearch || '').toLowerCase();
  var allConsignes = S.data.consignes;
  if (searchQ) {
    allConsignes = allConsignes.filter(function(c) {
      return (c.message && c.message.toLowerCase().indexOf(searchQ) >= 0) ||
             (c.created_by_name && c.created_by_name.toLowerCase().indexOf(searchQ) >= 0);
    });
  }
  var todayConsignes = allConsignes.filter(function(c) { return c.created_at && c.created_at.startsWith(todayStr); });
  var olderConsignes = allConsignes.filter(function(c) { return !c.created_at || !c.created_at.startsWith(todayStr); });

  // Consignes urgentes non traitées en premier (toutes dates)
  var urgents = allConsignes.filter(function(c) { return c.priority === 'urgent' && !c.is_read; });
  // Note: treatedUrgents removed — is_read consignes are already filtered out in loadSiteData
  if (urgents.length > 0) {
    h += '<div class="card v2-card--danger-left"><div class="card-header v2-text-danger">🔴 Consignes urgentes <span class="badge badge-red v2-ml-auto">' + urgents.length + '</span></div>';
    urgents.forEach(function(c) {
      h += '<div class="list-item"><div class="list-content"><div class="list-title v2-text-danger">' + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions">';
      if (isManager()) h += '<button class="btn btn-success btn-sm" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button> ';
      if (isManager()) h += '<button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')" title="Supprimer">🗑️</button>';
      h += '</div></div>';
    });
    h += '</div>';
  }
  if (treatedUrgents.length > 0) {
    h += '<div class="card"><div class="card-header" style="color:var(--af-ok)">✅ Consignes urgentes traitées <span class="badge badge-green v2-ml-auto">' + treatedUrgents.length + '</span></div>';
    treatedUrgents.forEach(function(c) {
      var canDelete = isManager() || (S.user && c.created_by === S.user.id);
      h += '<div class="list-item" style="opacity:.6"><div class="list-content"><div class="list-title" style="text-decoration:line-through">' + esc(c.message) + '</div><div class="list-sub">Traité — Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      if (canDelete) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
      h += '</div>';
    });
    h += '</div>';
  }

  // Journal du jour
  h += '<div class="card"><div class="card-header">📋 Journal du jour — ' + fmtD(todayStr) + ' <span class="badge badge-blue v2-ml-auto">' + todayConsignes.length + '</span></div>';
  if (todayConsignes.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucune consigne aujourd\'hui</div></div></div>';
  } else {
    todayConsignes.filter(function(c) { return c.priority !== 'urgent'; }).forEach(function(c) {
      var canDelete = isManager() || (S.user && c.created_by === S.user.id);
      var prioIcon = c.priority === 'high' ? '🟡 ' : '';
      var readStyle = c.is_read ? ' style="opacity:.6"' : '';
      var readStrike = c.is_read ? ' style="text-decoration:line-through"' : '';
      h += '<div class="list-item"' + readStyle + '><div class="list-content"><div class="list-title"' + readStrike + '>' + prioIcon + (c.is_read ? '✅ ' : '') + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions">';
      if (!c.is_read && isManager()) h += '<button class="btn btn-success btn-sm" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button> ';
      if (canDelete) h += '<button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  // Historique (jours précédents) — groupé par jour, menu déroulant
  if (olderConsignes.length > 0) {
    // Grouper par date
    var byDay = {};
    olderConsignes.forEach(function(c) {
      var day = c.created_at ? c.created_at.substring(0, 10) : 'inconnu';
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(c);
    });
    var days = Object.keys(byDay).sort().reverse();

    h += '<div class="card"><div class="card-header">📜 Historique <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + olderConsignes.length + '</span></div>';
    h += '<div class="card-body" style="padding:0">';

    days.forEach(function(day) {
      var items = byDay[day];
      var stateKey = '_consHist_' + day;
      var isOpen = S[stateKey];

      h += '<div style="border-bottom:1px solid var(--border)">';
      h += '<div onclick="S._consHist_' + day.replace(/-/g,'') + '=!S._consHist_' + day.replace(/-/g,'') + ';render()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;background:var(--bg-off);transition:background var(--transition-fast)">';
      h += '<div style="display:flex;align-items:center;gap:10px"><span class="v2-text-md v2-font-700">📅 ' + fmtD(day) + '</span><span class="badge badge-blue">' + items.length + '</span></div>';
      h += '<span style="font-size:12px;color:var(--ink-muted)">' + (S['_consHist_' + day.replace(/-/g,'')] ? '▼' : '▶') + '</span>';
      h += '</div>';

      if (S['_consHist_' + day.replace(/-/g,'')]) {
        items.forEach(function(c) {
          var canDelete = isManager() || (S.user && c.created_by === S.user.id);
          var prioIcon = c.priority === 'urgent' ? '🔴 ' : c.priority === 'high' ? '🟡 ' : '';
          h += '<div class="list-item" style="padding-left:28px"><div class="list-content"><div class="list-title">' + prioIcon + esc(c.message) + '</div><div class="list-sub">Par ' + esc(c.created_by_name) + ' — ' + fmtDT(c.created_at).split(' ').pop() + '</div></div>';
          if (canDelete) h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="deleteConsigne(\'' + c.id + '\')">🗑️</button></div>';
          h += '</div>';
        });
      }
      h += '</div>';
    });

    h += '</div></div>';
  }

  return h;
}
