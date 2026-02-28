// =====================================================================
// CLEANING — Plan de nettoyage
// =====================================================================

function getTodayCleaningSchedules() {
  var now = new Date();
  var dow = now.getDay(); // 0=dim, 1=lun, ..., 6=sam
  var dom = now.getDate();
  var todayStr = now.toISOString().slice(0, 10);
  return (S.data.cleaning_schedules || []).filter(function(s) {
    if (s.frequency === 'daily') return true;
    if (s.frequency === 'weekly') {
      var targetDay = (s.day_of_week != null) ? s.day_of_week : 1;
      return dow === targetDay;
    }
    if (s.frequency === 'monthly') {
      var targetDom = (s.day_of_month != null) ? s.day_of_month : 1;
      return dom === targetDom;
    }
    if (s.frequency === 'one_time') {
      return s.one_time_date === todayStr;
    }
    return false;
  });
}

function renderCleaning() {
  var h = '';
  var schedules = S.data.cleaning_schedules || [];
  var records = S.data.cleaning_logs || [];
  var todayScheds = getTodayCleaningSchedules();
  var completedIds = {};
  records.forEach(function(r) { completedIds[r.schedule_id] = r; });
  var doneCount = todayScheds.filter(function(s) { return completedIds[s.id]; }).length;
  var totalCount = todayScheds.length;
  var pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  // Tabs
  h += '<div class="tabs" style="overflow:visible">';
  ['today','overdue','completed','all'].forEach(function(t) {
    var labels = {today:'📋 Aujourd\'hui', overdue:'⚠️ En retard', completed:'✅ Terminées', all:'📁 Toutes'};
    h += '<button class="tab' + (S.cleaningFilter === t ? ' active' : '') + '" onclick="S.cleaningFilter=\'' + t + '\';render()" style="flex:1;text-align:center">' + labels[t] + '</button>';
  });
  h += '</div>';

  // Progress card
  if (S.cleaningFilter === 'today' || S.cleaningFilter === 'overdue') {
    h += '<div class="card v2-mb-18"><div class="card-body v2-card-body--compact">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    h += '<span style="font-weight:700;font-size:15px">🧹 Nettoyage du jour</span>';
    h += '<span style="font-weight:800;font-size:20px;color:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '">' + doneCount + '/' + totalCount + '</span>';
    h += '</div>';
    h += '<div class="progress" style="height:6px"><div class="progress-bar" style="width:' + pct + '%;background:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div>';
    h += '</div></div>';
  }

  // Quick add button
  h += '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">';
  h += '<button class="btn btn-primary" onclick="openCleaningAddModal()">+ Ajouter une tâche</button>';
  h += '</div>';

  // Content by filter
  if (S.cleaningFilter === 'today') {
    h += renderCleaningToday(todayScheds, completedIds);
  } else if (S.cleaningFilter === 'overdue') {
    h += renderCleaningOverdue(todayScheds, completedIds);
  } else if (S.cleaningFilter === 'completed') {
    h += renderCleaningCompleted(records);
  } else {
    h += renderCleaningAll(schedules);
  }

  return h;
}

