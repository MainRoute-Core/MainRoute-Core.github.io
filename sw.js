const CACHE_VERSION = "v1";
const CACHE_NAME = `mainroute-caches-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const CORE_ASSETS = [
    OFFLINE_URL,
    "/src/social-.png",
    "/src/social_.png",
    "/css/index.css",
    "/js/index.js",
    "/favicon.ico",
    "/index.html",
    "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();

    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);

            await Promise.allSettled(
                CORE_ASSETS.map((asset) => cache.add(asset))
            );
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );

            if ("navigationPreload" in self.registration) {
                await self.registration.navigationPreload.enable();
            }

            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") return;

    // HTML pages: Network First
    if (
        request.mode === "navigate" ||
        request.headers.get("accept")?.includes("text/html")
    ) {
        event.respondWith(networkFirst(request));
        return;
    }

    // CSS, JS, Images, Fonts: Stale While Revalidate
    if (
        ["style", "script", "image", "font"].includes(
            request.destination
        )
    ) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }
});

async function networkFirst(request) {
    try {
        const preload = await event?.preloadResponse;
        if (preload) return preload;

        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch {
        const cached = await caches.match(request);

        if (cached) return cached;

        return caches.match(OFFLINE_URL);
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || networkFetch;
}