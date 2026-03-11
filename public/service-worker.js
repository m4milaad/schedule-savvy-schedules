// CUK Acadex Service Worker - Offline-First Caching
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `cuk-static-${CACHE_VERSION}`;
const API_CACHE = `cuk-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `cuk-images-${CACHE_VERSION}`;

const SUPABASE_URL = 'https://hhhcesxsxtuqnnmaspdc.supabase.co';

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/CUKLogo.ico',
];

// ── Install: precache critical assets ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching critical assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('cuk-') &&
              name !== STATIC_CACHE &&
              name !== API_CACHE &&
              name !== IMAGE_CACHE
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: routing strategies ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, data URIs, etc
  if (!url.protocol.startsWith('http')) return;

  // Skip auth endpoints — never cache these
  if (url.pathname.includes('/auth/') || url.pathname.includes('/~oauth')) return;

  // Skip realtime websocket connections
  if (url.pathname.includes('/realtime/')) return;

  // ── Supabase REST API: stale-while-revalidate ──
  if (url.origin === SUPABASE_URL && url.pathname.startsWith('/rest/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // ── Images: cache-first ──
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── Static assets (JS, CSS, fonts): cache-first for hashed, network-first for HTML ──
  if (url.origin === self.location.origin) {
    // Hashed build assets (e.g. /assets/index-abc123.js) → cache-first
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    // HTML navigation requests → network-first (so new deploys are picked up)
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, STATIC_CACHE));
      return;
    }
    // Other same-origin → stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── External resources (CDN fonts, etc.) → stale-while-revalidate ──
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ── Caching strategies ──

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation, return cached index.html (SPA fallback)
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Store response with sync timestamp for API cache
        if (cacheName === API_CACHE) {
          const cloned = response.clone();
          cloned.text().then((body) => {
            const timestamped = new Response(body, {
              status: cloned.status,
              statusText: cloned.statusText,
              headers: new Headers({
                ...Object.fromEntries(cloned.headers.entries()),
                'x-sw-cached-at': new Date().toISOString(),
              }),
            });
            cache.put(request, timestamped);
          });
        } else {
          cache.put(request, response.clone());
        }
      }
      return response;
    })
    .catch(() => {
      // Network failed, cached version will be used
      return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    });

  return cached || fetchPromise;
}

// ── Message handler for cache management ──
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_CACHE_INFO') {
    getCacheInfo().then((info) => {
      event.ports[0].postMessage(info);
    });
  }
});

async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    info[name] = keys.length;
  }
  return info;
}
