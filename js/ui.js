// =====================================================================
// PHOTO HANDLING + CLAUDE VISION OCR
// =====================================================================

function handlePhotoFor(inputId, context) {
  var input = document.getElementById(inputId);
  if (!input || !input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      if (context === 'dlc') { S.photoDlcData = dataUrl; }
      else { S.photoLotData = dataUrl; }
      render();
      // Lancer l'OCR automatique
      runPhotoOCR(dataUrl, context);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Remove Claude API key from this browser (session + legacy localStorage)
function clearClaudeKey() {
  try { sessionStorage.removeItem('haccp_claude_key'); } catch (e) {}
  try { localStorage.removeItem('haccp_claude_key'); } catch (e) {}
  S.claudeApiKey = '';
  var el = document.getElementById('claudeApiKey');
  if (el) el.value = '';
  showToast('Clé Claude supprimée de ce navigateur', 'success');
}

async function runPhotoOCR(dataUrl, context) {
  showOcrStatus(context, 'loading', '🔍 Analyse en cours...');

  try {
    var base64 = dataUrl.split(',')[1];

    // Try Edge Function proxy first (no API key needed)
    var result = await _ocrViaProxy(base64, context);
    if (!result) {
      // Fallback: direct API call with local key (super_admin only)
      result = await _ocrDirectApi(base64, context);
    }
    if (!result) {
      showOcrStatus(context, 'error', '⚠️ OCR non disponible. Contactez votre administrateur.');
      return;
    }
    applyOcrResult(result, context);
  } catch(err) {
    showOcrStatus(context, 'error', '⚠️ ' + (err.message || 'Erreur de détection'));
  }
}

async function _ocrViaProxy(base64, context) {
  try {
    var session = await sb.auth.getSession();
    var token = session.data.session ? session.data.session.access_token : null;
    if (!token) return null;

    var resp = await fetch(SB_URL + '/functions/v1/ocr-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ image_base64: base64, context: context })
    });

    if (!resp.ok) {
      var errData = await resp.json().catch(function() { return {}; });
      // If function not deployed (404) or API key not set (500), return null for fallback
      if (resp.status === 404 || resp.status === 500) return null;
      throw new Error(errData.error || 'Erreur serveur OCR');
    }

    var data = await resp.json();
    return data.result || null;
  } catch(e) {
    // Network error or function not deployed — allow fallback
    if (e.message && e.message.indexOf('fetch') >= 0) return null;
    throw e;
  }
}

async function _ocrDirectApi(base64, context) {
  var apiKey = S.claudeApiKey || sessionStorage.getItem('haccp_claude_key') || '';
  if (!apiKey) return null;

  var prompts = {
    dlc: 'Analyse cette photo d\'étiquette alimentaire. Extrais UNIQUEMENT en JSON:\n{"product_name": "...", "dlc_date": "YYYY-MM-DD", "lot_number": "...", "supplier": "...", "confidence": "high/medium/low"}\nSi un champ n\'est pas visible, mets null. dlc_date = date limite de consommation (DLC) ou DDM. Cherche les formats: JJ/MM/AAAA, DD.MM.YYYY, DDMMYY, etc. Convertis toujours en YYYY-MM-DD.',
    lot: 'Analyse cette photo d\'étiquette alimentaire. Extrais UNIQUEMENT en JSON:\n{"product_name": "...", "lot_number": "...", "origin": "...", "supplier": "...", "dlc_date": "YYYY-MM-DD", "confidence": "high/medium/low"}\nSi un champ n\'est pas visible, mets null.',
    bl: 'Analyse ce bon de livraison ou facture. Extrais UNIQUEMENT en JSON:\n{"supplier": "...", "delivery_date": "YYYY-MM-DD", "bl_number": "...", "total_amount": "...", "products": [{"name": "...", "qty": "..."}], "confidence": "high/medium/low"}\nSi un champ n\'est pas visible, mets null.'
  };
  var prompt = prompts[context] || prompts.dlc;

  var resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });

  if (!resp.ok) {
    var errData = await resp.json().catch(function() { return {}; });
    throw new Error(errData.error ? errData.error.message : 'Erreur API ' + resp.status);
  }

  var data = await resp.json();
  var text = data.content && data.content[0] ? data.content[0].text : '';
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Pas de données détectées');
  return JSON.parse(jsonMatch[0]);
}

function normalizeOcrDate(value) {
  if (!value) return '';
  var v = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  var m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) return '';
  var day = String(parseInt(m[1], 10)).padStart(2, '0');
  var month = String(parseInt(m[2], 10)).padStart(2, '0');
  var year = String(m[3]);
  if (year.length === 2) year = '20' + year;
  return year + '-' + month + '-' + day;
}

function normalizeLotNumber(value) {
  if (!value) return '';
  return String(value).trim().toUpperCase();
}

