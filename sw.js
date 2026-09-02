const CACHE_NAME = "worksphere-shell-v1.2.55";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./favicon.ico", "./favicon.svg", "./safari-pinned-tab.svg", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", "./icons/worksphere-icon.svg", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Keep Firebase/API/cloud data network-first; only static app assets use the cache.
  if (url.pathname.includes("/api/") || url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
