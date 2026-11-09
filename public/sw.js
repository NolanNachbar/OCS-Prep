const CACHE = "ocsprep-v4"
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
))
// Stale-while-revalidate: instant offline loads, fresh copy fetched in the background.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.url.includes("/audio/") || !e.request.url.startsWith(self.location.origin)) return
  if (e.request.mode === "navigate") {
    // Network first for the page itself so a new deploy never pairs an old index.html with deleted hashed scripts.
    e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); return r }).catch(() => caches.match(e.request)))
    return
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request)
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r }).catch(() => hit)
    return hit || net
  }))
})