function applyOcrResult(result, context) {
  var filled = [];

  if (context === 'bl') {
    // BL context: fill receive notes with detected info
    var notesEl = document.getElementById('receiveNotes');
    if (notesEl) {
      var lines = [];
      if (result.supplier) lines.push('Fournisseur: ' + result.supplier);
      if (result.bl_number) lines.push('BL/Facture: ' + result.bl_number);
      if (result.delivery_date) { var d = normalizeOcrDate(result.delivery_date); if (d) lines.push('Date: ' + d); }
      if (result.total_amount) lines.push('Montant: ' + result.total_amount);
      if (result.products && result.products.length > 0) {
        lines.push('Produits:');
        result.products.forEach(function(p) {
          if (p.name) lines.push('  - ' + p.name + (p.qty ? ' (' + p.qty + ')' : ''));
        });
      }
      if (lines.length > 0) {
        notesEl.value = lines.join('\n');
        filled = lines.slice(0, 3).map(function(l) { return l.split(':')[0]; });
      }
    }
  } else if (context === 'dlc') {
    if (result.product_name) {
      var el = document.getElementById('recProduct') || document.getElementById('dlcProd');
      if (el && !el.value) { el.value = result.product_name; filled.push('produit'); }
    }
    if (result.dlc_date) {
      var el2 = document.getElementById('recDlcDate') || document.getElementById('dlcDate');
      var normalizedDate = normalizeOcrDate(result.dlc_date);
      if (el2 && normalizedDate) { el2.value = normalizedDate; filled.push('date DLC'); }
    }
    if (result.lot_number) {
      var el3 = document.getElementById('recLotNum') || document.getElementById('dlcLot');
      if (el3 && !el3.value) { el3.value = normalizeLotNumber(result.lot_number); filled.push('n° lot'); }
    }
    if (result.supplier) {
      var el6 = document.getElementById('recSupplier');
      if (el6 && !el6.value) { el6.value = result.supplier; filled.push('fournisseur'); }
    }
  } else {
    // lot context
    if (result.product_name) {
      var el4 = document.getElementById('recProduct') || document.getElementById('lotProd');
      if (el4 && !el4.value) { el4.value = result.product_name; filled.push('produit'); }
    }
    if (result.lot_number) {
      var el5 = document.getElementById('recLotNum') || document.getElementById('lotNum');
      if (el5 && !el5.value) { el5.value = normalizeLotNumber(result.lot_number); filled.push('n° lot'); }
    }
    if (result.supplier) {
      var el7 = document.getElementById('recSupplier') || document.getElementById('lotSupp');
      if (el7) {
        if (el7.tagName === 'SELECT') {
          var opts = el7.options;
          for (var i = 0; i < opts.length; i++) {
            if (opts[i].text.toLowerCase().indexOf(result.supplier.toLowerCase()) >= 0) {
              el7.value = opts[i].value; filled.push('fournisseur'); break;
            }
          }
        } else {
          if (!el7.value) { el7.value = result.supplier; filled.push('fournisseur'); }
        }
      }
    }
  }

  var confidence = result.confidence || 'medium';
  var confLabel = confidence === 'high' ? '🟢 Élevée' : confidence === 'medium' ? '🟡 Moyenne' : '🔴 Faible';

  if (filled.length > 0) {
    showOcrStatus(context, 'success', '✅ Détecté : ' + filled.join(', ') + ' (confiance : ' + confLabel + ')');
  } else {
    showOcrStatus(context, 'info', '📷 Photo capturée mais aucune info détectée automatiquement.');
  }
}

function showOcrStatus(context, type, message) {
  var idMap = { dlc: 'ocrStatusDlc', lot: 'ocrStatusLot', bl: 'ocrStatusBl' };
  var el = document.getElementById(idMap[context] || 'ocrStatusDlc');
  if (!el) return;
  var safeType = esc(type);
  el.innerHTML = '<div class="v2-ocr-status v2-ocr-status--' + safeType + '">' + (type === 'loading' ? '<span class="loading v2-mr-6"></span>' : '') + esc(message) + '</div>';

  // Add/remove scanning animation on the photo
  var imgMap = { dlc: 'photoDlcImg', bl: 'blPhotoImg' };
  var img = document.getElementById(imgMap[context]);
  if (img) {
    if (type === 'loading') img.classList.add('photo-scanning');
    else img.classList.remove('photo-scanning');
  }
}

function clearPhotoDlc() { S.photoDlcData = null; render(); }
function clearPhotoLot() { S.photoLotData = null; render(); }

// =====================================================================
// SIGNATURE
// =====================================================================

var sigCanvas, sigCtx, sigDrawing = false;

function initSignature() {
  sigCanvas = document.getElementById('sigCanvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  var rect = sigCanvas.getBoundingClientRect();
  sigCanvas.width = rect.width;
  sigCanvas.height = rect.height;
  sigCtx.strokeStyle = '#1a1a2e';
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigDrawing = false;

  function getPos(e) {
    var r = sigCanvas.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  sigCanvas.onmousedown = sigCanvas.ontouchstart = function(e) {
    e.preventDefault(); sigDrawing = true;
    var p = getPos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y);
  };
  sigCanvas.onmousemove = sigCanvas.ontouchmove = function(e) {
    if (!sigDrawing) return; e.preventDefault();
    var p = getPos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke();
  };
  sigCanvas.onmouseup = sigCanvas.ontouchend = function() { sigDrawing = false; };
}

function clearSignature() {
  if (sigCanvas && sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  S.sigData = null;
}

function saveSignature() {
  if (!sigCanvas) return;
  S.sigData = sigCanvas.toDataURL('image/png');
  closeModal(); render();
}

// =====================================================================
// MODALS
// =====================================================================

var _lastFocusedElement = null;

function openModal(html) {
  _lastFocusedElement = document.activeElement;
  $('modalContent').innerHTML = html;
  $('modalOverlay').classList.add('show');
  setTimeout(function() {
    initSignature();
    // Focus first focusable element in modal
    var modal = $('modalContent');
    var focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }, 100);
}

function closeModal() {
  $('modalOverlay').classList.remove('show');
  // Clean up any pending confirm/prompt resolve
  if (window._modalResolve) { window._modalResolve(null); window._modalResolve = null; }
  // Restore focus
  if (_lastFocusedElement && _lastFocusedElement.focus) {
    try { _lastFocusedElement.focus(); } catch(e) {}
    _lastFocusedElement = null;
  }
}

// Fermer modals avec Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = $('modalOverlay');
    if (overlay && overlay.classList.contains('show')) closeModal();
  }
});

