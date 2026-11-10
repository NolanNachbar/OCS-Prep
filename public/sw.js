const CACHE = "ocsprep-v5"
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
))
const shell = () => caches.match("./index.html").then((r) => r || caches.match("./")).then((r) => r || Response.error())
// Stale-while-revalidate: instant offline loads, fresh copy fetched in the background.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.url.includes("/audio/") || !e.request.url.startsWith(self.location.origin)) return
  if (e.request.mode === "navigate") {
    // Network first (3 s, then the cached shell) so a new deploy never pairs an old index.html with deleted hashed scripts.
    const net = fetch(e.request).then((r) => { const k = r.clone(); caches.open(CACHE).then((c) => { c.put(e.request, k.clone()); c.put("./index.html", k) }); return r })
    const slow = new Promise((res) => setTimeout(() => res(null), 3000))
    e.respondWith(Promise.race([net, slow]).then((r) => r || shell()).catch(shell))
    return
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request)
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r })
    if (hit) { net.catch(() => {}); return hit }
    return net
  }))
})
