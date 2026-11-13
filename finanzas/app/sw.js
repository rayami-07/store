/* Service worker de RAYAMI Finanzas (solo /finanzas/app/).
   "Network first": siempre trae lo más nuevo de internet; si no hay señal, usa la copia guardada
   para que la app abra igual. No guarda nada de Firebase: los datos siempre van directo a la base. */
const CACHE = "rayami-finanzas-v3";
const BASE = ["./", "./index.html", "./app.css?v=2", "./app.js?v=1", "./calculos.js", "./umbrales.js",
  "./manifest.json", "./icons/icon-192.png", "../../site.css?v=5"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: "reload" })))).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("rayami-finanzas-") && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
