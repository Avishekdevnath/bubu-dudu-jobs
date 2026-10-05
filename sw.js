// Bubu-Dudu Job Portal Service Worker
// Version: 20261005-v2 (Forces instant cache purge & Network-First fresh UI)
const CACHE_NAME = 'bubu-dudu-jobportal-v20261005';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.bundle.js',
  './data/circulars.js',
  './data/circulars.json',
  './data/applications.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

// Install Event - Pre-cache core shell & immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline app shell:', CACHE_NAME);
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Purge ALL old caches immediately and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Message Event - Support remote skipWaiting triggers
self.addEventListener('message', (event) => {
  if (event.data && (event.data.action === 'skipWaiting' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// Fetch Event:
// 1. Network-First for HTML, Scripts, Styles, and Data JSON (Ensures latest UI/UX and jobs always load when online)
// 2. Cache-First with background revalidate for images, icons, and static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin external API requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  const isCoreAsset = request.mode === 'navigate' ||
                      url.pathname.endsWith('.html') ||
                      url.pathname.endsWith('/') ||
                      url.pathname.endsWith('.js') ||
                      url.pathname.endsWith('.css') ||
                      url.pathname.endsWith('.json');

  if (isCoreAsset) {
    // Network-First with Cache Fallback
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('./index.html');
            return null;
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for icons and static media
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
