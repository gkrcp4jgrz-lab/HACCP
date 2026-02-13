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
  h += '<div class="card" style="border-left:4px solid ' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '">';
  h += '<div class="card-body">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">';
  h += '<div><h3 style="margin:0;font-size:18px;font-weight:800">Service ' + currentService + '/' + servicesPerDay + '</h3>';
  h += '<span style="font-size:14px;color:var(--gray);font-weight:500">' + serviceProgress + '/' + totalPerService + ' relevés ce service</span></div>';
  h += '<div style="text-align:right"><div style="font-size:32px;font-weight:900;color:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + ';letter-spacing:-1px">' + tempCount + '/' + totalExpected + '</div>';
  h += '<span style="font-size:12px;color:var(--gray);font-weight:600">Total journée (' + servicesPerDay + ' service' + (servicesPerDay > 1 ? 's' : '') + ')</span></div>';
  h += '</div>';

  // Progress bar du service actuel
  h += '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;font-weight:700">Progression service ' + currentService + '</span><span style="font-size:13px;font-weight:800;color:' + (servicePct >= 100 ? 'var(--success)' : 'var(--primary)') + '">' + servicePct + '%</span></div>';
  h += '<div class="progress" style="height:10px"><div class="progress-bar" style="width:' + servicePct + '%;background:' + (servicePct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div></div>';

  // Non-conform warning
  if (nonConform.length > 0) {
    h += '<div style="margin-top:12px;padding:10px 14px;background:var(--danger-bg);border-radius:8px;font-size:14px;color:var(--danger);font-weight:700">⚠️ <strong>' + nonConform.length + ' relevé' + (nonConform.length > 1 ? 's' : '') + ' non conforme' + (nonConform.length > 1 ? 's' : '') + '</strong> — Action corrective requise</div>';
  }

  // Validation button
  if (serviceProgress >= totalPerService && totalPerService > 0) {
    var alreadyValidated = S.validatedServices && S.validatedServices.indexOf(currentService) >= 0;
    if (alreadyValidated) {
      h += '<div style="margin-top:14px;text-align:center;padding:14px;background:var(--success-bg);border-radius:var(--radius);color:var(--success);font-weight:800;font-size:15px">✅ Service ' + currentService + ' validé</div>';
    } else {
      h += '<div style="margin-top:14px;text-align:center"><button class="btn btn-success btn-lg btn-block" onclick="validateService(' + currentService + ',' + nonConform.length + ')" style="font-size:16px;padding:16px 28px">✅ Valider le service ' + currentService + '</button></div>';
    }
  }

  h += '</div></div>';

  // Form - Equipment
  h += '<div class="card"><div class="card-header"><span style="font-size:18px">❄️</span> Relevé Équipement <span class="badge badge-blue" style="margin-left:auto;font-size:12px;padding:4px 12px">' + eqCount + ' équipements</span></div><div class="card-body"><form onsubmit="handleTempEquip(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Équipement <span class="req">*</span></label><select class="form-select" id="tempEq" required><option value="">Sélectionner...</option>';
  S.siteConfig.equipment.forEach(function(e) {
    // Check if already recorded this service
    var alreadyDone = S.data.temperatures.some(function(t) { return t.equipment_id === e.id && t.record_type === 'equipment'; });
    h += '<option value="' + e.id + '"' + (alreadyDone ? ' style="color:green"' : '') + '>' + (alreadyDone ? '✅ ' : '') + e.emoji + ' ' + esc(e.name) + ' (' + e.temp_min + '°/' + e.temp_max + '°C)</option>';
  });
  h += '</select></div><div class="form-group"><label class="form-label">Température °C <span class="req">*</span></label><input type="number" step="0.1" class="form-input" id="tempEqVal" required placeholder="Ex: 3.5"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="margin-top:4px">✓ Enregistrer la température</button></form></div></div>';

  // Form - Product
  h += '<div class="card"><div class="card-header"><span style="font-size:18px">🍽️</span> Relevé Produit <span class="badge badge-blue" style="margin-left:auto;font-size:12px;padding:4px 12px">' + prCount + ' produits</span></div><div class="card-body"><form onsubmit="handleTempProd(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Produit <span class="req">*</span></label><select class="form-select" id="tempPr" required><option value="">Sélectionner...</option>';
  S.siteConfig.products.forEach(function(p) {
    var alreadyDone = S.data.temperatures.some(function(t) { return t.product_id === p.id && t.record_type === 'product'; });
    h += '<option value="' + p.id + '"' + (alreadyDone ? ' style="color:green"' : '') + '>' + (alreadyDone ? '✅ ' : '') + p.emoji + ' ' + esc(p.name) + ' (' + p.temp_min + '°/' + p.temp_max + '°C)</option>';
  });
  h += '</select></div><div class="form-group"><label class="form-label">Température °C <span class="req">*</span></label><input type="number" step="0.1" class="form-input" id="tempPrVal" required placeholder="Ex: 2.0"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg" style="margin-top:4px">✓ Enregistrer la température</button></form></div></div>';

  // Signature
  h += '<div class="card"><div class="card-header"><span style="font-size:18px">✍️</span> Signature</div><div class="card-body">';
  if (S.sigData) {
    h += '<div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--success-bg);border-radius:var(--radius)"><img src="' + S.sigData + '" style="max-width:200px;max-height:60px;border:1px solid var(--gray-border);border-radius:8px"><button class="btn btn-ghost" onclick="S.sigData=null;render()">✕ Effacer</button></div>';
  } else {
    h += '<button class="btn btn-ghost btn-lg btn-block" onclick="openSignatureModal()" style="padding:18px">✍️ Signer les relevés</button>';
  }
  h += '</div></div>';

  // Today's records
  h += '<div class="card"><div class="card-header"><span style="font-size:18px">📋</span> Relevés du jour <span class="badge badge-blue" style="margin-left:auto;font-size:12px;padding:4px 12px">' + tempCount + '/' + totalExpected + '</span></div>';
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
      var bgColor = t.is_conform ? 'var(--success-bg)' : 'var(--danger-bg)';
      var borderColor = t.is_conform ? 'var(--success)' : 'var(--danger)';
      h += '<div class="list-item" style="border-left:3px solid ' + borderColor + '"><div class="list-icon" style="background:' + bgColor + '">' + emoji + '</div><div class="list-content"><div class="list-title">' + esc(refName) + '</div><div class="list-sub"><strong style="font-size:13px">' + t.value + '°C</strong> — ' + (t.is_conform ? '✅ Conforme' : '❌ Non conforme') + ' — ' + fmtDT(t.recorded_at) + '</div>';
      if (t.corrective_action) h += '<div class="list-sub" style="color:var(--warning);font-weight:600">⚠️ ' + esc(t.corrective_action) + '</div>';
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
