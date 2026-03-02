// =====================================================================
// PAGE: NOTIFICATIONS / CENTRE D'ALERTES
// =====================================================================

function renderNotifications() {
  var h = '';

  // Onglets
  h += '<div class="tabs" style="overflow:visible">';
  h += '<button class="tab' + ((!S.notifTab || S.notifTab === 'alerts') ? ' active' : '') + '" onclick="S.notifTab=\'alerts\';render()" style="flex:1;text-align:center">🔔 Alertes</button>';
  h += '<button class="tab' + (S.notifTab === 'reports' ? ' active' : '') + '" onclick="S.notifTab=\'reports\';render()" style="flex:1;text-align:center">🚨 Signalements</button>';
  h += '<button class="tab' + (S.notifTab === 'history' ? ' active' : '') + '" onclick="S.notifTab=\'history\';render()" style="flex:1;text-align:center">📋 Historique</button>';
  h += '</div>';

  if (S.notifTab === 'reports') {
    h += renderNotifReports();
  } else if (S.notifTab === 'history') {
    h += renderNotifHistory();
  } else {
    h += renderNotifAlerts();
  }

  return h;
}

// ── ONGLET : ALERTES ACTIVES ──

function renderNotifAlerts() {
  var isMultiSite = (isSuperAdmin() || isManager()) && S.sites.length > 1;

  if (isMultiSite) {
    // Multi-site: chargement async groupé par site
    var h = '';
    h += '<div id="multiSiteAlertsContainer">';
    h += '<div class="v2-loading-inline" style="padding:40px"><div class="loading" style="width:32px;height:32px;border-width:3px"></div></div>';
    h += '</div>';
    setTimeout(function() { loadMultiSiteAlerts(); }, 50);
    return h;
  }

  // Single site: comportement original
  return renderSingleSiteAlerts();
}

function renderSingleSiteAlerts() {
  var h = '';
  var alerts = buildAlerts();
  var critical = alerts.filter(function(a) { return a.level === 'critical'; });
  var warnings = alerts.filter(function(a) { return a.level === 'warning'; });
  var infos = alerts.filter(function(a) { return a.level === 'info'; });

  // Résumé
  h += '<div class="stats-grid v2-mb-22">';
  h += '<div class="stat-card danger"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">🚨</span><div class="stat-value">' + critical.length + '</div></div><div class="stat-label">Critiques</div></div>';
  h += '<div class="stat-card warning"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">⚠️</span><div class="stat-value">' + warnings.length + '</div></div><div class="stat-label">Avertissements</div></div>';
  h += '<div class="stat-card success"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">ℹ️</span><div class="stat-value">' + infos.length + '</div></div><div class="stat-label">Informations</div></div>';
  h += '</div>';

  if (alerts.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">✅</div><div class="empty-title">Aucune alerte</div><div class="empty-text">Tout est en ordre sur ce site. Bravo !</div></div></div></div>';
    return h;
  }

  h += renderAlertsByLevel(alerts);
  return h;
}

function renderAlertsByLevel(alerts) {
  var h = '';
  var critical = alerts.filter(function(a) { return a.level === 'critical'; });
  var warnings = alerts.filter(function(a) { return a.level === 'warning'; });
  var infos = alerts.filter(function(a) { return a.level === 'info'; });

  if (critical.length > 0) {
    h += '<div class="card v2-card--danger-left">';
    h += '<div class="card-header v2-card-header--danger"><span class="v2-text-2xl">🚨</span> Alertes critiques <span class="badge badge-red v2-badge-lg v2-ml-auto">' + critical.length + '</span></div>';
    h += '<div class="card-body v2-p-0">';
    critical.forEach(function(a) { h += renderAlertItem(a); });
    h += '</div></div>';
  }
  if (warnings.length > 0) {
    h += '<div class="card v2-card--warning-left">';
    h += '<div class="card-header v2-card-header--warning"><span class="v2-text-2xl">⚠️</span> Avertissements <span class="badge badge-yellow v2-badge-lg v2-ml-auto">' + warnings.length + '</span></div>';
    h += '<div class="card-body v2-p-0">';
    warnings.forEach(function(a) { h += renderAlertItem(a); });
    h += '</div></div>';
  }
  if (infos.length > 0) {
    h += '<div class="card v2-card--primary-left">';
    h += '<div class="card-header" style="color:var(--primary);background:var(--primary-bg)"><span class="v2-text-2xl">ℹ️</span> Informations <span class="badge badge-blue v2-badge-lg v2-ml-auto">' + infos.length + '</span></div>';
    h += '<div class="card-body v2-p-0">';
    infos.forEach(function(a) { h += renderAlertItem(a); });
    h += '</div></div>';
  }
  return h;
}

