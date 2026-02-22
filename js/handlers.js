// =====================================================================
// FORM HANDLERS (all exposed globally) — with security improvements
// =====================================================================

window.handleLogin = async function(e) {
  e.preventDefault();
  var btn = $('loginBtn'), err = $('loginError');
  var loginId = ($('loginId').value || '').trim().toUpperCase();
  if (!loginId) return;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Connexion...';
  err.classList.remove('show');
  try {
    await doLoginById(loginId, $('loginPass').value);
  } catch(ex) {
    err.textContent = ex.message || 'Erreur de connexion';
    err.classList.add('show');
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
};

window.handleChangePassword = async function(e) {
  e.preventDefault();
  var p1 = $('newPass1').value, p2 = $('newPass2').value, err = $('pwdError');
  if (p1 !== p2) { err.textContent = 'Les mots de passe ne correspondent pas.'; err.classList.add('show'); return; }
  var v = validatePassword(p1);
  if (!v.valid) { err.textContent = v.message; err.classList.add('show'); return; }
  try {
    await changePassword(p1);
    var overlay = $('pwdOverlay');
    if (overlay) overlay.remove();
  } catch(ex) {
    err.textContent = ex.message || 'Erreur'; err.classList.add('show');
  }
};

window.updatePwdStrength = function(val) {
  var el = $('pwdStrength');
  if (!el) return;
  if (!val) { el.innerHTML = ''; return; }
  var v = validatePassword(val);
  var color = v.valid ? 'var(--ok)' : 'var(--err)';
  el.innerHTML = '<span class="' + (v.valid ? 'v2-pwd-strength--ok' : 'v2-pwd-strength--err') + '">' + (v.valid ? '✅ ' : '❌ ') + esc(v.message) + '</span>';
};

window.handleTempEquip = async function(e) {
  e.preventDefault();
  var eqId = $('tempEq').value, val = $('tempEqVal').value;
  if (!eqId || !val) return;
  var numVal = sanitizeNumeric(val);
  if (numVal === null) { showToast('Valeur de temperature invalide', 'error'); return; }
  var eq = S.siteConfig.equipment.find(function(e){return e.id===eqId;});
  var eqMin = (eq && eq.temp_min != null && eq.temp_min !== '') ? Number(eq.temp_min) : -999;
  var eqMax = (eq && eq.temp_max != null && eq.temp_max !== '') ? Number(eq.temp_max) : 999;
  if (eq && (numVal < eqMin || numVal > eqMax)) {
    var action = await appPrompt('Température non conforme', 'La valeur <strong>' + numVal + '°C</strong> est hors limites (' + eqMin + '°/' + eqMax + '°C).<br>Quelle action corrective a été effectuée ?', '', {placeholder:'Ex: Dégivrage, Appel SAV, Transfert produits...',multiline:true,confirmLabel:'Enregistrer'});
    if (!action) return;
    await addTemperature('equipment', eqId, numVal, action, '');
  } else {
    await addTemperature('equipment', eqId, numVal, null, null);
  }
  $('tempEq').value = ''; $('tempEqVal').value = '';
};

window.handleTempProd = async function(e) {
  e.preventDefault();
  var prId = $('tempPr').value, val = $('tempPrVal').value;
  if (!prId || !val) return;
  var numVal = sanitizeNumeric(val);
  if (numVal === null) { showToast('Valeur de temperature invalide', 'error'); return; }
  var pr = S.siteConfig.products.find(function(p){return p.id===prId;});
  var prMin = (pr && pr.temp_min != null && pr.temp_min !== '') ? Number(pr.temp_min) : -999;
  var prMax = (pr && pr.temp_max != null && pr.temp_max !== '') ? Number(pr.temp_max) : 999;
  if (pr && (numVal < prMin || numVal > prMax)) {
    var action = await appPrompt('Température non conforme', 'Quelle action corrective a été effectuée ?', '', {placeholder:'Ex: Dégivrage, Appel SAV, Transfert produits...',multiline:true,confirmLabel:'Enregistrer'});
    if (!action) return;
    await addTemperature('product', prId, numVal, action, '');
  } else {
    await addTemperature('product', prId, numVal, null, null);
  }
  $('tempPr').value = ''; $('tempPrVal').value = '';
};

window.handleDlc = async function(e) {
  e.preventDefault();
  await addDlc($('dlcProd').value, $('dlcDate').value, $('dlcLot').value, $('dlcNotes').value);
  $('dlcProd').value = ''; $('dlcDate').value = ''; $('dlcLot').value = ''; $('dlcNotes').value = '';
};

window.handleLot = async function(e) {
  e.preventDefault();
  await addLot($('lotProd').value, $('lotNum').value, $('lotSupp').value, $('lotDlc').value, $('lotNotes').value);
  $('lotProd').value = ''; $('lotNum').value = ''; $('lotSupp').value = ''; $('lotDlc').value = ''; $('lotNotes').value = '';
};

// ── UNIFIED RECEPTION HANDLER ──
window.handleReception = async function(e) {
  e.preventDefault();
  var product = $('recProduct').value.trim();
  var lotNum = $('recLotNum').value.trim().toUpperCase();
  var dlcDate = $('recDlcDate').value;
  var supplier = $('recSupplier').value.trim();
  var notes = $('recNotes').value.trim();
  var saveDlc = $('recSaveDlc').checked;
  var saveLot = $('recSaveLot').checked;
  var photoData = S.photoDlcData || null;

  if (!product || !dlcDate) return;
  if (!saveDlc && !saveLot) { showToast('Cochez au moins une option d\'enregistrement', 'warning'); return; }

  var btn = e.target.querySelector('button[type="submit"]');
  var origText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Enregistrement...';

  try {
    if (saveDlc) {
      await _insertDlcRecord(product, dlcDate, lotNum, notes, photoData);
    }
    if (saveLot && lotNum) {
      await _insertLotRecord(product, lotNum, supplier, dlcDate, notes, photoData);
    }
    S.photoDlcData = null;
    await loadSiteData();
    render();
    showToast('Réception enregistrée');
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
    btn.disabled = false; btn.innerHTML = origText;
  }
};

// ── TOAST HELPER ──
window.showToast = function(msg, type, duration) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var cls = 'toast';
  if (type === 'error') cls += ' toast-error';
  else if (type === 'warning') cls += ' toast-warning';
  else if (type === 'info') cls += ' toast-info';
  else cls += ' toast-success';
  var toast = document.createElement('div');
  toast.className = cls;
  toast.textContent = msg;
  document.body.appendChild(toast);
  var dur = duration || (type === 'error' ? 4000 : 2500);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, dur);
};

