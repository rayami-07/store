/* ============================================================
   SERVICE WORKER — RAYAMI Store
   Estrategia "network first": siempre intenta traer lo más nuevo
   de internet; si no hay conexión, usa la copia guardada.
   Así tus cambios en GitHub se ven de inmediato y la app
   sigue abriendo aunque el celular esté sin señal.
   Solo guarda archivos de este mismo sitio (no Firebase, no ImgBB).
============================================================ */
const CACHE = "rayami-v7";
const BASE = [
  "./",
  "./index.html",
  "./styles.css",
  "./tienda-v2.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: "reload" })))));
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
    // "no-cache": siempre pregunta al servidor si hay versión nueva
    // (GitHub Pages deja guardadas las páginas 10 min y eso retrasaba los cambios)
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((r) => {
          if (r) return r;
          // Sin señal: la página principal solo se usa como respaldo en la portada.
          // En otras secciones (crm, creador, tienda, quiero-mi-tienda…) se veía rota
          // porque sus estilos se buscaban en la carpeta equivocada.
          const base = new URL("./", self.registration.scope).pathname;
          if (req.mode === "navigate" && (url.pathname === base || url.pathname === base + "index.html")) {
            return caches.match("./index.html");
          }
          if (req.mode === "navigate") return offlinePage();
          return Response.error();
        })
      )
  );
});

function offlinePage() {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center;background:#faf8f6;color:#1a1714">
<div><h1 style="font-size:22px;margin:0 0 8px">Sin conexión</h1><p style="color:#6b655f;margin:0 0 18px">No se pudo cargar esta página. Revisa tu señal e intenta de nuevo.</p>
<button onclick="location.reload()" style="font:inherit;font-weight:700;padding:12px 22px;border-radius:99px;border:0;background:#ff6a00;color:#fff">Reintentar</button></div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
