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
  var btn = e.target.querySelector('button[type="submit"]');
  var eqId = $('tempEq').value, val = $('tempEqVal').value;
  if (!eqId || !val) return;
  var numVal = sanitizeNumeric(val);
  if (numVal === null || numVal < -50 || numVal > 200) { showToast('Température invalide (-50 à 200°C)', 'error'); return; }
  var eq = S.siteConfig.equipment.find(function(e){return e.id===eqId;});
  var eqMin = (eq && eq.temp_min != null && eq.temp_min !== '') ? Number(eq.temp_min) : -999;
  var eqMax = (eq && eq.temp_max != null && eq.temp_max !== '') ? Number(eq.temp_max) : 999;
  var action = null;
  if (eq && (numVal < eqMin || numVal > eqMax)) {
    action = await appPrompt('Température non conforme', 'La valeur <strong>' + numVal + '°C</strong> est hors limites (' + eqMin + '°/' + eqMax + '°C).<br>Quelle action corrective a été effectuée ?', '', {placeholder:'Ex: Dégivrage, Appel SAV, Transfert produits...',multiline:true,confirmLabel:'Enregistrer'});
    if (!action) { showToast('Enregistrement annulé', 'info'); return; }
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading"></span>'; }
  try {
    await addTemperature('equipment', eqId, numVal, action, '');
    if ($('tempEqVal')) $('tempEqVal').value = '';
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '✓ Enregistrer la température'; }
};

window.handleTempProd = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  var prId = $('tempPr').value, val = $('tempPrVal').value;
  if (!prId || !val) return;
  var numVal = sanitizeNumeric(val);
  if (numVal === null || numVal < -50 || numVal > 200) { showToast('Température invalide (-50 à 200°C)', 'error'); return; }
  var pr = S.siteConfig.products.find(function(p){return p.id===prId;});
  var prMin = (pr && pr.temp_min != null && pr.temp_min !== '') ? Number(pr.temp_min) : -999;
  var prMax = (pr && pr.temp_max != null && pr.temp_max !== '') ? Number(pr.temp_max) : 999;
  var action = null;
  if (pr && (numVal < prMin || numVal > prMax)) {
    action = await appPrompt('Température non conforme', 'Quelle action corrective a été effectuée ?', '', {placeholder:'Ex: Dégivrage, Appel SAV, Transfert produits...',multiline:true,confirmLabel:'Enregistrer'});
    if (!action) { showToast('Enregistrement annulé', 'info'); return; }
  }
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading"></span>'; }
  try {
    await addTemperature('product', prId, numVal, action, '');
    if ($('tempPrVal')) $('tempPrVal').value = '';
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
  if (btn) { btn.disabled = false; btn.innerHTML = '✓ Enregistrer la température'; }
};

window.handleDlc = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addDlc($('dlcProd').value, $('dlcDate').value, $('dlcLot').value, $('dlcNotes').value);
    $('dlcProd').value = ''; $('dlcDate').value = ''; $('dlcLot').value = ''; $('dlcNotes').value = '';
  });
};

window.handleLot = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addLot($('lotProd').value, $('lotNum').value, $('lotSupp').value, $('lotDlc').value, $('lotNotes').value);
    $('lotProd').value = ''; $('lotNum').value = ''; $('lotSupp').value = ''; $('lotDlc').value = ''; $('lotNotes').value = '';
  });
};

// ── UNIFIED RECEPTION HANDLER ──
window.handleReception = async function(e) {
  e.preventDefault();
  var product = $('recProduct').value.trim();
  var lotNum = $('recLotNum').value.trim().toUpperCase();
  var qty = $('recQty') ? $('recQty').value : '1';
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
      await _insertDlcRecord(product, dlcDate, lotNum, notes, photoData, qty);
    }
    if (saveLot && lotNum) {
      await _insertLotRecord(product, lotNum, supplier, dlcDate, notes, photoData, qty);
    }
    S.photoDlcData = null;
    await loadSiteData();
    showToast('Réception enregistrée', 'success');
    render();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
    btn.disabled = false; btn.innerHTML = origText;
  }
};


window.handleOrder = async function(e) {
  e.preventDefault();
  if (!$('ordSupp').value) { showToast('Sélectionnez un fournisseur', 'warning'); return; }
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addOrder($('ordProd').value, $('ordQty').value, $('ordUnit').value, $('ordSupp').value, $('ordNotes').value);
    $('ordProd').value = ''; $('ordQty').value = '1'; $('ordNotes').value = '';
  });
};

