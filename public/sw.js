const CACHE_NAME = "ipos-pos-cache-v2";

// Public assets only — these are reachable without a session, so they are safe
// to warm at install time.
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
];

// The POS shell sits behind the auth proxy: fetching it while signed out just
// redirects to /login, and Cache.put() rejects a redirected response anyway.
// It is warmed on demand instead, once the app reports an established session
// (see PRECACHE_POS_SHELL below).
const POS_SHELL_URL = "/pos";

/* ------------------------------------------------------------------ */
/* Push notifications                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Offline app shell                                                   */
/* ------------------------------------------------------------------ */

// Install Event - Pre-cache core POS App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache each asset on its own so a single 404 does not abort the whole
      // pre-cache the way cache.addAll() would.
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

/**
 * Warms the POS shell after login.
 *
 * The app posts PRECACHE_POS_SHELL once it has a session, so the terminal is
 * available offline even for someone who signed in on the dashboard and never
 * navigated to /pos. A redirected or non-OK response means the session was not
 * accepted, and caching a login page as the POS shell would be worse than
 * caching nothing.
 */
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

/**
 * Drops every cached POS document on sign-out.
 *
 * /pos is server-rendered per request, so a cached shell carries the data of
 * whoever was signed in. On a shared terminal the next person could pull that
 * back out of the cache while offline. Static assets under /_next/static are
 * not user-specific and stay put, so a re-login re-warms cheaply.
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
  if (event.data?.type === "PRECACHE_POS_SHELL") {
    event.waitUntil(precachePosShell());
  }

  if (event.data?.type === "CLEAR_POS_SHELL") {
    event.waitUntil(clearPosShell());
  }
});

// Fetch Event - Custom caching policy scoped for POS
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Sign-out invalidates every cached POS document. Catching it here rather
  // than in the page means no logout path can miss it: /api/logout is a form
  // POST that navigates away, so a page-side handler would race the redirect,
  // whereas waitUntil keeps this worker alive until the eviction finishes.
  // The request itself is left alone and goes to the network as usual.
  if (event.request.method === "POST" && url.pathname === "/api/logout") {
    event.waitUntil(clearPosShell());
  }

  /*
   * Leave cross-origin requests to the browser.
   *
   * Item photos, business logos and profile pictures are plain <img> tags
   * pointed at the backend's own host, and their `destination` is "image" —
   * so without this they fall into the network-first branch below and get
   * re-issued by fetch() from inside this worker. A worker inherits the CSP
   * delivered with its script, and next.config.ts serves /sw.js under
   * `default-src 'self'`, which caps connect-src at same-origin: that re-issued
   * fetch is blocked, and the image breaks. The page itself has no CSP, so
   * simply not intercepting lets the browser load it as normal.
   *
   * Nothing is lost by skipping them. A cross-origin response here is opaque
   * (status 0), so the `status === 200` check below never cached one anyway.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

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
          if (!networkResponse) return networkResponse;

          /*
           * Landing on /login after following a redirect means the session is
           * over. The proxy sends an expired Keycloak token there just as it
           * does a missing cookie, and that expiry path never touches
           * /api/logout — so this is the only signal the worker gets that the
           * cached shell now belongs to a session that has ended.
           *
           * Caching the response would be wrong twice over: it would stand the
           * login screen in as the POS shell, and Cache.put() rejects a
           * redirected response anyway.
           */
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
          // respondWith() rejects on an undefined return, which surfaces as a
          // browser network error instead of our offline state.
          return new Response("", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
  }
});