// ── Apple-style Confirm Modal (returns Promise<boolean>) ──
function appConfirm(title, message, opts) {
  opts = opts || {};
  var confirmLabel = opts.confirmLabel || 'Confirmer';
  var cancelLabel = opts.cancelLabel || 'Annuler';
  var danger = opts.danger || false;
  var icon = opts.icon || (danger ? '⚠️' : '✓');
  var btnClass = danger ? 'btn-danger' : 'btn-primary';

  return new Promise(function(resolve) {
    window._modalResolve = resolve;
    var h = '<div class="modal-header"><div class="modal-title">' + esc(title) + '</div><button class="modal-close" onclick="window._modalResolve(false);window._modalResolve=null;closeModal()" aria-label="Fermer">✕</button></div>';
    h += '<div class="modal-body" style="text-align:center;padding:28px 24px">';
    h += '<div style="width:56px;height:56px;border-radius:50%;background:' + (danger ? 'var(--af-err-bg)' : 'var(--af-teal-bg)') + ';display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 16px">' + icon + '</div>';
    h += '<p style="font-size:15px;line-height:1.6;color:var(--ink);font-weight:500;margin:0">' + message + '</p>';
    h += '</div>';
    h += '<div class="modal-footer" style="justify-content:center;gap:12px;padding:18px 24px">';
    h += '<button class="btn btn-ghost btn-lg" style="min-width:120px" onclick="window._modalResolve(false);window._modalResolve=null;closeModal()">' + esc(cancelLabel) + '</button>';
    h += '<button class="btn ' + btnClass + ' btn-lg" style="min-width:120px" onclick="window._modalResolve(true);window._modalResolve=null;closeModal()">' + esc(confirmLabel) + '</button>';
    h += '</div>';
    openModal(h);
  });
}

// ── Apple-style Prompt Modal (returns Promise<string|null>) ──
function appPrompt(title, message, defaultVal, opts) {
  opts = opts || {};
  var placeholder = opts.placeholder || '';
  var inputType = opts.inputType || 'text';
  var confirmLabel = opts.confirmLabel || 'Valider';
  var multiline = opts.multiline || false;

  return new Promise(function(resolve) {
    window._modalResolve = resolve;
    var h = '<div class="modal-header"><div class="modal-title">' + esc(title) + '</div><button class="modal-close" onclick="window._modalResolve(null);window._modalResolve=null;closeModal()">✕</button></div>';
    h += '<div class="modal-body">';
    if (message) h += '<p style="font-size:14px;line-height:1.6;color:var(--ink-muted);margin:0 0 16px;font-weight:500">' + message + '</p>';
    if (multiline) {
      h += '<textarea class="form-textarea" id="_appPromptInput" rows="3" placeholder="' + esc(placeholder) + '" style="font-size:15px">' + esc(defaultVal || '') + '</textarea>';
    } else {
      h += '<input type="' + inputType + '" class="form-input" id="_appPromptInput" value="' + esc(defaultVal || '') + '" placeholder="' + esc(placeholder) + '" style="font-size:15px">';
    }
    h += '</div>';
    h += '<div class="modal-footer"><button class="btn btn-ghost" onclick="window._modalResolve(null);window._modalResolve=null;closeModal()">Annuler</button>';
    h += '<button class="btn btn-primary btn-lg" onclick="var v=document.getElementById(\'_appPromptInput\').value;window._modalResolve(v);window._modalResolve=null;closeModal()">' + esc(confirmLabel) + '</button></div>';
    openModal(h);
    setTimeout(function() { var el = document.getElementById('_appPromptInput'); if (el) { el.focus(); el.select(); } }, 150);
  });
}

window.appConfirm = appConfirm;
window.appPrompt = appPrompt;

// =====================================================================
// SIDEBAR & NAVIGATION
// =====================================================================

function toggleSidebar() {
  S.sidebarOpen = !S.sidebarOpen;
  var sidebar = document.querySelector('.sidebar');
  var bd = $('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('open', S.sidebarOpen);
  if (bd) bd.classList.toggle('show', S.sidebarOpen);
}

function navigate(page, skipHistory) {
  S.page = page;
  S.filter = 'all';
  S.sidebarOpen = false;
  var sidebar = document.querySelector('.sidebar');
  var bd = $('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (bd) bd.classList.remove('show');
  if (!skipHistory) {
    try { history.pushState({ page: page }, '', '#' + page); } catch(e) {}
  }
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page) {
    navigate(e.state.page, true);
  } else {
    var hash = location.hash.replace('#', '');
    navigate(hash || 'dashboard', true);
  }
});

// =====================================================================
// PDF GENERATION — SYSTÈME COMPLET
// =====================================================================

// ── STYLES COMMUNS ──

