/* No-op cleanup service worker.
 * Kept to satisfy stale browser registrations that still request /push-sw.js.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(self.registration.unregister());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => self.clients.claim()),
  );
});
