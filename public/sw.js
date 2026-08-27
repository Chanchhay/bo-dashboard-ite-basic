const CACHE_NAME = "ipos-pos-cache-v2";
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
];

const POS_SHELL_URL = "/pos";

self.addEventListener("push", function (event) {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/pwa/icon-192x192.png",
    badge: "/pwa/badge.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn("[Service Worker] Pre-cache warning:", asset, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

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

async function precachePosShell() {
  try {
    const response = await fetch(POS_SHELL_URL, {
      credentials: "same-origin",
      redirect: "follow",
    });

    if (!response.ok || response.redirected) {
      console.warn("[Service Worker] POS shell not cacheable yet (unauthenticated?)");
      return;
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(POS_SHELL_URL, response);
    console.log("[Service Worker] POS shell cached");
  } catch (err) {
    console.warn("[Service Worker] POS shell pre-cache failed:", err);
  }
}

async function clearPosShell() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    await Promise.all(
      requests.map((request) => {
        const { pathname } = new URL(request.url);
        if (pathname === POS_SHELL_URL || pathname.startsWith(`${POS_SHELL_URL}/`)) {
          return cache.delete(request);
        }
      })
    );

    console.log("[Service Worker] POS shell cleared");
  } catch (err) {
    console.warn("[Service Worker] POS shell clear failed:", err);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "PRECACHE_POS_SHELL") {
    event.waitUntil(precachePosShell());
  }

  if (event.data?.type === "CLEAR_POS_SHELL") {
    event.waitUntil(clearPosShell());
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/api/logout") {
    event.waitUntil(clearPosShell());
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    !url.protocol.startsWith("http")
  ) {
    return;
  }

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
          if (!networkResponse) return networkResponse;

          if (networkResponse.redirected) {
            if (new URL(networkResponse.url).pathname.startsWith("/login")) {
              event.waitUntil(clearPosShell());
            }
            return networkResponse;
          }

          if (networkResponse.status === 200) {
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
            const shell = await caches.match(POS_SHELL_URL);
            if (shell) {
              return shell;
            }
          }
          return new Response("", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
  }
});
