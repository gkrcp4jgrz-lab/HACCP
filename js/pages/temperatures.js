function renderTemperatures() {
  var h = '';
  var site = currentSite();
  var servicesPerDay = (site && site.services_per_day) || 1;
  var eqCount = S.siteConfig.equipment.length;
  var prCount = S.siteConfig.products.length;
  var totalPerService = eqCount + prCount;
  var totalExpected = totalPerService * servicesPerDay;
  var tempCount = S.data.temperatures.length;
  var currentService = totalPerService > 0 ? Math.floor(tempCount / totalPerService) + 1 : 1;
  if (currentService > servicesPerDay) currentService = servicesPerDay;
  var serviceProgress = totalPerService > 0 ? tempCount % totalPerService : 0;
  if (tempCount > 0 && tempCount % totalPerService === 0) serviceProgress = totalPerService;
  var pct = totalExpected > 0 ? Math.min(100, Math.round(tempCount / totalExpected * 100)) : 0;
  var servicePct = totalPerService > 0 ? Math.min(100, Math.round(serviceProgress / totalPerService * 100)) : 0;
  var nonConform = S.data.temperatures.filter(function(t) { return !t.is_conform; });
  var conformCount = tempCount - nonConform.length;

  // Load validated services from localStorage
  if (!S.validatedServices) {
    try {
      var key = 'haccp_validated_' + S.currentSiteId + '_' + today();
      var saved = localStorage.getItem(key);
      S.validatedServices = saved ? JSON.parse(saved) : [];
    } catch(e) { S.validatedServices = []; }
  }

  // ── Hero status card with SVG ring ──
  var ringSize = 90, ringStroke = 7, ringR = (ringSize - ringStroke) / 2, ringC = 2 * Math.PI * ringR;
  var ringOffset = ringC - (servicePct / 100) * ringC;
  var ringColor = servicePct >= 100 ? 'var(--af-ok)' : 'var(--af-teal)';

  h += '<div class="card card-accent" style="overflow:visible">';
  h += '<div class="card-body" style="padding:28px">';
  h += '<div class="v2-flex v2-justify-between v2-items-center v2-flex-wrap v2-gap-16">';

  // Left: service info
  h += '<div style="flex:1;min-width:180px">';
  h += '<div class="v2-text-sm v2-font-700 v2-uppercase" style="letter-spacing:1.5px;color:var(--af-teal)">Service ' + currentService + ' sur ' + servicesPerDay + '</div>';
  h += '<h3 class="v2-text-4xl v2-font-900 v2-mt-6" style="margin:0;letter-spacing:-.5px">' + serviceProgress + '<span class="v2-text-xl v2-text-muted v2-font-600"> / ' + totalPerService + ' relevés</span></h3>';
  h += '<div class="v2-mt-12"><div class="v2-flex v2-justify-between v2-mb-6"><span class="v2-text-sm v2-font-600 v2-text-muted">Progression</span><span class="v2-text-sm v2-font-800" style="color:' + (servicePct >= 100 ? 'var(--af-ok)' : 'var(--af-teal)') + '">' + servicePct + '%</span></div>';
  h += '<div class="progress" style="height:8px"><div class="progress-bar" style="width:' + servicePct + '%;background:' + (servicePct >= 100 ? 'var(--af-ok)' : 'var(--af-teal)') + '"></div></div></div>';
  h += '</div>';

  // Right: SVG progress ring
  h += '<div style="text-align:center;flex-shrink:0">';
  h += '<svg width="' + ringSize + '" height="' + ringSize + '" class="progress-ring" style="--ring-circumference:' + ringC + ';--ring-offset:' + ringOffset + '">';
  h += '<circle class="progress-ring__bg" cx="' + ringSize/2 + '" cy="' + ringSize/2 + '" r="' + ringR + '"/>';
  h += '<circle class="progress-ring__fill' + (servicePct >= 100 ? ' progress-ring__fill--ok' : '') + '" cx="' + ringSize/2 + '" cy="' + ringSize/2 + '" r="' + ringR + '" stroke-dasharray="' + ringC + '" stroke-dashoffset="' + ringOffset + '" style="stroke:' + ringColor + '"/>';
  h += '</svg>';
  h += '<div class="v2-text-sm v2-font-800 v2-mt-4" style="color:' + (pct >= 100 ? 'var(--af-ok)' : 'var(--af-teal)') + '">' + tempCount + '/' + totalExpected + ' total</div>';
  h += '</div></div>';

  // Stats mini-row
  h += '<div class="v2-flex v2-gap-12 v2-mt-16" style="flex-wrap:wrap">';
  h += '<div style="flex:1;min-width:100px;padding:12px 16px;background:var(--af-ok-bg);border-radius:var(--radius-sm);text-align:center"><div class="v2-text-xl v2-font-800" style="color:var(--af-ok)">' + conformCount + '</div><div class="v2-text-xs v2-font-600 v2-text-muted v2-mt-2">Conformes</div></div>';
  h += '<div style="flex:1;min-width:100px;padding:12px 16px;background:' + (nonConform.length > 0 ? 'var(--af-err-bg)' : 'var(--bg-off)') + ';border-radius:var(--radius-sm);text-align:center"><div class="v2-text-xl v2-font-800" style="color:' + (nonConform.length > 0 ? 'var(--af-err)' : 'var(--ink-muted)') + '">' + nonConform.length + '</div><div class="v2-text-xs v2-font-600 v2-text-muted v2-mt-2">Non conformes</div></div>';
  h += '<div style="flex:1;min-width:100px;padding:12px 16px;background:var(--af-teal-bg);border-radius:var(--radius-sm);text-align:center"><div class="v2-text-xl v2-font-800" style="color:var(--af-teal)">' + servicesPerDay + '</div><div class="v2-text-xs v2-font-600 v2-text-muted v2-mt-2">Services / jour</div></div>';
  h += '</div>';

  // Non-conform warning
  if (nonConform.length > 0) {
    h += '<div class="v2-alert-inline v2-alert-inline--danger v2-mt-14" style="display:flex;align-items:center;gap:10px;padding:14px 18px">⚠️ <div><strong>' + nonConform.length + ' relevé' + (nonConform.length > 1 ? 's' : '') + ' non conforme' + (nonConform.length > 1 ? 's' : '') + '</strong><br><span class="v2-text-sm" style="opacity:.8">Action corrective requise</span></div></div>';
  }

  // Validation button
  if (serviceProgress >= totalPerService && totalPerService > 0) {
    var alreadyValidated = S.validatedServices && S.validatedServices.indexOf(currentService) >= 0;
    if (alreadyValidated) {
      h += '<div class="v2-temp-validated v2-mt-14" style="display:flex;align-items:center;justify-content:center;gap:10px;font-size:16px;padding:18px">✅ Service ' + currentService + ' validé avec succès</div>';
    } else {
      h += '<div class="v2-mt-14"><button class="btn btn-success btn-lg btn-block" onclick="validateService(' + currentService + ',' + nonConform.length + ')" style="font-size:16px;padding:18px 28px;border-radius:var(--radius)">✅ Valider le service ' + currentService + '</button></div>';
    }
  }

  h += '</div></div>';

  // Form - Equipment
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">❄️</span> Relevé Équipement <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + eqCount + ' équipements</span></div><div class="card-body"><form onsubmit="handleTempEquip(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Équipement <span class="req">*</span></label><select class="form-select" id="tempEq" required><option value="">Sélectionner...</option>';
  S.siteConfig.equipment.forEach(function(e) {
    // Check if already recorded this service
    var alreadyDone = S.data.temperatures.some(function(t) { return t.equipment_id === e.id && t.record_type === 'equipment'; });
    h += '<option value="' + e.id + '">' + (alreadyDone ? '✅ ' : '') + e.emoji + ' ' + esc(e.name) + ' (' + e.temp_min + '°/' + e.temp_max + '°C)</option>';
  });
  h += '</select></div><div class="form-group"><label class="form-label">Température °C <span class="req">*</span></label><input type="number" step="0.1" class="form-input" id="tempEqVal" required placeholder="Ex: 3.5"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg v2-mt-4">✓ Enregistrer la température</button></form></div></div>';

  // Form - Product
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">🍽️</span> Relevé Produit <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + prCount + ' produits</span></div><div class="card-body"><form onsubmit="handleTempProd(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Produit <span class="req">*</span></label><select class="form-select" id="tempPr" required><option value="">Sélectionner...</option>';
  S.siteConfig.products.forEach(function(p) {
    var alreadyDone = S.data.temperatures.some(function(t) { return t.product_id === p.id && t.record_type === 'product'; });
    h += '<option value="' + p.id + '">' + (alreadyDone ? '✅ ' : '') + p.emoji + ' ' + esc(p.name) + ' (' + p.temp_min + '°/' + p.temp_max + '°C)</option>';
  });
  h += '</select></div><div class="form-group"><label class="form-label">Température °C <span class="req">*</span></label><input type="number" step="0.1" class="form-input" id="tempPrVal" required placeholder="Ex: 2.0"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg v2-mt-4">✓ Enregistrer la température</button></form></div></div>';

  // Signature
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">✍️</span> Signature</div><div class="card-body">';
  if (S.sigData) {
    h += '<div class="v2-signature-preview"><img src="' + S.sigData + '" style="max-width:200px;max-height:60px;border:1px solid var(--gray-border);border-radius:8px"><button class="btn btn-ghost" onclick="S.sigData=null;render()">✕ Effacer</button></div>';
  } else {
    h += '<button class="btn btn-ghost btn-lg btn-block" onclick="openSignatureModal()" style="padding:18px">✍️ Signer les relevés</button>';
  }
  h += '</div></div>';

  // Filter bar
  if (!S.tempFilter) S.tempFilter = 'all';
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Relevés du jour <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + tempCount + '/' + totalExpected + '</span></div>';
  h += '<div class="card-body" style="padding:10px 18px"><div class="v2-flex v2-gap-8 v2-flex-wrap">';
  h += '<button class="btn btn-sm ' + (S.tempFilter === 'all' ? 'btn-primary' : 'btn-ghost') + '" onclick="S.tempFilter=\'all\';render()">Tous (' + tempCount + ')</button>';
  h += '<button class="btn btn-sm ' + (S.tempFilter === 'conform' ? 'btn-success' : 'btn-ghost') + '" onclick="S.tempFilter=\'conform\';render()">Conformes (' + conformCount + ')</button>';
  h += '<button class="btn btn-sm ' + (S.tempFilter === 'nonconform' ? 'btn-danger' : 'btn-ghost') + '" onclick="S.tempFilter=\'nonconform\';render()">Non conformes (' + nonConform.length + ')</button>';
  h += '</div></div>';

  var filteredTemps = S.data.temperatures;
  if (S.tempFilter === 'conform') filteredTemps = S.data.temperatures.filter(function(t) { return t.is_conform; });
  else if (S.tempFilter === 'nonconform') filteredTemps = nonConform;

  if (filteredTemps.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🌡️</div><div class="empty-title">Aucun relevé aujourd\'hui</div><div class="empty-text">Commencez par enregistrer vos températures ci-dessus.</div></div></div>';
  } else {
    filteredTemps.forEach(function(t) {
      var refName = '', emoji = '';
      if (t.record_type === 'equipment') {
        var eq = S.siteConfig.equipment.find(function(e){return e.id===t.equipment_id;});
        refName = eq ? eq.name : 'Équipement';
        emoji = eq ? eq.emoji : '❄️';
      } else {
        var pr = S.siteConfig.products.find(function(p){return p.id===t.product_id;});
        refName = pr ? pr.name : 'Produit';
        emoji = pr ? pr.emoji : '📦';
      }
      h += '<div class="list-item ' + (t.is_conform ? 'v2-list-item--border-left-ok' : 'v2-list-item--border-left-nok') + '"><div class="list-icon ' + (t.is_conform ? 'v2-list-icon--ok' : 'v2-list-icon--nok') + '">' + emoji + '</div><div class="list-content"><div class="list-title">' + esc(refName) + '</div><div class="list-sub"><strong class="v2-text-sm">' + t.value + '°C</strong> — ' + (t.is_conform ? '✅ Conforme' : '❌ Non conforme') + ' — ' + fmtDT(t.recorded_at) + '</div>';
      if (t.corrective_action) h += '<div class="list-sub v2-text-warning v2-font-600">⚠️ ' + esc(t.corrective_action) + '</div>';
      h += '</div></div>';
    });
  }
  h += '</div>';

  return h;
}

window.validateService = async function(serviceNum, nonConformCount) {
  // Empêcher double validation
  if (!S.validatedServices) S.validatedServices = [];
  if (S.validatedServices.indexOf(serviceNum) >= 0) {
    showToast('Ce service a déjà été validé', 'info');
    return;
  }

  if (nonConformCount > 0) {
    if (!(await appConfirm('Anomalies détectées', '<strong>' + nonConformCount + ' relevé(s) non conforme(s)</strong> détecté(s).<br><br>Êtes-vous sûr de vouloir valider le service ' + serviceNum + ' malgré ces anomalies ?<br><small>Une action corrective devrait être documentée.</small>', {danger:true,icon:'⚠️',confirmLabel:'Valider malgré tout'}))) {
      return;
    }
  }
  if (!S.sigData) {
    showToast('Veuillez signer avant de valider le service', 'warning');
    openSignatureModal();
    return;
  }

  if (!(await appConfirm('Validation du service', 'Confirmer la validation du service ' + serviceNum + ' ?<br><br>Relevés : <strong>' + S.data.temperatures.length + '</strong><br>Signature : ✅', {icon:'✅',confirmLabel:'Valider le service'}))) {
    return;
  }

  // Marquer le service comme validé + persister en localStorage
  S.validatedServices.push(serviceNum);
  try {
    var lsKey = 'haccp_validated_' + S.currentSiteId + '_' + today();
    localStorage.setItem(lsKey, JSON.stringify(S.validatedServices));
  } catch(e) {}

  // Envoi email si configuré
  triggerEmailNotification('temp_validation', {
    service: serviceNum,
    temperatures: S.data.temperatures.length,
    nonConform: nonConformCount,
    site: currentSite() ? currentSite().name : '',
    user: userName(),
    date: today()
  });

  showToast('Service ' + serviceNum + ' validé avec succès' + (nonConformCount > 0 ? ' — ' + nonConformCount + ' non-conformité(s)' : ''), nonConformCount > 0 ? 'warning' : 'success');
  render();
};
