/* Survival Matematic: scoped offline cache. Model updates must not serve stale GLBs. */
const CACHE = "sm-cache-v3-models";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const P = (path) => BASE + path;
const HOME = P("/");
const CACHE_NAME = `${CACHE}:${BASE || "root"}`;
const PRECACHE = [HOME, P("/manifest.webmanifest"), P("/icons/icon-192.png"), P("/icons/icon-512.png"), P("/images/menu-bg.jpg")];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((k) => k !== CACHE_NAME && k.startsWith("sm-") && (k.endsWith(`:${BASE || "root"}`) || !k.includes(":"))).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
async function fetchAndCache(request, cacheKey = request) {
  const response = await fetch(request);
  if (response.ok && response.status !== 206) {
    const copy = response.clone(); // clone BEFORE returning response to browser
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey, copy);
  }
  return response;
}
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(P("/api/"))) return;
  if (BASE && !url.pathname.startsWith(`${BASE}/`)) return;

  const models = url.pathname.startsWith(P("/assets/models/"));
  if (req.mode === "navigate" || models) {
    // Model/animation-map: NETWORK FIRST. Offline may use previously cached model.
    // A 404 is returned as 404 rather than silently reviving a removed file.
    event.respondWith((async () => {
      try { return await fetchAndCache(req, req.mode === "navigate" && url.pathname === HOME ? HOME : req); }
      catch {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(req) || (req.mode === "navigate" ? await cache.match(HOME) : null) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }
  // Hashed JS/CSS and ordinary assets: stale-while-revalidate.
  const network = fetchAndCache(req).catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(req) || await network || new Response("Offline", { status: 503 });
  })());
});
