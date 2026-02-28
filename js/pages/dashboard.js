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
  var urgentConsignes = S.data.consignes.filter(function(c) { return c.priority === 'urgent' && c.is_read !== true; });
  var normalConsignes = S.data.consignes.filter(function(c) { return c.priority !== 'urgent' && c.is_read !== true; }).slice(0, 5);

  var h = '';

  // ── 1. GREETING BANNER ──
  var now = new Date();
  var hour = now.getHours();
  var greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  var firstName = userName().split(' ')[0];

  h += '<div class="greeting-banner greeting-banner--compact">';
  h += '<div class="v2-flex v2-items-center v2-justify-between v2-flex-wrap v2-gap-8">';
  h += '<div class="greeting-text"><h2>' + greeting + ', ' + esc(firstName) + '</h2>';
  h += '<p>' + fmtD(today()) + ' · ' + esc(site.name) + '</p></div>';
  if (S.sites.length > 1) {
    h += '<div><select class="v2-greeting-select" onchange="switchSite(this.value)">';
    S.sites.forEach(function(s) {
      h += '<option value="' + s.id + '"' + (s.id === S.currentSiteId ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    });
    h += '</select></div>';
  }
  h += '</div></div>';

  // ── 2. STATS GRID ──
  h += '<div class="stats-grid">';

  var tempPct = totalExpected > 0 ? Math.round(tempCount / totalExpected * 100) : 0;
  h += '<div class="stat-card v2-clickable' + (tempCount >= totalExpected ? ' success' : '') + '" onclick="navigate(\'temperatures\')">';
  h += '<div class="v2-flex v2-items-center v2-justify-between v2-mb-8"><span class="v2-text-5xl">🌡️</span>';
  if (totalExpected > 0) {
    h += '<div class="v2-radial-pct ' + (tempPct >= 100 ? 'v2-radial-pct--ok' : 'v2-radial-pct--primary') + '">' + tempPct + '%</div>';
  }
  h += '</div>';
  h += '<div class="stat-value">' + tempCount + '/' + totalExpected + '</div><div class="stat-label">Relevés aujourd\'hui</div></div>';

  h += '<div class="stat-card v2-clickable' + (dlcWarnings.length > 0 ? ' warning' : ' success') + '" onclick="navigate(\'dlc\')">';
  h += '<div class="v2-mb-8"><span class="v2-text-5xl">📅</span></div>';
  h += '<div class="stat-value">' + dlcWarnings.length + '</div><div class="stat-label">DLC à surveiller</div></div>';

  h += '<div class="stat-card v2-clickable' + (dlcExpired.length > 0 ? ' danger' : ' success') + '" onclick="navigate(\'dlc\')">';
  h += '<div class="v2-mb-8"><span class="v2-text-5xl">❌</span></div>';
  h += '<div class="stat-value">' + dlcExpired.length + '</div><div class="stat-label">DLC expirées</div></div>';

  h += '<div class="stat-card v2-clickable' + (ordersToOrder.length > 0 ? ' warning' : ' success') + '" onclick="navigate(\'orders\')">';
  h += '<div class="v2-mb-8"><span class="v2-text-5xl">🛒</span></div>';
  h += '<div class="stat-value">' + ordersToOrder.length + '</div><div class="stat-label">À commander</div></div>';

  if (moduleEnabled('cleaning') && typeof getTodayCleaningSchedules === 'function') {
    var cScheds = getTodayCleaningSchedules();
    var cRecs = S.data.cleaning_records || [];
    var cCompIds = {};
    cRecs.forEach(function(r) { cCompIds[r.schedule_id] = true; });
    var cDone = cScheds.filter(function(s) { return cCompIds[s.id]; }).length;
    h += '<div class="stat-card v2-clickable' + (cDone >= cScheds.length && cScheds.length > 0 ? ' success' : '') + '" onclick="navigate(\'cleaning\')">';
    h += '<div class="v2-mb-8"><span class="v2-text-5xl">🧹</span></div>';
    h += '<div class="stat-value">' + cDone + '/' + cScheds.length + '</div><div class="stat-label">Nettoyage</div></div>';
  }

  h += '</div>';

  // ── 4. ALERTS (Urgent consignes + DLC expired combined) ──
  var totalAlerts = urgentConsignes.length + dlcExpired.length;
  if (totalAlerts > 0) {
    h += '<div class="card v2-card--danger-left"><div class="card-header v2-card-header--danger">🚨 Alertes <span class="badge badge-red v2-badge-lg v2-ml-auto">' + totalAlerts + '</span></div><div class="card-body v2-p-0">';

    urgentConsignes.forEach(function(c) {
      h += '<div class="list-item">';
      h += '<div class="list-content"><div class="list-title v2-text-danger v2-font-700 v2-text-md">💬 ' + esc(c.message) + '</div>';
      h += '<div class="list-sub">Par ' + esc(c.created_by_name) + ' · ' + fmtDT(c.created_at) + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-success" onclick="event.stopPropagation();markConsigneRead(\'' + c.id + '\')">✓ Traité</button></div>';
      h += '</div>';
    });

    dlcExpired.forEach(function(d) {
      h += '<div class="list-item">';
      h += '<div class="list-content"><div class="list-title v2-text-danger v2-text-md">📅 ' + esc(d.product_name) + ' <span class="badge badge-red">Expiré (J' + daysUntil(d.dlc_date) + ')</span></div>';
      h += '<div class="list-sub">DLC : ' + fmtD(d.dlc_date) + (d.lot_number ? ' · Lot : ' + esc(d.lot_number) : '') + '</div></div>';
      h += '<div class="list-actions">';
      h += '<button class="btn btn-danger" onclick="updateDlcStatus(\'' + d.id + '\',\'discarded\')">🗑️ Jeter</button>';
      h += '<button class="btn btn-success" onclick="updateDlcStatus(\'' + d.id + '\',\'consumed\')">✓ Utilisé</button>';
      h += '</div></div>';
    });

    h += '</div></div>';
  }

  // ── 5. TIMELINE : MA JOURNÉE ──
  h += renderDashboardTimeline(tempCount, totalExpected, dlcExpired, dlcWarnings, ordersToOrder, ordersOrdered, urgentConsignes);

  return h;
}

// ── TIMELINE MA JOURNÉE ──

function renderDashboardTimeline(tempCount, totalExpected, dlcExpired, dlcWarnings, ordersToOrder, ordersOrdered, urgentConsignes) {
  var h = '';

  h += '<div class="v2-section-title">📋 Ma Journée</div>';

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
      h += '<div class="v2-mt-8"><div class="progress v2-progress-sm"><div class="progress-bar" style="width:' + tempPct + '%;background:' + (tempPct > 50 ? 'var(--primary)' : 'var(--warning)') + '"></div></div>';
      h += '<div class="tl-card-sub v2-mt-6">' + (totalExpected - tempCount) + ' relevé(s) restant(s)</div></div>';
    } else if (tempDone) {
      h += '<div class="tl-card-sub">Tous les relevés sont complétés</div>';
    } else {
      h += '<div class="tl-card-sub">Aucun équipement/produit configuré</div>';
    }

    var nonConform = S.data.temperatures.filter(function(t) { return !t.is_conform; });
    if (nonConform.length > 0) {
      h += '<div class="v2-alert-inline v2-alert-inline--danger v2-mt-8">⚠️ ' + nonConform.length + ' non-conformité(s) détectée(s)</div>';
    }
    h += '</div></div>';
  }

  // 2. DLC
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
      h += '<div class="v2-mt-6">';
      dlcExpired.slice(0, 3).forEach(function(d) {
        h += '<div class="v2-tl-alert v2-tl-alert--danger v2-tl-alert--actions">❌ <strong>' + esc(d.product_name) + '</strong> — expirée depuis ' + Math.abs(daysUntil(d.dlc_date)) + 'j';
        h += '<span class="v2-tl-alert-btns"><button class="btn btn-danger btn-sm" onclick="event.stopPropagation();updateDlcStatus(\'' + d.id + '\',\'discarded\')">Jeter</button>';
        h += '<button class="btn btn-success btn-sm" onclick="event.stopPropagation();updateDlcStatus(\'' + d.id + '\',\'consumed\')">Utilisé</button></span></div>';
      });
      if (dlcExpired.length > 3) h += '<div class="tl-card-sub">+ ' + (dlcExpired.length - 3) + ' autre(s)...</div>';
      h += '</div>';
    }
    if (dlcWarnings.length > 0) {
      h += '<div class="v2-mt-6">';
      dlcWarnings.slice(0, 3).forEach(function(d) {
        var days = daysUntil(d.dlc_date);
        h += '<div class="v2-tl-alert v2-tl-alert--warning v2-tl-alert--actions">⚠️ <strong>' + esc(d.product_name) + '</strong> — ' + (days === 0 ? 'expire aujourd\'hui' : days + 'j restant(s)');
        h += '<span class="v2-tl-alert-btns"><button class="btn btn-success btn-sm" onclick="event.stopPropagation();updateDlcStatus(\'' + d.id + '\',\'consumed\')">✓ Utilisé</button></span></div>';
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
        h += '<div class="v2-tl-alert v2-tl-alert--danger v2-tl-alert--actions">🚨 ' + esc(c.message.substring(0, 80)) + (c.message.length > 80 ? '...' : '');
        h += '<span class="v2-tl-alert-btns"><button class="btn btn-success btn-sm" onclick="event.stopPropagation();markConsigneRead(\'' + c.id + '\')">✓ Traité</button></span></div>';
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
      var bySupp = {};
      ordersToOrder.forEach(function(o) { var s = o.supplier_name || 'Sans fournisseur'; bySupp[s] = (bySupp[s] || 0) + 1; });
      h += '<div class="v2-mt-6">';
      Object.keys(bySupp).slice(0, 3).forEach(function(s) {
        h += '<div class="v2-tl-alert v2-tl-alert--warning">📞 ' + esc(s) + ' — ' + bySupp[s] + ' produit(s)</div>';
      });
      h += '</div>';
    }
    if (ordersOrdered.length > 0) {
      h += '<div class="v2-text-sm v2-text-muted v2-mt-4 v2-font-500">📦 ' + ordersOrdered.length + ' livraison(s) attendue(s)</div>';
    }
    if (totalOrders === 0) {
      h += '<div class="tl-card-sub">Aucune commande en cours</div>';
    }
    h += '</div></div>';
  }

  // 4.5 Nettoyage
  if (moduleEnabled('cleaning') && typeof getTodayCleaningSchedules === 'function') {
    var cleanScheds = getTodayCleaningSchedules();
    var cleanRecs = S.data.cleaning_records || [];
    var cleanCompIds = {};
    cleanRecs.forEach(function(r) { cleanCompIds[r.schedule_id] = true; });
    var cleanDone = cleanScheds.filter(function(s) { return cleanCompIds[s.id]; }).length;
    var cleanTotal = cleanScheds.length;
    var cleanPct = cleanTotal > 0 ? Math.round(cleanDone / cleanTotal * 100) : 0;
    var cleanDotClass = cleanTotal === 0 ? 'done' : cleanDone >= cleanTotal ? 'done' : cleanDone > 0 ? 'info' : 'pending';

    h += '<div class="tl-item"><div class="tl-dot ' + cleanDotClass + '"></div>';
    h += '<div class="tl-card" onclick="navigate(\'cleaning\')">';
    h += '<div class="tl-card-header"><div class="tl-card-title">🧹 Nettoyage</div>';
    if (cleanTotal === 0) {
      h += '<span class="badge badge-gray">Aucune tâche</span>';
    } else if (cleanDone >= cleanTotal) {
      h += '<span class="badge badge-green">✓ Terminé</span>';
    } else {
      h += '<span class="badge badge-blue">' + cleanDone + '/' + cleanTotal + '</span>';
    }
    h += '</div>';
    if (cleanTotal > 0 && cleanDone < cleanTotal) {
      h += '<div class="v2-mt-8"><div class="progress" style="height:4px"><div class="progress-bar" style="width:' + cleanPct + '%"></div></div>';
      h += '<div class="tl-card-sub v2-mt-6">' + (cleanTotal - cleanDone) + ' tâche(s) restante(s)</div></div>';
    } else if (cleanDone >= cleanTotal && cleanTotal > 0) {
      h += '<div class="tl-card-sub">Toutes les tâches sont complétées</div>';
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
      h += '<div class="v2-tl-alert v2-tl-alert--danger">' + esc(r.title) + '</div>';
    });
    h += '</div></div>';
  }

  // 6. Rapport du jour
  var reportGenerated = S.reportGenerated === today();
  h += '<div class="tl-item"><div class="tl-dot ' + (reportGenerated ? 'done' : 'pending') + '"></div>';
  h += '<div class="tl-card" onclick="navigate(\'reports\')">';
  h += '<div class="tl-card-header"><div class="tl-card-title">📄 Rapport du jour</div>';
  if (reportGenerated) {
    h += '<span class="badge badge-green">✓ Généré</span>';
  } else {
    h += '<span class="badge badge-gray">À générer</span>';
  }
  h += '</div>';
  h += '<div class="tl-card-sub">' + (reportGenerated ? 'Rapport HACCP généré' : 'Générez votre rapport HACCP journalier') + '</div>';
  h += '</div></div>';

  h += '</div>'; // fin timeline

  return h;
}

