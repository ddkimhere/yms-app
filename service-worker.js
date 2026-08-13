/* YMS Master Track — Service Worker v3.1.0 */
const CACHE_NAME = 'yms-v3.1.0';
const APP_SHELL = [
  './login.html',
  './css/style.css',
  './js/app.js',
  './js/admin-multirole-fix.js',
  './manifest.json',
  './images/icon-source.svg',
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

async function withAdminMultiRolePatch(request, response) {
  try {
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/admin.html') || !response.ok) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;
    const html = await response.text();
    const patched = html.includes('admin-multirole-fix.js')
      ? html
      : html.replace('</body>', '<script src="js/admin-multirole-fix.js"></script></body>');
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(patched, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(async response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return withAdminMultiRolePatch(request, response);
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('./login.html'));
          if (cached) return withAdminMultiRolePatch(request, cached);
          return new Response('오프라인 상태입니다.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

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
