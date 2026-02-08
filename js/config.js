// =====================================================================
// HACCP PRO V1 — CONFIGURATION & STATE
// =====================================================================

// ── CONFIG SUPABASE ──
var SB_URL = 'https://lqwdhbevylmgrrgkdoxn.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2RoYmV2eWxtZ3JyZ2tkb3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODU2MzksImV4cCI6MjA4NTk2MTYzOX0.YjglruiKzMAwlF0xje8zenidlYUXbyeYY4bAziL7FXU';

var sb;
try { sb = supabase.createClient(SB_URL, SB_KEY); } catch(e) { console.error('Supabase init error:', e); }

// ── HELPER DOM ──
function $(id) { return document.getElementById(id); }
function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtD(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR'); } catch(e) { return d; } }
function fmtDT(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('fr-FR'); } catch(e) { return d; } }
function today() { return new Date().toISOString().split('T')[0]; }
function daysUntil(d) { return Math.ceil((new Date(d) - new Date(today())) / 86400000); }

// ── APPLICATION STATE ──
var S = {
  user: null,
  profile: null,
  page: 'dashboard',
  sites: [],
  currentSiteId: null,
  siteConfig: { equipment: [], products: [], suppliers: [], modules: [] },
  data: { temperatures: [], dlcs: [], lots: [], orders: [], consignes: [], incident_reports: [] },
  filter: 'all',
  adminTab: 'users',
  settingsTab: 'equipment',
  notifTab: 'alerts',
  photoDlcData: null,
  photoLotData: null,
  sigData: null,
  sidebarOpen: false,
  loading: true
};

// ── HELPERS ──
function currentSite() {
  return S.sites.find(function(s) { return s.id === S.currentSiteId; }) || null;
}

function isSuperAdmin() { return S.profile && S.profile.role === 'super_admin'; }
function isManager() { return S.profile && (S.profile.role === 'super_admin' || S.profile.role === 'manager'); }
function userName() { return S.profile ? (S.profile.full_name || S.profile.email) : 'Utilisateur'; }
function userInitials() { var n = userName(); return n.split(' ').map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase(); }

function moduleEnabled(key) {
  var m = S.siteConfig.modules.find(function(mod) { return mod.module_key === key; });
  return m ? m.enabled : true;
}
