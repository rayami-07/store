/* ============================================================
   SERVICE WORKER — RAYAMI Store
   Estrategia "network first": siempre intenta traer lo más nuevo
   de internet; si no hay conexión, usa la copia guardada.
   Así tus cambios en GitHub se ven de inmediato y la app
   sigue abriendo aunque el celular esté sin señal.
   Solo guarda archivos de este mismo sitio (no Firebase, no ImgBB).
============================================================ */
const CACHE = "rayami-v1";
const BASE = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((r) => r || caches.match("./index.html"))
      )
  );
});