// =====================================================================
// MULTI-SITE DASHBOARD
// =====================================================================

var _multiSiteCache = null;
var _multiSiteCacheTime = 0;

async function loadMultiSiteStats() {
  var now = Date.now();
  if (_multiSiteCache && (now - _multiSiteCacheTime) < 30000) return _multiSiteCache;

  var todayStr = today();
  var stats = [];

  var localMidnightISO = new Date(todayStr + 'T00:00:00').toISOString();

  stats = await Promise.all(S.sites.map(async function(site) {
    var sid = site.id;
    try {
      var results = await Promise.all([
        sb.from('temperatures').select('id', { count: 'exact', head: true }).eq('site_id', sid).gte('recorded_at', localMidnightISO),
        sb.from('site_equipment').select('id', { count: 'exact', head: true }).eq('site_id', sid).eq('active', true),
        sb.from('site_products').select('id', { count: 'exact', head: true }).eq('site_id', sid).eq('active', true),
        sb.from('dlcs').select('id, dlc_date, status').eq('site_id', sid).not('status', 'in', '("consumed","discarded")'),
        sb.from('orders').select('id', { count: 'exact', head: true }).eq('site_id', sid).eq('status', 'to_order'),
        sb.from('consignes').select('*').eq('site_id', sid).eq('priority', 'urgent').eq('is_read', false)
      ]);

      var dlcData = results[3].data || [];
      var dlcWarnings = dlcData.filter(function(x) { var days = daysUntil(x.dlc_date); return days <= 2 && days >= 0; }).length;
      var dlcExpired = dlcData.filter(function(x) { return daysUntil(x.dlc_date) < 0; }).length;
      var urgentList = results[5].data || [];

      return {
        site: site,
        tempCount: results[0].count || 0,
        totalExpected: (results[1].count || 0) + (results[2].count || 0),
        dlcWarnings: dlcWarnings,
        dlcExpired: dlcExpired,
        ordersOpen: results[4].count || 0,
        urgentConsignes: urgentList.length,
        urgentConsignesList: urgentList
      };
    } catch (e) {
      console.error('Stats error for site', site.name, e);
      return { site: site, tempCount: 0, totalExpected: 0, dlcWarnings: 0, dlcExpired: 0, ordersOpen: 0, urgentConsignes: 0 };
    }
  }));

  _multiSiteCache = stats;
  _multiSiteCacheTime = now;
  return stats;
}

