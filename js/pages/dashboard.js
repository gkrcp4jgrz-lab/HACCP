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

  // ── CONI SCORE HERO ──
  h += renderConiScoreHero();

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

  if (moduleEnabled('cleaning') && typeof getTodayCleaningSchedules === 'function') {
    var cScheds = getTodayCleaningSchedules();
    var cRecs = S.data.cleaning_logs || [];
    var cCompIds = {};
    cRecs.forEach(function(r) { cCompIds[r.schedule_id] = true; });
    var cDone = cScheds.filter(function(s) { return cCompIds[s.id]; }).length;
    var cOverdue = cScheds.length - cDone;
    var cState = cScheds.length === 0 ? '' : cDone >= cScheds.length ? ' success' : new Date().getHours() >= 14 && cOverdue > 0 ? ' danger' : cOverdue > 0 ? ' warning' : '';
    h += '<div class="stat-card v2-clickable' + cState + '" onclick="navigate(\'cleaning\')">';
    h += '<div class="v2-mb-8"><span class="v2-text-5xl">🧹</span></div>';
    h += '<div class="stat-value">' + cDone + '/' + cScheds.length + '</div><div class="stat-label">Nettoyage</div></div>';
  }

  h += '<div class="stat-card v2-clickable' + (ordersToOrder.length > 0 ? ' warning' : ' success') + '" onclick="navigate(\'orders\')">';
  h += '<div class="v2-mb-8"><span class="v2-text-5xl">🛒</span></div>';
  h += '<div class="stat-value">' + ordersToOrder.length + '</div><div class="stat-label">À commander</div></div>';

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
    var cleanRecs = S.data.cleaning_logs || [];
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
      h += '<div class="v2-mt-8"><div class="progress v2-progress-sm"><div class="progress-bar" style="width:' + cleanPct + '%;background:' + (cleanPct >= 100 ? 'var(--success)' : 'var(--primary)') + '"></div></div>';
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
  var siteIds = S.sites.map(function(s) { return s.id; });

  try {
    // 1 query au lieu de 6*N : charger tous les summaries du jour
    var results = await Promise.all([
      sb.from('daily_site_summary').select('*').in('site_id', siteIds).eq('summary_date', todayStr),
      sb.from('consignes').select('*').in('site_id', siteIds).eq('priority', 'urgent').eq('is_read', false)
    ]);

    var summaries = results[0].data || [];
    var urgentConsignes = results[1].data || [];
    var summaryBySite = {};
    summaries.forEach(function(s) { summaryBySite[s.site_id] = s; });
    var urgentBySite = {};
    urgentConsignes.forEach(function(c) {
      if (!urgentBySite[c.site_id]) urgentBySite[c.site_id] = [];
      urgentBySite[c.site_id].push(c);
    });

    var stats = S.sites.map(function(site) {
      var sum = summaryBySite[site.id];
      var urgList = urgentBySite[site.id] || [];
      urgList.forEach(function(c) { c._siteName = site.name; });

      if (sum) {
        return {
          site: site,
          coniScore: Math.round(sum.coni_score || 0),
          scoreBreakdown: sum.score_breakdown || {},
          tempCount: sum.temp_recorded || 0,
          totalExpected: sum.temp_expected || 0,
          dlcWarnings: sum.dlc_warning || 0,
          dlcExpired: sum.dlc_expired || 0,
          ordersOpen: sum.orders_pending || 0,
          urgentConsignes: urgList.length,
          urgentConsignesList: urgList,
          incidentsOpen: sum.incidents_open || 0
        };
      }
      return {
        site: site, coniScore: null, scoreBreakdown: {},
        tempCount: 0, totalExpected: 0, dlcWarnings: 0, dlcExpired: 0,
        ordersOpen: 0, urgentConsignes: urgList.length, urgentConsignesList: urgList,
        incidentsOpen: 0
      };
    });

    _multiSiteCache = stats;
    _multiSiteCacheTime = now;
    return stats;
  } catch (e) {
    console.error('Multi-site stats error:', e);
    return S.sites.map(function(site) {
      return { site: site, coniScore: null, scoreBreakdown: {}, tempCount: 0, totalExpected: 0, dlcWarnings: 0, dlcExpired: 0, ordersOpen: 0, urgentConsignes: 0, urgentConsignesList: [], incidentsOpen: 0 };
    });
  }
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
  h += '<div class="v2-flex v2-gap-8">';
  h += '<button class="v2-greeting-select" onclick="toggleBenchmarkView();">📊 Benchmark</button>';
  h += '<button class="v2-greeting-select" onclick="_multiSiteCache=null;loadAndRenderMultiDashboard();">↻ Actualiser</button>';
  h += '</div>';
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

  var totalTemp = 0, totalExpected = 0, totalDlcExp = 0, totalUrgent = 0;
  var allUrgentConsignes = [];
  var scoredSites = 0, scoreSum = 0;

  stats.forEach(function(s) {
    totalTemp += s.tempCount;
    totalExpected += s.totalExpected;
    totalDlcExp += s.dlcExpired;
    totalUrgent += s.urgentConsignes;
    if (s.coniScore !== null) { scoredSites++; scoreSum += s.coniScore; }
    if (s.urgentConsignesList) {
      s.urgentConsignesList.forEach(function(c) { allUrgentConsignes.push(c); });
    }
  });

  var globalScore = scoredSites > 0 ? Math.round(scoreSum / scoredSites) : null;
  var globalGrade = globalScore !== null ? (globalScore >= 90 ? 'A' : globalScore >= 75 ? 'B' : globalScore >= 60 ? 'C' : globalScore >= 40 ? 'D' : 'F') : '-';
  var globalColor = globalScore !== null ? (globalScore >= 80 ? 'var(--ok,#16a34a)' : globalScore >= 60 ? '#f59e0b' : 'var(--err,#dc2626)') : 'var(--muted)';

  // CONI Score Global Hero
  if (globalScore !== null) {
    var radius = 44, circ = 2 * Math.PI * radius, off = circ - (globalScore / 100) * circ;
    h += '<div class="card" style="overflow:hidden;margin-bottom:18px"><div style="display:flex;align-items:center;gap:20px;padding:20px">';
    h += '<div style="flex-shrink:0;position:relative;width:108px;height:108px">';
    h += '<svg viewBox="0 0 108 108" width="108" height="108"><circle cx="54" cy="54" r="' + radius + '" fill="none" stroke="var(--border)" stroke-width="8"/>';
    h += '<circle cx="54" cy="54" r="' + radius + '" fill="none" stroke="' + globalColor + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '" transform="rotate(-90 54 54)" style="transition:stroke-dashoffset 1s ease"/></svg>';
    h += '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">';
    h += '<div style="font-size:28px;font-weight:800;color:' + globalColor + ';line-height:1">' + globalScore + '</div>';
    h += '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Global</div>';
    h += '</div></div>';
    h += '<div style="flex:1"><div style="font-size:20px;font-weight:800;color:' + globalColor + ';margin-bottom:6px">Grade ' + globalGrade + '</div>';
    h += '<div style="font-size:13px;color:var(--muted)">Score moyen sur ' + scoredSites + ' site' + (scoredSites > 1 ? 's' : '') + '</div>';
    h += '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + S.sites.length + ' sites · ' + fmtD(today()) + '</div>';
    h += '</div></div></div>';
  } else {
    h += '<div class="card" style="margin-bottom:18px"><div class="card-body" style="text-align:center;padding:24px">';
    h += '<div style="font-size:14px;color:var(--muted);margin-bottom:12px">CONI Score non encore calcule</div>';
    h += '<button class="btn btn-primary" onclick="S.sites.forEach(function(s){sb.rpc(\'compute_daily_summary\',{p_site_id:s.id,p_date:today()}).catch(function(){})});_multiSiteCache=null;setTimeout(function(){loadAndRenderMultiDashboard()},2000)">Calculer les scores</button>';
    h += '</div></div>';
  }

  // Alerts
  if (totalUrgent > 0 || totalDlcExp > 0) {
    h += '<div class="card v2-card--danger-left v2-mb-18">';
    h += '<div class="card-header v2-card-header--danger">🚨 Alertes <span class="badge badge-red v2-badge-lg v2-ml-auto">' + (totalUrgent + totalDlcExp) + '</span></div>';
    h += '<div class="card-body v2-p-0">';
    allUrgentConsignes.forEach(function(c) {
      h += '<div class="list-item"><div class="list-icon v2-list-icon--danger">💬</div><div class="list-content"><div class="list-title v2-text-danger">' + esc(c.message.substring(0, 80)) + '</div><div class="list-sub">📍 ' + esc(c._siteName || '') + '</div></div>';
      h += '<div class="list-actions"><button class="btn btn-success btn-sm" onclick="event.stopPropagation();markConsigneRead(\'' + c.id + '\');_multiSiteCache=null;">✓</button></div></div>';
    });
    if (totalDlcExp > 0) {
      h += '<div class="list-item"><div class="list-icon v2-list-icon--danger">📅</div><div class="list-content"><div class="list-title v2-text-danger">' + totalDlcExp + ' DLC expiree(s)</div></div>';
      h += '<div class="list-actions"><button class="btn btn-ghost btn-sm" onclick="navigate(\'dlc\')">Voir</button></div></div>';
    }
    h += '</div></div>';
  }

  // Classement sites par CONI Score (pire en premier)
  var sorted = stats.slice().sort(function(a, b) { return (a.coniScore || 0) - (b.coniScore || 0); });

  h += '<div class="v2-flex v2-justify-between v2-items-center v2-mb-14"><h3 class="v2-section-heading">Classement par site</h3></div>';

  sorted.forEach(function(s) {
    var site = s.site;
    var score = s.coniScore;
    var typeEmoji = { hotel: '🏨', restaurant: '🍽️', cuisine_centrale: '🏭', autre: '🏢' }[site.type] || '🏢';
    var scoreColor = score === null ? 'var(--muted)' : score >= 80 ? 'var(--ok,#16a34a)' : score >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';
    var grade = score === null ? '-' : score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

    h += '<div class="site-overview-card hover-lift animate-in" onclick="switchSite(\'' + site.id + '\');navigate(\'dashboard\');" style="border-left:4px solid ' + scoreColor + '">';
    h += '<div class="site-card-header"><div class="site-card-title">' + typeEmoji + ' ' + esc(site.name) + '</div><div class="site-card-badges">';
    if (score !== null) {
      h += '<span style="font-size:20px;font-weight:800;color:' + scoreColor + '">' + score + '</span>';
      h += '<span style="font-size:12px;font-weight:700;color:' + scoreColor + ';margin-left:4px">' + grade + '</span>';
    } else {
      h += '<span class="badge badge-gray">--</span>';
    }
    h += '</div></div>';
    h += '<div class="mini-stats">';
    h += '<div class="mini-stat' + (s.tempCount >= s.totalExpected && s.totalExpected > 0 ? ' ok' : s.tempCount > 0 ? ' warn' : '') + '"><div class="mini-stat-value">' + s.tempCount + '/' + s.totalExpected + '</div><div class="mini-stat-label">🌡️ Releves</div></div>';
    h += '<div class="mini-stat' + (s.dlcExpired > 0 ? ' bad' : ' ok') + '"><div class="mini-stat-value">' + (s.dlcExpired + s.dlcWarnings) + '</div><div class="mini-stat-label">📅 DLC</div></div>';
    h += '<div class="mini-stat"><div class="mini-stat-value">' + s.ordersOpen + '</div><div class="mini-stat-label">🛒 Cmd</div></div>';
    h += '<div class="mini-stat' + (s.urgentConsignes > 0 ? ' bad' : ' ok') + '"><div class="mini-stat-value">' + s.urgentConsignes + '</div><div class="mini-stat-label">💬 Urg.</div></div>';
    h += '</div>';
    // Score bar
    if (score !== null) {
      h += '<div style="margin-top:10px"><div class="progress v2-progress-xs" style="overflow:hidden"><div class="progress-bar" style="width:' + score + '%;background:' + scoreColor + '"></div></div></div>';
    }
    h += '</div>';
  });

  container.innerHTML = h;

  // Trigger CONI Score refresh for all sites in background
  S.sites.forEach(function(site) {
    sb.rpc('compute_daily_summary', { p_site_id: site.id, p_date: today() }).catch(function(){});
  });
}