window.handleConsigne = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addConsigne($('conMsg').value, $('conPrio').value);
    $('conMsg').value = ''; if ($('conPrio')) $('conPrio').value = 'normal';
  });
};

window.handleCreateSite = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await createSite($('sName').value, $('sType').value, $('sAddr').value, $('sCity').value, $('sPhone').value, $('sEmail').value, $('sAgr').value, $('sResp').value);
    if ($('sName')) $('sName').value = '';
    if ($('sAddr')) $('sAddr').value = '';
    if ($('sCity')) $('sCity').value = '';
    if ($('sPhone')) $('sPhone').value = '';
    if ($('sEmail')) $('sEmail').value = '';
    if ($('sAgr')) $('sAgr').value = '';
    if ($('sResp')) $('sResp').value = '';
  });
};

window.handleCreateUser = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  var origText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> Création en cours...';
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
    openModal('<div class="modal-header"><div class="modal-title">Utilisateur créé</div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" style="text-align:center"><div style="width:56px;height:56px;background:var(--af-ok-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 14px">✅</div><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm);margin-bottom:10px"><div class="v2-text-xs v2-text-muted v2-mb-4">Identifiant</div><div class="v2-text-xl v2-font-800" style="letter-spacing:2px;color:var(--af-teal);font-family:monospace">' + esc(loginId) + '</div></div><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-xs v2-text-muted v2-mb-4">Mot de passe (cliquez pour copier)</div><input type="text" readonly value="' + esc(tempPass) + '" style="width:100%;border:none;background:transparent;font-size:18px;font-weight:800;text-align:center;cursor:pointer" onclick="navigator.clipboard.writeText(this.value);showToast(\'Copié !\',\'success\',1500)"></div></div><div class="modal-footer"><button class="btn btn-primary btn-lg" onclick="closeModal()">Compris</button></div>');

    $('nuName').value = ''; $('nuPass').value = generateTempPassword();
    if ($('nuLoginPreview')) $('nuLoginPreview').textContent = '';
    if ($('userListContainer')) loadAndDisplayUsers();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
  btn.disabled = false; btn.innerHTML = origText;
};

window.handleAddEquip = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addEquipment($('eqName').value, $('eqType').value, parseFloat($('eqMin').value), parseFloat($('eqMax').value), $('eqEmoji').value);
    $('eqName').value = '';
  });
};

window.handleAddProd = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addProduct($('prName').value, $('prCat').value, parseFloat($('prMin').value), parseFloat($('prMax').value), $('prEmoji').value, $('prConsoMode') ? $('prConsoMode').value : 'whole');
    $('prName').value = '';
  });
};

window.handleAddSupp = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  withLoading(btn, async function() {
    await addSupplier($('spName').value, $('spPhone').value, $('spEmail').value);
    $('spName').value = ''; $('spPhone').value = ''; $('spEmail').value = '';
  });
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
  var headers = ['Date', 'Heure', 'Point de contrôle', 'Type', 'Température', 'Conforme', 'Action corrective', 'Opérateur'];
  var rows = S.data.temperatures.map(function(t) {
    var refName = '';
    if (t.record_type === 'equipment') {
      var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
      refName = eq ? eq.name : '';
    } else {
      var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
      refName = pr ? pr.name : '';
    }
    return [fmtD(t.recorded_at), fmtDT(t.recorded_at), refName, t.record_type === 'equipment' ? 'Équipement' : 'Produit', t.value + ' C', t.is_conform ? 'Oui' : 'Non', t.corrective_action || '', t.recorded_by_name || ''];
  });
  exportCSV('temperatures-' + today() + '.csv', headers, rows);
};

window.exportDlcCSV = function() {
  var headers = ['Produit', 'Date DLC', 'Jours restants', 'Lot', 'Statut', 'Enregistré par', 'Date'];
  var rows = S.data.dlcs.map(function(d) {
    return [d.product_name, fmtD(d.dlc_date), daysUntil(d.dlc_date), d.lot_number || '', d.status || 'actif', d.recorded_by_name || '', fmtDT(d.recorded_at)];
  });
  exportCSV('dlc-' + today() + '.csv', headers, rows);
};

