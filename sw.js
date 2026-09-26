/* MEMCO service worker — always the newest page from the internet;
   the last copy is used only when there is no connection. */
const CACHE = 'memco-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;          // Supabase, CDNs: straight to the network
  e.respondWith((async () => {
    try{
      const fresh = await fetch(req, {cache: 'no-store'});
      if(fresh && fresh.ok){ const c = await caches.open(CACHE); c.put(req, fresh.clone()); }
      return fresh;
    }catch(err){
      const hit = await caches.match(req);
      if(hit) return hit;
      throw err;
    }
  })());
});
