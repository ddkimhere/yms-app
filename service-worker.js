/* YMS Master Track — Service Worker v3.0.0 */
const CACHE_NAME = 'yms-v3.0.0';
const APP_SHELL = [
  './login.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './images/icon-192.png',
  './images/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Firebase/Auth/API traffic must always go directly to the network.
  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // Pages: network first so app updates appear quickly.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match('./login.html')) ||
          new Response('오프라인 상태입니다.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        )
    );
    return;
  }

  // Local static assets: cache first, then network.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
