function renderOrders() {
  var h = '';
  if (!S.ordersTab) S.ordersTab = 'active';

  // Tabs
  h += '<div class="tabs v2-mb-20">';
  h += '<button class="tab' + (S.ordersTab==='active'?' active':'') + '" onclick="S.ordersTab=\'active\';render()">🛒 Commandes en cours</button>';
  h += '<button class="tab' + (S.ordersTab==='history'?' active':'') + '" onclick="S.ordersTab=\'history\';loadOrderHistory()">📋 Historique</button>';
  h += '</div>';

  if (S.ordersTab === 'active') {
    h += renderOrdersActive();
  } else {
    h += renderOrdersHistory();
  }

  return h;
}

function renderOrdersActive() {
  var h = '';

  // Form
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">➕</span> Nouvelle commande</div><div class="card-body"><form onsubmit="handleOrder(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Produit <span class="req">*</span></label><input type="text" class="form-input" id="ordProd" required placeholder="Nom du produit"></div>';
  h += '<div class="form-group"><label class="form-label">Quantité</label><div class="v2-flex v2-gap-8"><input type="number" class="form-input v2-flex-1" id="ordQty" value="1" min="0.1" step="0.1"><select class="form-select v2-flex-1" id="ordUnit"><option>unité</option><option>kg</option><option>L</option><option>carton</option><option>paquet</option></select></div></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Fournisseur <span class="req">*</span></label><select class="form-select" id="ordSupp" required><option value="">Sélectionner...</option>';
  S.siteConfig.suppliers.forEach(function(s) { h += '<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>'; });
  h += '</select></div><div class="form-group"><label class="form-label">Notes</label><input type="text" class="form-input" id="ordNotes" placeholder="Optionnel"></div></div>';
  h += '<button type="submit" class="btn btn-primary btn-lg v2-mt-4">✓ Ajouter à la commande</button></form></div></div>';

  // À commander — groupé par fournisseur
  var toOrder = S.data.orders.filter(function(o) { return o.status === 'to_order'; });
  var ordered = S.data.orders.filter(function(o) { return o.status === 'ordered'; });

  if (toOrder.length > 0) {
    var bySupplier = {};
    toOrder.forEach(function(o) {
      var key = o.supplier_name || '— Sans fournisseur —';
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(o);
    });

    h += '<div class="card v2-card--warning-left"><div class="card-header v2-card-header--warning"><span class="v2-text-2xl">🛒</span> À commander <span class="badge badge-yellow v2-badge-lg v2-ml-auto">' + toOrder.length + '</span></div><div class="card-body">';

    Object.keys(bySupplier).forEach(function(supplier) {
      var items = bySupplier[supplier];
      h += '<div class="v2-supplier-group">';
      h += '<div class="v2-supplier-group__header">';
      h += '<h4 class="v2-supplier-group__title"><span class="v2-text-3xl">🏭</span> ' + esc(supplier) + ' <span class="badge badge-blue">' + items.length + ' article' + (items.length > 1 ? 's' : '') + '</span></h4>';
      h += '<button class="btn btn-primary" onclick="markSupplierOrdered(\'' + esc(supplier).replace(/'/g,'\\\'') + '\')">📞 Tout commandé</button>';
      h += '</div>';

      items.forEach(function(o) {
        h += '<div class="v2-order-row">';
        h += '<div><strong class="v2-order-row__name">' + esc(o.product_name) + '</strong><span class="v2-order-row__qty">' + (o.quantity||1) + ' ' + esc(o.unit||'unité') + '</span>';
        if (o.notes) h += '<span class="v2-order-row__note">(' + esc(o.notes) + ')</span>';
        h += '</div>';
        h += '<div class="v2-order-row__actions">';
        h += '<button class="btn btn-primary btn-sm" onclick="updateOrderStatus(\'' + o.id + '\',\'ordered\')" title="Commandé">✓</button>';
        h += '<button class="btn btn-ghost btn-sm" onclick="deleteOrder(\'' + o.id + '\')" title="Supprimer">🗑️</button>';
        h += '</div></div>';
      });
      h += '</div>';
    });
    h += '</div></div>';
  }

  // Commandé — en attente de livraison
  if (ordered.length > 0) {
    var bySupplier2 = {};
    ordered.forEach(function(o) {
      var key = o.supplier_name || '— Sans fournisseur —';
      if (!bySupplier2[key]) bySupplier2[key] = [];
      bySupplier2[key].push(o);
    });

    h += '<div class="card v2-card--primary-left"><div class="card-header"><span class="v2-text-2xl">📦</span> En attente de livraison <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + ordered.length + '</span></div><div class="card-body">';

    Object.keys(bySupplier2).forEach(function(supplier) {
      var items = bySupplier2[supplier];
      h += '<div class="v2-mb-18">';
      h += '<h4 class="v2-supplier-group__title v2-text-primary"><span class="v2-text-2xl">🏭</span> ' + esc(supplier) + '</h4>';
      items.forEach(function(o) {
        h += '<div class="v2-order-row">';
        h += '<div><strong class="v2-order-row__name">' + esc(o.product_name) + '</strong><span class="v2-order-row__qty">' + (o.quantity||1) + ' ' + esc(o.unit||'unité') + '</span>';
        h += '<div class="v2-text-sm v2-text-muted v2-font-500 v2-mt-2">Commandé le ' + fmtD(o.ordered_at) + '</div></div>';
        h += '<button class="btn btn-success" onclick="openReceiveModal(\'' + o.id + '\',\'' + esc(o.product_name).replace(/'/g,'\\\'') + '\')">✅ Réceptionner</button>';
        h += '</div>';
      });
      h += '</div>';
    });
    h += '</div></div>';
  }

  if (toOrder.length === 0 && ordered.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🛒</div><div class="empty-title">Aucune commande en cours</div><div class="empty-text">Ajoutez des produits à commander ci-dessus.</div></div></div></div>';
  }

  return h;
}

function renderOrdersHistory() {
  var h = '';
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Commandes reçues</div>';
  h += '<div class="card-body" style="padding:10px 18px;border-bottom:1px solid var(--border)"><input type="text" class="form-input" id="orderHistorySearch" placeholder="Rechercher produit ou fournisseur..." oninput="S._orderSearch=this.value;clearTimeout(S._orderSearchTimer);S._orderSearchTimer=setTimeout(loadAndRenderOrderHistory,400)" value="' + esc(S._orderSearch || '') + '"></div>';
  h += '<div class="card-body" id="orderHistoryContainer"><div class="v2-loading-inline"><div class="loading" style="width:28px;height:28px;border-width:3px"></div></div></div></div>';
  setTimeout(function() { loadAndRenderOrderHistory(); }, 50);
  return h;
}

window.loadOrderHistory = async function() {
  S.ordersTab = 'history';
  render();
};

window.loadAndRenderOrderHistory = async function() {
  var container = $('orderHistoryContainer');
  if (!container) return;

  var r = await sb.from('orders').select('*').eq('site_id', S.currentSiteId).eq('status', 'received').order('received_at', {ascending:false}).limit(50);
  var received = r.data || [];

  // Filter by search query
  var searchQ = (S._orderSearch || '').toLowerCase();
  if (searchQ) {
    received = received.filter(function(o) {
      return (o.product_name && o.product_name.toLowerCase().indexOf(searchQ) >= 0) ||
             (o.supplier_name && o.supplier_name.toLowerCase().indexOf(searchQ) >= 0);
    });
  }

  if (received.length === 0) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">Aucune commande reçue</div></div>';
    return;
  }

  // Group by supplier
  var bySupplier = {};
  received.forEach(function(o) {
    var key = o.supplier_name || '— Sans fournisseur —';
    if (!bySupplier[key]) bySupplier[key] = [];
    bySupplier[key].push(o);
  });

  var html = '';
  Object.keys(bySupplier).forEach(function(supplier) {
    var items = bySupplier[supplier];
    html += '<div class="v2-mb-22">';
    html += '<h4 class="v2-supplier-group__title v2-text-ok"><span class="v2-text-2xl">🏭</span> ' + esc(supplier) + ' <span class="badge badge-green">' + items.length + ' livraison' + (items.length > 1 ? 's' : '') + '</span></h4>';

    items.forEach(function(o) {
      html += '<div class="v2-order-row v2-flex-wrap v2-gap-8 v2-py-10">';
      html += '<div><strong class="v2-order-row__name">' + esc(o.product_name) + '</strong> — ' + (o.quantity||1) + ' ' + esc(o.unit||'unité');
      html += '<div class="v2-text-sm v2-text-muted v2-font-500 v2-mt-2">Reçu le ' + fmtDT(o.received_at) + '</div></div>';
      html += '<div class="v2-order-row__actions" style="align-items:center">';
      if (o.bl_photo) {
        html += '<button class="btn btn-ghost btn-sm" onclick="viewBLPhoto(\'' + o.id + '\')">📸 Voir BL</button>';
      } else {
        html += '<span class="badge badge-yellow v2-text-xs">Pas de BL</span>';
        html += '<button class="btn btn-ghost btn-sm" onclick="openReceiveModal(\'' + o.id + '\',\'' + esc(o.product_name).replace(/'/g,'\\\'') + '\',true)">📸 Ajouter</button>';
      }
      html += '</div></div>';
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

// Modal de réception avec photo BL
window.openReceiveModal = function(orderId, productName, photoOnly) {
  var title = photoOnly ? '📸 Ajouter photo BL/Facture' : '✅ Réception : ' + productName;
  var html = '<div class="modal-header"><div class="modal-title">' + title + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
  html += '<div class="modal-body">';
  if (!photoOnly) {
    html += '<p style="margin-bottom:16px;font-size:15px;font-weight:500">Confirmez la réception de <strong>' + productName + '</strong>.</p>';
  }
  html += '<div class="form-group"><label class="form-label">📸 Photo du BL ou de la facture <span class="v2-text-sm v2-text-muted v2-font-500">(recommandé)</span></label>';
  html += '<label class="photo-box" for="blPhotoInput" id="blPhotoPreviewBox"><div class="photo-icon">📷</div><div class="photo-text">Prendre une photo du bon de livraison</div><div class="photo-hint">Servira de preuve de réception</div></label>';
  html += '<input type="file" id="blPhotoInput" accept="image/*" capture="environment" onchange="previewBLPhoto()" style="display:none">';
  html += '<div id="blPhotoPreview" style="display:none;text-align:center;padding:14px;border:2px solid var(--success);border-radius:12px;background:var(--success-bg)"><img id="blPhotoImg" class="photo-preview" style="max-width:300px"><br><button type="button" class="btn btn-ghost" onclick="clearBLPhoto()">✕ Supprimer</button></div>';
  html += '</div>';
  html += '<div class="form-group"><label class="form-label">Notes de réception</label><input type="text" class="form-input" id="receiveNotes" placeholder="Ex: Tout conforme, manque 2 cartons..."></div>';
  html += '</div>';
  html += '<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button>';
  html += '<button class="btn btn-success btn-lg" onclick="confirmReceive(\'' + orderId + '\',' + (photoOnly ? 'true' : 'false') + ')">✅ ' + (photoOnly ? 'Enregistrer' : 'Confirmer la réception') + '</button></div>';
  openModal(html);
};

window.previewBLPhoto = function() {
  var input = document.getElementById('blPhotoInput');
  if (!input || !input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    S._blPhotoData = e.target.result;
    document.getElementById('blPhotoPreviewBox').style.display = 'none';
    var preview = document.getElementById('blPhotoPreview');
    preview.style.display = 'block';
    document.getElementById('blPhotoImg').src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
};

window.clearBLPhoto = function() {
  S._blPhotoData = null;
  document.getElementById('blPhotoPreviewBox').style.display = '';
  document.getElementById('blPhotoPreview').style.display = 'none';
};

window.confirmReceive = async function(orderId, photoOnly) {
  try {
    var upd = {};
    if (!photoOnly) {
      upd.status = 'received';
      upd.received_at = new Date().toISOString();
    }
    var notes = document.getElementById('receiveNotes');
    if (notes && notes.value) upd.receive_notes = notes.value;
    if (S._blPhotoData) upd.bl_photo = S._blPhotoData;

    await sb.from('orders').update(upd).eq('id', orderId);
    S._blPhotoData = null;
    closeModal();
    await loadSiteData();
    render();
    showToast(photoOnly ? 'Photo enregistrée' : 'Réception confirmée', 'success');
  } catch(e) { showToast('Erreur: ' + (e.message||e), 'error'); }
};

window.markSupplierOrdered = async function(supplierName) {
  if (!(await appConfirm('Commandes passées', 'Marquer toutes les commandes de <strong>' + esc(supplierName) + '</strong> comme commandées ?', {icon:'📞',confirmLabel:'Tout commandé'}))) return;
  var toMark = S.data.orders.filter(function(o) { return o.status === 'to_order' && (o.supplier_name || '— Sans fournisseur —') === supplierName; });
  for (var i = 0; i < toMark.length; i++) {
    await sb.from('orders').update({ status: 'ordered' }).eq('id', toMark[i].id);
  }
  await loadSiteData();
  render();
  showToast(toMark.length + ' commande(s) marquée(s) comme commandée(s)', 'success');
};

window.viewBLPhoto = function(orderId) {
  // Load the order's BL photo
  sb.from('orders').select('bl_photo,product_name').eq('id', orderId).single().then(function(r) {
    if (r.data && r.data.bl_photo) {
      var html = '<div class="modal-header"><div class="modal-title">📸 BL : ' + esc(r.data.product_name) + '</div><button class="modal-close" onclick="closeModal()">✕</button></div>';
      html += '<div class="modal-body v2-text-center"><img src="' + r.data.bl_photo + '" style="max-width:100%;max-height:70vh;border-radius:12px"></div>';
      openModal(html);
    } else {
      showToast('Aucune photo disponible', 'warning');
    }
  });
};
