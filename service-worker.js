const CACHE_NAME = 'horas-v11';
const BASE_PATH = '/';

// These files are always fetched from network (never stale)
const NETWORK_FIRST = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'app.js',
];

// These are cached and served from cache (change rarely)
const urlsToCache = [
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png',
  BASE_PATH + 'icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => name !== CACHE_NAME && caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isNetworkFirst = NETWORK_FIRST.some(p => url.pathname === p || url.pathname === p.replace(BASE_PATH, '/'));

  if (isNetworkFirst) {
    // Network first: bypass HTTP cache to always get the latest version
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => res)
        .catch(() => caches.match(event.request).then(r => r || caches.match(BASE_PATH + 'index.html')))
    );
  } else {
    // Cache first: serve from cache, fall back to network
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => caches.match(BASE_PATH + 'index.html'))
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
