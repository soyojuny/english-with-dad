const cacheName = "ewd-reading-v24";
const appShell = [
  "/",
  "/manifest.webmanifest",
  "/assets/dragons/dragons-v2.png",
  "/assets/dragons/eggs/spotted.webp",
  "/assets/dragons/eggs/striped.webp",
  "/assets/dragons/eggs/diamond.webp",
  "/assets/dragons/habitats/lava-open-foreground.webp",
  "/assets/dragons/habitats/lava-stone-platform.webp",
  "/assets/dragons/habitats/lava-central-volcano.webp",
  "/assets/dragons/habitats/lava-waterfall.webp",
  "/assets/dragons/props/ancient-dragon-relic.webp",
  "/assets/dragons/props/lava-crystal.webp",
  "/assets/dragons/adult-fire.webp",
  "/assets/dragons/baby/neutral.webp",
  "/assets/dragons/baby/flight-takeoff.webp",
  "/assets/dragons/baby/flight-move.webp",
  "/assets/dragons/baby/flight-hover.webp",
  "/assets/dragons/baby/fire-flight-takeoff.webp",
  "/assets/dragons/baby/fire-flight-move.webp",
  "/assets/dragons/baby/thunder-flight-takeoff.webp",
  "/assets/dragons/baby/thunder-flight-move.webp",
  "/assets/dragons/baby/thunder-tail-attack.webp",
  "/assets/dragons/baby/walk-bde.webp",
  "/assets/dragons/baby/fire-walk-bde.webp",
  "/assets/dragons/baby/thunder-walk-bde.webp",
  "/assets/dragons/baby/ice-walk-bde.webp",
  "/assets/dragons/baby/sit-sequence.webp",
  "/assets/dragons/baby/fire-sit-sequence.webp",
  "/assets/dragons/baby/ice-sit-sequence.webp",
  "/assets/dragons/baby/thunder-sit-sequence.webp",
  "/assets/dragons/baby/breathe.webp",
  "/assets/dragons/baby/blink.webp",
  "/assets/dragons/baby/fire-breathe.webp",
  "/assets/dragons/baby/fire-blink.webp",
  "/assets/dragons/baby/thunder-breathe.webp",
  "/assets/dragons/baby/thunder-blink.webp",
  "/assets/dragons/baby/ice-breathe.webp",
  "/assets/dragons/baby/ice-blink.webp",
  "/assets/dragons/baby/fire.webp",
  "/assets/dragons/baby/thunder.webp",
  "/assets/dragons/baby/ice.webp",
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