async function loadMultiSiteAlerts() {
  var container = $('multiSiteAlertsContainer');
  if (!container) return;

  var todayStr = today();
  var localMidnightISO = new Date(todayStr + 'T00:00:00').toISOString();
  var dismissed = [];
  try { dismissed = JSON.parse(localStorage.getItem('haccp_dismissed_consignes') || '[]'); } catch(e) {}

  var totalCritical = 0, totalWarning = 0, totalInfo = 0;
  var siteAlerts = [];

  var siteResults = await Promise.all(S.sites.map(async function(site) {
    var sid = site.id;
    var typeEmoji = { hotel:'🏨', restaurant:'🍽️', cuisine_centrale:'🏭', autre:'🏢' }[site.type] || '🏢';
    try {
      var results = await Promise.all([
        sb.from('temperatures').select('*').eq('site_id', sid).gte('recorded_at', localMidnightISO).order('recorded_at', {ascending:false}),
        sb.from('dlcs').select('*').eq('site_id', sid).order('dlc_date'),
        sb.from('consignes').select('*').eq('site_id', sid).order('created_at', {ascending:false}).limit(50),
        sb.from('orders').select('*').eq('site_id', sid).in('status', ['to_order','ordered']).order('ordered_at', {ascending:false}),
        sb.from('incident_reports').select('*').eq('site_id', sid).in('status', ['open','in_progress']).order('created_at', {ascending:false}),
        sb.from('site_equipment').select('*').eq('site_id', sid).eq('active', true),
        sb.from('site_products').select('*').eq('site_id', sid).eq('active', true)
      ]);

      var temps = results[0].data || [];
      var dlcs = results[1].data || [];
      var consignes = (results[2].data || []).filter(function(c) { return dismissed.indexOf(c.id) === -1 && c.is_read !== true; });
      var orders = results[3].data || [];
      var incidents = results[4].data || [];
      var equipment = results[5].data || [];
      var products = results[6].data || [];

      var alerts = buildAlertsForSite(temps, dlcs, consignes, orders, incidents, equipment, products);
      return { site: site, emoji: typeEmoji, alerts: alerts };
    } catch(e) {
      console.error('Alerts error for', site.name, e);
      return null;
    }
  }));

  siteResults.forEach(function(r) {
    if (!r || r.alerts.length === 0) return;
    var c = r.alerts.filter(function(a) { return a.level === 'critical'; }).length;
    var w = r.alerts.filter(function(a) { return a.level === 'warning'; }).length;
    var inf = r.alerts.filter(function(a) { return a.level === 'info'; }).length;
    totalCritical += c;
    totalWarning += w;
    totalInfo += inf;
    siteAlerts.push({ site: r.site, emoji: r.emoji, alerts: r.alerts, critical: c, warning: w, info: inf });
  });

  // Trier : sites avec critiques en premier
  siteAlerts.sort(function(a, b) { return b.critical - a.critical || b.warning - a.warning; });

  var h = '';

  // Résumé global
  h += '<div class="stats-grid v2-mb-22">';
  h += '<div class="stat-card danger"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">🚨</span><div class="stat-value">' + totalCritical + '</div></div><div class="stat-label">Critiques</div></div>';
  h += '<div class="stat-card warning"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">⚠️</span><div class="stat-value">' + totalWarning + '</div></div><div class="stat-label">Avertissements</div></div>';
  h += '<div class="stat-card success"><div class="v2-flex v2-items-center v2-gap-10 v2-mb-6"><span class="v2-text-4xl">ℹ️</span><div class="stat-value">' + totalInfo + '</div></div><div class="stat-label">Informations</div></div>';
  h += '</div>';

  if (siteAlerts.length === 0) {
    h += '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">✅</div><div class="empty-title">Aucune alerte</div><div class="empty-text">Tout est en ordre sur tous vos sites. Bravo !</div></div></div></div>';
    container.innerHTML = h;
    return;
  }

  // Alertes groupées par site
  siteAlerts.forEach(function(sa) {
    var totalSite = sa.alerts.length;
    var badgeClass = sa.critical > 0 ? 'badge-red' : sa.warning > 0 ? 'badge-yellow' : 'badge-blue';
    var borderClass = sa.critical > 0 ? 'v2-card--danger-left' : sa.warning > 0 ? 'v2-card--warning-left' : '';

    h += '<div class="card ' + borderClass + ' v2-mb-14">';
    h += '<div class="card-header" style="font-size:15px;gap:10px">';
    h += '<span class="v2-text-2xl">' + sa.emoji + '</span> ' + esc(sa.site.name);
    h += '<div style="margin-left:auto;display:flex;gap:6px">';
    if (sa.critical > 0) h += '<span class="badge badge-red">' + sa.critical + ' crit.</span>';
    if (sa.warning > 0) h += '<span class="badge badge-yellow">' + sa.warning + ' avert.</span>';
    if (sa.info > 0) h += '<span class="badge badge-blue">' + sa.info + ' info</span>';
    h += '</div></div>';
    h += '<div class="card-body v2-p-0">';
    sa.alerts.forEach(function(a) { h += renderAlertItem(a); });
    h += '</div></div>';
  });

  container.innerHTML = h;
}

