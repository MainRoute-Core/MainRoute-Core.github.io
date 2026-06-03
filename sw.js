const CACHE_NAME = 'mr-core-cache-v3';
const OFFLINE_URL = '/offline.html';

/**
 * 1. PRECACHE CORE ASSETS
 * These files are downloaded immediately when the user visits the site.
 * This ensures your Offline Page looks beautiful (has fonts & logos) even without internet.
 */
const CORE_ASSETS = [
    OFFLINE_URL,
    '/manifest.webmanifest',
    '/src/CoreSans-Regular_en.otf',
    '/src/mrc-nuca.svg'
];

/**
 * 2. INSTALL EVENT
 * Triggered when the service worker is first registered.
 */
self.addEventListener('install', event => {
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Precaching Core Assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

/**
 * 3. ACTIVATE EVENT
 * Triggered when the service worker takes control. Great for cleaning up old caches.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

/**
 * 4. FETCH EVENT (THE BOOSTED ROUTER)
 * Intercepts all network requests and applies performance strategies.
 */
self.addEventListener('fetch', event => {
    const request = event.request;

    // Ignore non-GET requests (like form submissions)
    if (request.method !== 'GET') return;

    // ====================================================================
    // STRATEGY 1: HTML PAGES (Network First, Fallback to Cache, Fallback to Offline)
    // ====================================================================
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // If online, save a copy of this page to the cache for future offline visits
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(async () => {
                    // If offline, check if we have visited this page before
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) return cachedResponse;
                    
                    // If offline and never visited this page, serve the custom offline.html
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // ====================================================================
    // STRATEGY 2: STATIC ASSETS (Stale-While-Revalidate)
    // Fonts, Images, CSS, JS
    // ====================================================================
    if (['font', 'image', 'style', 'script'].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                // Fetch fresh asset from network in the background
                const fetchPromise = fetch(request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(() => null); // Silently fail if offline

                // Return cached asset IMMEDIATELY (blazing fast), or wait for network if not cached
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }
});
