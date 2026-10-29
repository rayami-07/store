/* ============================================================
   MODO PRUEBA (tienda/editar.html?t=<id>)
   El prospecto agrega sus productos y precios para ver cómo
   quedaría su tienda. Todo se guarda SOLO en su celular
   (localStorage); no toca la base de datos ni la demo original.
   Es la base del editor del dueño (etapa 3).
============================================================ */
import { ESTILOS, GIROS, fotoEjemplo } from "./muestras.js";

const DB_URL = "https://rayami-store-default-rtdb.firebaseio.com";
const PLATAFORMA_WA = "525581074978";
const TRIAL_KEY = (id) => "tienda-prueba-" + id;

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const num = (v) => Number(String(v || "").replace(/[^\d.]/g, "")) || 0;
const storeId = (new URLSearchParams(location.search).get("t") || "").trim();

let base = null;      // la demo original (Firebase)
let local = null;     // cambios del prospecto { plan, products }
let editing = null;   // id del producto en edición, o "new"
let draftPhoto = "";
let draftCombo = false;

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2400);
}
function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
const giro = () => GIROS[base.giro] || GIROS.otro;
const photoOf = (p) => p.photo || fotoEjemplo(p.emoji || giro().emoji, base.color);
const products = () => local.products;

function save() {
  try { localStorage.setItem(TRIAL_KEY(storeId), JSON.stringify(local)); return true; }
  catch { toast("Ya no caben más fotos en este celular. Quita algunas e intenta de nuevo."); return false; }
}

/* ── Lista ── */
function render() {
  document.querySelectorAll('input[name="plan"]').forEach((r) => (r.checked = r.value === (local.plan || "pedidos")));
  $("count").textContent = `(${products().length})`;
  $("list").innerHTML = products().length ? products().map((p) => {
    const sale = p.salePrice > 0 && p.salePrice < p.price;
    return `<div class="item${p.agotado ? " off" : ""}">
      <img src="${esc(photoOf(p))}" alt="" />
      <div>
        <div class="item-name">${esc(p.name)}</div>
        <div class="item-meta">
          ${sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : `<span>${money(p.price)}</span>`}
          ${p.category ? `<span>· ${esc(p.category)}</span>` : ""}
          ${p.agotado ? `<span class="badge off">Agotado</span>` : ""}
          ${(p.variantes || []).length ? `<span class="badge">${(p.variantes || []).map((g) => esc(g.nombre)).join(", ")}</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="mini" data-edit="${esc(p.id)}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="mini${p.agotado ? " on" : ""}" data-off="${esc(p.id)}"><i class="fa-solid fa-ban"></i> ${p.agotado ? "Agotado" : "Marcar agotado"}</button>
        <button class="mini danger" data-del="${esc(p.id)}" aria-label="Borrar ${esc(p.name)}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join("") : `<p class="muted">Aún no tienes productos. Agrega el primero.</p>`;
}

/* ── Hoja de producto ── */
function categories() {
  return [...new Set([...(base.categorias || giro().categorias || []), ...products().map((p) => p.category).filter(Boolean)])];
}
function openSheet(id, combo = false) {
  editing = id;
  const p = id === "new" ? null : products().find((x) => x.id === id);
  draftCombo = p ? p.category === "Combos" || !!p.combo : combo;
  draftPhoto = p?.photo || "";
  $("sheetTitle").textContent = p ? "Editar producto" : draftCombo ? "Agregar combo" : "Agregar producto";
  $("fName").value = p?.name || "";
  $("fName").placeholder = draftCombo ? "Ej. Combo 2 tacos + refresco" : "Ej. Tenis blancos";
  $("fPrice").value = p?.price || "";
  $("fSale").value = p?.salePrice || "";
  const cats = categories();
  if (draftCombo && !cats.includes("Combos")) cats.unshift("Combos");
  const cur = p?.category || (draftCombo ? "Combos" : cats[0] || "");
  $("fCat").innerHTML = cats.map((c) => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("") + `<option value="__new">+ Categoría nueva…</option>`;
  $("newCatWrap").hidden = true; $("fNewCat").value = "";
  $("descLabel").innerHTML = draftCombo ? "¿Qué incluye?" : `Descripción <span class="muted">(opcional)</span>`;
  $("fDesc").placeholder = draftCombo ? "Ej. 2 tacos al pastor + refresco de 600 ml" : "Material, medidas, qué incluye…";
  $("fDesc").value = p?.desc || "";
  const v = p?.variantes || [];
  $("v0n").value = v[0]?.nombre || ""; $("v0v").value = (v[0]?.opciones || []).join(", ");
  $("v1n").value = v[1]?.nombre || ""; $("v1v").value = (v[1]?.opciones || []).join(", ");
  $("optsBox").open = v.length > 0;
  $("fPhotoPrev").src = draftPhoto || (p ? photoOf(p) : fotoEjemplo(draftCombo ? "🎁" : giro().emoji, base.color));
  $("fErr").textContent = "";
  $("sheet").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("fName").focus(), 50);
}
function closeSheet() { $("sheet").hidden = true; document.body.style.overflow = ""; editing = null; }

function resizeImage(file, max = 600, quality = 0.75) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => fail(new Error("No se pudo leer la foto"));
    img.src = URL.createObjectURL(file);
  });
}
$("fPhoto").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { draftPhoto = await resizeImage(f); $("fPhotoPrev").src = draftPhoto; }
  catch (err) { toast(err.message); }
  e.target.value = "";
});
$("fCat").addEventListener("change", () => { $("newCatWrap").hidden = $("fCat").value !== "__new"; if (!$("newCatWrap").hidden) $("fNewCat").focus(); });