function buildAlertsForSite(temperatures, dlcs, consignes, orders, incidents, equipment, products) {
  var alerts = [];

  // 1. DLC expirées — groupees par produit (CRITIQUE)
  var dlcExpired = dlcs.filter(function(d) {
    return daysUntil(d.dlc_date) < 0 && d.status !== 'consumed' && d.status !== 'discarded';
  });
  var dlcExpGroups = {};
  dlcExpired.forEach(function(d) {
    if (!dlcExpGroups[d.product_name]) dlcExpGroups[d.product_name] = [];
    dlcExpGroups[d.product_name].push(d);
  });
  Object.keys(dlcExpGroups).forEach(function(prodName) {
    var items = dlcExpGroups[prodName];
    var oldest = items[0];
    var countLabel = items.length > 1 ? ' (' + items.length + 'x)' : '';
    alerts.push({
      level: 'critical', icon: '📅', category: 'dlc',
      title: 'DLC expirée : ' + prodName + countLabel,
      message: 'Expirée depuis ' + Math.abs(daysUntil(oldest.dlc_date)) + ' jour(s) — Lot: ' + (oldest.lot_number || 'N/R'),
      time: fmtD(oldest.dlc_date),
      action: '<button class="btn btn-danger" onclick="updateDlcStatus(\'' + oldest.id + '\',\'discarded\');render()">🗑️ Jeter</button>'
    });
  });

  // 2. Températures non conformes — groupees (CRITIQUE)
  var ncTemps = temperatures.filter(function(t) { return !t.is_conform; });
  var ncTempGroups = {};
  ncTemps.forEach(function(t) {
    var key = t.equipment_id || t.product_id || 'unknown';
    if (!ncTempGroups[key]) ncTempGroups[key] = { items: [], refName: '' };
    ncTempGroups[key].items.push(t);
    if (!ncTempGroups[key].refName) {
      if (t.record_type === 'equipment') {
        var eq = equipment.find(function(e) { return e.id === t.equipment_id; });
        ncTempGroups[key].refName = eq ? eq.name : 'Équipement';
      } else {
        var pr = products.find(function(p) { return p.id === t.product_id; });
        ncTempGroups[key].refName = pr ? pr.name : 'Produit';
      }
    }
  });
  Object.keys(ncTempGroups).forEach(function(key) {
    var g = ncTempGroups[key];
    var latest = g.items[0];
    var countLabel = g.items.length > 1 ? ' (' + g.items.length + 'x)' : '';
    alerts.push({
      level: 'critical', icon: '🌡️', category: 'temperature',
      title: 'Température non conforme : ' + g.refName + countLabel,
      message: latest.value + '°C — Action : ' + (latest.corrective_action || 'Non renseignée'),
      time: fmtDT(latest.recorded_at)
    });
  });

  // 3. Consignes urgentes (CRITIQUE)
  consignes.filter(function(c) { return c.priority === 'urgent' && !c.is_read; }).forEach(function(c) {
    alerts.push({
      level: 'critical', icon: '💬', category: 'consigne',
      title: 'Consigne urgente',
      message: c.message.substring(0, 100) + (c.message.length > 100 ? '...' : ''),
      time: fmtDT(c.created_at) + ' — par ' + (c.created_by_name || 'Inconnu'),
      action: '<button class="btn btn-ghost" onclick="markConsigneRead(\'' + c.id + '\')">✓ Traité</button>'
    });
  });

  // 4. DLC proches — groupees par produit (WARNING)
  var dlcSoon = dlcs.filter(function(d) {
    var days = daysUntil(d.dlc_date);
    return days >= 0 && days <= 2 && d.status !== 'consumed' && d.status !== 'discarded';
  });
  var dlcSoonGroups = {};
  dlcSoon.forEach(function(d) {
    if (!dlcSoonGroups[d.product_name]) dlcSoonGroups[d.product_name] = [];
    dlcSoonGroups[d.product_name].push(d);
  });
  Object.keys(dlcSoonGroups).forEach(function(prodName) {
    var items = dlcSoonGroups[prodName];
    var nearest = items[0];
    var days = daysUntil(nearest.dlc_date);
    var countLabel = items.length > 1 ? ' (' + items.length + ' lots)' : '';
    alerts.push({
      level: 'warning', icon: '📅', category: 'dlc',
      title: 'DLC proche : ' + prodName + countLabel,
      message: (days === 0 ? 'Expire aujourd\'hui' : 'Expire dans ' + days + ' jour(s)') + ' — Lot: ' + (nearest.lot_number || 'N/R'),
      time: fmtD(nearest.dlc_date),
      action: '<button class="btn btn-success" onclick="updateDlcStatus(\'' + nearest.id + '\',\'consumed\')">✓ Consommé</button>'
    });
  });

  // 4b. DLC secondaire (multi-site)
  dlcs.filter(function(d) {
    return d.opened_at && d.shelf_life_days && d.status !== 'consumed' && d.status !== 'discarded';
  }).forEach(function(d) {
    var openDate = new Date(d.opened_at + 'T00:00:00');
    var expiryDate = new Date(openDate.getTime() + d.shelf_life_days * 86400000);
    var todayDate = new Date(today() + 'T00:00:00');
    var daysLeft = Math.ceil((expiryDate - todayDate) / 86400000);
    if (daysLeft < 0) {
      alerts.push({ level: 'critical', icon: '📂', category: 'dlc2', title: 'DLC après ouverture expirée : ' + d.product_name, message: 'Ouvert depuis ' + Math.ceil((todayDate - openDate) / 86400000) + 'j (max ' + d.shelf_life_days + 'j)' });
    } else if (daysLeft <= 1) {
      alerts.push({ level: 'warning', icon: '📂', category: 'dlc2', title: 'DLC après ouverture proche : ' + d.product_name, message: (daysLeft === 0 ? 'Expire aujourd\'hui' : 'Expire demain') });
    }
  });

  // 5. Commandes en attente longtemps (WARNING)
  orders.filter(function(o) {
    if (o.status !== 'ordered' || !o.ordered_at) return false;
    return Math.ceil((new Date() - new Date(o.ordered_at)) / 86400000) >= 3;
  }).forEach(function(o) {
    var daysSince = Math.ceil((new Date() - new Date(o.ordered_at)) / 86400000);
    alerts.push({
      level: 'warning', icon: '🛒', category: 'order',
      title: 'Livraison en attente : ' + o.product_name,
      message: 'Commandé il y a ' + daysSince + ' jours — Fournisseur: ' + (o.supplier_name || 'N/R'),
      time: fmtD(o.ordered_at)
    });
  });

  // 6. Relevés incomplets (INFO)
  var totalExpected = equipment.length + products.length;
  var tempCount = temperatures.length;
  if (totalExpected > 0 && tempCount < totalExpected) {
    alerts.push({
      level: 'info', icon: '🌡️', category: 'temperature',
      title: 'Relevés incomplets',
      message: (totalExpected - tempCount) + ' relevé(s) restant(s) sur ' + totalExpected + ' attendus'
    });
  }

  // 7. Commandes à passer (INFO)
  var toOrder = orders.filter(function(o) { return o.status === 'to_order'; });
  if (toOrder.length > 0) {
    alerts.push({
      level: 'info', icon: '🛒', category: 'order',
      title: toOrder.length + ' produit(s) à commander',
      message: 'Commandes en attente de validation'
    });
  }

  // 8. Signalements (CRITICAL/WARNING)
  incidents.filter(function(r) { return r.status !== 'resolved'; }).forEach(function(r) {
    alerts.push({
      level: r.priority === 'urgent' ? 'critical' : 'warning',
      icon: '🚨', category: 'report',
      title: 'Signalement : ' + r.title,
      message: (r.description || '').substring(0, 100) + ((r.description || '').length > 100 ? '...' : ''),
      time: fmtDT(r.created_at) + ' — par ' + (r.reported_by_name || 'Inconnu')
    });
  });

  return alerts;
}

