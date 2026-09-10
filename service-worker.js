// Minimal PWA service worker: caches this app's own shell (the single
// index.html plus manifest/icons) so the portal installs to a home screen
// and doesn't 404 the moment a connection drops, without trying to cache
// or "go offline" for the live Supabase data itself — this app's whole
// value is real-time shared data, so anything cross-origin (CDNs, the
// Supabase REST API) is deliberately left untouched and always goes to the
// network, never served stale from here.
const CACHE_NAME = 'memco-tracker-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only ever manage same-origin app-shell requests. Every CDN script,
  // font, and the Supabase REST API itself is a different origin and is
  // simply never intercepted here.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
