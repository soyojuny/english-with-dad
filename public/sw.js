const cacheName = "ewd-reading-v1";
const appShell = [
  "/",
  "/manifest.webmanifest",
  "/assets/app-icon.svg",
  "/assets/app-icon-192.png",
  "/assets/app-icon-512.png",
  "/assets/covers/berenstain-doctor.jpg",
  "/assets/covers/bones.jpg",
  "/assets/covers/monthly-filled.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(appShell)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
