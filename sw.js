// Mova : service worker (hors connexion + mises à jour)
// À chaque nouvelle version : changer VERSION ici ET APP_VERSION dans index.html.
const VERSION = '1.3.0';
const CACHE = 'pf-' + VERSION;
const FONTS = 'fonts-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' force le téléchargement des nouveaux fichiers (sinon le navigateur peut resservir l'ancienne version).
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La page envoie ce message quand on appuie sur « Mettre à jour ».
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).catch(() =>
        req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    );
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