window.exportLotsCSV = function() {
  var headers = ['Produit', 'N° Lot', 'Fournisseur', 'Date DLC', 'Date enregistrement', 'Enregistré par'];
  var rows = S.data.lots.map(function(l) {
    return [l.product_name, l.lot_number, l.supplier_name || '', l.dlc_date ? fmtD(l.dlc_date) : '', fmtDT(l.recorded_at), l.recorded_by_name || ''];
  });
  exportCSV('lots-' + today() + '.csv', headers, rows);
};

window.exportOrdersCSV = function() {
  var headers = ['Produit', 'Quantité', 'Unité', 'Fournisseur', 'Statut', 'Commandé par', 'Date'];
  var rows = S.data.orders.map(function(o) {
    return [o.product_name, o.quantity, o.unit || '', o.supplier_name || '', o.status, o.ordered_by_name || '', fmtDT(o.ordered_at)];
  });
  exportCSV('commandes-' + today() + '.csv', headers, rows);
};

// ── FULL BACKUP EXPORT ──
window.exportFullBackup = function() {
  var headers = ['Type', 'Produit', 'Valeur', 'Conforme', 'Date DLC', 'N° Lot', 'Fournisseur', 'Statut', 'Quantité', 'Unité', 'Notes', 'Opérateur', 'Date'];
  var rows = [];
  S.data.temperatures.forEach(function(t) {
    var refName = '';
    if (t.record_type === 'equipment') {
      var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
      refName = eq ? eq.name : '';
    } else {
      var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
      refName = pr ? pr.name : '';
    }
    rows.push(['Temperature', refName, t.value + ' C', t.is_conform ? 'Oui' : 'Non', '', '', '', '', '', '', t.corrective_action || '', t.recorded_by_name || '', fmtDT(t.recorded_at)]);
  });
  S.data.dlcs.forEach(function(d) {
    rows.push(['DLC', d.product_name, '', '', fmtD(d.dlc_date), d.lot_number || '', '', d.status || 'actif', '', '', '', d.recorded_by_name || '', fmtDT(d.recorded_at)]);
  });
  S.data.lots.forEach(function(l) {
    rows.push(['Lot', l.product_name, '', '', l.dlc_date ? fmtD(l.dlc_date) : '', l.lot_number, l.supplier_name || '', '', '', '', '', l.recorded_by_name || '', fmtDT(l.recorded_at)]);
  });
  S.data.orders.forEach(function(o) {
    rows.push(['Commande', o.product_name, '', '', '', '', o.supplier_name || '', o.status, o.quantity, o.unit || '', '', o.ordered_by_name || '', fmtDT(o.ordered_at)]);
  });
  var siteName = currentSite() ? currentSite().name.replace(/[^a-zA-Z0-9]/g, '_') : 'site';
  exportCSV('backup-' + siteName + '-' + today() + '.csv', headers, rows);
};