function renderMultiSiteDashboard() {
  var h = '';

  // Greeting banner
  var now = new Date();
  var hour = now.getHours();
  var greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  var firstName = userName().split(' ')[0];

  h += '<div class="greeting-banner">';
  h += '<div class="v2-flex v2-items-center v2-justify-between v2-flex-wrap v2-gap-12">';
  h += '<div class="greeting-text"><h2>' + greeting + ', ' + esc(firstName) + '</h2>';
  h += '<p>Vue globale — ' + S.sites.length + ' site' + (S.sites.length > 1 ? 's' : '') + ' · ' + fmtD(today()) + '</p></div>';
  h += '<button class="v2-greeting-select" onclick="_multiSiteCache=null;loadAndRenderMultiDashboard();">↻ Actualiser</button>';
  h += '</div></div>';

  // Container with skeleton loading
  h += '<div id="multiDashContainer">';
  h += '<div class="skeleton skeleton-card"></div>';
  h += '<div class="skeleton skeleton-card"></div>';
  h += '<div class="v2-grid-2">';
  h += '<div class="skeleton skeleton-card"></div>';
  h += '<div class="skeleton skeleton-card"></div>';
  h += '</div>';
  h += '</div>';

  setTimeout(function() { loadAndRenderMultiDashboard(); }, 50);

  return h;
}

