const CACHE_NAME = "msa-prayerboard-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./resources/css/index.css",
  "./resources/css/wallboard-hardening.css",
  "./resources/JS/config.js",
  "./resources/JS/app.js",
  "./resources/images/MSA PNG.png",
  "./resources/images/linktr.png",
  "./resources/images/logo1.png",
  "./resources/images/background.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.hostname === "api.aladhan.com") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
