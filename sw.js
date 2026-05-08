// Tasks Tracker — service worker
// Caches the app shell so the page can open offline.
// Lets Firebase / Google APIs handle their own caching (Firestore has built-in offline persistence).

const CACHE = "tt-v2";
const ASSETS = ["./", "./todo.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Skip Firebase / Google APIs — they have their own caching strategies
  if (
    url.host.includes("firebase") ||
    url.host.includes("googleapis") ||
    url.host.includes("gstatic") ||
    url.host.includes("firebaseio") ||
    url.host.includes("identitytoolkit")
  ) return;

  // Same-origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const networkPromise = fetch(req)
            .then((resp) => {
              if (resp && resp.ok) cache.put(req, resp.clone());
              return resp;
            })
            .catch(() => cached);
          return cached || networkPromise;
        })
      )
    );
  }
});
