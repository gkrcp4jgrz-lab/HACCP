// =====================================================================
// CLEANING — Plan de nettoyage
// =====================================================================

function getTodayCleaningSchedules() {
  var now = new Date();
  var dow = now.getDay(); // 0=dim
  var dom = now.getDate();
  return (S.data.cleaning_schedules || []).filter(function(s) {
    if (s.frequency === 'daily') return true;
    if (s.frequency === 'weekly') return dow === 1; // lundi
    if (s.frequency === 'monthly') return dom === 1; // 1er du mois
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
  h += '<div class="tabs">';
  ['today','overdue','completed','all'].forEach(function(t) {
    var labels = {today:'📋 Aujourd\'hui', overdue:'⚠️ En retard', completed:'✅ Terminées', all:'📁 Toutes'};
    h += '<button class="tab' + (S.cleaningFilter === t ? ' active' : '') + '" onclick="S.cleaningFilter=\'' + t + '\';render()">' + labels[t] + '</button>';
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
  var freqLabels = {daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel'};

  if (schedules.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🧹</div>';
    h += '<div class="empty-title">Aucune tâche prévue aujourd\'hui</div>';
    h += '<div class="empty-text">Configurez vos tâches de nettoyage dans les paramètres du site.</div></div></div></div>';
    return h;
  }

  // Pending tasks
  var pending = schedules.filter(function(s) { return !completedIds[s.id]; });
  var done = schedules.filter(function(s) { return completedIds[s.id]; });

  if (pending.length > 0) {
    h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">⏳</span> À faire <span class="badge badge-blue">' + pending.length + '</span></div>';
    pending.forEach(function(s) {
      h += '<div class="list-item"><div class="list-icon" style="font-size:24px">🧹</div>';
      h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div>';
      h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + ' · ' + (freqLabels[s.frequency] || s.frequency) + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-primary" onclick="openCleaningRecordModal(' + JSON.stringify(s.id) + ',' + JSON.stringify(s.name) + ')">✅ Fait</button></div>';
      h += '</div>';
    });
    h += '</div>';
  }

  if (done.length > 0) {
    h += '<div class="card v2-mt-16"><div class="card-header"><span class="v2-text-2xl">✅</span> Terminées <span class="badge badge-green">' + done.length + '</span></div>';
    done.forEach(function(s) {
      var rec = completedIds[s.id];
      h += '<div class="list-item" style="opacity:.7"><div class="list-icon" style="font-size:24px">✅</div>';
      h += '<div class="list-content"><div class="list-title" style="text-decoration:line-through">' + esc(s.name) + '</div>';
      h += '<div class="list-sub">' + esc(s.zone || '') + (rec ? ' · par ' + esc(rec.performed_by_name) + ' à ' + fmtTime(rec.performed_at) : '') + '</div></div>';
      h += '</div>';
    });
    h += '</div>';
  }

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
    var borderColor = level === 'danger' ? 'var(--danger)' : level === 'warning' ? 'var(--warning)' : 'var(--primary)';
    h += '<div class="list-item" style="border-left:3px solid ' + borderColor + '">';
    h += '<div class="list-icon" style="font-size:24px">🧹</div>';
    h += '<div class="list-content"><div class="list-title">' + esc(s.name) + '</div>';
    h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + '</div></div>';
    h += '<div class="list-actions"><button class="btn btn-primary" onclick="openCleaningRecordModal(' + JSON.stringify(s.id) + ',' + JSON.stringify(s.name) + ')">✅ Fait</button></div>';
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
      h += '<div class="list-actions"><img src="' + r.photo_data + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;cursor:pointer" onclick="openModal(\'<div class=modal-body><img src=&quot;\' + this.src + \'&quot; style=max-width:100%;border-radius:12px></div>\')"></div>';
    }
    h += '</div>';
  });
  h += '</div>';

  return h;
}

function renderCleaningAll(schedules) {
  var h = '';
  var freqLabels = {daily:'Quotidien', weekly:'Hebdomadaire', monthly:'Mensuel'};

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
    h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + ' · ' + (freqLabels[s.frequency] || s.frequency) + '</div></div>';
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

window.openCleaningRecordModal = function(scheduleId, scheduleName) {
  var safeName = esc(scheduleName);
  var h = '<div class="modal-header"><div class="modal-title">🧹 ' + safeName + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<div class="form-group"><label class="form-label">Notes (optionnel)</label>';
  h += '<textarea class="form-textarea" id="cleanNotes" rows="2" placeholder="Observations, remarques..."></textarea></div>';
  h += '<div class="form-group"><label class="form-label">Photo (optionnel)</label>';
  h += '<label class="photo-box" for="cleanPhotoInput"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo</div><div class="photo-hint">Preuve de nettoyage</div></label>';
  h += '<input type="file" id="cleanPhotoInput" accept="image/*" capture="environment" onchange="handleCleaningPhoto(this)" style="display:none">';
  h += '<div id="cleanPhotoPreview"></div></div>';
  h += '</div>';
  h += '<div class="modal-footer" style="gap:12px">';
  h += '<button class="btn btn-ghost" onclick="handleCleaningRecord(' + JSON.stringify(scheduleId) + ',\'skipped\')">⏭️ Passer</button>';
  h += '<button class="btn btn-primary btn-lg" onclick="handleCleaningRecord(' + JSON.stringify(scheduleId) + ',\'completed\')">✅ Terminé</button>';
  h += '</div>';
  openModal(h);
};

window.deleteCleaningSchedule = function(id) {
  return deleteCleaningSchedule(id);
};

window.openCleaningAddModal = function() {
  var h = '<div class="modal-header"><div class="modal-title">🧹 Ajouter une tâche</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  h += '<div class="modal-body">';
  h += '<form onsubmit="handleCleaningSchedule(event)">';
  h += '<div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="cleanName" required placeholder="Ex: Nettoyage plan de travail"></div>';
  h += '<div class="form-group"><label class="form-label">Zone</label><input type="text" class="form-input" id="cleanZone" placeholder="Cuisine, Salle..."></div>';
  h += '<div class="form-group"><label class="form-label">Fréquence</label>';
  h += '<select class="form-select" id="cleanFreq"><option value="daily">Quotidien</option><option value="weekly">Hebdomadaire</option><option value="monthly">Mensuel</option></select></div>';
  h += '<input type="hidden" id="cleanRole" value="employee">';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">Ajouter</button>';
  h += '</form>';
  h += '</div>';
  openModal(h);
};
