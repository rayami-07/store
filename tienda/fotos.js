/* ============================================================
   FOTOS — compresión en el celular antes de subir
   Lo usa "Mi tienda". El dueño solo toca "poner foto"; esto pasa por dentro:
   1. Se endereza la foto (orientación del celular).
   2. Se achica a un ancho máximo (una foto de celular mide 4000 px o más).
   3. Se guarda en WebP (pesa ~30% menos que JPG con la misma calidad).
      Si el navegador no sabe hacer WebP, usa JPG (o PNG si tiene transparencia).
   4. Si la foto original ya era más ligera, se queda la original.
   Devuelve un dataURL ("data:image/...") listo para uploadString.
============================================================ */

/** Lee la imagen ya enderezada. */
async function leer(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { /* sigue abajo */ }
  }
  return await new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); ok(img); };
    img.onerror = () => fail(new Error("No se pudo leer la foto"));
    img.src = URL.createObjectURL(file);
  });
}

const aDataURL = (blob) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => fail(new Error("No se pudo leer la foto"));
  r.readAsDataURL(blob);
});

// Tamaño aproximado en bytes de un dataURL (base64 → 3/4)
const pesoDe = (dataUrl) => Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

/**
 * @param {File} file
 * @param {object} op
 * @param {number} op.max          Lado más largo en píxeles
 * @param {number} op.calidad      0–1
 * @param {boolean} op.transparente true para logos (respeta fondo transparente)
 * @returns {Promise<string>} dataURL
 */
export async function comprimirFoto(file, { max = 1200, calidad = 0.82, transparente = false } = {}) {
  if (!file || !file.type?.startsWith("image/")) throw new Error("Ese archivo no es una foto");
  const img = await leer(file);
  const w0 = img.width, h0 = img.height;
  const k = Math.min(1, max / Math.max(w0, h0)); // nunca se agranda
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * k));
  c.height = Math.max(1, Math.round(h0 * k));
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  if (!transparente) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  img.close?.();

  let out = c.toDataURL("image/webp", calidad);
  if (!out.startsWith("data:image/webp")) {
    out = transparente ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", calidad);
  }

  // Si no hubo que achicarla y el archivo original ya pesaba menos, se queda el original
  const tiposWeb = ["image/jpeg", "image/webp", "image/png"];
  if (k === 1 && tiposWeb.includes(file.type) && file.size < pesoDe(out)) out = await aDataURL(file);
  return out;
}

/* Medidas que usa la tienda */
export const FOTO_GRANDE = { max: 1200, calidad: 0.82 }; // ficha del producto (~100–180 KB)
export const FOTO_MINI = { max: 480, calidad: 0.78 };    // catálogo, ofertas, carrito (~25–40 KB)
export const FOTO_BASE = { max: 720, calidad: 0.78 };    // si Storage no está activo y va dentro de la base
export const FOTO_LOGO = { max: 320, calidad: 0.9, transparente: true };