// ── LOGIN ID MANAGEMENT ──
window.handleEditLoginId = async function(userId, currentId) {
  var newId = await appPrompt('Modifier l\'identifiant', 'Saisissez le nouvel identifiant pour cet utilisateur.', currentId || '', {placeholder:'Ex: JR0001',confirmLabel:'Modifier'});
  if (!newId || newId.toUpperCase() === (currentId || '').toUpperCase()) return;
  try {
    await updateLoginId(userId, newId);
    showToast('Identifiant modifié : ' + newId.toUpperCase(), 'success');
    if (typeof loadAndDisplayUsersDetailed === 'function') loadAndDisplayUsersDetailed();
    if (typeof loadAndRenderTeam === 'function') loadAndRenderTeam();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
};

window.handleResetUserPassword = async function(userId, loginId) {
  var newPass = await appPrompt('Réinitialiser le mot de passe', 'Nouveau mot de passe pour <strong>' + esc(loginId) + '</strong>', '', {placeholder:'Minimum 8 caractères',inputType:'password',confirmLabel:'Réinitialiser'});
  if (!newPass) return;
  var v = validatePassword(newPass);
  if (!v.valid) { showToast(v.message, 'error'); return; }
  try {
    // 1. Save current admin session
    var currentSession = await sb.auth.getSession();
    var savedToken = currentSession.data.session;

    // 2. Get user's email to sign in as them temporarily
    var profile = await sb.from('profiles').select('email').eq('id', userId).single();
    if (!profile.data || !profile.data.email) throw new Error('Email utilisateur introuvable');

    // Use server-side RPC to reset password (SECURITY DEFINER)
    var rpcResult = await sb.rpc('admin_reset_password', { p_user_id: userId, p_new_password: newPass });
    if (rpcResult.error) {
      // Fallback: set must_change_password and warn admin
      await sb.from('profiles').update({ must_change_password: true }).eq('id', userId);
      showToast('Le mot de passe n\'a pas pu être changé automatiquement. L\'utilisateur devra le changer à la prochaine connexion.', 'warning', 6000);
      return;
    }
    if (rpcResult.data && rpcResult.data.error) {
      showToast(rpcResult.data.error, 'error');
      return;
    }

    showToast('Mot de passe réinitialisé', 'success');
    openModal('<div class="modal-header"><div class="modal-title">Mot de passe réinitialisé</div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" style="text-align:center"><p class="v2-text-md v2-font-600 v2-mb-14">L\'utilisateur devra changer son mot de passe à la prochaine connexion.</p><div style="padding:14px;background:var(--bg-off);border-radius:var(--radius-sm)"><div class="v2-text-xs v2-text-muted v2-mb-4">Nouveau mot de passe</div><div class="v2-font-800" style="font-size:16px;letter-spacing:1px"><input type="text" readonly value="' + esc(newPass) + '" style="width:100%;border:none;background:transparent;font-size:16px;font-weight:800;text-align:center;cursor:pointer" onclick="navigator.clipboard.writeText(this.value);showToast(\'Copié !\',\'success\',1500)"></div></div><p class="v2-text-xs v2-text-muted v2-mt-8">Cliquez sur le mot de passe pour le copier</p></div><div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Compris</button></div>');
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
    // 1. Remove from local state + render immediately (UI responsive)
    S.data.consignes = S.data.consignes.filter(function(c) { return c.id !== id; });
    render();
    showToast('Consigne traitée ✓', 'success');

    // 2. Persist in DB (RLS now allows all members to update is_read)
    var r = await sb.from('consignes').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);

    // 3. Fallback: save in localStorage in case DB update fails
    if (r.error) {
      var key = 'haccp_dismissed_consignes_' + (S.currentSiteId || 'global');
      var dismissed = [];
      try { dismissed = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e2) {}
      if (dismissed.indexOf(id) === -1) dismissed.push(id);
      localStorage.setItem(key, JSON.stringify(dismissed));
    }
  } catch(e) { console.warn('markConsigneRead:', e); }
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
window.partialConsumeDlc = partialConsumeDlc;
window.deleteLot = deleteLot;
window.updateLotStatus = updateLotStatus;
window.partialConsumeLot = partialConsumeLot;
window.addOrder = addOrder;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.deleteConsigne = deleteConsigne;
// Save original refs before wrapping (avoid circular reference)
var _deleteEquipment = deleteEquipment;
var _deleteProduct = deleteProduct;
var _deleteSupplier = deleteSupplier;
var _toggleModule = toggleModule;
var _deleteSite = deleteSite;
window.deleteEquipment = function(id) { if (!isManager()) { showToast('Accès refusé','error'); return; } return _deleteEquipment(id); };
window.deleteProduct = function(id) { if (!isManager()) { showToast('Accès refusé','error'); return; } return _deleteProduct(id); };
window.deleteSupplier = function(id) { if (!isManager()) { showToast('Accès refusé','error'); return; } return _deleteSupplier(id); };
window.toggleModule = function(k,v) { if (!isManager()) { showToast('Accès refusé','error'); return; } return _toggleModule(k,v); };
window.deleteSite = function(id) { if (!isSuperAdmin()) { showToast('Accès refusé','error'); return; } return _deleteSite(id); };
window.generateDailyPDF = generateDailyPDF;
window.generateTempPDF = generateTempPDF;
window.generateDlcPDF = generateDlcPDF;
window.generateIncidentPDF = generateIncidentPDF;
window.generateFullPDF = generateFullPDF;
window.loadAndDisplayUsers = loadAndDisplayUsers;

// -- Cleaning handlers --
window.handleCleaningRecord = async function(scheduleId, status) {
  var notes = $('cleanNotes') ? $('cleanNotes').value.trim() : '';
  closeModal();
  await addCleaningLog(scheduleId, status, notes);
};

window.handleCleaningSchedule = async function(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  var name = $('cleanName') ? $('cleanName').value.trim() : '';
  var zone = $('cleanZone') ? $('cleanZone').value.trim() : '';
  var freq = $('cleanFreq') ? $('cleanFreq').value : 'daily';
  if (!name) { showToast('Nom de la tâche requis', 'error'); return; }
  var opts = {};
  if (freq === 'weekly' && $('cleanDayOfWeek')) opts.day_of_week = $('cleanDayOfWeek').value;
  if (freq === 'monthly' && $('cleanDayOfMonth')) opts.day_of_month = $('cleanDayOfMonth').value;
  if (freq === 'one_time' && $('cleanOneTimeDate')) opts.one_time_date = $('cleanOneTimeDate').value;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loading"></span>'; }
  try {
    await addCleaningSchedule(name, zone, freq, opts);
    closeModal();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = 'Ajouter'; }
  }
};

