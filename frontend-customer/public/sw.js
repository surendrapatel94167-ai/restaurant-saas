// Minimal service worker for the customer PWA:
//  1. Receives and shows Web Push notifications (offers/announcements).
//  2. Caches just the static app shell so the icon opens instantly even on a
//     flaky connection — it deliberately never caches API responses (menu,
//     orders, prices must always be fresh), and never touches non-GET
//     requests or cross-origin calls to the backend.

const CACHE_NAME = 'restaurant-app-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only ever handle same-origin GET navigations/static assets — anything
  // else (API calls, POST/PUT/DELETE, cross-origin) passes straight through
  // untouched so order placement, payments etc. are never affected.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }
  if (SHELL_ASSETS.some((a) => request.url.endsWith(a))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'New offer', body: 'Check out the latest offer!' };
  try {
    if (event.data) data = event.data.json();
  } catch (_) { /* plain text payload, use default */ }

  event.waitUntil(
    self.registration.showNotification(data.title || 'New offer', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
