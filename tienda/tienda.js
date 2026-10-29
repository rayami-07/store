/* ============================================================
   PLANTILLA DE TIENDA
   - ?t=<id>        carga la tienda guardada en Firebase (/stores/<id>)
   - ?preview=1     vista previa en vivo desde el creador (postMessage)
============================================================ */
import { ESTILOS, GIROS, fotoEjemplo } from "./muestras.js";

const DB_URL = "https://rayami-store-default-rtdb.firebaseio.com";
// Quien ofrece la plataforma (sale en el pie y en la barra de demo)
export const PLATAFORMA = { nombre: "RAYAMI Tiendas", whatsapp: "525581074978" };

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };
const waLink = (n, text) => `https://wa.me/${waNumber(n)}${text ? "?text=" + encodeURIComponent(text) : ""}`;

let cfg = null;
let cart = [];
let cat = "";
let storeId = "";

function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
const finalPrice = (p) => (p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price);
const photoOf = (p) => p.photo || fotoEjemplo(p.emoji || (GIROS[cfg.giro] || GIROS.otro).emoji, cfg.color);

function applyTheme() {
  const st = ESTILOS[cfg.estilo] || ESTILOS.moderno;
  const r = document.documentElement.style;
  r.setProperty("--accent", cfg.color || "#111111");
  r.setProperty("--accent-ink", inkFor(cfg.color));
  r.setProperty("--display", st.display);
  r.setProperty("--display-weight", st.weight);
  r.setProperty("--display-case", st.upper ? "uppercase" : "none");
  document.title = cfg.name || "Tienda en línea";
  document.querySelector('meta[name="theme-color"]').content = "#ffffff";
}

