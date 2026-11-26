const CACHE_NAME = 'foodie-hub-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './src/styles.css',
  './src/app.js',
  './src/icons.js',
  './src/state.js',
  './src/data/index.js',
  './src/data/offers.js',
  './src/data/types.js',
  './src/data/cuisines/chinese.js',
  './src/data/cuisines/japanese.js',
  './src/data/cuisines/indian.js',
  './src/data/cuisines/southIndian.js',
  './src/data/cuisines/italian.js',
  './src/data/cuisines/korean.js',
  './assets/logo.svg',
  './assets/favicon.svg',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || network;
    }),
  );
});
