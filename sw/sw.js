/* AstroVerse service worker. Generated into dist/sw.js by the swPlugin in vite.config.ts,
 * which fills in the version and precache list below. Strategy:
 *  - navigations: network first, then that page's cached copy, then the app shell (offline)
 *  - same-origin GETs (hashed assets, icons): cache first, then network (and cache it)
 *  - cross-origin (place search, analytics): not intercepted
 */
const VERSION = '__VERSION__';
const CACHE = `astroverse-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('astroverse-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Pre-rendered pages (/signs/…) differ from the app shell, so each page is cached under
    // its own URL; offline, a page never visited falls back to the precached shell.
    const key = url.origin + url.pathname;
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && !res.redirected) caches.open(CACHE).then((c) => c.put(key, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(key)
            .then((r) => r || caches.match('/index.html'))
            .then((r) => r || Response.error()),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