function renderAlertItem(alert) {
  var levelColors = { critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--primary)' };
  var levelBgs = { critical: 'var(--danger-bg)', warning: 'var(--warning-bg)', info: 'var(--primary-light)' };
  var color = levelColors[alert.level] || 'var(--gray)';
  var bg = levelBgs[alert.level] || 'var(--gray-light)';

  var catPages = { dlc:'dlc', dlc2:'dlc', temperature:'temperatures', consigne:'consignes', order:'orders', cleaning:'cleaning' };
  var targetPage = catPages[alert.category] || '';
  var clickAttr = targetPage ? ' onclick="alertItemClick(event,\'' + targetPage + '\')" style="border-left:3px solid ' + color + ';cursor:pointer"' : ' style="border-left:3px solid ' + color + '"';

  var h = '<div class="list-item"' + clickAttr + '>';
  h += '<div class="list-icon" style="background:' + bg + ';color:' + color + ';font-size:18px">' + alert.icon + '</div>';
  h += '<div class="list-content">';
  h += '<div class="list-title">' + esc(alert.title) + '</div>';
  h += '<div class="list-sub">' + esc(alert.message) + '</div>';
  if (alert.time) h += '<div class="list-sub v2-text-xs v2-mt-4 v2-font-600">📅 ' + alert.time + '</div>';
  h += '</div>';
  if (alert.action) {
    h += '<div class="list-actions">' + alert.action + '</div>';
  }
  if (targetPage) h += '<span style="color:var(--ink-muted);font-size:18px;flex-shrink:0">›</span>';
  h += '</div>';
  return h;
}

window.alertItemClick = function(event, page) {
  if (event.target.closest('button') || event.target.closest('.btn')) return;
  if (page) navigate(page);
};

// ── CONSTRUCTION DES ALERTES AUTOMATIQUES ──

