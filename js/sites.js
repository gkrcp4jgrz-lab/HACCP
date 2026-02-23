// =====================================================================
// SITE MANAGEMENT
// =====================================================================

async function createSite(name, type, address, city, phone, email, agrement, responsable) {
  var r = await sb.rpc('create_site_with_defaults', { p_name: name, p_address: address || '', p_type: type || 'hotel' });
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  var siteId = r.data;
  await sb.from('sites').update({ city:city||'', phone:phone||'', email:email||'', agrement:agrement||'', responsable:responsable||'' }).eq('id', siteId);
  await loadSites();
  S.currentSiteId = siteId;
  await loadSiteConfig(); await loadSiteData(); render();
  showToast('Site créé avec succès', 'success');
}

async function updateSite(siteId, data) {
  await sb.from('sites').update(data).eq('id', siteId);
  await loadSites(); render();
}

window.updateSiteConfig = async function(key, value) {
  if (!S.currentSiteId) return;
  var data = {};
  data[key] = value;
  await sb.from('sites').update(data).eq('id', S.currentSiteId);
  var site = S.sites.find(function(s){return s.id===S.currentSiteId;});
  if (site) site[key] = value;
  render();
};

async function deleteSite(siteId) {
  if (!(await appConfirm('Supprimer le site', 'ATTENTION : Supprimer ce site supprimera <strong>TOUTES</strong> ses données définitivement.', {danger:true,icon:'🗑️',confirmLabel:'Supprimer le site'}))) return;
  if (!(await appConfirm('Confirmation finale', 'Êtes-vous vraiment sûr ? Cette action est irréversible.', {danger:true,icon:'⚠️',confirmLabel:'Oui, supprimer'}))) return;
  await sb.from('sites').delete().eq('id', siteId);
  await loadSites();
  if (S.currentSiteId === siteId) {
    S.currentSiteId = S.sites.length > 0 ? S.sites[0].id : null;
    if (S.currentSiteId) { await loadSiteConfig(); await loadSiteData(); }
  }
  render();
}

// ── EQUIPMENT / PRODUCTS / SUPPLIERS ──

async function addEquipment(name, type, tempMin, tempMax, emoji) {
  var maxSort = S.siteConfig.equipment.reduce(function(m,e){return Math.max(m,e.sort_order||0);},0);
  var r = await sb.from('site_equipment').insert({ site_id:S.currentSiteId, name:name, type:type, temp_min:tempMin, temp_max:tempMax, emoji:emoji||'❄️', sort_order:maxSort+1 });
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Équipement ajouté', 'success');
  await loadSiteConfig(); render();
}

async function updateEquipment(id, data) {
  await sb.from('site_equipment').update(data).eq('id', id);
  await loadSiteConfig(); render();
}

async function deleteEquipment(id) {
  if (!(await appConfirm('Désactiver', 'Désactiver cet équipement ?', {danger:true,icon:'❄️',confirmLabel:'Désactiver'}))) return;
  await sb.from('site_equipment').update({active:false}).eq('id', id);
  showToast('Équipement désactivé', 'success');
  await loadSiteConfig(); render();
}

async function addProduct(name, category, tempMin, tempMax, emoji) {
  var maxSort = S.siteConfig.products.reduce(function(m,p){return Math.max(m,p.sort_order||0);},0);
  var r = await sb.from('site_products').insert({ site_id:S.currentSiteId, name:name, category:category, temp_min:tempMin, temp_max:tempMax, emoji:emoji||'📦', sort_order:maxSort+1 });
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Produit ajouté', 'success');
  await loadSiteConfig(); render();
}

async function deleteProduct(id) {
  if (!(await appConfirm('Désactiver', 'Désactiver ce produit ?', {danger:true,icon:'🍽️',confirmLabel:'Désactiver'}))) return;
  await sb.from('site_products').update({active:false}).eq('id', id);
  showToast('Produit désactivé', 'success');
  await loadSiteConfig(); render();
}

async function addSupplier(name, phone, email) {
  var r = await sb.from('site_suppliers').insert({ site_id:S.currentSiteId, name:name, phone:phone||'', email:email||'' });
  if (r.error) { showToast('Erreur: ' + r.error.message, 'error'); return; }
  showToast('Fournisseur ajouté', 'success');
  await loadSiteConfig(); render();
}

async function deleteSupplier(id) {
  if (!(await appConfirm('Désactiver', 'Désactiver ce fournisseur ?', {danger:true,icon:'🏭',confirmLabel:'Désactiver'}))) return;
  await sb.from('site_suppliers').update({active:false}).eq('id', id);
  showToast('Fournisseur désactivé', 'success');
  await loadSiteConfig(); render();
}

// ── MODULES ──

async function toggleModule(moduleKey, enabled) {
  var existing = S.siteConfig.modules.find(function(m){return m.module_key===moduleKey;});
  if (existing) {
    await sb.from('site_modules').update({enabled:enabled}).eq('id', existing.id);
  } else {
    await sb.from('site_modules').insert({site_id:S.currentSiteId, module_key:moduleKey, enabled:enabled});
  }
  await loadSiteConfig(); render();
}

// ── USER MANAGEMENT ──

async function loadAllUsers() {
  var r = await sb.from('profiles').select('*').order('created_at');
  return r.data || [];
}

async function loadSiteUsers(siteId) {
  var r = await sb.from('user_sites').select('*, profiles(*)').eq('site_id', siteId);
  return r.data || [];
}

async function assignUserToSite(userId, siteId, siteRole) {
  var r = await sb.rpc('admin_assign_user_to_site', { p_user_id: userId, p_site_id: siteId, p_site_role: siteRole });
  if (r.error) throw r.error;
}

async function removeUserFromSite(userId, siteId) {
  var r = await sb.from('user_sites').delete().match({ user_id: userId, site_id: siteId });
  if (r.error) throw r.error;
}

async function updateUserRole(userId, newRole) {
  var r = await sb.rpc('admin_set_user_role', { p_target_user_id: userId, p_new_role: newRole });
  if (r.error) throw r.error;
}