function pdfStyles() {
  return 'body{font-family:Arial,sans-serif;padding:30px;font-size:13px;color:#1a1a2e}' +
    'h1{color:#2563eb;font-size:20px;margin-bottom:4px}' +
    'h2{font-size:14px;color:#666;margin-bottom:20px}' +
    'h3{font-size:15px;color:#2563eb;margin:24px 0 10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0 20px}' +
    'th{background:#2563eb;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.3px}' +
    'td{padding:7px 10px;border-bottom:1px solid #e5e7eb;font-size:12px}' +
    'tr:nth-child(even) td{background:#f8fafc}' +
    '.ok{color:#059669;font-weight:600}.nok{color:#dc2626;font-weight:600}' +
    '.header{border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start}' +
    '.header-left{flex:1}.header-right{text-align:right;font-size:11px;color:#999}' +
    '.footer{margin-top:30px;padding-top:16px;border-top:2px solid #2563eb;font-size:10px;color:#999;display:flex;justify-content:space-between}' +
    '.stat-box{display:inline-block;border:1px solid #e5e7eb;border-radius:6px;padding:10px 16px;margin:0 8px 8px 0;text-align:center}' +
    '.stat-box .val{font-size:22px;font-weight:800;color:#2563eb}.stat-box .lbl{font-size:10px;color:#666;margin-top:2px}' +
    '.stat-box.danger .val{color:#dc2626}.stat-box.warn .val{color:#d97706}.stat-box.success .val{color:#059669}' +
    '.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}' +
    '.badge-red{background:#fee2e2;color:#dc2626}.badge-green{background:#d1fae5;color:#059669}.badge-yellow{background:#fef3c7;color:#d97706}.badge-gray{background:#f3f4f6;color:#6b7280}' +
    '.section{page-break-inside:avoid}' +
    '.sig-block{margin-top:24px;display:flex;gap:40px}' +
    '.sig-item{flex:1;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#666}' +
    '@media print{body{padding:15px}h1{font-size:18px}.footer{position:fixed;bottom:0;left:0;right:0;padding:10px 30px}}';
}

function pdfHeader(title, subtitle) {
  var site = currentSite();
  return '<div class="header"><div class="header-left"><h1>🛡️ ' + esc(title) + '</h1><h2>' + esc(subtitle) + '</h2></div>' +
    '<div class="header-right">' + (site ? esc(site.name) + '<br>' : '') +
    (site && site.address ? esc(site.address) + '<br>' : '') +
    (site && site.city ? esc(site.city) + '<br>' : '') +
    (site && site.agrement ? 'N° agrément : ' + esc(site.agrement) + '<br>' : '') +
    (site && site.responsable ? 'Responsable : ' + esc(site.responsable) : '') +
    '</div></div>';
}

function pdfFooter() {
  return '<div class="footer"><span>Généré par HACCP Pro le ' + fmtDT(new Date()) + '</span><span>Document à conserver 2 ans minimum — Règlement CE 852/2004</span></div>';
}

function pdfSignatureBlock() {
  var sigImg = S.sigData ? '<img src="' + S.sigData + '" style="max-width:180px;max-height:60px;margin-top:6px">' : '<div style="height:50px"></div>';
  return '<div class="sig-block">' +
    '<div class="sig-item">Signature de l\'opérateur :<br>' + sigImg + '</div>' +
    '<div class="sig-item">Date : ' + fmtD(today()) + '</div>' +
    '<div class="sig-item">Nom : ' + esc(userName()) + '</div>' +
    '</div>';
}

function openPdfWindow(html) {
  // Mobile-friendly: use blob URL to avoid blocking
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var w = window.open(url, '_blank');
  if (!w) {
    // Fallback if popup blocked: create download link
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.setAttribute('download', 'rapport-haccp.html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Le rapport a été téléchargé. Ouvrez-le pour imprimer.', 'info');
  } else {
    setTimeout(function() { try { w.print(); } catch(e) {} }, 500);
  }
}

// ── RAPPORT TEMPÉRATURES ──

async function generateTempPDF() {
  var dateStr = $('rptTempDate') ? $('rptTempDate').value : today();
  var site = currentSite();
  var siteName = site ? site.name : 'Site';

  // Charger les températures depuis la DB pour la date sélectionnée
  var temps;
  if (dateStr === today()) {
    temps = S.data.temperatures;
  } else {
    showToast('Chargement des données...', 'info');
    var dayStart = new Date(dateStr + 'T00:00:00').toISOString();
    var dayEnd = new Date(dateStr + 'T23:59:59').toISOString();
    var r = await sb.from('temperatures').select('*').eq('site_id', S.currentSiteId).gte('recorded_at', dayStart).lte('recorded_at', dayEnd).order('recorded_at', {ascending: false});
    temps = r.data || [];
  }

  var conform = temps.filter(function(t) { return t.is_conform; }).length;
  var nonConform = temps.length - conform;
  var eqCount = S.siteConfig.equipment.length;
  var prCount = S.siteConfig.products.length;
  var totalExpected = eqCount + prCount;

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Températures — ' + siteName + '</title><style>' + pdfStyles() + '</style></head><body>';
  html += pdfHeader('Rapport Températures', siteName + ' — ' + fmtD(dateStr));

  // Stats
  html += '<div style="margin-bottom:16px">';
  html += '<div class="stat-box"><div class="val">' + temps.length + '/' + totalExpected + '</div><div class="lbl">Relevés effectués</div></div>';
  html += '<div class="stat-box success"><div class="val">' + conform + '</div><div class="lbl">Conformes</div></div>';
  if (nonConform > 0) html += '<div class="stat-box danger"><div class="val">' + nonConform + '</div><div class="lbl">Non conformes</div></div>';
  html += '</div>';

  // Tableau
  html += '<table><thead><tr><th>Heure</th><th>Point de contrôle</th><th>Type</th><th>Température</th><th>Conformité</th><th>Action corrective</th><th>Opérateur</th></tr></thead><tbody>';
  if (temps.length > 0) {
    temps.forEach(function(t) {
      var refName = '', refType = '';
      if (t.record_type === 'equipment') {
        var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
        refName = eq ? eq.name : '—'; refType = 'Équipement';
      } else {
        var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
        refName = pr ? pr.name : '—'; refType = 'Produit';
      }
      html += '<tr><td>' + fmtDT(t.recorded_at) + '</td><td>' + esc(refName) + '</td><td>' + refType + '</td>';
      html += '<td style="font-weight:700">' + t.value + '°C</td>';
      html += '<td class="' + (t.is_conform ? 'ok' : 'nok') + '">' + (t.is_conform ? '✓ Conforme' : '✗ Non conforme') + '</td>';
      html += '<td>' + esc(t.corrective_action || '—') + '</td><td>' + esc(t.recorded_by_name || '—') + '</td></tr>';
    });
  } else {
    html += '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999">Aucun relevé enregistré pour cette date</td></tr>';
  }
  html += '</tbody></table>';
  html += pdfSignatureBlock();
  html += pdfFooter();
  html += '</body></html>';
  openPdfWindow(html);
}

