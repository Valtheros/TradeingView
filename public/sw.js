const CACHE = "stockmarket-shell-v2";
const ASSETS = ["/offline.html", "/assets/icons/app-192.png", "/assets/icons/app-512.png", "/assets/icons/app-maskable.png", "/assets/icons/apple-touch-icon.png", "/assets/icons/startup-iphone17-portrait.png", "/assets/icons/startup-iphone17-landscape.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("stockmarket-shell-") && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  } else if (request.mode === "navigate") {
    // Never store authenticated documents, RSC responses, API data or stock prices.
    event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error()));
  }
});
