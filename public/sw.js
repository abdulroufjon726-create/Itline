// Minimal service worker — faqat PWA "o'rnatish" (install) shartini
// qondirish uchun. Hech narsani keshlamaydi, tarmoq xatti-harakatiga
// aralashmaydi (offline logika ilovaning o'zida navigator.onLine orqali).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
// Fetch handler bo'lishi kerak (aks holda brauzer "installable" demaydi),
// lekin respondWith chaqirmaymiz — so'rovlar odatдагиdek ketaveradi.
self.addEventListener("fetch", () => {});