function buildAlerts() {
  var alerts = [];
  var todayStr = today();

  // 1. DLC expirées — groupees par produit (CRITIQUE)
  var dlcExpired = S.data.dlcs.filter(function(d) {
    return daysUntil(d.dlc_date) < 0 && d.status !== 'consumed' && d.status !== 'discarded';
  });
  var dlcExpGroups = {};
  dlcExpired.forEach(function(d) {
    if (!dlcExpGroups[d.product_name]) dlcExpGroups[d.product_name] = [];
    dlcExpGroups[d.product_name].push(d);
  });
  Object.keys(dlcExpGroups).forEach(function(prodName) {
    var items = dlcExpGroups[prodName];
    var oldest = items[0];
    var countLabel = items.length > 1 ? ' (' + items.length + 'x)' : '';
    alerts.push({
      level: 'critical', icon: '📅', category: 'dlc',
      title: 'DLC expiree : ' + prodName + countLabel,
      message: 'Expiree depuis ' + Math.abs(daysUntil(oldest.dlc_date)) + ' jour(s) — Lot: ' + (oldest.lot_number || 'N/R'),
      time: fmtD(oldest.dlc_date),
      action: '<button class="btn btn-danger" onclick="updateDlcStatus(\'' + oldest.id + '\',\'discarded\');render()">🗑️ Jeter</button>'
    });
  });

  // 2. Temperatures non conformes — groupees par equipement/produit (CRITIQUE)
  var nonConform = S.data.temperatures.filter(function(t) { return !t.is_conform; });
  var ncGroups = {};
  nonConform.forEach(function(t) {
    var key = t.equipment_id || t.product_id || 'unknown';
    if (!ncGroups[key]) ncGroups[key] = { items: [], refName: '' };
    ncGroups[key].items.push(t);
    if (!ncGroups[key].refName) {
      if (t.record_type === 'equipment') {
        var eq = S.siteConfig.equipment.find(function(e) { return e.id === t.equipment_id; });
        ncGroups[key].refName = eq ? eq.name : 'Equipement';
      } else {
        var pr = S.siteConfig.products.find(function(p) { return p.id === t.product_id; });
        ncGroups[key].refName = pr ? pr.name : 'Produit';
      }
    }
  });
  Object.keys(ncGroups).forEach(function(key) {
    var g = ncGroups[key];
    var latest = g.items[0];
    var countLabel = g.items.length > 1 ? ' (' + g.items.length + 'x)' : '';
    alerts.push({
      level: 'critical', icon: '🌡️', category: 'temperature',
      title: 'Temperature non conforme : ' + g.refName + countLabel,
      message: latest.value + '°C — Action : ' + (latest.corrective_action || 'Non renseignee'),
      time: fmtDT(latest.recorded_at)
    });
  });

  // 3. Consignes urgentes non lues (CRITIQUE)
  var urgentCons = S.data.consignes.filter(function(c) { return c.priority === 'urgent' && !c.is_read; });
  urgentCons.forEach(function(c) {
    alerts.push({
      level: 'critical', icon: '💬', category: 'consigne',
      title: 'Consigne urgente',
      message: c.message.substring(0, 100) + (c.message.length > 100 ? '...' : ''),
      time: fmtDT(c.created_at) + ' — par ' + (c.created_by_name || 'Inconnu'),
      action: '<button class="btn btn-ghost" onclick="markConsigneRead(\'' + c.id + '\')">✓ Lu</button>'
    });
  });

  // 4. DLC qui expirent dans 2 jours — groupees par produit (WARNING)
  var dlcSoon = S.data.dlcs.filter(function(d) {
    var days = daysUntil(d.dlc_date);
    return days >= 0 && days <= 2 && d.status !== 'consumed' && d.status !== 'discarded';
  });
  var dlcSoonGroups = {};
  dlcSoon.forEach(function(d) {
    if (!dlcSoonGroups[d.product_name]) dlcSoonGroups[d.product_name] = [];
    dlcSoonGroups[d.product_name].push(d);
  });
  Object.keys(dlcSoonGroups).forEach(function(prodName) {
    var items = dlcSoonGroups[prodName];
    var nearest = items[0];
    var days = daysUntil(nearest.dlc_date);
    var countLabel = items.length > 1 ? ' (' + items.length + ' lots)' : '';
    alerts.push({
      level: 'warning', icon: '📅', category: 'dlc',
      title: 'DLC proche : ' + prodName + countLabel,
      message: (days === 0 ? 'Expire aujourd\'hui' : 'Expire dans ' + days + ' jour(s)') + ' — Lot: ' + (nearest.lot_number || 'N/R'),
      time: fmtD(nearest.dlc_date),
      action: '<button class="btn btn-success" onclick="updateDlcStatus(\'' + nearest.id + '\',\'consumed\')">Consomme</button>'
    });
  });

  // 4b. DLC secondaire expirée (CRITICAL) ou proche (WARNING)
  S.data.dlcs.filter(function(d) {
    return d.opened_at && d.shelf_life_days && d.status !== 'consumed' && d.status !== 'discarded';
  }).forEach(function(d) {
    var openDate = new Date(d.opened_at + 'T00:00:00');
    var expiryDate = new Date(openDate.getTime() + d.shelf_life_days * 86400000);
    var todayDate = new Date(today() + 'T00:00:00');
    var daysLeft = Math.ceil((expiryDate - todayDate) / 86400000);
    if (daysLeft < 0) {
      alerts.push({
        level: 'critical', icon: '📂', category: 'dlc2',
        title: 'DLC après ouverture expirée : ' + d.product_name,
        message: 'Ouvert depuis ' + Math.ceil((todayDate - openDate) / 86400000) + 'j (max ' + d.shelf_life_days + 'j)',
        action: '<button class="btn btn-danger" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">🗑️ Jeter</button>'
      });
    } else if (daysLeft <= 1) {
      alerts.push({
        level: 'warning', icon: '📂', category: 'dlc2',
        title: 'DLC après ouverture proche : ' + d.product_name,
        message: (daysLeft === 0 ? 'Expire aujourd\'hui' : 'Expire demain') + ' (ouvert ' + d.shelf_life_days + 'j max)',
        action: '<button class="btn btn-success" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utiliser</button>'
      });
    }
  });

  // 5. Commandes en attente depuis longtemps (WARNING)
  var oldOrders = S.data.orders.filter(function(o) {
    if (o.status !== 'ordered' || !o.ordered_at) return false;
    var daysSince = Math.ceil((new Date() - new Date(o.ordered_at)) / 86400000);
    return daysSince >= 3;
  });
  oldOrders.forEach(function(o) {
    var daysSince = Math.ceil((new Date() - new Date(o.ordered_at)) / 86400000);
    alerts.push({
      level: 'warning', icon: '🛒', category: 'order',
      title: 'Livraison en attente : ' + o.product_name,
      message: 'Commandé il y a ' + daysSince + ' jours — Fournisseur: ' + (o.supplier_name || 'N/R'),
      time: fmtD(o.ordered_at)
    });
  });

  // 6. Relevés température incomplets (INFO)
  var eqCount = S.siteConfig.equipment.length;
  var prCount = S.siteConfig.products.length;
  var totalExpected = eqCount + prCount;
  var tempCount = S.data.temperatures.length;
  if (totalExpected > 0 && tempCount < totalExpected) {
    var remaining = totalExpected - tempCount;
    alerts.push({
      level: 'info', icon: '🌡️', category: 'temperature',
      title: 'Relevés incomplets',
      message: remaining + ' relevé(s) restant(s) sur ' + totalExpected + ' attendus aujourd\'hui',
      action: '<button class="btn btn-primary" onclick="navigate(\'temperatures\')">📝 Compléter</button>'
    });
  }

  // 7. Commandes à passer (INFO)
  var toOrder = S.data.orders.filter(function(o) { return o.status === 'to_order'; });
  if (toOrder.length > 0) {
    // Grouper par fournisseur
    var suppliers = {};
    toOrder.forEach(function(o) {
      var sn = o.supplier_name || 'Sans fournisseur';
      if (!suppliers[sn]) suppliers[sn] = 0;
      suppliers[sn]++;
    });
    Object.keys(suppliers).forEach(function(sn) {
      alerts.push({
        level: 'info', icon: '🛒', category: 'order',
        title: suppliers[sn] + ' produit(s) à commander',
        message: 'Fournisseur : ' + sn,
        action: '<button class="btn btn-primary" onclick="navigate(\'orders\')">Voir</button>'
      });
    });
  }

  // 8. Signalements non résolus (CRITICAL ou WARNING) + indicateur escalade
  var unresolvedReports = (S.data.incident_reports || []).filter(function(r) { return r.status !== 'resolved'; });
  unresolvedReports.forEach(function(r) {
    var escLevel = r.escalation_level || 0;
    var escBadge = escLevel >= 3 ? ' <span class="badge badge-red" style="animation:pulse 1.5s infinite">ESC ' + escLevel + '</span>' : escLevel > 0 ? ' <span class="badge badge-yellow">ESC ' + escLevel + '</span>' : '';
    alerts.push({
      level: r.priority === 'urgent' ? 'critical' : 'warning',
      icon: '🚨', category: 'report',
      title: 'Signalement : ' + r.title + escBadge,
      message: (r.description || '').substring(0, 100) + ((r.description || '').length > 100 ? '...' : ''),
      time: fmtDT(r.created_at) + ' — par ' + (r.reported_by_name || 'Inconnu'),
      action: isManager() ? '<button class="btn btn-success" onclick="resolveReport(\'' + r.id + '\')">✓ Résolu</button>' : ''
    });
  });

  // 9. Cleaning tasks not completed today
  if (moduleEnabled('cleaning') && typeof getTodayCleaningSchedules === 'function') {
    var cleanScheds = getTodayCleaningSchedules();
    var cleanRecs = S.data.cleaning_logs || [];
    var cleanCompIds = {};
    cleanRecs.forEach(function(r) { cleanCompIds[r.schedule_id] = true; });
    var cleanOverdue = cleanScheds.filter(function(s) { return !cleanCompIds[s.id]; });
    if (cleanOverdue.length > 0) {
      var now = new Date();
      var hour = now.getHours();
      var level = hour >= 18 ? 'critical' : hour >= 14 ? 'warning' : 'info';
      alerts.push({
        level: level, icon: '🧹', category: 'cleaning',
        title: cleanOverdue.length + ' tâche(s) de nettoyage non effectuée(s)',
        message: cleanOverdue.map(function(s) { return s.name; }).slice(0, 3).join(', ') + (cleanOverdue.length > 3 ? '...' : ''),
        action: '<button class="btn btn-primary" onclick="navigate(\'cleaning\')">Voir</button>'
      });
    }
  }

  return alerts;
}

