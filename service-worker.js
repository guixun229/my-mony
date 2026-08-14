const CACHE_NAME = 'facai-v2.0.0';
const ASSETS = [
  './',
  './facai.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for app shell, network-first for external resources
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // External resources (fonts, CDN): network-first, fallback to cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Local resources: cache-first, then network (and update cache)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      const fetchPromise = fetch(event.request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});

// Listen for messages from the page (for manual update trigger)
self.addEventListener('message', function(event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
