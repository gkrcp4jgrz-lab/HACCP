function renderSettings() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès restreint</div></div></div></div>';
  }

  var h = '';
  h += '<div class="settings-tabs-wrap">';
  var settingsTabs = ['equipment','products','suppliers','cleaning','modules','notifications','audit'];
  var settingsLabels = {equipment:'❄️ Équip.',products:'🍽️ Produits',suppliers:'🏭 Fourn.',cleaning:'🧹 Nettoyage',modules:'📦 Modules',notifications:'🔔 Notifs',audit:'📋 Historique'};
  settingsTabs.forEach(function(t) {
    h += '<button class="settings-tab' + (S.settingsTab===t?' active':'') + '" onclick="S.settingsTab=\'' + t + '\';render()">' + settingsLabels[t] + '</button>';
  });
  h += '</div>';

  if (S.settingsTab === 'equipment') h += renderSettingsEquipment();
  else if (S.settingsTab === 'products') h += renderSettingsProducts();
  else if (S.settingsTab === 'suppliers') h += renderSettingsSuppliers();
  else if (S.settingsTab === 'cleaning') h += renderSettingsCleaning();
  else if (S.settingsTab === 'modules') h += renderSettingsModules();
  else if (S.settingsTab === 'notifications') h += renderSettingsNotifications();
  else if (S.settingsTab === 'audit') h += renderSettingsAudit();

  return h;
}