$("pForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("fName").value.trim();
  const price = num($("fPrice").value);
  const salePrice = num($("fSale").value);
  let category = $("fCat").value === "__new" ? $("fNewCat").value.trim() : $("fCat").value;
  if (!name) { $("fErr").textContent = "Escribe el nombre"; $("fName").focus(); return; }
  if (!price) { $("fErr").textContent = "Escribe el precio"; $("fPrice").focus(); return; }
  if (salePrice && salePrice >= price) { $("fErr").textContent = "El precio de oferta debe ser menor al precio normal"; $("fSale").focus(); return; }
  if (!category) { $("fErr").textContent = "Escribe el nombre de la categoría"; $("fNewCat").focus(); return; }
  const variantes = [["v0n", "v0v"], ["v1n", "v1v"]].map(([n, v]) => ({
    nombre: $(n).value.trim(), opciones: $(v).value.split(",").map((x) => x.trim()).filter(Boolean),
  })).filter((g) => g.nombre && g.opciones.length);
  const prev = editing === "new" ? null : products().find((x) => x.id === editing);
  const item = {
    ...(prev || { id: "p" + Date.now().toString(36), emoji: draftCombo ? "🎁" : giro().emoji }),
    name, price, salePrice, category, desc: $("fDesc").value.trim(), photo: draftPhoto, variantes,
    ...(draftCombo ? { combo: true } : {}),
  };
  if (prev) local.products = products().map((x) => (x.id === prev.id ? item : x));
  else local.products = [item, ...products()];
  if (!save()) return;
  closeSheet(); render();
  toast(prev ? "Producto actualizado" : "Producto agregado");
});

/* ── Eventos ── */
$("list").addEventListener("click", (e) => {
  const ed = e.target.closest("[data-edit]"), off = e.target.closest("[data-off]"), del = e.target.closest("[data-del]");
  if (ed) openSheet(ed.dataset.edit);
  if (off) {
    local.products = products().map((p) => (p.id === off.dataset.off ? { ...p, agotado: !p.agotado } : p));
    save(); render();
  }
  if (del) {
    const id = del.dataset.del;
    if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.innerHTML = "¿Borrar? Toca otra vez"; setTimeout(render, 3500); return; }
    local.products = products().filter((p) => p.id !== id); save(); render(); toast("Producto borrado");
  }
});
document.querySelectorAll('input[name="plan"]').forEach((r) => r.addEventListener("change", () => {
  local.plan = r.value; save();
  toast(r.value === "vitrina" ? "Ahora tu tienda es un catálogo: tus clientes preguntan por WhatsApp" : "Ahora tu tienda recibe pedidos con carrito");
}));
$("addProd").addEventListener("click", () => openSheet("new", false));
$("addCombo").addEventListener("click", () => openSheet("new", true));
$("sheetClose").addEventListener("click", closeSheet);
$("sheetCancel").addEventListener("click", closeSheet);
$("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });
$("reset").addEventListener("click", (e) => {
  const b = e.currentTarget;
  if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "¿Seguro? Toca otra vez para quitar tus cambios"; setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Empezar de nuevo (quitar mis cambios)"; }, 4000); return; }
  try { localStorage.removeItem(TRIAL_KEY(storeId)); } catch {}
  start(); toast("Volviste a la demo original");
});

/* ── Arranque ── */
async function start() {
  if (!/^[a-z0-9-]{3,60}$/.test(storeId)) { $("loading").hidden = true; $("notfound").hidden = false; return; }
  if (!base) {
    try { base = await fetch(`${DB_URL}/stores/${storeId}.json`).then((r) => (r.ok ? r.json() : null)); } catch { base = null; }
    if (!base || !base.name) { $("loading").hidden = true; $("notfound").hidden = false; return; }
  }
  const baseProducts = Array.isArray(base.products) ? base.products : Object.values(base.products || {});
  try { local = JSON.parse(localStorage.getItem(TRIAL_KEY(storeId)) || "null"); } catch { local = null; }
  if (!local) local = { plan: base.plan || "pedidos", products: JSON.parse(JSON.stringify(baseProducts)) };

  const st = ESTILOS[base.estilo] || ESTILOS.moderno;
  const r = document.documentElement.style;
  r.setProperty("--accent", base.color || "#111111");
  r.setProperty("--accent-ink", inkFor(base.color));
  r.setProperty("--display", st.display);
  r.setProperty("--display-weight", st.weight);
  r.setProperty("--display-case", st.upper ? "uppercase" : "none");
  document.title = `Prueba tu tienda · ${base.name}`;
  $("name").textContent = base.name;
  $("logo").hidden = !base.logo; if (base.logo) $("logo").src = base.logo;
  $("viewStore").href = `./?t=${storeId}&prueba=1`;
  $("want").href = `https://api.whatsapp.com/send?phone=${PLATAFORMA_WA}&text=${encodeURIComponent(`Hola, probé la tienda de "${base.name}" con mis productos y la quiero`)}`;
  save();
  render();
  $("loading").hidden = true;
  $("app").hidden = false;
}
start();
