const CACHE = 'prayer-bank-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // only handle GET
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, {ignoreSearch:true});
    if (cached) return cached;
    try{
      const net = await fetch(req);
      // cache same-origin
      const url = new URL(req.url);
      if (url.origin === self.location.origin) cache.put(req, net.clone());
      return net;
    }catch(err){
      // fallback to index for navigation requests
      if (req.mode === 'navigate'){
        const idx = await cache.match('./index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