window.handleOrder = async function(e) {
  e.preventDefault();
  await addOrder($('ordProd').value, $('ordQty').value, $('ordUnit').value, $('ordSupp').value, $('ordNotes').value);
  $('ordProd').value = ''; $('ordQty').value = '1'; $('ordNotes').value = '';
};

window.handleConsigne = async function(e) {
  e.preventDefault();
  await addConsigne($('conMsg').value, $('conPrio').value);
  $('conMsg').value = '';
};

window.handleCreateSite = async function(e) {
  e.preventDefault();
  await createSite($('sName').value, $('sType').value, $('sAddr').value, $('sCity').value, $('sPhone').value, $('sEmail').value, $('sAgr').value, $('sResp').value);
  $('sName').value = ''; $('sAddr').value = ''; $('sCity').value = ''; $('sPhone').value = ''; $('sEmail').value = ''; $('sAgr').value = ''; $('sResp').value = '';
};

window.handleCreateUser = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  var origText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Creation en cours...';
  try {
    var fullName = $('nuName').value;
    var role = $('nuRole').value;
    var siteId = $('nuSite').value;
    var siteRole = $('nuSiteRole').value;
    var tempPass = $('nuPass').value;

    // Auto-generate login_id
    var loginId = await generateUniqueLoginId(fullName);

    var user = await createUser(loginId, tempPass, fullName, role);

    // Assign to selected site
    if (user && siteId) {
      await assignUserToSite(user.id, siteId, siteRole);
    }

    showToast('Utilisateur créé — ID : ' + loginId, 'success', 5000);
    openModal('<div class="modal-header"><div class="modal-title">Utilisateur créé</div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" style="text-align:center"><div style="width:56px;height:56px;background:var(--af-ok-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 14px">✅</div><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm);margin-bottom:10px"><div class="v2-text-xs v2-text-muted v2-mb-4">Identifiant</div><div class="v2-text-xl v2-font-800" style="letter-spacing:2px;color:var(--af-teal);font-family:monospace">' + esc(loginId) + '</div></div><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-xs v2-text-muted v2-mb-4">Mot de passe</div><div class="v2-text-xl v2-font-800">' + esc(tempPass) + '</div></div></div><div class="modal-footer"><button class="btn btn-primary btn-lg" onclick="closeModal()">Compris</button></div>');

    $('nuName').value = ''; $('nuPass').value = 'Haccp2026!';
    if ($('nuLoginPreview')) $('nuLoginPreview').textContent = '';
    if ($('userListContainer')) loadAndDisplayUsers();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
  btn.disabled = false; btn.innerHTML = origText;
};

