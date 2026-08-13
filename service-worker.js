/* YMS Master Track — Service Worker v3.14.0 */
const CACHE_NAME = 'yms-v3.14.0';
const APP_SHELL = [
  './login.html',
  './student-home.html',
  './parent-home.html',
  './homework.html',
  './css/style.css',
  './js/app.js',
  './js/admin-multirole-fix.js',
  './js/admin-account-fix.js',
  './js/account-id-migration.js',
  './js/student-dashboard.js',
  './js/admin-structure-fix.js',
  './js/admin-menu-cleanup.js',
  './js/student-select-options.js',
  './js/homework-personal.js',
  './js/parent-home-fix.js',
  './js/parent-link-repair.js',
  './js/parent-account-save-fix.js',
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

async function patchHtml(request, response) {
  try {
    const url = new URL(request.url);
    if (!response.ok) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;
    let html = await response.text();

    if (url.pathname.endsWith('/admin.html')) {
      const scripts = [
        'js/admin-multirole-fix.js',
        'js/admin-account-fix.js',
        'js/account-id-migration.js',
        'js/student-dashboard.js',
        'js/admin-structure-fix.js',
        'js/admin-menu-cleanup.js',
        'js/student-select-options.js',
        'js/parent-link-repair.js',
        'js/parent-account-save-fix.js'
      ];
      const missing = scripts.filter(src => !html.includes(src));
      if (missing.length) {
        html = html.replace('</body>', missing.map(src => `<script src="${src}"></script>`).join('') + '</body>');
      }
    }

    if (url.pathname.endsWith('/homework.html') && !html.includes('js/homework-personal.js')) {
      html = html.replace('</body>', '<script src="js/homework-personal.js"></script></body>');
    }

    if (url.pathname.endsWith('/parent-home.html') && !html.includes('js/parent-home-fix.js')) {
      const appTag = '<script src="js/app.js"></script>';
      html = html.includes(appTag)
        ? html.replace(appTag, appTag + '<script src="js/parent-home-fix.js"></script>')
        : html.replace('</body>', '<script src="js/parent-home-fix.js"></script></body>');
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
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
          return patchHtml(request, response);
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('./login.html'));
          if (cached) return patchHtml(request, cached);
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
