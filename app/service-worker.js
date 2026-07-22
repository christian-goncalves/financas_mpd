const CACHE_NAME = "contas-mpd-shell-v18";
const APP_SHELL = [
  "./",
  "./index.html",
  "./auth-session.js",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./vendor/fontawesome/css/fontawesome.min.css",
  "./vendor/fontawesome/css/solid.min.css",
  "./vendor/fontawesome/webfonts/fa-solid-900.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
