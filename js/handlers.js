// =====================================================================
// FORM HANDLERS (all exposed globally)
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
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Inscription...';
  err.style.display = 'none';
  try {
    await doRegister($('regEmail').value, $('regPass').value, $('regName').value);
    btn.disabled = false; btn.textContent = 'Créer un compte';
  } catch(ex) {
    err.textContent = ex.message || 'Erreur d\'inscription';
    err.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Créer un compte';
  }
};

window.handleChangePassword = async function(e) {
  e.preventDefault();
  var p1 = $('newPass1').value, p2 = $('newPass2').value, err = $('pwdError');
  if (p1 !== p2) { err.textContent = 'Les mots de passe ne correspondent pas.'; err.style.display = 'block'; return; }
  if (p1.length < 6) { err.textContent = 'Le mot de passe doit faire au moins 6 caractères.'; err.style.display = 'block'; return; }
  try {
    await changePassword(p1);
    var overlay = $('pwdOverlay');
    if (overlay) overlay.remove();
  } catch(ex) {
    err.textContent = ex.message || 'Erreur'; err.style.display = 'block';
  }
};

window.handleTempEquip = async function(e) {
  e.preventDefault();
  var eqId = $('tempEq').value, val = $('tempEqVal').value;
  if (!eqId || !val) return;
  var eq = S.siteConfig.equipment.find(function(e){return e.id===eqId;});
  var numVal = parseFloat(val);
  if (eq && (numVal < eq.temp_min || numVal > eq.temp_max)) {
    var action = prompt('⚠️ Température non conforme !\nAction corrective effectuée :\n(Ex: Dégivrage, Appel SAV, Transfert produits...)');
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
  var pr = S.siteConfig.products.find(function(p){return p.id===prId;});
  var numVal = parseFloat(val);
  if (pr && (numVal < pr.temp_min || numVal > pr.temp_max)) {
    var action = prompt('⚠️ Température non conforme !\nAction corrective effectuée :');
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
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Création en cours...';
  try {
    var email = $('nuEmail').value;
    var role = $('nuRole').value;
    var siteId = $('nuSite').value;
    var siteRole = $('nuSiteRole').value;

    var user = await createUser(email, $('nuPass').value, $('nuName').value, role);

    // Assigner automatiquement au site sélectionné
    if (user && siteId) {
      await assignUserToSite(user.id, siteId, siteRole);
    }

    var siteName = siteId ? S.sites.find(function(s){return s.id===siteId;}) : null;
    var msg = '✅ Utilisateur ' + email + ' créé avec succès !';
    if (siteName) msg += '\n📍 Assigné à : ' + siteName.name + ' (' + siteRole + ')';
    msg += '\n🔑 Mot de passe : ' + $('nuPass').value;
    msg += '\n\nL\'utilisateur peut se connecter directement.';
    alert(msg);

    $('nuName').value = ''; $('nuEmail').value = ''; $('nuPass').value = 'Haccp2026!';
    // Recharger la liste si affichée
    if ($('userListContainer')) loadAndDisplayUsers();
  } catch(ex) {
    alert('❌ Erreur: ' + (ex.message || ex));
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
    '<div class="modal-header"><div class="modal-title">✍️ Signature</div><button class="modal-close" onclick="closeModal()">✕</button></div>' +
    '<div class="modal-body"><p style="font-size:13px;color:var(--gray);margin-bottom:12px">Signez avec votre doigt ou votre souris :</p><canvas id="sigCanvas" class="sig-canvas"></canvas></div>' +
    '<div class="modal-footer"><button class="btn btn-ghost" onclick="clearSignature()">🗑️ Effacer</button><button class="btn btn-primary btn-lg" onclick="saveSignature()">✓ Confirmer la signature</button></div>'
  );
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
  } catch(e) { alert('Erreur: ' + (e.message||e)); }
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

