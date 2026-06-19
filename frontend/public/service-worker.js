// AfyaHewa Service Worker — offline support for core emergency content
const CACHE_NAME = 'afyahewa-v4';
const RUNTIME_CACHE = 'afyahewa-runtime-v3';

// App shell — always cached on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all open tabs that a new version is available
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Always take over immediately — don't wait for old SW to finish
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Fetch strategy:
// - App shell (HTML/JS/CSS): cache-first, fallback to network
// - Open-Meteo weather API: network-first, fallback to cache (for offline weather)
// - Everything else: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST to Afya chat, reports, etc.) — these need live network
  if (request.method !== 'GET') return;

  // Never cache API calls to our own backend (dynamic data)
  if (url.hostname.includes('onrender.com')) return;

  // Open-Meteo and Nominatim — network-first with cache fallback (stale weather better than none)
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // OSRM routing — network only, don't cache (real-time, low value offline)
  if (url.hostname.includes('osrm.org')) return;

  // App shell and static assets — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful same-origin responses
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests — serve cached app shell
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Listen for messages from the app (e.g. skip waiting on update)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Push notification handler (for future SMS/push alert activation)
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || 'AfyaHewa Alert';
  const options = {
    body: data.body || 'New health or weather alert in your area.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    tag: data.tag || 'afyahewa-alert',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