window.handleAddEquip = async function(e) {
  e.preventDefault();
  await addEquipment($('eqName').value, $('eqType').value, parseFloat($('eqMin').value), parseFloat($('eqMax').value), $('eqEmoji').value);
  $('eqName').value = '';
};

window.handleAddProd = async function(e) {
  e.preventDefault();
  await addProduct($('prName').value, $('prCat').value, parseFloat($('prMin').value), parseFloat($('prMax').value), $('prEmoji').value);
  $('prName').value = '';
};

window.handleAddSupp = async function(e) {
  e.preventDefault();
  await addSupplier($('spName').value, $('spPhone').value, $('spEmail').value);
  $('spName').value = ''; $('spPhone').value = ''; $('spEmail').value = '';
};

window.openSignatureModal = function() {
  openModal(
    '<div class="modal-header"><div class="modal-title">Signature</div><button class="modal-close" onclick="closeModal()">x</button></div>' +
    '<div class="modal-body"><p class="v2-text-sm v2-text-muted v2-mb-12">Signez avec votre doigt ou votre souris :</p><canvas id="sigCanvas" class="sig-canvas"></canvas></div>' +
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="clearSignature()">Effacer</button><button class="btn btn-primary btn-lg" onclick="saveSignature()">Confirmer la signature</button></div>'
  );
};

// ── CSV EXPORT HANDLERS ──
window.exportTemperaturesCSV = function() {
  var headers = ['Date', 'Heure', 'Point de controle', 'Type', 'Temperature', 'Conforme', 'Action corrective', 'Operateur'];
  var rows = S.data.temperatures.map(function(t) {
    var refName = '';
    if (t.record_type === 'equipment') {
      var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
      refName = eq ? eq.name : '';
    } else {
      var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
      refName = pr ? pr.name : '';
    }
    return [fmtD(t.recorded_at), fmtDT(t.recorded_at), refName, t.record_type === 'equipment' ? 'Equipement' : 'Produit', t.value + ' C', t.is_conform ? 'Oui' : 'Non', t.corrective_action || '', t.recorded_by_name || ''];
  });
  exportCSV('temperatures-' + today() + '.csv', headers, rows);
};

window.exportDlcCSV = function() {
  var headers = ['Produit', 'Date DLC', 'Jours restants', 'Lot', 'Statut', 'Enregistre par', 'Date'];
  var rows = S.data.dlcs.map(function(d) {
    return [d.product_name, fmtD(d.dlc_date), daysUntil(d.dlc_date), d.lot_number || '', d.status || 'actif', d.recorded_by_name || '', fmtDT(d.recorded_at)];
  });
  exportCSV('dlc-' + today() + '.csv', headers, rows);
};

window.exportLotsCSV = function() {
  var headers = ['Produit', 'N Lot', 'Fournisseur', 'Date DLC', 'Date enregistrement', 'Enregistre par'];
  var rows = S.data.lots.map(function(l) {
    return [l.product_name, l.lot_number, l.supplier_name || '', l.dlc_date ? fmtD(l.dlc_date) : '', fmtDT(l.recorded_at), l.recorded_by_name || ''];
  });
  exportCSV('lots-' + today() + '.csv', headers, rows);
};