// =====================================================================
// 5A — BENCHMARKING INTER-SITES
// =====================================================================

window.toggleBenchmarkView = function() {
  S._benchmarkOpen = !S._benchmarkOpen;
  var container = $('multiDashContainer');
  if (!container) return;
  if (S._benchmarkOpen) {
    loadAndRenderBenchmark();
  } else {
    _multiSiteCache = null;
    loadAndRenderMultiDashboard();
  }
};

async function loadAndRenderBenchmark() {
  var container = $('multiDashContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px"><div class="loading"></div><div style="margin-top:12px;color:var(--muted);font-size:13px">Chargement du benchmark...</div></div>';

  var siteIds = S.sites.map(function(s) { return s.id; });
  var data = await loadBenchmarkData(siteIds, 30);

  // Aggregate by site
  var bySite = {};
  siteIds.forEach(function(sid) { bySite[sid] = []; });
  data.forEach(function(d) {
    if (bySite[d.site_id]) bySite[d.site_id].push(d);
  });

  var siteStats = S.sites.map(function(site) {
    var entries = bySite[site.id] || [];
    if (entries.length === 0) return { site: site, avg: null, trend: 0, weekAvg: null, breakdown: {}, weakest: null, count: 0 };

    var total = 0;
    entries.forEach(function(e) { total += (e.coni_score || 0); });
    var avg = Math.round(total / entries.length);

    // Last 7 days vs previous 7 days
    var now = new Date();
    var d7 = new Date(); d7.setDate(d7.getDate() - 7);
    var d14 = new Date(); d14.setDate(d14.getDate() - 14);
    var recent = entries.filter(function(e) { return new Date(e.summary_date) >= d7; });
    var prev = entries.filter(function(e) { var d = new Date(e.summary_date); return d >= d14 && d < d7; });
    var recentAvg = recent.length > 0 ? recent.reduce(function(s, e) { return s + (e.coni_score || 0); }, 0) / recent.length : null;
    var prevAvg = prev.length > 0 ? prev.reduce(function(s, e) { return s + (e.coni_score || 0); }, 0) / prev.length : null;
    var trend = (recentAvg !== null && prevAvg !== null) ? Math.round(recentAvg - prevAvg) : 0;

    // Average breakdown over 30 days
    var bk = { temp_pct: 0, temp_completion: 0, dlc_pct: 0, cleaning_pct: 0, incident_penalty: 0 };
    var bkCount = 0;
    entries.forEach(function(e) {
      if (e.score_breakdown) {
        bk.temp_pct += (e.score_breakdown.temp_pct || 0);
        bk.temp_completion += (e.score_breakdown.temp_completion || 0);
        bk.dlc_pct += (e.score_breakdown.dlc_pct || 0);
        bk.cleaning_pct += (e.score_breakdown.cleaning_pct || 0);
        bk.incident_penalty += (e.score_breakdown.incident_penalty || 0);
        bkCount++;
      }
    });
    if (bkCount > 0) {
      Object.keys(bk).forEach(function(k) { bk[k] = Math.round(bk[k] / bkCount); });
    }

    // Find weakest dimension
    var dims = [
      { key: 'temp_pct', label: 'Temperatures' },
      { key: 'temp_completion', label: 'Completude' },
      { key: 'dlc_pct', label: 'DLC' },
      { key: 'cleaning_pct', label: 'Nettoyage' }
    ];
    var weakest = null;
    var weakVal = 101;
    dims.forEach(function(d) {
      if (bk[d.key] < weakVal) { weakVal = bk[d.key]; weakest = d.label; }
    });

    return { site: site, avg: avg, trend: trend, weekAvg: recentAvg !== null ? Math.round(recentAvg) : null, breakdown: bk, weakest: weakest, count: entries.length };
  });

  // Sort by avg score ascending (worst first)
  siteStats.sort(function(a, b) { return (a.avg || 0) - (b.avg || 0); });

  var h = '';

  // Header
  h += '<div class="v2-flex v2-justify-between v2-items-center v2-mb-14">';
  h += '<h3 class="v2-section-heading">Benchmark 30 jours</h3>';
  h += '<button class="btn btn-ghost btn-sm" onclick="toggleBenchmarkView()">Retour classement</button>';
  h += '</div>';

  // Comparative chart
  h += '<div class="card" style="margin-bottom:18px"><div class="card-header">Comparaison des scores moyens</div><div class="card-body">';
  siteStats.forEach(function(s) {
    var score = s.avg;
    var color = score === null ? 'var(--muted)' : score >= 80 ? 'var(--ok,#16a34a)' : score >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';
    var trendArrow = s.trend > 0 ? '<span style="color:var(--ok,#16a34a);font-weight:700;margin-left:6px">+' + s.trend + ' pts</span>' : s.trend < 0 ? '<span style="color:var(--err,#dc2626);font-weight:700;margin-left:6px">' + s.trend + ' pts</span>' : '';
    h += '<div style="margin-bottom:12px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    h += '<span style="font-size:13px;font-weight:600">' + esc(s.site.name) + '</span>';
    h += '<span style="font-size:14px;font-weight:800;color:' + color + '">' + (score !== null ? score : '--') + trendArrow + '</span>';
    h += '</div>';
    h += '<div style="height:10px;background:var(--border);border-radius:5px;overflow:hidden">';
    h += '<div style="width:' + (score || 0) + '%;height:100%;background:' + color + ';border-radius:5px;transition:width 0.6s ease"></div>';
    h += '</div></div>';
  });
  h += '</div></div>';

  // Breakdown comparison table
  h += '<div class="card" style="margin-bottom:18px"><div class="card-header">Detail par dimension (%)</div><div class="card-body" style="overflow-x:auto">';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<thead><tr style="border-bottom:2px solid var(--border)">';
  h += '<th style="text-align:left;padding:8px 10px;font-size:11px;color:var(--muted)">Site</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">Temp</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">Complet.</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">DLC</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">Nettoy.</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">Incidents</th>';
  h += '<th style="text-align:center;padding:8px 6px;font-size:11px">Faiblesse</th>';
  h += '</tr></thead><tbody>';

  siteStats.forEach(function(s) {
    var bk = s.breakdown;
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:8px 10px;font-weight:600">' + esc(s.site.name) + '</td>';
    var dims = ['temp_pct', 'temp_completion', 'dlc_pct', 'cleaning_pct'];
    dims.forEach(function(k) {
      var v = bk[k] || 0;
      var c = v >= 80 ? 'var(--ok,#16a34a)' : v >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';
      h += '<td style="text-align:center;padding:8px 6px;font-weight:700;color:' + c + '">' + v + '</td>';
    });
    var pen = bk.incident_penalty || 0;
    h += '<td style="text-align:center;padding:8px 6px;font-weight:700;color:' + (pen > 5 ? 'var(--err,#dc2626)' : pen > 0 ? '#f59e0b' : 'var(--ok,#16a34a)') + '">-' + pen + '</td>';
    h += '<td style="text-align:center;padding:8px 6px;font-size:11px;color:var(--err,#dc2626);font-weight:600">' + (s.weakest || '--') + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';

  // Trend sparklines per site
  h += '<div class="card"><div class="card-header">Evolution 30 jours</div><div class="card-body">';
  siteStats.forEach(function(s) {
    var entries = (bySite[s.site.id] || []).sort(function(a, b) { return a.summary_date < b.summary_date ? -1 : 1; });
    if (entries.length < 2) {
      h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">' + esc(s.site.name) + '</div><div style="font-size:11px;color:var(--muted)">Pas assez de donnees</div></div>';
      return;
    }
    h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">' + esc(s.site.name) + '</div>';
    h += renderSparkline(entries, 260, 40);
    h += '</div>';
  });
  h += '</div></div>';

  container.innerHTML = h;
}

// =====================================================================
// CONI SCORE
// =====================================================================

function renderConiScoreHero() {
  var summary = S.data.dailySummary;
  var h = '';

  h += '<div class="card coni-hero-card">';
  h += '<div class="coni-hero-layout">';

  if (!summary || summary.coni_score === undefined || summary.coni_score === null) {
    // Pas encore de score ou pas de donnees
    h += '<div style="flex:1;text-align:center;padding:16px 0">';
    var hasData = summary && summary.temp_expected > 0;
    h += '<div style="font-size:14px;color:var(--muted);margin-bottom:12px">' + (hasData ? 'Score CONI non encore calcule pour aujourd\'hui' : 'Aucune donnee — configurez vos equipements et effectuez des releves') + '</div>';
    h += '<button class="btn btn-primary" onclick="refreshDailySummary().then(function(){loadSiteData().then(render)})">Calculer le CONI Score</button>';
    h += '</div></div></div>';
    return h;
  }

  var score = Math.round(summary.coni_score);
  var grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  var color = score >= 80 ? 'var(--ok,#16a34a)' : score >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';
  var breakdown = summary.score_breakdown || {};

  // Cercle SVG
  var radius = 44;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (score / 100) * circumference;

  h += '<div class="coni-hero-circle">';
  h += '<svg viewBox="0 0 108 108" width="108" height="108">';
  h += '<circle cx="54" cy="54" r="' + radius + '" fill="none" stroke="var(--border)" stroke-width="8"/>';
  h += '<circle cx="54" cy="54" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 54 54)" style="transition:stroke-dashoffset 1s ease"/>';
  h += '</svg>';
  h += '<div class="coni-hero-score">';
  h += '<div style="font-size:28px;font-weight:800;color:' + color + ';line-height:1">' + score + '</div>';
  h += '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Score</div>';
  h += '</div></div>';

  // Breakdown
  h += '<div class="coni-hero-breakdown">';
  h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
  h += '<span style="font-size:20px;font-weight:800;color:' + color + '">Grade ' + grade + '</span>';
  h += '<span style="font-size:12px;color:var(--muted);font-weight:500">CONI Score</span>';
  h += '</div>';

  var dimensions = [
    { label: 'Temp.', key: 'temp_pct', weight: '20%' },
    { label: 'Complet.', key: 'temp_completion', weight: '20%' },
    { label: 'DLC', key: 'dlc_pct', weight: '25%' },
    { label: 'Nettoy.', key: 'cleaning_pct', weight: '20%' }
  ];

  dimensions.forEach(function(dim) {
    var val = Math.round(breakdown[dim.key] || 0);
    var barColor = val >= 80 ? 'var(--ok,#16a34a)' : val >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';
    h += '<div class="coni-bar-row">';
    h += '<span class="coni-bar-label">' + dim.label + '</span>';
    h += '<div class="coni-bar-track"><div class="coni-bar-fill" style="width:' + val + '%;background:' + barColor + '"></div></div>';
    h += '<span class="coni-bar-value" style="color:' + barColor + '">' + val + '%</span>';
    h += '</div>';
  });

  // Incident penalty
  var penalty = breakdown.incident_penalty || 0;
  if (penalty > 0) {
    h += '<div style="font-size:11px;color:var(--err);margin-top:4px;font-weight:600">' + IC.alertTriangle + ' Malus incidents : -' + penalty + ' pts</div>';
  }

  h += '</div></div>';

  // Sparkline container (loaded async)
  h += '<div id="coniSparklineContainer" style="padding:0 20px 16px"></div>';

  h += '</div>';

  // Load sparkline data async
  setTimeout(function() { loadAndRenderSparkline(); }, 100);

  return h;
}

// ── SPARKLINE 7 JOURS ──

async function loadAndRenderSparkline() {
  var container = document.getElementById('coniSparklineContainer');
  if (!container || !S.currentSiteId) return;

  var data = await loadScoreTrend(S.currentSiteId, 7);
  if (!data || data.length < 2) {
    container.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center">Tendance disponible apres 2 jours de donnees</div>';
    return;
  }

  container.innerHTML = renderSparkline(data, 280, 50);
}

function renderSparkline(dataPoints, width, height) {
  var padding = 4;
  var w = width - padding * 2;
  var h = height - padding * 2;

  var scores = dataPoints.map(function(d) { return d.coni_score || 0; });
  var minS = Math.max(0, Math.min.apply(null, scores) - 10);
  var maxS = Math.min(100, Math.max.apply(null, scores) + 10);
  var range = maxS - minS || 1;

  var points = dataPoints.map(function(d, i) {
    var x = padding + (i / (dataPoints.length - 1)) * w;
    var y = padding + h - ((d.coni_score - minS) / range) * h;
    return { x: x, y: y, score: Math.round(d.coni_score), date: d.summary_date };
  });

  var polyline = points.map(function(p) { return p.x + ',' + p.y; }).join(' ');
  var areaPoints = polyline + ' ' + points[points.length - 1].x + ',' + (height - padding) + ' ' + points[0].x + ',' + (height - padding);

  var lastScore = points[points.length - 1].score;
  var firstScore = points[0].score;
  var diff = lastScore - firstScore;
  var trendColor = diff >= 0 ? 'var(--ok,#16a34a)' : 'var(--err,#dc2626)';
  var lineColor = lastScore >= 80 ? 'var(--ok,#16a34a)' : lastScore >= 60 ? '#f59e0b' : 'var(--err,#dc2626)';

  var svg = '<div style="display:flex;align-items:center;gap:12px">';
  svg += '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '" style="flex:1;max-width:' + width + 'px">';
  // Zone 80+ (vert)
  var y80 = padding + h - ((80 - minS) / range) * h;
  svg += '<rect x="' + padding + '" y="' + padding + '" width="' + w + '" height="' + Math.max(0, y80 - padding) + '" fill="var(--ok,#16a34a)" opacity="0.04"/>';
  // Area fill
  svg += '<polygon points="' + areaPoints + '" fill="' + lineColor + '" opacity="0.08"/>';
  // Line
  svg += '<polyline points="' + polyline + '" fill="none" stroke="' + lineColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  // Dots
  points.forEach(function(p) {
    svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="' + lineColor + '" stroke="white" stroke-width="1.5"/>';
  });
  svg += '</svg>';
  // Trend indicator
  svg += '<div style="text-align:center;flex-shrink:0">';
  svg += '<div style="font-size:16px;font-weight:800;color:' + trendColor + '">' + (diff >= 0 ? '+' : '') + diff + '</div>';
  svg += '<div style="font-size:10px;color:var(--muted);font-weight:600">7 jours</div>';
  svg += '</div></div>';

  return svg;
}
