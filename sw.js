const CACHE = 'tanzeem-v45'; // bump this version on every deploy → triggers auto-reload for all users
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
  './js/features/ai.js',
  './icons/icon.svg',
  './manifest.json'
];

// Skip waiting so updated SW activates immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Claim clients immediately so new SW controls all open tabs at once
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-bypass for external APIs — never cache these
const BYPASS = [
  'googleapis.com',
  'generativelanguage.googleapis.com',
  'accounts.google.com',
  'workers.dev',
  'gsi/client',
  'cdn.jsdelivr.net',
];

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (BYPASS.some(h => url.includes(h))) return; // let browser handle it

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful same-origin GET responses
        if (res.ok && e.request.method === 'GET' && url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html')) // offline fallback
  );
});
