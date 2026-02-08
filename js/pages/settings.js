function renderSettings() {
  if (!isManager()) {
    return '<div class="card"><div class="card-body"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Accès restreint</div></div></div></div>';
  }

  var h = '';
  h += '<div class="tabs">';
  ['equipment','products','suppliers','modules'].forEach(function(t) {
    var labels = {equipment:'❄️ Équipements',products:'🍽️ Produits',suppliers:'🏭 Fournisseurs',modules:'📦 Modules'};
    h += '<button class="tab' + (S.settingsTab===t?' active':'') + '" onclick="S.settingsTab=\'' + t + '\';render()">' + labels[t] + '</button>';
  });
  h += '</div>';

  if (S.settingsTab === 'equipment') h += renderSettingsEquipment();
  else if (S.settingsTab === 'products') h += renderSettingsProducts();
  else if (S.settingsTab === 'suppliers') h += renderSettingsSuppliers();
  else if (S.settingsTab === 'modules') h += renderSettingsModules();

  return h;
}

function renderSettingsEquipment() {
  var h = '<div class="card"><div class="card-header">➕ Ajouter un équipement</div><div class="card-body"><form onsubmit="handleAddEquip(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="eqName" required placeholder="Ex: Frigo cuisine"></div>';
  h += '<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="eqType"><option value="fridge">Frigo</option><option value="freezer">Congélateur</option><option value="hot">Chaud</option><option value="other">Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Temp. min °C</label><input type="number" step="0.1" class="form-input" id="eqMin" value="0"></div>';
  h += '<div class="form-group"><label class="form-label">Temp. max °C</label><input type="number" step="0.1" class="form-input" id="eqMax" value="4"></div></div>';
  h += '<div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" id="eqEmoji" value="❄️" maxlength="4"></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header">Équipements actifs</div>';
  S.siteConfig.equipment.forEach(function(e) {
    h += '<div class="list-item"><div class="list-icon" style="background:var(--primary-light)">' + e.emoji + '</div><div class="list-content"><div class="list-title">' + esc(e.name) + '</div><div class="list-sub">' + e.temp_min + '°C → ' + e.temp_max + '°C · ' + ({fridge:'Frigo',freezer:'Congélateur',hot:'Chaud',other:'Autre'}[e.type] || e.type) + '</div></div><div class="list-actions"><button class="btn btn-danger btn-sm" onclick="deleteEquipment(\'' + e.id + '\')">🗑️</button></div></div>';
  });
  if (S.siteConfig.equipment.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun équipement</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsProducts() {
  var h = '<div class="card"><div class="card-header">➕ Ajouter un produit</div><div class="card-body"><form onsubmit="handleAddProd(event)">';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="prName" required placeholder="Ex: Saumon frais"></div>';
  h += '<div class="form-group"><label class="form-label">Catégorie</label><select class="form-select" id="prCat"><option value="frigo">Frigo</option><option value="congel">Congélateur</option><option value="chaud">Chaud</option><option value="autre">Autre</option></select></div></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Temp. min °C</label><input type="number" step="0.1" class="form-input" id="prMin" value="0"></div>';
  h += '<div class="form-group"><label class="form-label">Temp. max °C</label><input type="number" step="0.1" class="form-input" id="prMax" value="4"></div></div>';
  h += '<div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" id="prEmoji" value="📦" maxlength="4"></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header">Produits actifs</div>';
  S.siteConfig.products.forEach(function(p) {
    h += '<div class="list-item"><div class="list-icon" style="background:var(--success-bg)">' + p.emoji + '</div><div class="list-content"><div class="list-title">' + esc(p.name) + '</div><div class="list-sub">' + p.temp_min + '°C → ' + p.temp_max + '°C · ' + ({frigo:'Frigo',congel:'Congélateur',chaud:'Chaud',autre:'Autre'}[p.category] || p.category) + '</div></div><div class="list-actions"><button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + p.id + '\')">🗑️</button></div></div>';
  });
  if (S.siteConfig.products.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun produit</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsSuppliers() {
  var h = '<div class="card"><div class="card-header">➕ Ajouter un fournisseur</div><div class="card-body"><form onsubmit="handleAddSupp(event)">';
  h += '<div class="form-group"><label class="form-label">Nom <span class="req">*</span></label><input type="text" class="form-input" id="spName" required placeholder="Ex: Brake France"></div>';
  h += '<div class="form-row"><div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" id="spPhone" placeholder="0612345678"></div>';
  h += '<div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="spEmail" placeholder="contact@four.com"></div></div>';
  h += '<button type="submit" class="btn btn-primary">✓ Ajouter</button></form></div></div>';

  h += '<div class="card"><div class="card-header">Fournisseurs actifs</div>';
  S.siteConfig.suppliers.forEach(function(s) {
    h += '<div class="list-item"><div class="list-icon" style="background:var(--warning-bg)">🏭</div><div class="list-content"><div class="list-title">' + esc(s.name) + '</div><div class="list-sub">' + (s.phone ? '📞 ' + esc(s.phone) + ' ' : '') + (s.email ? '✉️ ' + esc(s.email) : '') + '</div></div><div class="list-actions"><button class="btn btn-danger btn-sm" onclick="deleteSupplier(\'' + s.id + '\')">🗑️</button></div></div>';
  });
  if (S.siteConfig.suppliers.length === 0) h += '<div class="card-body"><div class="empty"><div class="empty-title">Aucun fournisseur</div></div></div>';
  h += '</div>';
  return h;
}

function renderSettingsModules() {
  var modules = [
    {key:'temperatures',label:'🌡️ Températures',desc:'Relevés de température des équipements et produits'},
    {key:'dlc',label:'📅 Contrôle DLC',desc:'Suivi des dates limites de consommation'},
    {key:'lots',label:'📦 Traçabilité',desc:'Enregistrement des numéros de lots'},
    {key:'orders',label:'🛒 Commandes',desc:'Gestion des commandes fournisseurs'},
    {key:'consignes',label:'💬 Consignes',desc:'Communication inter-équipes'},
    {key:'viennoiseries',label:'🥐 Viennoiseries',desc:'Calculateur petit-déjeuner'}
  ];

  var h = '<div class="card"><div class="card-header">📦 Modules actifs pour ce site</div><div class="card-body">';
  modules.forEach(function(m) {
    var enabled = moduleEnabled(m.key);
    h += '<div class="list-item"><div class="list-content"><div class="list-title">' + m.label + '</div><div class="list-sub">' + m.desc + '</div></div>';
    h += '<label class="toggle"><input type="checkbox" ' + (enabled?'checked':'') + ' onchange="toggleModule(\'' + m.key + '\',this.checked)"><span class="toggle-slider"></span></label></div>';
  });
  h += '</div></div>';

  // Config température
  if (moduleEnabled('temperatures')) {
    var site = currentSite();
    var servicesPerDay = (site && site.services_per_day) || 1;
    h += '<div class="card"><div class="card-header">🌡️ Configuration températures</div><div class="card-body">';
    h += '<div class="form-group"><label class="form-label">Nombre de services par jour</label>';
    h += '<div style="display:flex;align-items:center;gap:12px">';
    h += '<select class="form-select" style="width:200px" onchange="updateSiteConfig(\'services_per_day\',parseInt(this.value))">';
    for (var i = 1; i <= 4; i++) {
      h += '<option value="' + i + '"' + (servicesPerDay===i?' selected':'') + '>' + i + ' service' + (i>1?'s':'') + ' / jour</option>';
    }
    h += '</select>';
    h += '<span style="font-size:13px;color:var(--gray)">Chaque service nécessite un relevé complet de tous les équipements et produits</span>';
    h += '</div></div>';
    h += '</div></div>';
  }

  return h;
}