// Compteur global pour badge sidebar (cached per render cycle)
var _alertsCache = null;
var _alertsCacheToken = 0;
function getCachedAlerts() {
  var token = S._renderToken || 0;
  if (_alertsCache && _alertsCacheToken === token) return _alertsCache;
  _alertsCache = buildAlerts();
  _alertsCacheToken = token;
  return _alertsCache;
}
function getAlertCount() {
  return getCachedAlerts().filter(function(a) { return a.level === 'critical' || a.level === 'warning'; }).length;
}

// ── ONGLET : SIGNALEMENTS ──

function renderNotifReports() {
  var h = '';

  // Formulaire de signalement
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">🚨</span> Signaler un problème</div><div class="card-body">';
  h += '<form onsubmit="handleNewReport(event)">';
  h += '<div class="form-group"><label class="form-label">Titre <span class="req">*</span></label>';
  h += '<input type="text" class="form-input" id="reportTitle" required placeholder="Ex: Frigo chambre 2 en panne"></div>';

  h += '<div class="form-row">';
  h += '<div class="form-group"><label class="form-label">Catégorie</label>';
  h += '<select class="form-select" id="reportCategory">';
  h += '<option value="equipment">🔧 Équipement</option>';
  h += '<option value="hygiene">🧹 Hygiène</option>';
  h += '<option value="temperature">🌡️ Température</option>';
  h += '<option value="product">📦 Produit</option>';
  h += '<option value="other">📋 Autre</option>';
  h += '</select></div>';

  h += '<div class="form-group"><label class="form-label">Priorité</label>';
  h += '<select class="form-select" id="reportPriority">';
  h += '<option value="normal">🟡 Normal</option>';
  h += '<option value="urgent">🔴 Urgent</option>';
  h += '</select></div>';
  h += '</div>';

  h += '<div class="form-group"><label class="form-label">Description <span class="req">*</span></label>';
  h += '<textarea class="form-textarea" id="reportDesc" required rows="3" placeholder="Décrivez le problème en détail..."></textarea></div>';

  h += '<button type="submit" class="btn btn-danger btn-lg">🚨 Envoyer le signalement</button>';
  h += '</form></div></div>';

  // Liste des signalements en cours
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Signalements en cours</div>';
  h += '<div class="card-body v2-p-0" id="reportsListContainer"><div class="v2-loading-inline"><div class="loading" style="width:28px;height:28px;border-width:3px"></div></div></div></div>';

  var isMultiSite = (isSuperAdmin() || isManager()) && S.sites.length > 1;
  setTimeout(function() { isMultiSite ? loadMultiSiteReports() : loadAndRenderReports(); }, 50);

  return h;
}

