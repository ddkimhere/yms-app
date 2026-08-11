/* ============================================================
   YMS Master Track — Service Worker v2.0.0
   tables/* API는 절대 캐싱 안 함 — 항상 네트워크 직통
============================================================ */

const CACHE_NAME  = 'yms-v2.0.0';
const OFFLINE_URL = 'offline.html';

const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './css/style.css',
  './js/app.js',
  './offline.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ★ tables/ 관련 요청 → 무조건 네트워크 직통, 캐싱 절대 안 함
  if (url.includes('tables/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        new Response(JSON.stringify({ data: [], total: 0 }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // ★ GET 이외 요청 → 네트워크 직통
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // http 아닌 요청 무시
  if (!url.startsWith('http')) return;

  // HTML → Network First
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // 정적 자산 → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        return res;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});
