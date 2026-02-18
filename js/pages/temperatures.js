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
  if (tempCount > 0 && tempCount % totalPerService === 0) serviceProgress = totalPerService; // Service complet
  var pct = totalExpected > 0 ? Math.min(100, Math.round(tempCount / totalExpected * 100)) : 0;
  var servicePct = totalPerService > 0 ? Math.min(100, Math.round(serviceProgress / totalPerService * 100)) : 0;

  // Non-conform temperatures today
  var nonConform = S.data.temperatures.filter(function(t) { return !t.is_conform; });

  // Status banner with gradient
  h += '<div class="card ' + (pct >= 100 ? 'v2-card--success-left' : 'v2-card--primary-left') + '">';
  h += '<div class="card-body">';
  h += '<div class="v2-flex v2-justify-between v2-items-center v2-flex-wrap v2-gap-12">';
  h += '<div><h3 class="v2-text-2xl v2-font-800" style="margin:0">Service ' + currentService + '/' + servicesPerDay + '</h3>';
  h += '<span class="v2-text-md v2-text-muted v2-font-500">' + serviceProgress + '/' + totalPerService + ' relevés ce service</span></div>';
  h += '<div class="v2-text-right"><div class="v2-text-5xl v2-font-900" style="color:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + ';letter-spacing:-1px">' + tempCount + '/' + totalExpected + '</div>';
  h += '<span class="v2-text-sm v2-text-muted v2-font-600">Total journée (' + servicesPerDay + ' service' + (servicesPerDay > 1 ? 's' : '') + ')</span></div>';
  h += '</div>';

  // Progress bar du service actuel
  h += '<div class="v2-mt-14"><div class="v2-flex v2-justify-between v2-mb-6"><span class="v2-text-sm v2-font-700">Progression service ' + currentService + '</span><span class="v2-text-sm v2-font-800" style="color:' + (servicePct >= 100 ? 'var(--success)' : 'var(--primary)') + '">' + servicePct + '%</span></div>';
  h += '<div class="progress" style="height:10px"><div class="progress-bar" style="width:' + servicePct + '%;background:' + (servicePct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div></div>';

  // Non-conform warning
  if (nonConform.length > 0) {
    h += '<div class="v2-alert-inline v2-alert-inline--danger v2-mt-12">⚠️ <strong>' + nonConform.length + ' relevé' + (nonConform.length > 1 ? 's' : '') + ' non conforme' + (nonConform.length > 1 ? 's' : '') + '</strong> — Action corrective requise</div>';
  }

  // Validation button
  if (serviceProgress >= totalPerService && totalPerService > 0) {
    var alreadyValidated = S.validatedServices && S.validatedServices.indexOf(currentService) >= 0;
    if (alreadyValidated) {
      h += '<div class="v2-temp-validated v2-mt-14">✅ Service ' + currentService + ' validé</div>';
    } else {
      h += '<div class="v2-mt-14 v2-text-center"><button class="btn btn-success btn-lg btn-block" onclick="validateService(' + currentService + ',' + nonConform.length + ')" style="font-size:16px;padding:16px 28px">✅ Valider le service ' + currentService + '</button></div>';
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

  // Today's records
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Relevés du jour <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + tempCount + '/' + totalExpected + '</span></div>';
  if (S.data.temperatures.length === 0) {
    h += '<div class="card-body"><div class="empty"><div class="empty-icon">🌡️</div><div class="empty-title">Aucun relevé aujourd\'hui</div><div class="empty-text">Commencez par enregistrer vos températures ci-dessus.</div></div></div>';
  } else {
    S.data.temperatures.forEach(function(t) {
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
    alert('✅ Ce service a déjà été validé.');
    return;
  }

  if (nonConformCount > 0) {
    if (!confirm('⚠️ ATTENTION : ' + nonConformCount + ' relevé(s) non conforme(s) détecté(s) !\n\nÊtes-vous sûr de vouloir valider le service ' + serviceNum + ' malgré ces anomalies ?\n\nUne action corrective devrait être documentée.')) {
      return;
    }
  }
  if (!S.sigData) {
    alert('✍️ Veuillez signer avant de valider le service.');
    openSignatureModal();
    return;
  }

  if (!confirm('Confirmer la validation du service ' + serviceNum + ' ?\n\nRelevés : ' + S.data.temperatures.length + '\nSignature : ✓')) {
    return;
  }

  // Marquer le service comme validé
  S.validatedServices.push(serviceNum);

  // Envoi email si configuré
  triggerEmailNotification('temp_validation', {
    service: serviceNum,
    temperatures: S.data.temperatures.length,
    nonConform: nonConformCount,
    site: currentSite() ? currentSite().name : '',
    user: userName(),
    date: today()
  });

  alert('✅ Service ' + serviceNum + ' validé avec succès !' + (nonConformCount > 0 ? '\n⚠️ ' + nonConformCount + ' non-conformité(s) signalée(s)' : '\n✅ Tous les relevés conformes'));
  render();
};