function renderCleaningToday(schedules, completedIds) {
  var h = '';

  if (schedules.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🧹</div>';
    h += '<div class="empty-title">Aucune tâche prévue aujourd\'hui</div>';
    h += '<div class="empty-text">Configurez vos tâches de nettoyage dans les paramètres du site.</div></div></div></div>';
    return h;
  }

  // Pending tasks
  var pending = schedules.filter(function(s) { return !completedIds[s.id]; });
  var done = schedules.filter(function(s) { return completedIds[s.id]; });

  // Checklist — all tasks in one card
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Checklist du jour <span class="badge ' + (pending.length === 0 && done.length > 0 ? 'badge-green' : 'badge-blue') + '">' + done.length + '/' + schedules.length + '</span></div>';

  // Pending tasks (unchecked)
  pending.forEach(function(s) {
    h += '<div class="list-item" style="cursor:pointer" onclick="quickCleaningDone(\'' + s.id + '\')">';
    h += '<div style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s"></div>';
    h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div>';
    h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + ' · ' + getFreqLabel(s) + '</div></div>';
    h += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openCleaningRecordModal(\'' + s.id + '\')" title="Notes">📝</button>';
    h += '</div>';
  });

  // Done tasks (checked)
  done.forEach(function(s) {
    var rec = completedIds[s.id];
    h += '<div class="list-item" style="opacity:.6">';
    h += '<div style="width:28px;height:28px;border-radius:50%;background:var(--af-ok);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';
    h += '<div class="list-content"><div class="list-title" style="text-decoration:line-through">' + esc(s.name) + '</div>';
    h += '<div class="list-sub">' + esc(s.zone || '') + (rec ? ' · par ' + esc(rec.performed_by_name) + ' à ' + fmtTime(rec.performed_at) : '') + '</div></div>';
    h += '</div>';
  });

  h += '</div>';

  return h;
}

function renderCleaningOverdue(todayScheds, completedIds) {
  var h = '';
  var pending = todayScheds.filter(function(s) { return !completedIds[s.id]; });

  if (pending.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="v2-callout--ok" style="padding:16px;border-radius:var(--radius);text-align:center">';
    h += '<span class="v2-text-3xl">✅</span><br><strong>Toutes les tâches sont à jour !</strong>';
    h += '</div></div></div>';
    return h;
  }

  var now = new Date();
  var hour = now.getHours();

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">⚠️</span> Tâches en retard <span class="badge badge-red">' + pending.length + '</span></div>';
  pending.forEach(function(s) {
    var level = hour >= 18 ? 'danger' : hour >= 14 ? 'warning' : 'info';
    var borderColor = level === 'danger' ? 'var(--af-err)' : level === 'warning' ? 'var(--af-warn)' : 'var(--af-teal)';
    h += '<div class="list-item" style="border-left:3px solid ' + borderColor + ';cursor:pointer" onclick="quickCleaningDone(\'' + s.id + '\')">';
    h += '<div style="width:28px;height:28px;border-radius:50%;border:2px solid ' + borderColor + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>';
    h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div>';
    h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + '</div></div>';
    h += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openCleaningRecordModal(\'' + s.id + '\')" title="Notes & photo">📝</button>';
    h += '</div>';
  });
  h += '</div>';

  return h;
}

function renderCleaningCompleted(records) {
  var h = '';

  if (records.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">📋</div>';
    h += '<div class="empty-title">Aucune tâche terminée aujourd\'hui</div></div></div></div>';
    return h;
  }

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">✅</span> Terminées aujourd\'hui <span class="badge badge-green">' + records.length + '</span></div>';
  records.forEach(function(r) {
    var sched = (S.data.cleaning_schedules || []).find(function(s) { return s.id === r.schedule_id; });
    var name = sched ? sched.name : 'Tâche supprimée';
    var statusIcon = r.status === 'skipped' ? '⏭️' : '✅';
    var statusLabel = r.status === 'skipped' ? 'Passée' : 'Terminée';

    h += '<div class="list-item"><div class="list-icon" style="font-size:24px">' + statusIcon + '</div>';
    h += '<div class="list-content"><div class="list-title">' + esc(name) + ' <span class="badge ' + (r.status === 'skipped' ? 'badge-yellow' : 'badge-green') + '">' + statusLabel + '</span></div>';
    h += '<div class="list-sub">Par ' + esc(r.performed_by_name) + ' à ' + fmtTime(r.performed_at);
    if (r.notes) h += ' — ' + esc(r.notes);
    h += '</div></div>';
    if (r.photo_data) {
      S._cleaningPhotos = S._cleaningPhotos || {};
      S._cleaningPhotos[r.id] = r.photo_data;
      h += '<div class="list-actions"><img src="' + r.photo_data + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="openCleaningPhoto(\'' + r.id + '\')"></div>';
    }
    h += '</div>';
  });
  h += '</div>';

  return h;
}

function getFreqLabel(s) {
  var dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  if (s.frequency === 'daily') return 'Quotidien';
  if (s.frequency === 'weekly') return 'Hebdo (' + (dayNames[s.day_of_week] || 'Lun') + ')';
  if (s.frequency === 'monthly') return 'Mensuel (le ' + (s.day_of_month || 1) + ')';
  if (s.frequency === 'one_time') return 'Ponctuel' + (s.one_time_date ? ' (' + s.one_time_date + ')' : '');
  return s.frequency;
}

function renderCleaningAll(schedules) {
  var h = '';

  if (schedules.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🧹</div>';
    h += '<div class="empty-title">Aucune tâche configurée</div>';
    h += '<div class="empty-text">Allez dans Paramètres du site pour ajouter des tâches de nettoyage.</div></div></div></div>';
    return h;
  }

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Toutes les tâches <span class="badge badge-blue">' + schedules.length + '</span></div>';
  schedules.forEach(function(s) {
    h += '<div class="list-item"><div class="list-icon" style="font-size:24px">🧹</div>';
    h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div>';
    h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + ' · ' + getFreqLabel(s) + '</div></div>';
    h += '<div class="list-actions"><button class="btn btn-danger btn-sm" onclick="deleteCleaningSchedule(\'' + s.id + '\')">🗑️</button></div>';
    h += '</div>';
  });
  h += '</div>';

  return h;
}

function fmtTime(isoStr) {
  if (!isoStr) return '';
  var d = new Date(isoStr);
  return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

window.openCleaningRecordModal = function(scheduleId) {
  var sched = (S.data.cleaning_schedules || []).find(function(s) { return s.id === scheduleId; });
  var safeName = esc(sched ? sched.name : '');
  var h = '<div class="modal-header"><div class="modal-title">🧹 ' + safeName + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<div class="form-group"><label class="form-label">Notes (optionnel)</label>';
  h += '<textarea class="form-textarea" id="cleanNotes" rows="2" placeholder="Observations, remarques..."></textarea></div>';
  h += '</div>';
  h += '<div class="modal-footer" style="gap:12px">';
  h += '<button class="btn btn-ghost" onclick="handleCleaningRecord(\'' + scheduleId + '\',\'skipped\')">⏭️ Passer</button>';
  h += '<button class="btn btn-primary btn-lg" onclick="handleCleaningRecord(\'' + scheduleId + '\',\'completed\')">✅ Terminé</button>';
  h += '</div>';
  openModal(h);
};

window.openCleaningPhoto = function(logId) {
  var src = S._cleaningPhotos && S._cleaningPhotos[logId];
  if (!src) return;
  var h = '<div class="modal-header"><div class="modal-title">📸 Photo nettoyage</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body" style="text-align:center"><img src="' + src + '" style="max-width:100%;border-radius:12px"></div>';
  openModal(h);
};

window.quickCleaningDone = async function(scheduleId, scheduleName) {
  try {
    await addCleaningLog(scheduleId, 'completed', '');
  } catch(e) {
    console.error('quickCleaningDone error:', e);
    showToast('Erreur: ' + (e.message || e), 'error');
  }
};

window.openCleaningAddModal = function() {
  var h = '<div class="modal-header"><div class="modal-title">🧹 Ajouter une tâche</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<form onsubmit="handleCleaningSchedule(event)">';
  h += '<div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="cleanName" required placeholder="Ex: Nettoyage plan de travail"></div>';
  h += '<div class="form-group"><label class="form-label">Zone</label><input type="text" class="form-input" id="cleanZone" placeholder="Cuisine, Salle..."></div>';
  h += '<div class="form-group"><label class="form-label">Fréquence</label>';
  h += '<select class="form-select" id="cleanFreq" onchange="toggleCleanFreqFields()">';
  h += '<option value="daily">Quotidien</option>';
  h += '<option value="weekly">Hebdomadaire</option>';
  h += '<option value="monthly">Mensuel</option>';
  h += '<option value="one_time">Ponctuel</option>';
  h += '</select></div>';
  h += '<div id="cleanFreqFields"></div>';
  h += '<input type="hidden" id="cleanRole" value="employee">';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">Ajouter</button>';
  h += '</form>';
  h += '</div>';
  openModal(h);
};

window.toggleCleanFreqFields = function() {
  var freq = document.getElementById('cleanFreq').value;
  var container = document.getElementById('cleanFreqFields');
  if (!container) return;
  var dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  var h = '';
  if (freq === 'weekly') {
    h += '<div class="form-group"><label class="form-label">Jour de la semaine</label><select class="form-select" id="cleanDayOfWeek">';
    for (var i = 1; i <= 6; i++) h += '<option value="' + i + '"' + (i === 1 ? ' selected' : '') + '>' + dayNames[i] + '</option>';
    h += '<option value="0">Dimanche</option></select></div>';
  } else if (freq === 'monthly') {
    h += '<div class="form-group"><label class="form-label">Jour du mois</label><select class="form-select" id="cleanDayOfMonth">';
    for (var j = 1; j <= 28; j++) h += '<option value="' + j + '">' + j + '</option>';
    h += '</select></div>';
  } else if (freq === 'one_time') {
    h += '<div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="cleanOneTimeDate" required></div>';
  }
  container.innerHTML = h;
};