// Compatibilité ancien nom
function generateDailyPDF() { generateTempPDF(); }

// ── RAPPORT DLC & TRAÇABILITÉ ──

function generateDlcPDF() {
  var scope = $('rptDlcScope') ? $('rptDlcScope').value : 'all';
  var site = currentSite();
  var siteName = site ? site.name : 'Site';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DLC & Traçabilité — ' + siteName + '</title><style>' + pdfStyles() + '</style></head><body>';
  html += pdfHeader('Rapport DLC & Traçabilité', siteName + ' — ' + fmtD(today()));

  // ── DLC ──
  if (scope === 'all' || scope === 'dlc') {
    var dlcs = S.data.dlcs.filter(function(d) { return d.status !== 'consumed' && d.status !== 'discarded'; });
    var expired = dlcs.filter(function(d) { return daysUntil(d.dlc_date) < 0; });
    var warning = dlcs.filter(function(d) { var dd = daysUntil(d.dlc_date); return dd >= 0 && dd <= 2; });
    var ok = dlcs.filter(function(d) { return daysUntil(d.dlc_date) > 2; });

    html += '<h3>📅 Contrôle des DLC</h3>';
    html += '<div style="margin-bottom:12px">';
    html += '<div class="stat-box danger"><div class="val">' + expired.length + '</div><div class="lbl">Expirées</div></div>';
    html += '<div class="stat-box warn"><div class="val">' + warning.length + '</div><div class="lbl">À surveiller (≤2j)</div></div>';
    html += '<div class="stat-box success"><div class="val">' + ok.length + '</div><div class="lbl">Conformes</div></div>';
    html += '</div>';

    html += '<table><thead><tr><th>Produit</th><th>DLC</th><th>Jours restants</th><th>Lot</th><th>Statut</th><th>Enregistré par</th></tr></thead><tbody>';
    dlcs.sort(function(a, b) { return new Date(a.dlc_date) - new Date(b.dlc_date); });
    dlcs.forEach(function(d) {
      var days = daysUntil(d.dlc_date);
      var cls = days < 0 ? 'nok' : days <= 2 ? 'nok' : 'ok';
      var label = days < 0 ? '✗ Expirée (' + Math.abs(days) + 'j)' : days === 0 ? '⚠ Aujourd\'hui' : days <= 2 ? '⚠ ' + days + ' jour(s)' : '✓ ' + days + ' jours';
      html += '<tr><td>' + esc(d.product_name) + '</td><td>' + fmtD(d.dlc_date) + '</td>';
      html += '<td class="' + cls + '">' + label + '</td>';
      html += '<td>' + esc(d.lot_number || '—') + '</td>';
      html += '<td>' + esc(d.status || 'actif') + '</td>';
      html += '<td>' + esc(d.recorded_by_name || '—') + '</td></tr>';
    });
    if (dlcs.length === 0) html += '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">Aucune DLC enregistrée</td></tr>';
    html += '</tbody></table>';
  }

  // ── LOTS / TRAÇABILITÉ ──
  if (scope === 'all' || scope === 'lots') {
    html += '<h3>📦 Registre de Traçabilité</h3>';
    var lots = S.data.lots;
    html += '<table><thead><tr><th>Produit</th><th>N° Lot</th><th>Fournisseur</th><th>DLC</th><th>Date d\'enregistrement</th><th>Enregistré par</th></tr></thead><tbody>';
    lots.forEach(function(l) {
      html += '<tr><td>' + esc(l.product_name) + '</td><td style="font-weight:600">' + esc(l.lot_number) + '</td>';
      html += '<td>' + esc(l.supplier_name || '—') + '</td>';
      html += '<td>' + (l.dlc_date ? fmtD(l.dlc_date) : '—') + '</td>';
      html += '<td>' + fmtDT(l.recorded_at) + '</td>';
      html += '<td>' + esc(l.recorded_by_name || '—') + '</td></tr>';
    });
    if (lots.length === 0) html += '<tr><td colspan="6" style="text-align:center;color:#999;padding:16px">Aucun lot enregistré</td></tr>';
    html += '</tbody></table>';
  }

  html += pdfSignatureBlock();
  html += pdfFooter();
  html += '</body></html>';
  openPdfWindow(html);
}