async function loadAndRenderReports() {
  var container = $('reportsListContainer');
  if (!container) return;

  try {
    var r = await sb.from('incident_reports').select('*')
      .eq('site_id', S.currentSiteId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    var reports = r.data || [];
    S.data.incident_reports = reports;

    if (reports.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:36px"><div class="empty-icon">✅</div><div class="empty-title">Aucun signalement en cours</div></div>';
      return;
    }

    var h = '';
    reports.forEach(function(rep) {
      var prioColor = rep.priority === 'urgent' ? 'var(--danger)' : 'var(--warning)';
      var prioBg = rep.priority === 'urgent' ? 'var(--danger-bg)' : 'var(--warning-bg)';
      var catEmojis = { equipment:'🔧', hygiene:'🧹', temperature:'🌡️', product:'📦', other:'📋' };
      var statusLabels = { open:'🔴 Ouvert', in_progress:'🟡 En cours', resolved:'🟢 Résolu' };

      h += '<div class="list-item ' + (rep.priority === 'urgent' ? 'v2-list-item--border-left-nok' : 'v2-list-item--border-left-warning') + '">';
      h += '<div class="list-icon" style="background:' + prioBg + ';font-size:18px">' + (catEmojis[rep.category] || '📋') + '</div>';
      h += '<div class="list-content">';
      h += '<div class="list-title">' + esc(rep.title) + '</div>';
      h += '<div class="list-sub">' + esc((rep.description || '').substring(0, 120)) + '</div>';
      h += '<div class="list-sub v2-mt-4 v2-text-xs">';
      h += '<span class="badge' + (rep.priority === 'urgent' ? ' badge-red' : ' badge-yellow') + '">' + (rep.priority === 'urgent' ? '🔴 Urgent' : '🟡 Normal') + '</span> ';
      h += '<span class="badge badge-gray">' + (statusLabels[rep.status] || rep.status) + '</span> ';
      h += '— ' + fmtDT(rep.created_at) + ' par ' + esc(rep.reported_by_name || 'Inconnu');
      h += '</div>';
      h += '</div>';
      h += '<div class="list-actions">';
      if (isManager()) {
        if (rep.status === 'open') {
          h += '<button class="btn btn-warning btn-sm" onclick="updateReportStatus(\'' + rep.id + '\',\'in_progress\')" title="En cours">🔄</button> ';
        }
        h += '<button class="btn btn-success" onclick="resolveReport(\'' + rep.id + '\')" title="Résolu">✓ Résolu</button>';
      }
      h += '</div></div>';
    });

    container.innerHTML = h;
  } catch(e) {
    container.innerHTML = '<p class="v2-text-danger v2-font-600" style="padding:18px">Erreur de chargement</p>';
    console.error('Load reports error:', e);
  }
}

// ── ONGLET : HISTORIQUE ──

function renderNotifHistory() {
  var h = '';
  h += '<div class="card"><div class="card-header"><span class="v2-text-2xl">📋</span> Signalements résolus</div>';
  h += '<div class="card-body v2-p-0" id="reportsHistoryContainer"><div class="v2-loading-inline"><div class="loading" style="width:28px;height:28px;border-width:3px"></div></div></div></div>';

  var isMultiSite = (isSuperAdmin() || isManager()) && S.sites.length > 1;
  setTimeout(function() { isMultiSite ? loadMultiSiteReportHistory() : loadAndRenderReportHistory(); }, 50);
  return h;
}

async function loadAndRenderReportHistory() {
  var container = $('reportsHistoryContainer');
  if (!container) return;

  try {
    var r = await sb.from('incident_reports').select('*')
      .eq('site_id', S.currentSiteId)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(30);

    var reports = r.data || [];

    if (reports.length === 0) {
      container.innerHTML = '<div class="empty" style="padding:36px"><div class="empty-icon">📋</div><div class="empty-title">Aucun historique</div></div>';
      return;
    }

    var h = '';
    reports.forEach(function(rep) {
      var catEmojis = { equipment:'🔧', hygiene:'🧹', temperature:'🌡️', product:'📦', other:'📋' };
      h += '<div class="list-item">';
      h += '<div class="list-icon v2-list-icon--ok v2-text-2xl">' + (catEmojis[rep.category] || '📋') + '</div>';
      h += '<div class="list-content">';
      h += '<div class="list-title" style="text-decoration:line-through;color:var(--gray)">' + esc(rep.title) + '</div>';
      h += '<div class="list-sub">' + esc((rep.description || '').substring(0, 80)) + '</div>';
      h += '<div class="list-sub v2-text-xs v2-mt-4">';
      h += '<span class="badge badge-green">✓ Résolu</span> ';
      h += fmtDT(rep.resolved_at || rep.created_at) + ' — Signalé par ' + esc(rep.reported_by_name || 'Inconnu');
      if (rep.resolved_by_name) h += ' — Résolu par ' + esc(rep.resolved_by_name);
      h += '</div>';
      if (rep.resolution_notes) h += '<div class="list-sub v2-text-xs v2-mt-4" style="color:var(--af-ok)">📝 ' + esc(rep.resolution_notes) + '</div>';
      h += '</div></div>';
    });

    container.innerHTML = h;
  } catch(e) {
    container.innerHTML = '<p class="v2-text-danger v2-font-600" style="padding:18px">Erreur de chargement</p>';
  }
}

// ── MULTI-SITE REPORT HISTORY ──

async function loadMultiSiteReportHistory() {
  var container = $('reportsHistoryContainer');
  if (!container) return;

  var results = await Promise.all(S.sites.map(async function(site) {
    try {
      var r = await sb.from('incident_reports').select('*')
        .eq('site_id', site.id).eq('status', 'resolved')
        .order('resolved_at', { ascending: false }).limit(20);
      var reports = r.data || [];
      if (reports.length > 0) {
        var typeEmoji = { hotel:'🏨', restaurant:'🍽️', cuisine_centrale:'🏭', autre:'🏢' }[site.type] || '🏢';
        return { site: site, emoji: typeEmoji, reports: reports };
      }
    } catch(e) { console.error('History error for', site.name, e); }
    return null;
  }));
  var allHistory = results.filter(Boolean);

  if (allHistory.length === 0) {
    container.innerHTML = '<div class="empty" style="padding:36px"><div class="empty-icon">📋</div><div class="empty-title">Aucun historique</div></div>';
    return;
  }

  var h = '';
  allHistory.forEach(function(sr) {
    h += '<div style="border-bottom:2px solid var(--border);padding:12px 16px;background:var(--bg-off);font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px">';
    h += '<span>' + sr.emoji + '</span> ' + esc(sr.site.name);
    h += '<span class="badge badge-green v2-ml-auto">' + sr.reports.length + '</span></div>';

    sr.reports.forEach(function(rep) {
      var catEmojis = { equipment:'🔧', hygiene:'🧹', temperature:'🌡️', product:'📦', other:'📋' };
      h += '<div class="list-item">';
      h += '<div class="list-icon v2-list-icon--ok v2-text-2xl">' + (catEmojis[rep.category] || '📋') + '</div>';
      h += '<div class="list-content">';
      h += '<div class="list-title" style="text-decoration:line-through;color:var(--gray)">' + esc(rep.title) + '</div>';
      h += '<div class="list-sub">' + esc((rep.description || '').substring(0, 80)) + '</div>';
      h += '<div class="list-sub v2-text-xs v2-mt-4">';
      h += '<span class="badge badge-green">✓ Résolu</span> ';
      h += fmtDT(rep.resolved_at || rep.created_at) + ' — Signalé par ' + esc(rep.reported_by_name || 'Inconnu');
      if (rep.resolved_by_name) h += ' — Résolu par ' + esc(rep.resolved_by_name);
      h += '</div></div></div>';
    });
  });

  container.innerHTML = h;
}

// ── MULTI-SITE REPORTS ──

async function loadMultiSiteReports() {
  var container = $('reportsListContainer');
  if (!container) return;

  var allSiteReports = [];
  for (var i = 0; i < S.sites.length; i++) {
    var site = S.sites[i];
    try {
      var r = await sb.from('incident_reports').select('*')
        .eq('site_id', site.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });
      var reports = r.data || [];
      if (reports.length > 0) {
        var typeEmoji = { hotel:'🏨', restaurant:'🍽️', cuisine_centrale:'🏭', autre:'🏢' }[site.type] || '🏢';
        allSiteReports.push({ site: site, emoji: typeEmoji, reports: reports });
      }
    } catch(e) { console.error('Reports error for', site.name, e); }
  }

  if (allSiteReports.length === 0) {
    container.innerHTML = '<div class="empty" style="padding:36px"><div class="empty-icon">✅</div><div class="empty-title">Aucun signalement en cours</div></div>';
    return;
  }

  var h = '';
  allSiteReports.forEach(function(sr) {
    h += '<div style="border-bottom:2px solid var(--border);padding:12px 16px;background:var(--bg-off);font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px">';
    h += '<span>' + sr.emoji + '</span> ' + esc(sr.site.name);
    h += '<span class="badge badge-red v2-ml-auto">' + sr.reports.length + '</span></div>';

    sr.reports.forEach(function(rep) {
      var prioColor = rep.priority === 'urgent' ? 'var(--danger)' : 'var(--warning)';
      var prioBg = rep.priority === 'urgent' ? 'var(--danger-bg)' : 'var(--warning-bg)';
      var catEmojis = { equipment:'🔧', hygiene:'🧹', temperature:'🌡️', product:'📦', other:'📋' };
      var statusLabels = { open:'🔴 Ouvert', in_progress:'🟡 En cours', resolved:'🟢 Résolu' };

      h += '<div class="list-item ' + (rep.priority === 'urgent' ? 'v2-list-item--border-left-nok' : 'v2-list-item--border-left-warning') + '">';
      h += '<div class="list-icon" style="background:' + prioBg + ';font-size:18px">' + (catEmojis[rep.category] || '📋') + '</div>';
      h += '<div class="list-content">';
      h += '<div class="list-title">' + esc(rep.title) + '</div>';
      h += '<div class="list-sub">' + esc((rep.description || '').substring(0, 120)) + '</div>';
      h += '<div class="list-sub v2-mt-4 v2-text-xs">';
      h += '<span class="badge' + (rep.priority === 'urgent' ? ' badge-red' : ' badge-yellow') + '">' + (rep.priority === 'urgent' ? '🔴 Urgent' : '🟡 Normal') + '</span> ';
      h += '<span class="badge badge-gray">' + (statusLabels[rep.status] || rep.status) + '</span> ';
      h += '— ' + fmtDT(rep.created_at) + ' par ' + esc(rep.reported_by_name || 'Inconnu');
      h += '</div></div>';
      h += '<div class="list-actions">';
      if (isManager() || isSuperAdmin()) {
        if (rep.status === 'open') {
          h += '<button class="btn btn-warning btn-sm" onclick="updateReportStatus(\'' + rep.id + '\',\'in_progress\')" title="En cours">🔄</button> ';
        }
        h += '<button class="btn btn-success" onclick="resolveReport(\'' + rep.id + '\')" title="Résolu">✓ Résolu</button>';
      }
      h += '</div></div>';
    });
  });

  container.innerHTML = h;
}

