/* Prayer Bank - simple offline shell cache */
const CACHE = "prayer-bank-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
  // icons are optional; add them once you place the files:
  // "./icons/icon-192.png",
  // "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        try {
          const url = new URL(req.url);
          if (url.origin === location.origin && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
        } catch(e){}
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