function renderSettingsEquipment() {
  var h = '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">❄️</span> Ajouter un équipement</div><div class="card-body"><form onsubmit="handleAddEquip(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="eqName" required placeholder="Ex: Frigo cuisine"></div>';
  h += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="eqType"><option value="fridge">Frigo</option><option value="freezer">Congélateur</option><option value="hot">Chaud</option><option value="other">Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Temp. min °C</label><input type="number" step="0.1" class="form-input" id="eqMin" value="0"></div>';
  h += '<div class="form-group"><label class="form-label">Temp. max °C</label><input type="number" step="0.1" class="form-input" id="eqMax" value="4"></div></div>';
  h += '<div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" id="eqEmoji" value="❄️" maxlength="4"></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Équipements actifs <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + S.siteConfig.equipment.length + '</span></div>';
  S.siteConfig.equipment.forEach(function(e) {
    h += '<div class="list-item"><div class="list-icon v2-list-icon--primary">' + e.emoji + '</div><div class="list-content"><div class="list-title">' + esc(e.name) + '</div><div class="list-sub">' + e.temp_min + '°C → ' + e.temp_max + '°C · ' + ({fridge:'Frigo',freezer:'Congélateur',hot:'Chaud',other:'Autre'}[e.type] || e.type) + '</div></div><div class="list-actions"><button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="deleteEquipment(\'' + e.id + '\')" title="Désactiver">' + IC.trash + '</button></div></div>';
  });
  if (S.siteConfig.equipment.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun équipement</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsProducts() {
  var h = '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">🍽️</span> Ajouter un produit</div><div class="card-body"><form onsubmit="handleAddProd(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="prName" required placeholder="Ex: Saumon frais"></div>';
  h += '<div class="form-group"><label class="form-label">Catégorie</label><select class="form-select" id="prCat"><option value="frigo">Frigo</option><option value="congel">Congélateur</option><option value="chaud">Chaud</option><option value="autre">Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Temp. min °C</label><input type="number" step="0.1" class="form-input" id="prMin" value="0"></div>';
  h += '<div class="form-group"><label class="form-label">Temp. max °C</label><input type="number" step="0.1" class="form-input" id="prMax" value="4"></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" id="prEmoji" value="📦" maxlength="4"></div>';
  h += '<div class="form-group"><label class="form-label">Mode de consommation</label><select class="form-select" id="prConsoMode"><option value="whole">Entier (oeufs, saucisses...)</option><option value="openable">Entamable (rosette, fromage...)</option></select></div></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Produits actifs <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + S.siteConfig.products.length + '</span></div>';
  S.siteConfig.products.forEach(function(p) {
    var modeLabel = p.consumption_mode === 'openable' ? ' · Entamable' : ' · Entier';
    h += '<div class="list-item"><div class="list-icon v2-list-icon--ok">' + p.emoji + '</div><div class="list-content"><div class="list-title">' + esc(p.name) + '</div><div class="list-sub">' + p.temp_min + '°C → ' + p.temp_max + '°C · ' + ({frigo:'Frigo',congel:'Congélateur',chaud:'Chaud',autre:'Autre'}[p.category] || p.category) + modeLabel + '</div></div><div class="list-actions"><button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="deleteProduct(\'' + p.id + '\')" title="Désactiver">' + IC.trash + '</button></div></div>';
  });
  if (S.siteConfig.products.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun produit</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsSuppliers() {
  var h = '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">🏭</span> Ajouter un fournisseur</div><div class="card-body"><form onsubmit="handleAddSupp(event)">';
  h += '<div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="spName" required placeholder="Ex: Brake France"></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="spPhone" placeholder="0612345678"></div>';
  h += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="spEmail" placeholder="contact@four.com"></div></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Fournisseurs actifs <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + S.siteConfig.suppliers.length + '</span></div>';
  S.siteConfig.suppliers.forEach(function(s) {
    h += '<div class="list-item"><div class="list-icon v2-list-icon--warning">🏭</div><div class="list-content"><div class="list-title">' + esc(s.name) + '</div><div class="list-sub">' + (s.phone ? esc(s.phone) + ' ' : '') + (s.email ? '· ' + esc(s.email) : '') + '</div></div><div class="list-actions"><button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="deleteSupplier(\'' + s.id + '\')" title="Désactiver">' + IC.trash + '</button></div></div>';
  });
  if (S.siteConfig.suppliers.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun fournisseur</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsModules() {
  var modules = [
    {key:'temperatures',label:'🌡️ Températures',desc:'Relevés de température des équipements et produits'},
    {key:'dlc',label:'📅 Contrôle DLC',desc:'Suivi des dates limites de consommation'},
    {key:'lots',label:'📦 Traçabilité',desc:'Enregistrement des numéros de lots'},
    {key:'orders',label:'🛒 Commandes',desc:'Gestion des commandes fournisseurs'},
    {key:'consignes',label:'💬 Consignes',desc:'Communication inter-équipes'},
    {key:'cleaning',label:'🧹 Nettoyage',desc:'Plan de nettoyage et suivi des tâches'},
    {key:'incidents',label:'🚨 Signalements',desc:'Signalement et suivi des incidents'}
  ];

  var h = '<div class="card"><div class="card-header">📦 Modules actifs pour ce site</div><div class="card-body">';
  modules.forEach(function(m) {
    var enabled = moduleEnabled(m.key);
    h += '<div class="list-item"><div class="list-content"><div class="list-title">' + m.label + '</div><div class="list-sub">' + m.desc + '</div></div>';
    h += '<label class="toggle"><input type="checkbox" ' + (enabled?'checked':'') + ' onchange="toggleModule(\'' + m.key + '\',this.checked)"><span class="toggle-slider"></span></label></div>';
  });
  h += '</div></div>';

  // Config température
  if (moduleEnabled('temperatures')) {
    var site = currentSite();
    var servicesPerDay = (site && site.services_per_day) || 1;
    h += '<div class="card"><div class="card-header">🌡️ Configuration températures</div><div class="card-body">';
    h += '<div class="form-group"><label class="form-label">Nombre de services par jour</label>';
    h += '<div class="v2-flex v2-items-center v2-gap-12">';
    h += '<select class="form-select" style="max-width:200px;width:100%" onchange="updateSiteConfig(\'services_per_day\',parseInt(this.value))">';
    for (var i = 1; i <= 4; i++) {
      h += '<option value="' + i + '"' + (servicesPerDay===i?' selected':'') + '>' + i + ' service' + (i>1?'s':'') + ' / jour</option>';
    }
    h += '</select>';
    h += '<span class="v2-text-base v2-text-muted">Chaque service nécessite un relevé complet de tous les équipements et produits</span>';
    h += '</div></div>';
    h += '</div></div>';
  }

  return h;
}

function renderSettingsNotifications() {
  var h = '';
  // Load saved settings
  var emailEnabled = localStorage.getItem('haccp_email_enabled') === 'true';
  var emailTo = localStorage.getItem('haccp_email_to') || '';
  var emailEvents; try { emailEvents = JSON.parse(localStorage.getItem('haccp_email_events') || '["temp_validation","dlc_expired","incident"]'); } catch(e) { emailEvents = ['temp_validation','dlc_expired','incident']; }
  var claudeKey = sessionStorage.getItem('haccp_claude_key') || '';

  // Email notifications
  h += '<div class="card"><div class="card-header">📧 Notifications par email</div><div class="card-body">';
  h += '<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer"><label class="toggle"><input type="checkbox" id="emailEnabled" ' + (emailEnabled ? 'checked' : '') + ' onchange="saveNotifSettings()"><span class="toggle-slider"></span></label> Activer les notifications email</label></div>';
  h += '<div id="emailConfig" style="' + (emailEnabled ? '' : 'opacity:.5;pointer-events:none') + '">';
  h += '<div class="form-group"><label class="form-label">Destinataire(s)</label><input type="text" class="form-input" id="emailTo" value="' + esc(emailTo) + '" placeholder="gerant@hotel.com, autre@hotel.com" onchange="saveNotifSettings()"></div>';
  h += '<div class="form-group"><label class="form-label">Événements déclencheurs</label>';
  h += '<div class="v2-flex v2-flex-col v2-gap-8">';
  h += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" class="emailEvt" value="temp_validation" ' + (emailEvents.indexOf('temp_validation') >= 0 ? 'checked' : '') + ' onchange="saveNotifSettings()"> Validation d\'un service températures</label>';
  h += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" class="emailEvt" value="temp_nonconform" ' + (emailEvents.indexOf('temp_nonconform') >= 0 ? 'checked' : '') + ' onchange="saveNotifSettings()"> Température non conforme détectée</label>';
  h += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" class="emailEvt" value="dlc_expired" ' + (emailEvents.indexOf('dlc_expired') >= 0 ? 'checked' : '') + ' onchange="saveNotifSettings()"> DLC expirée</label>';
  h += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" class="emailEvt" value="incident" ' + (emailEvents.indexOf('incident') >= 0 ? 'checked' : '') + ' onchange="saveNotifSettings()"> Nouveau signalement</label>';
  h += '</div></div>';
  h += '</div>';
  h += '<div id="emailSaveStatus"></div>';
  h += '</div></div>';

  // Report email (manager only)
  var reportEmail = localStorage.getItem('haccp_report_email') || emailTo;
  var reportHour = localStorage.getItem('haccp_report_hour') || '08';
  var reportEnabled = localStorage.getItem('haccp_report_enabled') === 'true';
  h += '<div class="card"><div class="card-header">📄 Rapport quotidien automatique</div><div class="card-body">';
  h += '<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer"><label class="toggle"><input type="checkbox" id="reportEnabled" ' + (reportEnabled ? 'checked' : '') + ' onchange="saveReportEmail()"><span class="toggle-slider"></span></label> Envoyer un rapport de la veille chaque matin</label></div>';
  h += '<div id="reportConfig" style="' + (reportEnabled ? '' : 'opacity:.5;pointer-events:none') + '">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Email destinataire</label><input type="text" class="form-input" id="reportEmail" value="' + esc(reportEmail) + '" placeholder="gerant@hotel.com" onchange="saveReportEmail()"></div>';
  h += '<div class="form-group"><label class="form-label">Heure d\'envoi</label><select class="form-select" id="reportHour" onchange="saveReportEmail()">';
  for (var rh = 6; rh <= 10; rh++) {
    var rhStr = rh < 10 ? '0' + rh : '' + rh;
    h += '<option value="' + rhStr + '"' + (reportHour === rhStr ? ' selected' : '') + '>' + rhStr + ':00</option>';
  }
  h += '</select></div></div>';
  h += '<p class="v2-text-xs v2-text-muted">Le rapport inclut : températures, DLC, nettoyage et incidents de la veille.</p>';
  h += '</div>';
  h += '<div id="reportEmailStatus"></div>';
  h += '</div></div>';

  // OCR status (visible to all managers)
  h += '<div class="card"><div class="card-header">📷 Reconnaissance d\'étiquettes (OCR)</div><div class="card-body">';
  h += '<div class="v2-ocr-status v2-ocr-status--success v2-mb-8">✅ Détection automatique active — Prenez une photo d\'étiquette, les champs se rempliront automatiquement.</div>';
  h += '<p class="v2-text-sm v2-text-muted">Fonctionne pour : DLC, numéros de lot, bons de livraison.</p>';

  // Advanced: API key fallback (super_admin only)
  if (S.profile && S.profile.role === 'super_admin') {
    h += '<details class="v2-mt-16"><summary class="v2-text-sm v2-text-muted" style="cursor:pointer">⚙️ Configuration avancée (admin)</summary>';
    h += '<div class="v2-mt-8"><p class="v2-text-xs v2-text-muted v2-mb-8">Clé API de secours si le serveur OCR n\'est pas disponible.</p>';
    h += '<div class="form-group"><label class="form-label">Clé API Claude (fallback)</label><input type="password" class="form-input" id="claudeApiKey" value="' + esc(claudeKey) + '" placeholder="sk-ant-..." onchange="saveClaudeKey()"></div>';
    if (claudeKey) {
      h += '<button type="button" class="btn btn-ghost btn-sm" onclick="clearClaudeKey()">🗑️ Supprimer la clé</button>';
    }
    h += '</div></details>';
  }
  h += '</div></div>';

  return h;
}

window.saveNotifSettings = function() {
  var enabled = document.getElementById('emailEnabled').checked;
  var emailTo = document.getElementById('emailTo').value.trim();
  var events = [];
  document.querySelectorAll('.emailEvt:checked').forEach(function(cb) { events.push(cb.value); });
  
  localStorage.setItem('haccp_email_enabled', enabled);
  localStorage.setItem('haccp_email_to', emailTo);
  localStorage.setItem('haccp_email_events', JSON.stringify(events));

  // Toggle opacity
  var cfg = document.getElementById('emailConfig');
  if (cfg) cfg.style = enabled ? '' : 'opacity:.5;pointer-events:none';

  var status = document.getElementById('emailSaveStatus');
  if (status) {
    status.innerHTML = '<div class="v2-ocr-status v2-ocr-status--success v2-mt-8">✅ Paramètres sauvegardés</div>';
    setTimeout(function() { if (status) status.innerHTML = ''; }, 2000);
  }
};

window.saveReportEmail = function() {
  var enabled = document.getElementById('reportEnabled') ? document.getElementById('reportEnabled').checked : false;
  var email = document.getElementById('reportEmail') ? document.getElementById('reportEmail').value.trim() : '';
  var hour = document.getElementById('reportHour') ? document.getElementById('reportHour').value : '08';

  localStorage.setItem('haccp_report_enabled', enabled);
  localStorage.setItem('haccp_report_email', email);
  localStorage.setItem('haccp_report_hour', hour);

  // Toggle opacity
  var cfg = document.getElementById('reportConfig');
  if (cfg) cfg.style = enabled ? '' : 'opacity:.5;pointer-events:none';

  var status = document.getElementById('reportEmailStatus');
  if (status) {
    if (enabled && email) {
      status.innerHTML = '<div class="v2-ocr-status v2-ocr-status--success v2-mt-8">✅ Rapport quotidien à ' + hour + ':00 → ' + esc(email) + '</div>';
    } else if (enabled && !email) {
      status.innerHTML = '<div class="v2-ocr-status v2-ocr-status--warning v2-mt-8">⚠️ Ajoutez un email destinataire</div>';
    } else {
      status.innerHTML = '<div class="v2-ocr-status v2-ocr-status--success v2-mt-8">Rapport quotidien désactivé</div>';
    }
    setTimeout(function() { if (status) status.innerHTML = ''; }, 3000);
  }
};

window.saveClaudeKey = function() {
  var key = document.getElementById('claudeApiKey').value.trim();
  sessionStorage.setItem('haccp_claude_key', key);
  localStorage.removeItem('haccp_claude_key');
  S.claudeApiKey = key;
  render();
};

window.clearClaudeKey = function() {
  sessionStorage.removeItem('haccp_claude_key');
  localStorage.removeItem('haccp_claude_key');
  S.claudeApiKey = '';
  render();
  showToast('Clé API supprimée', 'success');
};

function renderSettingsCleaning() {
  var h = '';

  // Add form
  h += '<div class="card card-accent"><div class="card-header"><span class="v2-text-2xl">🧹</span> Ajouter une tâche de nettoyage</div><div class="card-body">';
  h += '<form onsubmit="handleCleaningSchedule(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom de la tâche <span class="req">*</span></label><input type="text" class="form-input" id="cleanName" required placeholder="Ex: Nettoyage plan de travail"></div>';
  h += '<div class="form-group"><label class="form-label">Zone</label><input type="text" class="form-input" id="cleanZone" placeholder="Ex: Cuisine, Salle, Stockage"></div></div>';
  h += '<div class="form-group"><label class="form-label">Fréquence</label>';
  h += '<select class="form-select" id="cleanFreq" onchange="toggleCleanFreqFields()">';
  h += '<option value="daily">Quotidien</option>';
  h += '<option value="weekly">Hebdomadaire</option>';
  h += '<option value="monthly">Mensuel</option>';
  h += '<option value="one_time">Ponctuel</option>';
  h += '</select></div>';
  h += '<div id="cleanFreqFields"></div>';
  h += '<input type="hidden" id="cleanRole" value="employee">';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:8px">✓ Ajouter</button>';
  h += '</form></div></div>';

  // List
  var schedules = S.data.cleaning_schedules || [];
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Tâches configurées <span class="badge badge-blue">' + schedules.length + '</span></div>';
  if (schedules.length > 0) {
    schedules.forEach(function(s) {
      var freqLabel = (typeof getFreqLabel === 'function') ? getFreqLabel(s) : s.frequency;
      h += '<div class="list-item"><div class="list-icon" style="font-size:24px">🧹</div><div class="list-content">';
      h += '<div class="list-title">' + esc(s.name) + '</div>';
      h += '<div class="list-sub">' + esc(s.zone || 'Sans zone') + ' · ' + freqLabel + '</div>';
      h += '</div><div class="list-actions"><button class="btn btn-ghost btn-sm v2-icon-btn v2-icon-btn--danger" onclick="deleteCleaningSchedule(\'' + s.id + '\')" title="Supprimer">' + IC.trash + '</button></div></div>';
    });
  } else {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🧹</div><div class="empty-title">Aucune tâche configurée</div><div class="empty-text">Ajoutez des tâches de nettoyage pour votre site.</div></div></div>';
  }
  h += '</div>';

  return h;
}

// ── AUDIT TRAIL VIEWER ──

function renderSettingsAudit() {
  var h = '';
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Journal d\'audit (HACCP)';
  h += '<span class="badge badge-blue v2-badge-lg v2-ml-auto">Tracabilite</span></div>';
  h += '<div class="card-body" style="padding:12px 16px">';
  h += '<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Toutes les modifications de donnees sont enregistrees automatiquement. Ce journal est inalterable et constitue une preuve en cas de controle DDPP.</p>';
  h += '</div>';
  h += '<div id="auditLogContainer"><div style="text-align:center;padding:24px"><div class="loading" style="width:24px;height:24px;border-width:3px;display:inline-block"></div></div></div>';
  h += '</div>';
  setTimeout(function() { loadAndRenderAuditLogs(0); }, 50);
  return h;
}

window.loadAndRenderAuditLogs = async function(offset) {
  var container = document.getElementById('auditLogContainer');
  if (!container) return;
  var limit = 30;
  var result = await loadAuditLogs(S.currentSiteId, offset, limit);
  if (result.error) {
    container.innerHTML = '<div class="card-body"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Table audit_logs non disponible</div><div class="empty-text">Executez le SQL Phase 1A dans Supabase pour activer l\'audit trail.</div></div></div>';
    return;
  }
  var logs = result.data;
  var total = result.count;
  var h = '';

  if (logs.length === 0 && offset === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucun evenement</div><div class="empty-text">Les actions futures seront enregistrees ici automatiquement.</div></div></div>';
  } else {
    var tableLabels = { temperatures: '🌡️ Temperature', dlcs: '📅 DLC', lots: '📦 Lot', orders: '🛒 Commande', cleaning_logs: '🧹 Nettoyage', incident_reports: '🚨 Incident', site_equipment: '❄️ Equipement', profiles: '👤 Profil' };
    var actionLabels = { INSERT: 'Ajout', UPDATE: 'Modification', DELETE: 'Suppression' };
    var actionColors = { INSERT: 'badge-green', UPDATE: 'badge-blue', DELETE: 'badge-red' };

    logs.forEach(function(log) {
      var icon = tableLabels[log.table_name] || ('📄 ' + log.table_name);
      var actionLabel = actionLabels[log.action] || log.action;
      var actionClass = actionColors[log.action] || 'badge-gray';
      var changed = (log.changed_fields || []).join(', ');

      h += '<div class="list-item" style="cursor:pointer" onclick="this.querySelector(\'.audit-detail\').style.display=this.querySelector(\'.audit-detail\').style.display===\'none\'?\'\':\'none\'">';
      h += '<div class="list-content" style="min-width:0">';
      h += '<div class="list-title" style="font-size:13px">' + icon.split(' ')[0] + ' ';
      h += '<span class="badge ' + actionClass + '" style="font-size:10px;padding:2px 6px">' + actionLabel + '</span> ';
      h += icon.split(' ').slice(1).join(' ');
      if (changed) h += ' <span style="color:var(--muted);font-size:11px">(' + esc(changed) + ')</span>';
      h += '</div>';
      h += '<div class="list-sub">' + esc(log.user_name || 'Systeme') + ' · ' + fmtDT(log.created_at) + '</div>';
      // Detail expandable
      h += '<div class="audit-detail" style="display:none;margin-top:8px;padding:8px;background:var(--bg-off);border-radius:6px;font-size:11px;font-family:monospace;max-height:200px;overflow:auto;word-break:break-all">';
      if (log.action === 'UPDATE' && log.old_data && log.new_data && log.changed_fields) {
        log.changed_fields.forEach(function(field) {
          var oldVal = log.old_data[field];
          var newVal = log.new_data[field];
          h += '<div style="margin-bottom:4px"><strong>' + esc(field) + '</strong> : ';
          h += '<span style="color:var(--err);text-decoration:line-through">' + esc(String(oldVal === null ? 'null' : oldVal)) + '</span>';
          h += ' → <span style="color:var(--ok)">' + esc(String(newVal === null ? 'null' : newVal)) + '</span></div>';
        });
      } else if (log.action === 'INSERT' && log.new_data) {
        h += '<div style="color:var(--ok)">+ ' + esc(JSON.stringify(log.new_data).substring(0, 500)) + '</div>';
      } else if (log.action === 'DELETE' && log.old_data) {
        h += '<div style="color:var(--err)">- ' + esc(JSON.stringify(log.old_data).substring(0, 500)) + '</div>';
      }
      h += '</div>';
      h += '</div></div>';
    });

    // Pagination
    h += '<div style="display:flex;justify-content:center;gap:8px;padding:12px">';
    if (offset > 0) {
      h += '<button class="btn btn-outline btn-sm" onclick="loadAndRenderAuditLogs(' + Math.max(0, offset - limit) + ')">← Precedent</button>';
    }
    h += '<span style="font-size:12px;color:var(--muted);align-self:center">' + (offset + 1) + '-' + Math.min(offset + logs.length, total) + ' / ' + total + '</span>';
    if (offset + limit < total) {
      h += '<button class="btn btn-outline btn-sm" onclick="loadAndRenderAuditLogs(' + (offset + limit) + ')">Suivant →</button>';
    }
    h += '</div>';
  }

  container.innerHTML = h;
};
