const CACHE_NAME = "mr-core-cache-v3";
const OFFLINE_URL = "/offline.html";

const CORE_ASSETS = [
    OFFLINE_URL,
    "/manifest.webmanifest",
    "/src/CoreSans-Regular_en.otf",
    "/src/mrc-nuca.svg",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Precaching Core Assets");
            return cache.addAll(CORE_ASSETS);
        }),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
                            console.log("[SW] Clearing old cache:", cache);
                            return caches.delete(cache);
                        }
                    }),
                );
            })
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") return;

    if (
        request.mode === "navigate" ||
        request.headers.get("accept").includes("text/html")
    ) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(async () => {
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) return cachedResponse;
                    return caches.match(OFFLINE_URL);
                }),
        );
        return;
    }

    if (["font", "image", "style", "script"].includes(request.destination)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request)
                    .then((networkResponse) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse.clone());
                        });
                        return networkResponse;
                    })
                    .catch(() => null);

                return cachedResponse || fetchPromise;
            }),
        );
        return;
    }
});
