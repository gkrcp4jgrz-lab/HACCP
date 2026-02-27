// HACCP Pro — Service Worker (Offline + Cache)
var CACHE_NAME = 'haccp-pro-v21';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/data.js',
  '/js/sites.js',
  '/js/ui.js',
  '/js/render.js',
  '/js/bottomnav.js',
  '/js/handlers.js',
  '/js/app.js',
  '/js/pages/dashboard.js',
  '/js/pages/temperatures.js',
  '/js/pages/dlc.js',
  '/js/pages/orders.js',
  '/js/pages/consignes.js',
  '/js/pages/reports.js',
  '/js/pages/settings.js',
  '/js/pages/site-management.js',
  '/js/pages/user-management.js',
  '/js/pages/team.js',
  '/js/pages/profile.js',
  '/js/pages/notifications.js',
  '/js/pages/legal.js',
  '/icon.svg',
  '/manifest.json'
];

// Install — cache all static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Skip non-GET and Supabase API calls (always network)
  if (e.request.method !== 'GET') return;
  if (url.hostname.indexOf('supabase') >= 0) return;
  if (url.hostname.indexOf('googleapis') >= 0 || url.hostname.indexOf('gstatic') >= 0) return;
  if (url.hostname.indexOf('anthropic') >= 0) return;
  if (url.hostname.indexOf('cdn.jsdelivr') >= 0) {
    // Cache CDN libs with stale-while-revalidate
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetched = fetch(e.request).then(function(resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(function() { return cached; });
          return cached || fetched;
        });
      })
    );
    return;
  }

  // Static assets: network-first (ensures updates are visible immediately)
  e.respondWith(
    fetch(e.request).then(function(resp) {
      if (resp.ok && url.origin === self.location.origin) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function() {
      // Offline fallback: serve from cache
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
