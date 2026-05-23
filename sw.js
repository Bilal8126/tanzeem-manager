const CACHE = 'tanzeem-v1';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/app.js',
  './js/auth.js',
  './js/sheets.js',
  './js/router.js',
  './js/features/dashboard.js',
  './js/features/members.js',
  './js/features/payments.js',
  './js/features/finance.js',
  './js/features/ai.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('generativelanguage')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
