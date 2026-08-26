const CACHE_NAME = "ipos-pos-cache-v2";

const PRECACHE_ASSETS = [
  "/pos",
  "/manifest.json",
  "/favicon.ico",
];

// Install Event - Pre-cache core POS App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching POS App Shell");
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[Service Worker] Pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Custom caching policy scoped for POS
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker for API, HMR, websockets, and dev chunks
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  // Network-First strategy with Cache Fallback for /pos routes, static assets, and JS bundles
  if (
    url.pathname.startsWith("/pos") ||
    url.pathname.startsWith("/_next/static/") ||
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          if (url.pathname.startsWith("/pos")) {
            return caches.match("/pos");
          }
        })
    );
  }
});
