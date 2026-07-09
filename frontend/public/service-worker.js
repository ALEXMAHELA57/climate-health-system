// AfyaHewa Service Worker
// Strategy: network-first for app shell (always fetch latest code),
// cache only used as offline fallback. This guarantees users always
// get the newest version when online, with zero manual action needed.

const VERSION = 'v8';
const CACHE_NAME = `afyahewa-${VERSION}`;
const RUNTIME_CACHE = `afyahewa-runtime-${VERSION}`;

const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          // Delete every cache that isn't this exact version
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim()) // take control of all open tabs NOW
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: VERSION }));
      })
  );
});

// ── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests (chat, reports, etc.) — always live network
  if (request.method !== 'GET') return;

  // Never cache calls to our backend or serverless function — always fresh
  if (url.hostname.includes('onrender.com')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Weather/geocoding — network-first, cache as offline fallback only
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

  // Routing service — always live, never cached
  if (url.hostname.includes('osrm.org')) return;

  // App shell (HTML, JS, CSS, same-origin) — NETWORK FIRST
  // This is the key fix: always try to fetch the latest file first.
  // Only fall back to cache if the network request fails (offline).
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline — serve cached version
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Everything else — just pass through to network
});

// ── Messages from the app ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push notifications (ready for future activation) ───────────────────────
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
