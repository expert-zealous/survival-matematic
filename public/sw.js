/* Survival Matematic – service worker (offline shell + asset cache)
   Mendukung hosting di sub-folder (mis. GitHub Pages /nama-repo/) — base path
   diambil otomatis dari scope tempat service worker ini terdaftar. */
const CACHE = "sm-cache-v2";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const P = (path) => BASE + path;
const HOME = P("/");
const PRECACHE = [HOME, P("/manifest.webmanifest"), P("/icons/icon-192.png"), P("/icons/icon-512.png"), P("/images/menu-bg.jpg")];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // jangan cache API maupun lalu lintas Firebase (beda origin)
  if (url.origin !== self.location.origin || url.pathname.startsWith(P("/api/"))) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(HOME, copy));
          return res;
        })
        .catch(() => caches.match(HOME)),
    );
    return;
  }

  // aset statis: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
