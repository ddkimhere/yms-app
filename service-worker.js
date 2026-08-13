/* YMS Master Track — Service Worker v3.6.0 */
const CACHE_NAME = 'yms-v3.6.0';
const APP_SHELL = [
  './login.html',
  './student-home.html',
  './css/style.css',
  './js/app.js',
  './js/admin-multirole-fix.js',
  './js/admin-account-fix.js',
  './js/student-dashboard.js',
  './js/student-management-cleanup.js',
  './js/admin-menu-cleanup.js',
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

async function withAdminPatches(request, response) {
  try {
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/admin.html') || !response.ok) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;
    const html = await response.text();
    const scripts = [
      'js/admin-multirole-fix.js',
      'js/admin-account-fix.js',
      'js/student-dashboard.js',
      'js/student-management-cleanup.js',
      'js/admin-menu-cleanup.js'
    ];
    let patched = html;
    const missing = scripts.filter(src => !patched.includes(src));
    if (missing.length) {
      patched = patched.replace('</body>', missing.map(src => `<script src="${src}"></script>`).join('') + '</body>');
    }
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
          return withAdminPatches(request, response);
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('./login.html'));
          if (cached) return withAdminPatches(request, cached);
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