// ── RAPPORT SIGNALEMENTS / INCIDENTS ──

async function generateIncidentPDF() {
  var days = parseInt($('rptIncidentPeriod') ? $('rptIncidentPeriod').value : '30');
  var site = currentSite();
  var siteName = site ? site.name : 'Site';
  var sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  try {
    var r = await sb.from('incident_reports').select('*')
      .eq('site_id', S.currentSiteId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false });

    var reports = r.data || [];
    var open = reports.filter(function(r) { return r.status === 'open'; });
    var inProgress = reports.filter(function(r) { return r.status === 'in_progress'; });
    var resolved = reports.filter(function(r) { return r.status === 'resolved'; });

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Signalements — ' + siteName + '</title><style>' + pdfStyles() + '</style></head><body>';
    html += pdfHeader('Rapport Signalements', siteName + ' — ' + days + ' derniers jours');

    // Stats
    html += '<div style="margin-bottom:16px">';
    html += '<div class="stat-box"><div class="val">' + reports.length + '</div><div class="lbl">Total signalements</div></div>';
    html += '<div class="stat-box danger"><div class="val">' + open.length + '</div><div class="lbl">Ouverts</div></div>';
    html += '<div class="stat-box warn"><div class="val">' + inProgress.length + '</div><div class="lbl">En cours</div></div>';
    html += '<div class="stat-box success"><div class="val">' + resolved.length + '</div><div class="lbl">Résolus</div></div>';
    html += '</div>';

    // Tableau
    var catLabels = { equipment: '🔧 Équipement', hygiene: '🧹 Hygiène', temperature: '🌡️ Température', product: '📦 Produit', other: '📋 Autre' };
    var statusLabels = { open: '🔴 Ouvert', in_progress: '🟡 En cours', resolved: '🟢 Résolu' };

    html += '<table><thead><tr><th>Date</th><th>Titre</th><th>Catégorie</th><th>Priorité</th><th>Statut</th><th>Signalé par</th><th>Résolu par</th></tr></thead><tbody>';
    reports.forEach(function(rep) {
      html += '<tr><td>' + fmtD(rep.created_at) + '</td>';
      html += '<td>' + esc(rep.title) + '</td>';
      html += '<td>' + (catLabels[rep.category] || rep.category) + '</td>';
      html += '<td><span class="badge ' + (rep.priority === 'urgent' ? 'badge-red' : 'badge-yellow') + '">' + (rep.priority === 'urgent' ? 'Urgent' : 'Normal') + '</span></td>';
      html += '<td>' + (statusLabels[rep.status] || rep.status) + '</td>';
      html += '<td>' + esc(rep.reported_by_name || '—') + '</td>';
      html += '<td>' + esc(rep.resolved_by_name || '—') + '</td></tr>';
    });
    if (reports.length === 0) html += '<tr><td colspan="7" style="text-align:center;color:#999;padding:16px">Aucun signalement sur cette période</td></tr>';
    html += '</tbody></table>';

    html += pdfSignatureBlock();
    html += pdfFooter();
    html += '</body></html>';
    openPdfWindow(html);
  } catch(e) {
    showToast('Erreur lors de la génération : ' + (e.message || e), 'error');
  }
}

// ── SYNTHÈSE HACCP COMPLÈTE ──

