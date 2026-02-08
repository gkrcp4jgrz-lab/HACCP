function renderDashboard() {
  // Multi-site dashboard for super_admin or managers with multiple sites
  if ((isSuperAdmin() || isManager()) && S.sites.length > 1) {
    return renderMultiSiteDashboard();
  }

  var site = currentSite();
  if (!site) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🏢</div><div class="empty-title">Aucun site sélectionné</div><div class="empty-text">' + (isSuperAdmin() ? 'Créez votre premier site dans "Gestion sites".' : 'Contactez votre administrateur.') + '</div></div></div></div>';
  }

  var tempCount = S.data.temperatures.length;
  var eqCount = S.siteConfig.equipment.length;
  var prCount = S.siteConfig.products.length;
  var totalExpected = eqCount + prCount;
  var dlcWarnings = S.data.dlcs.filter(function(d) { var days = daysUntil(d.dlc_date); return days <= 2 && days >= 0 && d.status !== 'consumed' && d.status !== 'discarded'; });
  var dlcExpired = S.data.dlcs.filter(function(d) { return daysUntil(d.dlc_date) < 0 && d.status !== 'consumed' && d.status !== 'discarded'; });
  var ordersToOrder = S.data.orders.filter(function(o) { return o.status === 'to_order'; });
  var ordersOrdered = S.data.orders.filter(function(o) { return o.status === 'ordered'; });
  var urgentConsignes = S.data.consignes.filter(function(c) { return c.priority === 'urgent'; });
  var normalConsignes = S.data.consignes.filter(function(c) { return c.priority !== 'urgent'; }).slice(0, 5);

  var h = '';

  // Header avec nom du site
  h += '<div style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:24px">' + ({hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[site.type]||'🏢') + '</span><div><h2 style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e">' + esc(site.name) + '</h2><span style="font-size:12px;color:var(--gray)">' + (site.address||'') + (site.city ? ', ' + site.city : '') + '</span></div></div></div>';

  // Stats cards
  h += '<div class="stats-grid">';
  h += '<div class="stat-card' + (tempCount >= totalExpected ? ' success' : '') + '"><div class="stat-value">' + tempCount + '/' + totalExpected + '</div><div class="stat-label">🌡️ Relevés aujourd\'hui</div></div>';
  h += '<div class="stat-card' + (dlcWarnings.length > 0 ? ' warning' : ' success') + '"><div class="stat-value">' + dlcWarnings.length + '</div><div class="stat-label">📅 DLC à surveiller</div></div>';
  h += '<div class="stat-card' + (dlcExpired.length > 0 ? ' danger' : ' success') + '"><div class="stat-value">' + dlcExpired.length + '</div><div class="stat-label">❌ DLC expirées</div></div>';
  h += '<div class="stat-card' + (ordersToOrder.length > 0 ? ' warning' : ' success') + '"><div class="stat-value">' + ordersToOrder.length + '</div><div class="stat-label">🛒 À commander</div></div>';
  h += '</div>';

  // Barre de progression relevés
  if (totalExpected > 0) {
    var pct = Math.min(100, Math.round(tempCount / totalExpected * 100));
    h += '<div class="card"><div class="card-body"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><strong>Progression relevés du jour</strong><span style="font-weight:700;color:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '">' + pct + '%</span></div><div class="progress"><div class="progress-bar" style="width:' + pct + '%;background:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div></div></div>';
  }

  // ── CONSIGNES URGENTES ──
  if (urgentConsignes.length > 0) {
    h += '<div class="card" style="border-left:4px solid var(--danger)"><div class="card-header" style="color:var(--danger)">🚨 Consignes urgentes <span class="badge badge-red" style="margin-left:auto">' + urgentConsignes.length + '</span></div><div class="card-body">';
    urgentConsignes.forEach(function(c) {
      h += '<div class="list-item" style="border-bottom:1px solid var(--gray-border);padding:10px 0">';
      h += '<div class="list-content"><div class="list-title" style="color:var(--danger);font-weight:600">' + esc(c.message) + '</div>';
      h += '<div class="list-sub">Par ' + esc(c.created_by_name) + ' · ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-success btn-sm" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button></div>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── CONSIGNES RÉCENTES ──
  if (normalConsignes.length > 0) {
    h += '<div class="card"><div class="card-header">💬 Dernières consignes</div><div class="card-body">';
    normalConsignes.forEach(function(c) {
      var prioStyle = c.priority === 'high' ? 'color:var(--warning)' : '';
      h += '<div class="list-item" style="border-bottom:1px solid var(--gray-border);padding:8px 0">';
      h += '<div class="list-content"><div class="list-title" style="' + prioStyle + '">' + esc(c.message) + '</div>';
      h += '<div class="list-sub">' + esc(c.created_by_name) + ' · ' + fmtDT(c.created_at) + '</div></div></div>';
    });
    h += '<div style="text-align:center;padding-top:8px"><button class="btn btn-ghost btn-sm" onclick="navigate(\'consignes\')">Voir toutes les consignes →</button></div>';
    h += '</div></div>';
  }

  // ── DLC ALERTES ──
  if (dlcExpired.length > 0 || dlcWarnings.length > 0) {
    h += '<div class="card" style="border-left:4px solid ' + (dlcExpired.length > 0 ? 'var(--danger)' : 'var(--warning)') + '"><div class="card-header">📅 Alertes DLC <span class="badge ' + (dlcExpired.length > 0 ? 'badge-red' : 'badge-yellow') + '" style="margin-left:auto">' + (dlcExpired.length + dlcWarnings.length) + '</span></div><div class="card-body">';
    
    dlcExpired.forEach(function(d) {
      h += '<div class="list-item" style="border-bottom:1px solid var(--gray-border);padding:8px 0">';
      h += '<div class="list-content"><div class="list-title" style="color:var(--danger)">' + esc(d.product_name) + ' <span class="badge badge-red">Expiré (J' + daysUntil(d.dlc_date) + ')</span></div>';
      h += '<div class="list-sub">DLC : ' + fmtD(d.dlc_date) + (d.lot_number ? ' · Lot : ' + esc(d.lot_number) : '') + '</div></div>';
      h += '<div class="list-actions">';
      h += '<button class="btn btn-danger btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">Jeter</button>';
      h += '<button class="btn btn-success btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utilisé</button>';
      h += '</div></div>';
    });
    
    dlcWarnings.forEach(function(d) {
      var days = daysUntil(d.dlc_date);
      h += '<div class="list-item" style="border-bottom:1px solid var(--gray-border);padding:8px 0">';
      h += '<div class="list-content"><div class="list-title" style="color:var(--warning)">' + esc(d.product_name) + ' <span class="badge badge-yellow">J-' + days + '</span></div>';
      h += '<div class="list-sub">DLC : ' + fmtD(d.dlc_date) + (d.lot_number ? ' · Lot : ' + esc(d.lot_number) : '') + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-success btn-sm" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utilisé</button></div>';
      h += '</div>';
    });
    
    h += '</div></div>';
  }

  // ── COMMANDES EN ATTENTE (liste des courses) ──
  if (ordersToOrder.length > 0) {
    // Grouper par fournisseur
    var bySupplier = {};
    ordersToOrder.forEach(function(o) {
      var key = o.supplier_name || '— Sans fournisseur —';
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(o);
    });

    h += '<div class="card" style="border-left:4px solid var(--warning)"><div class="card-header">🛒 Liste des courses <span class="badge badge-yellow" style="margin-left:auto">' + ordersToOrder.length + ' article' + (ordersToOrder.length > 1 ? 's' : '') + '</span></div><div class="card-body">';
    
    Object.keys(bySupplier).forEach(function(supplier) {
      h += '<div style="margin-bottom:16px">';
      h += '<h4 style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid var(--primary-light)">🏭 ' + esc(supplier) + '</h4>';
      bySupplier[supplier].forEach(function(o) {
        h += '<div class="list-item" style="padding:6px 0">';
        h += '<div class="list-content"><div class="list-title">' + esc(o.product_name) + '</div>';
        h += '<div class="list-sub">' + (o.quantity || 1) + ' ' + (o.unit || 'unité') + (o.notes ? ' · ' + esc(o.notes) : '') + '</div></div>';
        h += '<div class="list-actions"><button class="btn btn-success btn-sm" onclick="dashMarkOrdered(\'' + o.id + '\')">✓ Commandé</button></div>';
        h += '</div>';
      });
      h += '</div>';
    });
    
    h += '</div></div>';
  }

  // ── COMMANDES EN COURS DE LIVRAISON ──
  if (ordersOrdered.length > 0) {
    h += '<div class="card"><div class="card-header">📦 En attente de livraison <span class="badge badge-blue" style="margin-left:auto">' + ordersOrdered.length + '</span></div><div class="card-body">';
    ordersOrdered.forEach(function(o) {
      h += '<div class="list-item" style="padding:6px 0">';
      h += '<div class="list-content"><div class="list-title">' + esc(o.product_name) + '</div>';
      h += '<div class="list-sub">' + (o.supplier_name ? '🏭 ' + esc(o.supplier_name) + ' · ' : '') + (o.quantity || 1) + ' ' + (o.unit || 'unité') + ' · Commandé le ' + fmtD(o.ordered_at) + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-primary btn-sm" onclick="dashMarkReceived(\'' + o.id + '\')">✓ Reçu</button></div>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── TIMELINE : MA JOURNÉE ──
  h += renderDashboardTimeline(tempCount, totalExpected, dlcExpired, dlcWarnings, ordersToOrder, ordersOrdered, urgentConsignes);

  return h;
}

// PAGE: MULTI-SITE DASHBOARD (Super Admin / Multi-site Managers)

// ── TIMELINE MA JOURNÉE ──

function renderDashboardTimeline(tempCount, totalExpected, dlcExpired, dlcWarnings, ordersToOrder, ordersOrdered, urgentConsignes) {
  var h = '';
  var now = new Date();
  var hour = now.getHours();

  // Greeting dynamique
  var greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  h += '<div style="margin:20px 0 16px"><div style="display:flex;align-items:center;justify-content:space-between">';
  h += '<div><h3 style="margin:0;font-size:17px;font-weight:700;color:#1a1a2e">' + greeting + ', ' + esc(userName().split(' ')[0]) + ' 👋</h3>';
  h += '<p style="margin:2px 0 0;font-size:13px;color:var(--gray)">Voici votre journée du ' + fmtD(today()) + '</p></div>';
  h += '</div></div>';

  h += '<div class="timeline">';

  // 1. Températures
  if (moduleEnabled('temperatures')) {
    var tempDone = tempCount >= totalExpected && totalExpected > 0;
    var tempPct = totalExpected > 0 ? Math.round(tempCount / totalExpected * 100) : 0;
    var tempDotClass = tempDone ? 'done' : tempCount > 0 ? 'info' : 'pending';

    h += '<div class="tl-item"><div class="tl-dot ' + tempDotClass + '"></div>';
    h += '<div class="tl-card" onclick="navigate(\'temperatures\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">🌡️ Relevés de température</div>';
    if (tempDone) {
      h += '<span class="badge badge-green">✓ Terminé</span>';
    } else {
      h += '<span class="badge badge-blue">' + tempCount + '/' + totalExpected + '</span>';
    }
    h += '</div>';
    if (!tempDone && totalExpected > 0) {
      h += '<div style="margin-top:6px"><div class="progress" style="height:6px"><div class="progress-bar" style="width:' + tempPct + '%;background:' + (tempPct > 50 ? 'var(--primary)' : 'var(--warning)') + '"></div></div>';
      h += '<div class="tl-card-sub" style="margin-top:4px">' + (totalExpected - tempCount) + ' relevé(s) restant(s)</div></div>';
    } else if (tempDone) {
      h += '<div class="tl-card-sub">Tous les relevés sont complétés</div>';
    } else {
      h += '<div class="tl-card-sub">Aucun équipement/produit configuré</div>';
    }

    // Non-conformités
    var nonConform = S.data.temperatures.filter(function(t) { return !t.is_conform; });
    if (nonConform.length > 0) {
      h += '<div style="margin-top:6px;padding:6px 10px;background:var(--danger-bg);border-radius:6px;font-size:12px;color:var(--danger);font-weight:600">⚠️ ' + nonConform.length + ' non-conformité(s) détectée(s)</div>';
    }
    h += '</div></div>';
  }

  // 2. DLC alertes
  if (moduleEnabled('dlc') || moduleEnabled('lots')) {
    var totalDlcAlerts = dlcExpired.length + dlcWarnings.length;
    var dlcDotClass = dlcExpired.length > 0 ? 'danger' : dlcWarnings.length > 0 ? 'warn' : 'done';

    h += '<div class="tl-item"><div class="tl-dot ' + dlcDotClass + '"></div>';
    h += '<div class="tl-card" onclick="navigate(\'dlc\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">📅 Contrôle DLC</div>';
    if (totalDlcAlerts === 0) {
      h += '<span class="badge badge-green">✓ RAS</span>';
    } else {
      h += '<span class="badge ' + (dlcExpired.length > 0 ? 'badge-red' : 'badge-yellow') + '">' + totalDlcAlerts + ' alerte(s)</span>';
    }
    h += '</div>';

    if (dlcExpired.length > 0) {
      h += '<div style="margin-top:4px">';
      dlcExpired.slice(0, 3).forEach(function(d) {
        h += '<div style="font-size:12px;padding:3px 0;color:var(--danger)">❌ <strong>' + esc(d.product_name) + '</strong> — expirée depuis ' + Math.abs(daysUntil(d.dlc_date)) + 'j</div>';
      });
      if (dlcExpired.length > 3) h += '<div class="tl-card-sub">+ ' + (dlcExpired.length - 3) + ' autre(s)...</div>';
      h += '</div>';
    }
    if (dlcWarnings.length > 0) {
      h += '<div style="margin-top:4px">';
      dlcWarnings.slice(0, 3).forEach(function(d) {
        var days = daysUntil(d.dlc_date);
        h += '<div style="font-size:12px;padding:3px 0;color:var(--warning)">⚠️ <strong>' + esc(d.product_name) + '</strong> — ' + (days === 0 ? 'expire aujourd\'hui' : days + 'j restant(s)') + '</div>';
      });
      if (dlcWarnings.length > 3) h += '<div class="tl-card-sub">+ ' + (dlcWarnings.length - 3) + ' autre(s)...</div>';
      h += '</div>';
    }
    if (totalDlcAlerts === 0) {
      h += '<div class="tl-card-sub">Toutes les DLC sont conformes</div>';
    }
    h += '</div></div>';
  }

  // 3. Consignes
  if (moduleEnabled('consignes')) {
    var allConsignes = S.data.consignes;
    var consDotClass = urgentConsignes.length > 0 ? 'danger' : allConsignes.length > 0 ? 'info' : 'done';

    h += '<div class="tl-item"><div class="tl-dot ' + consDotClass + '"></div>';
    h += '<div class="tl-card" onclick="navigate(\'consignes\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">💬 Consignes</div>';
    if (urgentConsignes.length > 0) {
      h += '<span class="badge badge-red">' + urgentConsignes.length + ' urgente(s)</span>';
    } else if (allConsignes.length > 0) {
      h += '<span class="badge badge-blue">' + allConsignes.length + '</span>';
    } else {
      h += '<span class="badge badge-green">✓</span>';
    }
    h += '</div>';

    if (urgentConsignes.length > 0) {
      urgentConsignes.slice(0, 2).forEach(function(c) {
        h += '<div style="font-size:12px;padding:4px 0;color:var(--danger)">🚨 ' + esc(c.message.substring(0, 80)) + (c.message.length > 80 ? '...' : '') + '</div>';
      });
    } else if (allConsignes.length > 0) {
      h += '<div class="tl-card-sub">' + allConsignes.length + ' consigne(s) active(s)</div>';
    } else {
      h += '<div class="tl-card-sub">Aucune consigne</div>';
    }
    h += '</div></div>';
  }

  // 4. Commandes
  if (moduleEnabled('orders')) {
    var totalOrders = ordersToOrder.length + ordersOrdered.length;
    var orderDotClass = ordersToOrder.length > 0 ? 'warn' : ordersOrdered.length > 0 ? 'info' : 'done';

    h += '<div class="tl-item"><div class="tl-dot ' + orderDotClass + '"></div>';
    h += '<div class="tl-card" onclick="navigate(\'orders\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">🛒 Commandes</div>';
    if (totalOrders === 0) {
      h += '<span class="badge badge-green">✓ RAS</span>';
    } else {
      h += '<span class="badge badge-yellow">' + totalOrders + ' en cours</span>';
    }
    h += '</div>';

    if (ordersToOrder.length > 0) {
      // Grouper par fournisseur
      var bySupp = {};
      ordersToOrder.forEach(function(o) { var s = o.supplier_name || 'Sans fournisseur'; bySupp[s] = (bySupp[s]||0) + 1; });
      h += '<div style="margin-top:4px">';
      Object.keys(bySupp).slice(0, 3).forEach(function(s) {
        h += '<div style="font-size:12px;padding:2px 0;color:var(--warning)">📞 ' + esc(s) + ' — ' + bySupp[s] + ' produit(s)</div>';
      });
      h += '</div>';
    }
    if (ordersOrdered.length > 0) {
      h += '<div style="font-size:12px;color:var(--gray);margin-top:2px">📦 ' + ordersOrdered.length + ' livraison(s) attendue(s)</div>';
    }
    if (totalOrders === 0) {
      h += '<div class="tl-card-sub">Aucune commande en cours</div>';
    }
    h += '</div></div>';
  }

  // 5. Signalements
  var incidents = S.data.incident_reports || [];
  if (incidents.length > 0) {
    h += '<div class="tl-item"><div class="tl-dot danger"></div>';
    h += '<div class="tl-card" onclick="navigate(\'notifications\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">🚨 Signalements</div>';
    h += '<span class="badge badge-red">' + incidents.length + ' ouvert(s)</span>';
    h += '</div>';
    incidents.slice(0, 2).forEach(function(r) {
      h += '<div style="font-size:12px;padding:3px 0;color:var(--danger)">' + esc(r.title) + '</div>';
    });
    h += '</div></div>';
  }

  // 6. Rapport du jour
  h += '<div class="tl-item"><div class="tl-dot pending"></div>';
  h += '<div class="tl-card" onclick="navigate(\'reports\')">';
  h += '<div class="tl-card-header"><div class="tl-card-title">📄 Rapport du jour</div>';
  h += '<span class="badge badge-gray">À générer</span>';
  h += '</div>';
  h += '<div class="tl-card-sub">Générez votre rapport HACCP journalier</div>';
  h += '</div></div>';

  h += '</div>'; // fin timeline

  return h;
}

var _multiSiteCache = null;
var _multiSiteCacheTime = 0;

async function loadMultiSiteStats() {
  var now = Date.now();
  // Cache 30 secondes pour éviter les requêtes multiples
  if (_multiSiteCache && (now - _multiSiteCacheTime) < 30000) return _multiSiteCache;

  var todayStr = today();
  var stats = [];

  for (var i = 0; i < S.sites.length; i++) {
    var site = S.sites[i];
    var sid = site.id;

    try {
      var t = await sb.from('temperatures').select('id', {count:'exact', head:true}).eq('site_id', sid).gte('recorded_at', todayStr + 'T00:00:00');
      var eq = await sb.from('site_equipment').select('id', {count:'exact', head:true}).eq('site_id', sid).eq('active', true);
      var pr = await sb.from('site_products').select('id', {count:'exact', head:true}).eq('site_id', sid).eq('active', true);
      var d = await sb.from('dlcs').select('id, dlc_date, status').eq('site_id', sid).not('status', 'in', '("consumed","discarded")');
      var o = await sb.from('orders').select('id', {count:'exact', head:true}).eq('site_id', sid).eq('status', 'to_order');
      var c = await sb.from('consignes').select('id', {count:'exact', head:true}).eq('site_id', sid).eq('priority', 'urgent');

      var dlcData = d.data || [];
      var dlcWarnings = dlcData.filter(function(x) { var days = daysUntil(x.dlc_date); return days <= 2 && days >= 0; }).length;
      var dlcExpired = dlcData.filter(function(x) { return daysUntil(x.dlc_date) < 0; }).length;

      stats.push({
        site: site,
        tempCount: t.count || 0,
        totalExpected: (eq.count || 0) + (pr.count || 0),
        dlcWarnings: dlcWarnings,
        dlcExpired: dlcExpired,
        ordersOpen: o.count || 0,
        urgentConsignes: c.count || 0
      });
    } catch(e) {
      console.error('Stats error for site', site.name, e);
      stats.push({ site: site, tempCount: 0, totalExpected: 0, dlcWarnings: 0, dlcExpired: 0, ordersOpen: 0, urgentConsignes: 0 });
    }
  }

  _multiSiteCache = stats;
  _multiSiteCacheTime = now;
  return stats;
}

function renderMultiSiteDashboard() {
  var h = '';

  // Titre
  h += '<div style="margin-bottom:20px"><h2 style="font-size:22px;font-weight:800;color:#1a1a2e;margin:0">🛡️ Vue globale — ' + S.sites.length + ' site' + (S.sites.length > 1 ? 's' : '') + '</h2><p style="color:var(--gray);font-size:13px;margin:4px 0 0">Dernière actualisation : ' + new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) + ' — <a href="#" onclick="event.preventDefault();_multiSiteCache=null;loadAndRenderMultiDashboard();" style="color:var(--primary)">↻ Actualiser</a></p></div>';

  // Container pour les stats chargées en async
  h += '<div id="multiDashContainer"><div style="text-align:center;padding:60px"><div class="loading"></div><div style="margin-top:12px;color:var(--gray);font-size:14px">Chargement des données de tous les sites...</div></div></div>';

  // Lancer le chargement async
  setTimeout(function() { loadAndRenderMultiDashboard(); }, 50);

  return h;
}

async function loadAndRenderMultiDashboard() {
  var container = $('multiDashContainer');
  if (!container) return;

  var stats = await loadMultiSiteStats();
  var h = '';

  // Calcul des totaux
  var totalTemp = 0, totalExpected = 0, totalDlcWarn = 0, totalDlcExp = 0, totalOrders = 0, totalUrgent = 0;
  var sitesOk = 0;

  stats.forEach(function(s) {
    totalTemp += s.tempCount;
    totalExpected += s.totalExpected;
    totalDlcWarn += s.dlcWarnings;
    totalDlcExp += s.dlcExpired;
    totalOrders += s.ordersOpen;
    totalUrgent += s.urgentConsignes;
    if (s.totalExpected > 0 && s.tempCount >= s.totalExpected && s.dlcExpired === 0) sitesOk++;
  });

  var globalPct = totalExpected > 0 ? Math.round(totalTemp / totalExpected * 100) : 0;

  // Bannière globale
  h += '<div class="global-stats-banner">';
  h += '<div class="global-stat"><div class="gs-value">' + S.sites.length + '</div><div class="gs-label">Sites actifs</div></div>';
  h += '<div class="global-stat' + (globalPct >= 100 ? ' gs-success' : '') + '"><div class="gs-value">' + globalPct + '%</div><div class="gs-label">Relevés complétés</div></div>';
  h += '<div class="global-stat' + (totalDlcExp > 0 ? ' gs-danger' : ' gs-success') + '"><div class="gs-value">' + totalDlcExp + '</div><div class="gs-label">DLC expirées</div></div>';
  h += '<div class="global-stat' + (totalDlcWarn > 0 ? ' gs-warning' : ' gs-success') + '"><div class="gs-value">' + totalDlcWarn + '</div><div class="gs-label">DLC à surveiller</div></div>';
  h += '<div class="global-stat"><div class="gs-value">' + totalOrders + '</div><div class="gs-label">Commandes en attente</div></div>';
  h += '<div class="global-stat' + (totalUrgent > 0 ? ' gs-danger' : ' gs-success') + '"><div class="gs-value">' + totalUrgent + '</div><div class="gs-label">Alertes urgentes</div></div>';
  h += '</div>';

  // Barre de progression globale
  h += '<div class="card" style="margin-bottom:20px"><div class="card-body"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><strong>Progression globale des relevés</strong><span style="font-weight:700;color:' + (globalPct >= 100 ? 'var(--success)' : 'var(--primary)') + '">' + totalTemp + '/' + totalExpected + ' (' + globalPct + '%)</span></div><div class="progress"><div class="progress-bar" style="width:' + Math.min(100, globalPct) + '%;background:' + (globalPct >= 100 ? 'var(--success)' : globalPct >= 50 ? 'var(--primary)' : 'var(--warning)') + '"></div></div></div></div>';

  // Carte par site
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0">Détail par site</h3><span style="font-size:12px;color:var(--gray)">' + sitesOk + '/' + S.sites.length + ' sites conformes</span></div>';

  stats.forEach(function(s) {
    var site = s.site;
    var pct = s.totalExpected > 0 ? Math.round(s.tempCount / s.totalExpected * 100) : 0;
    var typeEmoji = {hotel:'🏨',restaurant:'🍽️',cuisine_centrale:'🏭',autre:'🏢'}[site.type] || '🏢';
    var isOk = pct >= 100 && s.dlcExpired === 0 && s.urgentConsignes === 0;
    var borderColor = isOk ? 'var(--success)' : s.dlcExpired > 0 || s.urgentConsignes > 0 ? 'var(--danger)' : 'var(--primary)';

    h += '<div class="site-overview-card" style="border-left-color:' + borderColor + '" onclick="switchSite(\'' + site.id + '\');navigate(\'dashboard\');">';
    h += '<div class="site-card-header"><div class="site-card-title">' + typeEmoji + ' ' + esc(site.name) + '</div><div class="site-card-badges">';
    if (isOk) h += '<span class="badge badge-green">✓ Conforme</span>';
    if (s.dlcExpired > 0) h += '<span class="badge badge-red">⚠ ' + s.dlcExpired + ' DLC expirée' + (s.dlcExpired > 1 ? 's' : '') + '</span>';
    if (s.urgentConsignes > 0) h += '<span class="badge badge-red">🚨 ' + s.urgentConsignes + ' urgente' + (s.urgentConsignes > 1 ? 's' : '') + '</span>';
    if (pct < 100 && pct > 0) h += '<span class="badge badge-yellow">' + pct + '% relevés</span>';
    if (pct === 0 && s.totalExpected > 0) h += '<span class="badge badge-yellow">Aucun relevé</span>';
    h += '</div></div>';

    h += '<div class="mini-stats">';
    h += '<div class="mini-stat' + (pct >= 100 ? ' ok' : pct > 0 ? ' warn' : '') + '"><div class="mini-stat-value">' + s.tempCount + '/' + s.totalExpected + '</div><div class="mini-stat-label">🌡️ Relevés</div></div>';
    h += '<div class="mini-stat' + (s.dlcExpired > 0 ? ' bad' : s.dlcWarnings > 0 ? ' warn' : ' ok') + '"><div class="mini-stat-value">' + (s.dlcExpired + s.dlcWarnings) + '</div><div class="mini-stat-label">📅 DLC alertes</div></div>';
    h += '<div class="mini-stat"><div class="mini-stat-value">' + s.ordersOpen + '</div><div class="mini-stat-label">🛒 Commandes</div></div>';
    h += '<div class="mini-stat' + (s.urgentConsignes > 0 ? ' bad' : ' ok') + '"><div class="mini-stat-value">' + s.urgentConsignes + '</div><div class="mini-stat-label">💬 Urgentes</div></div>';
    h += '</div>';

    // Mini progress bar
    h += '<div style="margin-top:10px"><div class="progress" style="height:6px"><div class="progress-bar" style="width:' + Math.min(100, pct) + '%;background:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div></div>';

    h += '</div>';
  });

  container.innerHTML = h;
}
