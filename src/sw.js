import { precacheAndRoute } from 'workbox-precaching/precacheAndRoute';

/* =========================
   PRECACHE FILES
========================= */

precacheAndRoute([
  {
    "revision": "d41d8cd98f00b204e9800998ecf8427e",
    "url": "CopyRight/index.html"
  },
  {
    "revision": "48b778db6743ef01b9e28a1baf9381a9",
    "url": "googlea6b289d9dfe16c91.html"
  },
  {
    "revision": "6ac964f915a46cae0802c7c687bdb806",
    "url": "index.html"
  },
  {
    "revision": "423ff60d09e606412e3329ab21826b3e",
    "url": "MRamzanCh/index.html"
  },
  {
    "revision": "a808a80d29b1ae7dcc5db17f6a4e9eeb",
    "url": "MRD/index.html"
  },
  {
    "revision": "3163bc5cbde4ab5487ac7b21774d3996",
    "url": "Privacy/index.html"
  },
  {
    "revision": "02b9cbf9629b43c3a900fe80eb3d78eb",
    "url": "ProBandey/index.html"
  },
  {
    "revision": "de172cdca1c6eb810797ab3c9e60847b",
    "url": "Terms/index.html"
  },

  /* OFFLINE PAGE */
  {
    "revision": "5451dfb545a5e25c1652f5e564d6a6b656c65",
    "url": "offline.html"
  }
]);

/* =========================
   INSTALL
========================= */

self.addEventListener('install', event => {
  self.skipWaiting();
});

/* =========================
   ACTIVATE
========================= */

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

/* =========================
   NETWORK WITH FALLBACK
========================= */

self.addEventListener('fetch', event => {

  /* Only handle page navigation */
  if (event.request.mode === 'navigate') {

    event.respondWith(
      (async () => {

        try {

          /* Abort slow requests */
          const controller = new AbortController();

          const timeout = setTimeout(() => {
            controller.abort();
          }, 5000); // 5 seconds timeout

          const response = await fetch(event.request, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          return response;

        } catch (error) {

          /* Show offline page */
          const cache = await caches.open(
            'workbox-precache-v2'
          );

          const offlinePage =
            await cache.match('/offline.html') ||
            await caches.match('/offline.html');

          return offlinePage;

        }

      })()
    );

  }

});