function render(config) {
  cfg = { products: [], categorias: [], ...config };
  cfg.products = Array.isArray(cfg.products) ? cfg.products : Object.values(cfg.products || {});
  applyTheme();

  const giro = GIROS[cfg.giro] || GIROS.otro;
  for (const id of ["logo", "logoFtr"]) { const el = $(id); el.hidden = !cfg.logo; if (cfg.logo) el.src = cfg.logo; }
  $("brandName").textContent = cfg.name || "Mi tienda";
  $("ftrName").textContent = cfg.name || "Mi tienda";
  $("aviso").textContent = cfg.aviso || "";
  $("heroEyebrow").textContent = cfg.name || "";
  $("heroTitle").textContent = cfg.tagline || giro.tagline;
  const first = cfg.products[0];
  $("heroImg").src = first ? photoOf(first) : fotoEjemplo(giro.emoji, cfg.color);

  const hello = `Hola ${cfg.name || ""}, vi su tienda en línea y tengo una pregunta`;
  $("heroWa").href = waLink(cfg.whatsapp, hello);
  $("waFab").href = waLink(cfg.whatsapp, hello);
  $("ftrContact").innerHTML = cfg.whatsapp ? `WhatsApp: <b>${esc(cfg.whatsapp)}</b>${cfg.horario ? " · " + esc(cfg.horario) : ""}` : "";
  $("ftrMade").innerHTML = `Tienda creada con <a href="${waLink(PLATAFORMA.whatsapp, "Hola, quiero una tienda en línea como esta")}" target="_blank" rel="noopener">${esc(PLATAFORMA.nombre)}</a>`;

  const isDemo = cfg.status === "demo";
  $("demoBar").hidden = !isDemo;
  $("demoCta").href = waLink(PLATAFORMA.whatsapp, `Hola, vi la vista previa de mi tienda "${cfg.name}" y la quiero`);

  // Categorías: las que tienen productos, en el orden configurado
  const used = new Set(cfg.products.map((p) => p.category).filter(Boolean));
  const cats = [...(cfg.categorias || []).filter((c) => used.has(c)), ...[...used].filter((c) => !(cfg.categorias || []).includes(c))];
  if (cat && !used.has(cat)) cat = "";
  $("chips").innerHTML = cats.length > 1
    ? [`<button class="chip${cat ? "" : " active"}" data-cat="">Todo</button>`, ...cats.map((c) => `<button class="chip${c === cat ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)].join("")
    : "";

  renderGrid();
  renderCart();
  $("loading").hidden = true;
  $("notfound").hidden = true;
  $("store").hidden = false;
}

function renderGrid() {
  const q = $("search").value.trim().toLowerCase();
  let list = cfg.products.filter((p) => (!cat || p.category === cat) && (!q || `${p.name} ${p.desc || ""} ${p.category || ""}`.toLowerCase().includes(q)));
  const s = $("sort").value;
  if (s === "asc") list = [...list].sort((a, b) => finalPrice(a) - finalPrice(b));
  if (s === "desc") list = [...list].sort((a, b) => finalPrice(b) - finalPrice(a));
  $("count").textContent = `(${list.length})`;
  $("empty").hidden = list.length > 0;
  $("grid").innerHTML = list.map((p) => {
    const sale = p.salePrice > 0 && p.salePrice < p.price;
    const inCart = cart.some((i) => i.id === p.id);
    return `<article class="card">
      <div class="card-img"><img src="${esc(photoOf(p))}" alt="${esc(p.name)}" loading="lazy" />${sale ? `<span class="tag-sale">Oferta</span>` : ""}</div>
      <div class="card-name">${esc(p.name)}</div>
      ${p.category ? `<div class="card-cat">${esc(p.category)}</div>` : ""}
      ${p.desc ? `<div class="card-desc">${esc(p.desc)}</div>` : ""}
      <div class="card-price">${sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : money(p.price)}</div>
      <button class="add${inCart ? " in" : ""}" data-add="${esc(p.id)}">${inCart ? "En tu pedido ✓" : "Agregar"}</button>
    </article>`;
  }).join("");
}

/* ── Carrito ── */
const CART_KEY = () => "tienda-cart-" + (storeId || "preview");
function saveCart() { try { localStorage.setItem(CART_KEY(), JSON.stringify(cart)); } catch {} }
function loadCart() { try { cart = JSON.parse(localStorage.getItem(CART_KEY()) || "[]"); } catch { cart = []; } }

function renderCart() {
  cart = cart.filter((i) => cfg.products.some((p) => p.id === i.id));
  const n = cart.reduce((t, i) => t + i.qty, 0);
  $("cartBadge").hidden = n === 0;
  $("cartBadge").textContent = n;
  const total = cart.reduce((t, i) => t + i.qty * finalPrice(cfg.products.find((p) => p.id === i.id)), 0);
  $("cartTotal").textContent = money(total);
  $("sendOrder").disabled = n === 0;
  $("cartList").innerHTML = n === 0
    ? `<p class="vacio">Tu pedido está vacío. Agrega productos desde el catálogo.</p>`
    : cart.map((i) => {
        const p = cfg.products.find((x) => x.id === i.id);
        return `<div class="line">
          <img src="${esc(photoOf(p))}" alt="" />
          <div><b>${esc(p.name)}</b><small>${money(finalPrice(p))} c/u</small></div>
          <div class="qty"><button data-dec="${esc(i.id)}" aria-label="Menos">−</button><span>${i.qty}</span><button data-inc="${esc(i.id)}" aria-label="Más">+</button></div>
        </div>`;
      }).join("");
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}
const openCart = (o) => { $("drawer").classList.toggle("open", o); $("overlay").classList.toggle("open", o); };

function sendOrder() {
  const lines = cart.map((i) => {
    const p = cfg.products.find((x) => x.id === i.id);
    return `• ${p.name} x${i.qty} → ${money(finalPrice(p) * i.qty)}`;
  });
  const total = cart.reduce((t, i) => t + i.qty * finalPrice(cfg.products.find((p) => p.id === i.id)), 0);
  const text = `Hola ${cfg.name}, quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal: ${money(total)}\n\n¿Me confirman disponibilidad y forma de entrega?`;
  window.open(waLink(cfg.whatsapp, text), "_blank");
}

/* ── Eventos ── */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat],[data-add],[data-inc],[data-dec]");
  if (!t) return;
  if (t.dataset.cat !== undefined) { cat = t.dataset.cat; render(cfg); return; }
  const id = t.dataset.add || t.dataset.inc || t.dataset.dec;
  const item = cart.find((i) => i.id === id);
  if (t.dataset.add) {
    if (item) { openCart(true); return; }
    cart.push({ id, qty: 1 }); toast("Agregado a tu pedido");
  } else if (t.dataset.inc) item.qty++;
  else if (t.dataset.dec) { item.qty--; if (item.qty <= 0) cart = cart.filter((i) => i.id !== id); }
  saveCart(); renderCart(); renderGrid();
});
$("search").addEventListener("input", renderGrid);
$("sort").addEventListener("change", renderGrid);
$("cartBtn").addEventListener("click", () => openCart(true));
$("closeCart").addEventListener("click", () => openCart(false));
$("overlay").addEventListener("click", () => openCart(false));
$("sendOrder").addEventListener("click", sendOrder);

/* ── Arranque ── */
function notFound() { $("loading").hidden = true; $("store").hidden = true; $("notfound").hidden = false; }

const params = new URLSearchParams(location.search);
if (params.get("preview")) {
  // Vista previa del creador: recibe la configuración por mensaje
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.data?.type !== "tienda-preview") return;
    const keepScroll = scrollY;
    render(e.data.config);
    scrollTo(0, keepScroll);
  });
  window.parent?.postMessage({ type: "tienda-ready" }, location.origin);
} else {
  storeId = (params.get("t") || "").trim();
  if (!/^[a-z0-9-]{3,60}$/.test(storeId)) notFound();
  else {
    loadCart();
    fetch(`${DB_URL}/stores/${storeId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => (data && data.name ? render(data) : notFound()))
      .catch(notFound);
  }
}