async function loadAndRenderMultiDashboard() {
  var container = $('multiDashContainer');
  if (!container) return;

  var stats = await loadMultiSiteStats();
  var h = '';

  var totalTemp = 0, totalExpected = 0, totalDlcWarn = 0, totalDlcExp = 0, totalOrders = 0, totalUrgent = 0;
  var sitesOk = 0;
  var allUrgentConsignes = [];

  stats.forEach(function(s) {
    totalTemp += s.tempCount;
    totalExpected += s.totalExpected;
    totalDlcWarn += s.dlcWarnings;
    totalDlcExp += s.dlcExpired;
    totalOrders += s.ordersOpen;
    totalUrgent += s.urgentConsignes;
    if (s.totalExpected > 0 && s.tempCount >= s.totalExpected && s.dlcExpired === 0) sitesOk++;
    if (s.urgentConsignesList) {
      s.urgentConsignesList.forEach(function(c) { c._siteName = s.site.name; allUrgentConsignes.push(c); });
    }
  });

  var globalPct = totalExpected > 0 ? Math.round(totalTemp / totalExpected * 100) : 0;

  // Stats
  h += '<div class="global-stats-banner v2-grid-2">';
  h += '<div class="global-stat"><div class="gs-value">' + S.sites.length + '</div><div class="gs-label">Sites actifs</div></div>';
  h += '<div class="global-stat' + (globalPct >= 100 ? ' gs-success' : '') + '"><div class="gs-value">' + globalPct + '%</div><div class="gs-label">Relevés complétés</div></div>';
  h += '</div>';

  // Progress bar
  h += '<div class="card v2-mb-18"><div class="card-body v2-card-body--compact"><div class="v2-flex v2-justify-between v2-items-center v2-mb-8"><span class="v2-font-700 v2-text-md">Progression globale</span><span class="v2-font-800 v2-text-xl ' + (globalPct >= 100 ? 'v2-text-ok' : 'v2-text-primary') + '">' + totalTemp + '/' + totalExpected + '</span></div><div class="progress v2-progress-lg"><div class="progress-bar" style="width:' + Math.min(100, globalPct) + '%;background:' + (globalPct >= 100 ? 'var(--success)' : globalPct >= 50 ? 'var(--primary)' : 'var(--warning)') + '"></div></div></div></div>';

  // Alerts
  if (totalUrgent > 0 || totalDlcExp > 0) {
    h += '<div class="card v2-card--danger-left v2-mb-18">';
    h += '<div class="card-header v2-card-header--danger">🚨 Alertes à traiter <span class="badge badge-red v2-badge-lg v2-ml-auto">' + (totalUrgent + totalDlcExp) + '</span></div>';
    h += '<div class="card-body v2-p-0">';
    allUrgentConsignes.forEach(function(c) {
      h += '<div class="list-item"><div class="list-icon v2-list-icon--danger">💬</div><div class="list-content"><div class="list-title v2-text-danger">' + esc(c.message.substring(0, 80)) + (c.message.length > 80 ? '...' : '') + '</div><div class="list-sub">📍 ' + esc(c._siteName || '') + ' — ' + esc(c.created_by_name || '') + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-success btn-sm" onclick="event.stopPropagation();markConsigneRead(\'' + c.id + '\');_multiSiteCache=null;">✓ Traité</button></div>';
      h += '</div>';
    });
    if (totalDlcExp > 0) {
      h += '<div class="list-item"><div class="list-icon v2-list-icon--danger">📅</div><div class="list-content"><div class="list-title v2-text-danger">' + totalDlcExp + ' DLC expirée(s)</div><div class="list-sub">Vérifiez chaque site</div></div>';
      h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="navigate(\'dlc\')">Voir →</button></div>';
      h += '</div>';
    }
    h += '</div></div>';
  }

  // Site detail
  h += '<div class="v2-flex v2-justify-between v2-items-center v2-mb-14"><h3 class="v2-section-heading">Détail par site</h3><span class="v2-text-sm v2-text-muted v2-font-600">' + sitesOk + '/' + S.sites.length + ' conformes</span></div>';

  stats.forEach(function(s, idx) {
    var site = s.site;
    var pct = s.totalExpected > 0 ? Math.round(s.tempCount / s.totalExpected * 100) : 0;
    var typeEmoji = { hotel: '🏨', restaurant: '🍽️', cuisine_centrale: '🏭', autre: '🏢' }[site.type] || '🏢';
    var isOk = pct >= 100 && s.dlcExpired === 0 && s.urgentConsignes === 0;

    h += '<div class="site-overview-card hover-lift animate-in" onclick="switchSite(\'' + site.id + '\');navigate(\'dashboard\');">';
    h += '<div class="site-card-header"><div class="site-card-title">' + typeEmoji + ' ' + esc(site.name) + '</div><div class="site-card-badges">';
    if (isOk) h += '<span class="badge badge-green">✓ OK</span>';
    if (s.dlcExpired > 0) h += '<span class="badge badge-red">' + s.dlcExpired + ' DLC</span>';
    if (s.urgentConsignes > 0) h += '<span class="badge badge-red">' + s.urgentConsignes + ' urg.</span>';
    if (pct < 100) h += '<span class="badge badge-yellow">' + pct + '%</span>';
    h += '</div></div>';
    h += '<div class="mini-stats">';
    h += '<div class="mini-stat' + (pct >= 100 ? ' ok' : pct > 0 ? ' warn' : '') + '"><div class="mini-stat-value">' + s.tempCount + '/' + s.totalExpected + '</div><div class="mini-stat-label">🌡️ Relevés</div></div>';
    h += '<div class="mini-stat' + (s.dlcExpired > 0 ? ' bad' : ' ok') + '"><div class="mini-stat-value">' + (s.dlcExpired + s.dlcWarnings) + '</div><div class="mini-stat-label">📅 DLC</div></div>';
    h += '<div class="mini-stat"><div class="mini-stat-value">' + s.ordersOpen + '</div><div class="mini-stat-label">🛒 Cmd</div></div>';
    h += '<div class="mini-stat' + (s.urgentConsignes > 0 ? ' bad' : ' ok') + '"><div class="mini-stat-value">' + s.urgentConsignes + '</div><div class="mini-stat-label">💬 Urg.</div></div>';
    h += '</div>';
    h += '<div class="v2-mt-10"><div class="progress v2-progress-xs"><div class="progress-bar" style="width:' + Math.min(100, pct) + '%;background:' + (pct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div></div>';
    h += '</div>';
  });

  container.innerHTML = h;
}