window.handleCleaningPhoto = function(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      S.photoCleaningData = canvas.toDataURL('image/jpeg', 0.7);
      var preview = $('cleanPhotoPreview');
      if (preview) preview.innerHTML = '<img src="' + S.photoCleaningData + '" class="photo-preview" style="margin-top:8px"><button class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="S.photoCleaningData=null;this.parentElement.innerHTML=\'\'">🗑️ Supprimer</button>';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
};

// -- Produit utilisé entier (œufs, saucisses…) --
// prodIdx = index dans S._consoProds (évite les problèmes de quotes dans onclick)
window.handleUseWhole = async function(prodIdx, inputId) {
  var prodNames = S._consoProds ? Object.keys(S._consoProds).sort() : [];
  var prod = prodNames[prodIdx];
  if (!prod) { showToast('Produit introuvable', 'error'); return; }
  var input = document.getElementById(inputId);
  var qty = parseFloat(input ? input.value : '1') || 1;
  if (qty <= 0) { showToast('Quantité invalide', 'warning'); return; }
  var group = S._consoProds[prod];
  var unit = group && group[0] ? (group[0].unit || 'unité') : 'unité';
  try {
    await recordConsumption(prod, qty, unit, 'Utilisé entier');
  } catch(e) {
    showToast('Erreur: ' + (e.message || e), 'error');
  }
};

// -- Colis entamés --

// Ouvrir le modal d'ouverture d'un colis
window.openPackageModal = function(dlcId) {
  var d = S.data.dlcs.find(function(x) { return x.id === dlcId; });
  if (!d) return;
  var h = '<div style="padding:20px">';
  h += '<h3 style="margin:0 0 4px">📂 Ouvrir un colis</h3>';
  h += '<div style="color:var(--muted);margin-bottom:20px">' + esc(d.product_name);
  if (d.lot_number) h += ' · Lot ' + esc(d.lot_number);
  h += ' · DLC fabricant ' + fmtD(d.dlc_date) + '</div>';
  h += '<label class="form-label">Durée de conservation après ouverture</label>';
  h += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
  [3, 5, 7].forEach(function(n) {
    h += '<button type="button" class="btn btn-outline btn-sm" onclick="setShelfLifePreset(' + n + ')">' + n + ' jours</button>';
  });
  h += '</div>';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">';
  h += '<input type="number" id="openShelfLife" class="form-input" value="3" min="1" max="30" style="width:80px">';
  h += '<span style="color:var(--muted)">jours après ouverture</span></div>';
  h += '<input type="hidden" id="openPackageDlcId" value="' + dlcId + '">';
  h += '<button class="btn btn-primary" style="width:100%" onclick="confirmOpenPackage()">✅ Confirmer l\'ouverture</button>';
  h += '</div>';
  openModal(h);
};

window.setShelfLifePreset = function(n) {
  var el = $('openShelfLife');
  if (el) el.value = n;
};

window.confirmOpenPackage = async function() {
  var dlcId = $('openPackageDlcId') ? $('openPackageDlcId').value : '';
  var days = parseFloat($('openShelfLife') ? $('openShelfLife').value : '3') || 3;
  if (!dlcId) { showToast('Erreur interne', 'error'); return; }
  closeModal();
  await openPackage(dlcId, days);
};

window.discardPackage = async function(dlcId) {
  if (!(await appConfirm('Jeter', 'Confirmer la mise au rebut de ce produit expiré ?', { danger: true, icon: '🗑️', confirmLabel: 'Jeter' }))) return;
  var r = await sbExec(sb.from('dlcs').update({ status: 'discarded' }).eq('id', dlcId), 'Mise au rebut');
  if (!r) return;
  showToast('Produit jeté', 'success');
  await loadSiteData(); render();
};

