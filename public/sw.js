// Service Worker: App-Hülle offline verfügbar machen. Die Schnittkonstruktion läuft komplett im Browser,
// nur die Foto-Analyse (/api/…) braucht eine Verbindung und wird nie zwischengespeichert.
const VERSION = "fadenlauf-v1";
const SHELL = [
  "/", "/index.html", "/styles.css", "/app.js", "/engine.js", "/manifest.webmanifest",
  "/vendor/jspdf.umd.min.js", "/vendor/three.min.js",
  "/fonts/young-serif-400.woff2", "/fonts/instrument-sans-400.woff2", "/fonts/instrument-sans-500.woff2",
  "/fonts/instrument-sans-600.woff2", "/fonts/instrument-sans-700.woff2", "/fonts/ibm-plex-mono-400.woff2", "/fonts/ibm-plex-mono-500.woff2",
  "/icons/icon.svg", "/icons/icon-192.png", "/impressum.html", "/datenschutz.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Netz zuerst, damit Updates sofort ankommen; ohne Netz aus dem Cache.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/index.html"))),
  );
});
