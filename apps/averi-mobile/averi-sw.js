// CORTEX Mobile — Service Worker
// Caches the shell for offline access and fast loading

const CACHE = 'cortex-v5';
const SHELL = ['/', '/index.html', '/cortex-manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Always bypass cache for API calls
    if (e.request.url.includes('4100') || e.request.url.includes('5050')) {
        return;
    }
    // Network-first strategy for rapid Zero-Day deployment
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
