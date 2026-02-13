// =====================================================================
// FORM HANDLERS (all exposed globally) — with security improvements
// =====================================================================

window.showAuthTab = function(tab) {
  var tl = $('tabLogin'), tr = $('tabRegister'), af = $('authForm');
  if (tab === 'login') {
    tl.classList.add('active'); tr.classList.remove('active');
    af.innerHTML = renderLoginForm();
  } else {
    tr.classList.add('active'); tl.classList.remove('active');
    af.innerHTML = renderRegisterForm();
  }
};

window.showForgotPassword = function() {
  var af = $('authForm');
  if (af) af.innerHTML = renderForgotPasswordForm();
};

window.showLoginFromReset = function() {
  var af = $('authForm');
  if (af) af.innerHTML = renderLoginForm();
};

window.handleForgotPassword = async function(e) {
  e.preventDefault();
  var btn = $('resetBtn'), err = $('resetError');
  var email = $('resetEmail').value;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Envoi...';
  err.style.display = 'none';
  try {
    await doPasswordReset(email);
    btn.disabled = false; btn.textContent = 'Lien envoye !';
  } catch(ex) {
    err.textContent = ex.message || 'Erreur';
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Envoyer le lien';
  }
};

window.handleLogin = async function(e) {
  e.preventDefault();
  var btn = $('loginBtn'), err = $('loginError');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Connexion...';
  err.style.display = 'none';
  try {
    await doLogin($('loginEmail').value, $('loginPass').value);
  } catch(ex) {
    err.textContent = ex.message || 'Erreur de connexion';
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
};

window.handleRegister = async function(e) {
  e.preventDefault();
  var btn = $('regBtn'), err = $('regError');
  var pass = $('regPass').value;
  var v = validatePassword(pass);
  if (!v.valid) {
    err.textContent = v.message;
    err.style.display = 'block';
    return;
  }
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Inscription...';
  err.style.display = 'none';
  try {
    await doRegister($('regEmail').value, pass, $('regName').value);
    btn.disabled = false; btn.textContent = 'Creer un compte';
  } catch(ex) {
    err.textContent = ex.message || 'Erreur d\'inscription';
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Creer un compte';
  }
};

window.handleChangePassword = async function(e) {
  e.preventDefault();
  var p1 = $('newPass1').value, p2 = $('newPass2').value, err = $('pwdError');
  if (p1 !== p2) { err.textContent = 'Les mots de passe ne correspondent pas.'; err.style.display = 'block'; return; }
  var v = validatePassword(p1);
  if (!v.valid) { err.textContent = v.message; err.style.display = 'block'; return; }
  try {
    await changePassword(p1);
    var overlay = $('pwdOverlay');
    if (overlay) overlay.remove();
  } catch(ex) {
    err.textContent = ex.message || 'Erreur'; err.style.display = 'block';
  }
};

window.updatePwdStrength = function(val) {
  var el = $('pwdStrength');
  if (!el) return;
  if (!val) { el.innerHTML = ''; return; }
  var v = validatePassword(val);
  var color = v.valid ? 'var(--ok)' : 'var(--err)';
  el.innerHTML = '<span style="color:' + color + '">' + (v.valid ? '✅ ' : '❌ ') + esc(v.message) + '</span>';
};

window.handleTempEquip = async function(e) {
  e.preventDefault();
  var eqId = $('tempEq').value, val = $('tempEqVal').value;
  if (!eqId || !val) return;
  var numVal = sanitizeNumeric(val);
  if (numVal === null) { showToast('Valeur de temperature invalide', 'error'); return; }
  var eq = S.siteConfig.equipment.find(function(e){return e.id===eqId;});
  if (eq && (numVal < eq.temp_min || numVal > eq.temp_max)) {
    var action = prompt('Temperature non conforme !\nAction corrective effectuee :\n(Ex: Degivrage, Appel SAV, Transfert produits...)');
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
  if (pr && (numVal < pr.temp_min || numVal > pr.temp_max)) {
    var action = prompt('Temperature non conforme !\nAction corrective effectuee :');
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
    var email = $('nuEmail').value;
    var role = $('nuRole').value;
    var siteId = $('nuSite').value;
    var siteRole = $('nuSiteRole').value;
    var tempPass = $('nuPass').value;

    var user = await createUser(email, tempPass, $('nuName').value, role);

    // Assign to selected site
    if (user && siteId) {
      await assignUserToSite(user.id, siteId, siteRole);
    }

    var siteName = siteId ? S.sites.find(function(s){return s.id===siteId;}) : null;
    var msg = 'Utilisateur ' + email + ' cree avec succes !';
    if (siteName) msg += '\nAssigne a : ' + siteName.name + ' (' + siteRole + ')';
    msg += '\nL\'utilisateur devra changer son mot de passe a la premiere connexion.';
    showToast(msg, 'success', 5000);

    $('nuName').value = ''; $('nuEmail').value = ''; $('nuPass').value = 'Haccp2026!';
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
    '<div class="modal-body"><p style="font-size:13px;color:var(--gray);margin-bottom:12px">Signez avec votre doigt ou votre souris :</p><canvas id="sigCanvas" class="sig-canvas"></canvas></div>' +
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