async function generateFullPDF() {
  var dateStr = $('rptFullDate') ? $('rptFullDate').value : today();
  var site = currentSite();
  var siteName = site ? site.name : 'Site';

  // Charger les températures depuis la DB pour la date sélectionnée
  var temps;
  if (dateStr === today()) {
    temps = S.data.temperatures;
  } else {
    showToast('Chargement des données...', 'info');
    var dayStart = new Date(dateStr + 'T00:00:00').toISOString();
    var dayEnd = new Date(dateStr + 'T23:59:59').toISOString();
    var r = await sb.from('temperatures').select('*').eq('site_id', S.currentSiteId).gte('recorded_at', dayStart).lte('recorded_at', dayEnd).order('recorded_at', {ascending: false});
    temps = r.data || [];
  }

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Synthèse HACCP — ' + siteName + '</title><style>' + pdfStyles() + '</style></head><body>';
  html += pdfHeader('Synthèse HACCP Complète', siteName + ' — ' + fmtD(dateStr));

  // ── 1. TEMPÉRATURES ──
  var conform = temps.filter(function(t) { return t.is_conform; }).length;
  var totalExpected = S.siteConfig.equipment.length + S.siteConfig.products.length;

  html += '<div class="section"><h3>1. 🌡️ Températures du jour</h3>';
  html += '<div style="margin-bottom:10px">';
  html += '<div class="stat-box"><div class="val">' + temps.length + '/' + totalExpected + '</div><div class="lbl">Relevés</div></div>';
  html += '<div class="stat-box success"><div class="val">' + conform + '</div><div class="lbl">Conformes</div></div>';
  html += '<div class="stat-box danger"><div class="val">' + (temps.length - conform) + '</div><div class="lbl">Non conformes</div></div>';
  html += '</div>';

  html += '<table><thead><tr><th>Heure</th><th>Point de contrôle</th><th>Valeur</th><th>Conformité</th><th>Action</th><th>Opérateur</th></tr></thead><tbody>';
  temps.forEach(function(t) {
    var refName = '';
    if (t.record_type === 'equipment') {
      var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
      refName = eq ? eq.name : '—';
    } else {
      var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
      refName = pr ? pr.name : '—';
    }
    html += '<tr><td>' + fmtDT(t.recorded_at) + '</td><td>' + esc(refName) + '</td>';
    html += '<td style="font-weight:700">' + t.value + '°C</td>';
    html += '<td class="' + (t.is_conform ? 'ok' : 'nok') + '">' + (t.is_conform ? '✓' : '✗') + '</td>';
    html += '<td>' + esc(t.corrective_action || '—') + '</td>';
    html += '<td>' + esc(t.recorded_by_name || '—') + '</td></tr>';
  });
  if (temps.length === 0) html += '<tr><td colspan="6" style="text-align:center;color:#999;padding:12px">Aucun relevé</td></tr>';
  html += '</tbody></table></div>';

  // ── 2. DLC ──
  var dlcs = S.data.dlcs.filter(function(d) { return d.status !== 'consumed' && d.status !== 'discarded'; });
  var expired = dlcs.filter(function(d) { return daysUntil(d.dlc_date) < 0; });
  var warning = dlcs.filter(function(d) { var dd = daysUntil(d.dlc_date); return dd >= 0 && dd <= 2; });

  html += '<div class="section"><h3>2. 📅 État des DLC</h3>';
  html += '<div style="margin-bottom:10px">';
  html += '<div class="stat-box danger"><div class="val">' + expired.length + '</div><div class="lbl">Expirées</div></div>';
  html += '<div class="stat-box warn"><div class="val">' + warning.length + '</div><div class="lbl">≤ 2 jours</div></div>';
  html += '<div class="stat-box success"><div class="val">' + (dlcs.length - expired.length - warning.length) + '</div><div class="lbl">Conformes</div></div>';
  html += '</div>';

  if (expired.length > 0 || warning.length > 0) {
    html += '<table><thead><tr><th>Produit</th><th>DLC</th><th>Lot</th><th>Statut</th></tr></thead><tbody>';
    expired.concat(warning).sort(function(a, b) { return new Date(a.dlc_date) - new Date(b.dlc_date); }).forEach(function(d) {
      var days = daysUntil(d.dlc_date);
      html += '<tr><td>' + esc(d.product_name) + '</td><td>' + fmtD(d.dlc_date) + '</td><td>' + esc(d.lot_number || '—') + '</td>';
      html += '<td class="' + (days < 0 ? 'nok' : 'nok') + '">' + (days < 0 ? '✗ Expirée' : '⚠ ' + days + 'j') + '</td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#059669;font-weight:600">✓ Toutes les DLC sont conformes.</p>';
  }
  html += '</div>';

  // ── 3. TRAÇABILITÉ ──
  html += '<div class="section"><h3>3. 📦 Derniers lots enregistrés</h3>';
  var recentLots = S.data.lots.slice(0, 10);
  html += '<table><thead><tr><th>Produit</th><th>N° Lot</th><th>Fournisseur</th><th>DLC</th><th>Date</th></tr></thead><tbody>';
  recentLots.forEach(function(l) {
    html += '<tr><td>' + esc(l.product_name) + '</td><td style="font-weight:600">' + esc(l.lot_number) + '</td>';
    html += '<td>' + esc(l.supplier_name || '—') + '</td>';
    html += '<td>' + (l.dlc_date ? fmtD(l.dlc_date) : '—') + '</td>';
    html += '<td>' + fmtDT(l.recorded_at) + '</td></tr>';
  });
  if (recentLots.length === 0) html += '<tr><td colspan="5" style="text-align:center;color:#999;padding:12px">Aucun lot</td></tr>';
  html += '</tbody></table></div>';

  // ── 4. COMMANDES ──
  var toOrder = S.data.orders.filter(function(o) { return o.status === 'to_order'; });
  var ordered = S.data.orders.filter(function(o) { return o.status === 'ordered'; });

  html += '<div class="section"><h3>4. 🛒 Commandes en cours</h3>';
  html += '<div style="margin-bottom:10px">';
  html += '<div class="stat-box"><div class="val">' + toOrder.length + '</div><div class="lbl">À commander</div></div>';
  html += '<div class="stat-box warn"><div class="val">' + ordered.length + '</div><div class="lbl">En attente livraison</div></div>';
  html += '</div>';

  if (toOrder.length + ordered.length > 0) {
    html += '<table><thead><tr><th>Produit</th><th>Qté</th><th>Fournisseur</th><th>Statut</th></tr></thead><tbody>';
    toOrder.concat(ordered).forEach(function(o) {
      html += '<tr><td>' + esc(o.product_name) + '</td><td>' + o.quantity + ' ' + esc(o.unit || '') + '</td>';
      html += '<td>' + esc(o.supplier_name || '—') + '</td>';
      html += '<td><span class="badge ' + (o.status === 'to_order' ? 'badge-yellow' : 'badge-gray') + '">' + (o.status === 'to_order' ? 'À commander' : 'Commandé') + '</span></td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#059669;font-weight:600">✓ Aucune commande en attente.</p>';
  }
  html += '</div>';

  // ── 4b. COMMANDES RÉCEPTIONNÉES ──
  try {
    var recvResult = await sb.from('orders').select('*').eq('site_id', S.currentSiteId).eq('status', 'received').order('received_at', {ascending: false}).limit(20);
    var receivedOrders = recvResult.data || [];
    html += '<div class="section"><h3>4b. ✅ Commandes réceptionnées (' + receivedOrders.length + ')</h3>';
    if (receivedOrders.length > 0) {
      html += '<table><thead><tr><th>Produit</th><th>Qté</th><th>Fournisseur</th><th>Réceptionné le</th><th>Notes</th></tr></thead><tbody>';
      receivedOrders.forEach(function(o) {
        html += '<tr><td>' + esc(o.product_name) + '</td><td>' + o.quantity + ' ' + esc(o.unit || '') + '</td>';
        html += '<td>' + esc(o.supplier_name || '—') + '</td>';
        html += '<td>' + fmtD(o.received_at) + '</td>';
        html += '<td>' + esc(o.receive_notes || '—') + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p style="font-size:12px;color:var(--gray)">Aucune réception récente enregistrée.</p>';
    }
    html += '</div>';
  } catch(e) {
    html += '<div class="section"><h3>4b. ✅ Commandes réceptionnées</h3><p style="font-size:12px;color:var(--gray)">Données non disponibles.</p></div>';
  }

  var incidents = S.data.incident_reports || [];
  html += '<div class="section"><h3>5. 🚨 Signalements en cours</h3>';
  if (incidents.length > 0) {
    html += '<table><thead><tr><th>Date</th><th>Titre</th><th>Catégorie</th><th>Priorité</th><th>Statut</th><th>Signalé par</th></tr></thead><tbody>';
    incidents.forEach(function(rep) {
      html += '<tr><td>' + fmtD(rep.created_at) + '</td><td>' + esc(rep.title) + '</td>';
      html += '<td>' + esc(rep.category) + '</td>';
      html += '<td><span class="badge ' + (rep.priority === 'urgent' ? 'badge-red' : 'badge-yellow') + '">' + esc(rep.priority) + '</span></td>';
      html += '<td>' + esc(rep.status) + '</td>';
      html += '<td>' + esc(rep.reported_by_name || '—') + '</td></tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#059669;font-weight:600">✓ Aucun signalement en cours.</p>';
  }
  html += '</div>';

  // ── CONCLUSION ──
  var allOk = (temps.length - conform === 0) && expired.length === 0 && incidents.filter(function(i) { return i.priority === 'urgent'; }).length === 0;
  html += '<div style="margin-top:24px;padding:16px;border-radius:8px;background:' + (allOk ? '#d1fae5' : '#fee2e2') + ';text-align:center">';
  html += '<strong style="font-size:15px;color:' + (allOk ? '#059669' : '#dc2626') + '">';
  html += allOk ? '✅ Conformité globale : SITE CONFORME' : '⚠️ Points d\'attention identifiés — Actions correctives requises';
  html += '</strong></div>';

  html += pdfSignatureBlock();
  html += pdfFooter();
  html += '</body></html>';
  openPdfWindow(html);
  S.reportGenerated = today();
  setTimeout(function() { render(); }, 200);
}


// =====================================================================
// EMAIL NOTIFICATIONS (via Supabase Edge Function)
// =====================================================================

async function triggerEmailNotification(eventType, data) {
  try {
    var enabled = localStorage.getItem('haccp_email_enabled') === 'true';
    if (!enabled) return;

    var events = JSON.parse(localStorage.getItem('haccp_email_events') || '[]');
    if (events.indexOf(eventType) < 0) return;

    var emailTo = localStorage.getItem('haccp_email_to') || '';
    if (!emailTo) return;

    var subject = '';
    var body = '';

    switch(eventType) {
      case 'temp_validation':
        subject = '✅ HACCP — Service ' + data.service + ' validé — ' + data.site;
        body = 'Le service ' + data.service + ' a été validé par ' + data.user + ' le ' + data.date + '.\n\n';
        body += 'Relevés enregistrés : ' + data.temperatures + '\n';
        body += data.nonConform > 0 ? '⚠️ Non-conformités : ' + data.nonConform + '\n' : '✅ Tous les relevés conformes\n';
        break;
      case 'temp_nonconform':
        subject = '⚠️ HACCP — Température non conforme — ' + data.site;
        body = 'Une température non conforme a été enregistrée par ' + data.user + '.\n\n';
        body += 'Équipement : ' + data.equipment + '\n';
        body += 'Valeur : ' + data.value + '°C (limites : ' + data.min + '/' + data.max + '°C)\n';
        if (data.action) body += 'Action corrective : ' + data.action + '\n';
        break;
      case 'dlc_expired':
        subject = '🔴 HACCP — DLC expirée — ' + data.site;
        body = 'DLC expirée détectée.\n\nProduit : ' + data.product + '\nDate DLC : ' + data.dlcDate + '\n';
        break;
      case 'incident':
        subject = '🚨 HACCP — Nouveau signalement — ' + data.site;
        body = 'Signalement : ' + data.title + '\n\n' + data.description + '\n\nPar : ' + data.user + '\nPriorité : ' + data.priority + '\n';
        break;
      default: return;
    }

    // Appeler la Edge Function Supabase
    var funcUrl = sb.supabaseUrl.replace('.supabase.co', '.functions.supabase.co') + '/send-email';
    await fetch(funcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (await sb.auth.getSession()).data.session.access_token
      },
      body: JSON.stringify({ to: emailTo, subject: subject, body: body })
    });
  } catch(e) {
    console.warn('Email notification failed:', e);
  }
}

window.triggerEmailNotification = triggerEmailNotification;
