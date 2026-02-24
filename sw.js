const CACHE_NAME = 'prayerbank-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', (e)=> {
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e)=> {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (e)=> {
  const req = e.request;
  if(req.method!=='GET') return;
  e.respondWith(
    caches.match(req).then(res=> res || fetch(req).then(net=>{
      const copy = net.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      return net;
    }).catch(()=>res))
  );
});