window.exportOrdersCSV = function() {
  var headers = ['Produit', 'Quantite', 'Unite', 'Fournisseur', 'Statut', 'Commande par', 'Date'];
  var rows = S.data.orders.map(function(o) {
    return [o.product_name, o.quantity, o.unit || '', o.supplier_name || '', o.status, o.ordered_by_name || '', fmtDT(o.ordered_at)];
  });
  exportCSV('commandes-' + today() + '.csv', headers, rows);
};

// ── LOGIN ID MANAGEMENT ──
window.handleEditLoginId = async function(userId, currentId) {
  var newId = await appPrompt('Modifier l\'identifiant', 'Saisissez le nouvel identifiant pour cet utilisateur.', currentId || '', {placeholder:'Ex: JR0001',confirmLabel:'Modifier'});
  if (!newId || newId.toUpperCase() === (currentId || '').toUpperCase()) return;
  try {
    await updateLoginId(userId, newId);
    showToast('Identifiant modifie : ' + newId.toUpperCase(), 'success');
    if (typeof loadAndDisplayUsersDetailed === 'function') loadAndDisplayUsersDetailed();
    if (typeof loadAndRenderTeam === 'function') loadAndRenderTeam();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
};

window.handleResetUserPassword = async function(userId, loginId) {
  var newPass = await appPrompt('Réinitialiser le mot de passe', 'Nouveau mot de passe pour <strong>' + esc(loginId) + '</strong>', '', {placeholder:'Minimum 8 caractères',inputType:'text',confirmLabel:'Réinitialiser'});
  if (!newPass) return;
  var v = validatePassword(newPass);
  if (!v.valid) { showToast(v.message, 'error'); return; }
  try {
    await sb.from('profiles').update({ must_change_password: true }).eq('id', userId);
    showToast('Mot de passe réinitialisé', 'success');
    openModal('<div class="modal-header"><div class="modal-title">Mot de passe réinitialisé</div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" style="text-align:center"><p class="v2-text-md v2-font-600 v2-mb-14">L\'utilisateur devra changer son mot de passe à la prochaine connexion.</p><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-xs v2-text-muted v2-mb-4">Nouveau mot de passe</div><div class="v2-text-xl v2-font-800">' + esc(newPass) + '</div></div></div><div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Compris</button></div>');
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
};

// Expose all global handlers
window.navigate = navigate;
window.toggleSidebar = toggleSidebar;
window.switchSite = switchSite;
window.doLogout = doLogout;

// Dashboard quick actions
window.dashMarkOrdered = async function(id) {
  await updateOrderStatus(id, 'ordered');
};
window.dashMarkReceived = async function(id) {
  await updateOrderStatus(id, 'received');
};
window.markConsigneRead = async function(id) {
  try {
    await sb.from('consignes').update({ priority: 'normal' }).eq('id', id);
    await loadSiteData();
    render();
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};
window.closeModal = closeModal;
window.openModal = openModal;
window.clearSignature = clearSignature;
window.saveSignature = saveSignature;
window.handlePhotoFor = handlePhotoFor;
window.clearPhotoDlc = clearPhotoDlc;
window.clearPhotoLot = clearPhotoLot;
window.deleteDlc = deleteDlc;
window.updateDlcStatus = updateDlcStatus;
window.deleteLot = deleteLot;
window.addOrder = addOrder;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.deleteConsigne = deleteConsigne;
window.deleteEquipment = deleteEquipment;
window.deleteProduct = deleteProduct;
window.deleteSupplier = deleteSupplier;
window.toggleModule = toggleModule;
window.deleteSite = deleteSite;
window.generateDailyPDF = generateDailyPDF;
window.generateTempPDF = generateTempPDF;
window.generateDlcPDF = generateDlcPDF;
window.generateIncidentPDF = generateIncidentPDF;
window.generateFullPDF = generateFullPDF;
window.loadAndDisplayUsers = loadAndDisplayUsers;