// ── HANDLERS ──

window.handleNewReport = async function(e) {
  e.preventDefault();
  var title = $('reportTitle').value.trim();
  var desc = $('reportDesc').value.trim();
  var category = $('reportCategory').value;
  var priority = $('reportPriority').value;

  if (!title || !desc) { showToast('Veuillez remplir le titre et la description', 'error'); return; }

  try {
    var rec = {
      site_id: S.currentSiteId,
      title: title,
      description: desc,
      category: category,
      priority: priority,
      status: 'open',
      reported_by: S.user.id,
      reported_by_name: userName()
    };

    var r = await sb.from('incident_reports').insert(rec);
    if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }

    showToast('Signalement envoyé !', 'success');
    $('reportTitle').value = '';
    $('reportDesc').value = '';
    loadAndRenderReports();
  } catch(ex) {
    showToast('Erreur: ' + (ex.message || ex), 'error');
  }
};

window.resolveReport = async function(id) {
  var notes = await appPrompt(
    'Résoudre le signalement',
    'Comment le problème a-t-il été résolu ?',
    '',
    { placeholder: 'Ex: Technicien intervenu, pièce remplacée...', multiline: true, confirmLabel: 'Marquer résolu' }
  );
  if (notes === null || notes === undefined) return;
  try {
    await sb.from('incident_reports').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: S.user.id,
      resolved_by_name: userName(),
      resolution_notes: notes || ''
    }).eq('id', id);
    await loadAndRenderReports();
    render();
  } catch(e) {
    showToast('Erreur: ' + (e.message || e), 'error');
  }
};

window.updateReportStatus = async function(id, status) {
  try {
    await sb.from('incident_reports').update({ status: status }).eq('id', id);
    loadAndRenderReports();
  } catch(e) {
    showToast('Erreur: ' + (e.message || e), 'error');
  }
};
