const CACHE_NAME = "ipos-pos-cache-v2";
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
];

const POS_SHELL_URL = "/pos";

/*
 * Development is served by the Next dev server, which owns the page lifecycle:
 * chunks are unhashed and change on every recompile, and the dev client falls
 * back to a full `location.reload()` whenever it cannot reconcile a build.
 * A worker sitting in front of that turns one reload into a permanent loop —
 * the page reloading itself every few hundred milliseconds.
 *
 * So the worker stays installed here (push, notifications and the install
 * prompt still work) but hands every request straight to the network. Offline
 * behaviour is unchanged in production; to exercise it locally, run a
 * production build — `npm run build && npm start` — which is the only way to
 * test it against the hashed assets it actually ships with.
 */
const IS_DEV = new URL(self.location.href).searchParams.get("mode") === "dev";

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

/*
 * The POS shell is not pre-warmed.
 *
 * A background `fetch("/pos")` used to run whenever the page asked for one,
 * and nothing bounded it: /pos is dynamic and per-session, so a response that
 * redirected or errored was never cached, every retry paid a full server
 * render, and the worker hammered the page in a loop.
 *
 * The offline copy comes from real visits instead — the fetch handler below
 * caches /pos on the way through, which is where this cache was populated in
 * practice anyway.
 */

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
  if (event.data?.type === "CLEAR_POS_SHELL") {
    event.waitUntil(clearPosShell());
  }
});

self.addEventListener("fetch", (event) => {
  if (IS_DEV) return;

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
