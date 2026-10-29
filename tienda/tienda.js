/* ============================================================
   PLANTILLA DE TIENDA
   - ?t=<id>        carga la tienda guardada en Firebase (/stores/<id>)
   - ?preview=1     vista previa en vivo desde el creador (postMessage)
   Mide visitas, productos vistos, consultas y pedidos (stats.js)
============================================================ */
import { ESTILOS, GIROS, fotoEjemplo } from "./muestras.js";
import { DB_URL, track, saveLead } from "./stats.js";

// Quien ofrece la plataforma (sale en el pie y en la barra de demo)
export const PLATAFORMA = { nombre: "RAYAMI Tiendas", whatsapp: "525581074978" };
export const ENTREGAS = { recoger: "Recoger en tienda", domicilio: "Envío a domicilio", punto: "Punto de encuentro" };

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };
const waLink = (n, text) => `https://wa.me/${waNumber(n)}${text ? "?text=" + encodeURIComponent(text) : ""}`;

let cfg = null;
let cart = [];
let cat = "";
let storeId = "";
let isPreview = false;
let step = "cart"; // cart | checkout
let modalId = "";

const measure = (t, extra) => { if (!isPreview) track(storeId, t, extra); };

function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
const finalPrice = (p) => (p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price);
const photoOf = (p) => p.photo || fotoEjemplo(p.emoji || (GIROS[cfg.giro] || GIROS.otro).emoji, cfg.color);
const pedidosCfg = () => ({ datos: "opcional", entregas: ["recoger", "domicilio"], ...(cfg.pedidos || {}) });
const prodById = (id) => cfg.products.find((p) => p.id === id);

function applyTheme() {
  const st = ESTILOS[cfg.estilo] || ESTILOS.moderno;
  const r = document.documentElement.style;
  r.setProperty("--accent", cfg.color || "#111111");
  r.setProperty("--accent-ink", inkFor(cfg.color));
  r.setProperty("--display", st.display);
  r.setProperty("--display-weight", st.weight);
  r.setProperty("--display-case", st.upper ? "uppercase" : "none");
  document.title = cfg.name || "Tienda en línea";
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
  $("demoPanel").href = storeId ? `panel.html?t=${storeId}` : "#";
  $("demoPanel").hidden = !storeId;

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

const askText = (p) => `Hola ${cfg.name}, me interesa "${p.name}" (${money(finalPrice(p))}). ¿Me pueden dar más información?`;

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
      <div class="card-img" data-open="${esc(p.id)}"><img src="${esc(photoOf(p))}" alt="${esc(p.name)}" loading="lazy" />${sale ? `<span class="tag-sale">Oferta</span>` : ""}</div>
      <div class="card-name" data-open="${esc(p.id)}">${esc(p.name)}</div>
      ${p.category ? `<div class="card-cat">${esc(p.category)}</div>` : ""}
      <div class="card-price">${sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : money(p.price)}</div>
      <div class="card-actions">
        <button class="add${inCart ? " in" : ""}" data-add="${esc(p.id)}">${inCart ? "En tu pedido ✓" : "Agregar"}</button>
        <a class="ask" href="${waLink(cfg.whatsapp, askText(p))}" target="_blank" rel="noopener" data-ask="${esc(p.id)}" aria-label="Preguntar por ${esc(p.name)}" title="Preguntar por WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
      </div>
    </article>`;
  }).join("");
}

/* ── Ficha de producto ── */
function openModal(id) {
  const p = prodById(id); if (!p) return;
  modalId = id;
  const sale = p.salePrice > 0 && p.salePrice < p.price;
  $("pmImg").src = photoOf(p);
  $("pmImg").alt = p.name;
  $("pmCat").textContent = p.category || "";
  $("pmName").textContent = p.name;
  $("pmPrice").innerHTML = sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : money(p.price);
  $("pmDesc").textContent = p.desc || "";
  $("pmAsk").href = waLink(cfg.whatsapp, askText(p));
  $("pmAdd").textContent = cart.some((i) => i.id === id) ? "Ver mi pedido" : "Agregar al pedido";
  $("pModal").hidden = false;
  document.body.style.overflow = "hidden";
  measure("view", { p: id });
}
function closeModal() { $("pModal").hidden = true; document.body.style.overflow = ""; modalId = ""; }

/* ── Carrito ── */
const CART_KEY = () => "tienda-cart-" + (storeId || "preview");
function saveCart() { try { localStorage.setItem(CART_KEY(), JSON.stringify(cart)); } catch {} }
function loadCart() { try { cart = JSON.parse(localStorage.getItem(CART_KEY()) || "[]"); } catch { cart = []; } }
const cartTotal = () => cart.reduce((t, i) => t + i.qty * finalPrice(prodById(i.id)), 0);

function addToCart(id) {
  if (cart.some((i) => i.id === id)) { openCart(true); return; }
  cart.push({ id, qty: 1 });
  toast("Agregado a tu pedido");
  saveCart(); renderCart(); renderGrid();
}

function renderCart() {
  cart = cart.filter((i) => prodById(i.id));
  const n = cart.reduce((t, i) => t + i.qty, 0);
  $("cartBadge").hidden = n === 0;
  $("cartBadge").textContent = n;
  $("cartTotal").textContent = money(cartTotal());
  $("sendOrder").disabled = n === 0;
  if (n === 0 && step === "checkout") setStep("cart");
  const needsForm = pedidosCfg().datos !== "ninguno" || pedidosCfg().entregas.length > 1;
  $("sendLabel").textContent = step === "cart" && needsForm ? "Continuar" : "Enviar pedido por WhatsApp";
  $("cartList").innerHTML = n === 0
    ? `<p class="vacio">Tu pedido está vacío. Agrega productos desde el catálogo.</p>`
    : cart.map((i) => {
        const p = prodById(i.id);
        return `<div class="line">
          <img src="${esc(photoOf(p))}" alt="" />
          <div><b>${esc(p.name)}</b><small>${money(finalPrice(p))} c/u</small></div>
          <div class="qty"><button data-dec="${esc(i.id)}" aria-label="Menos">−</button><span>${i.qty}</span><button data-inc="${esc(i.id)}" aria-label="Más">+</button></div>
        </div>`;
      }).join("");
}

function setStep(s) {
  step = s;
  const co = s === "checkout";
  $("cartList").hidden = co;
  $("checkout").hidden = !co;
  $("backCart").hidden = !co;
  $("drawerTitle").textContent = co ? "Datos del pedido" : "Tu pedido";
  if (co) prepareCheckout();
  renderCart();
}

function prepareCheckout() {
  const pc = pedidosCfg();
  const req = pc.datos === "obligatorio";
  const hide = pc.datos === "ninguno";
  for (const id of ["coName", "coPhone"]) { $(id).closest("label").hidden = hide; $(id).required = req; }
  document.querySelectorAll("#checkout [data-opt]").forEach((s) => (s.textContent = req ? "*" : "(opcional)"));
  $("coNote").textContent = hide ? "Elige cómo lo quieres recibir; el negocio te confirma por WhatsApp."
    : req ? "Tus datos se comparten solo con este negocio para entregarte tu pedido."
    : "Tus datos son opcionales y solo los ve este negocio. Si prefieres, déjalos en blanco.";
  const entregas = pc.entregas.filter((k) => ENTREGAS[k]);
  const cur = document.querySelector('input[name="coDel"]:checked')?.value;
  $("coDelivery").hidden = entregas.length === 0;
  $("coDelivery").innerHTML = `<legend>¿Cómo lo quieres recibir?</legend>` + entregas.map((k, i) =>
    `<label class="radio"><input type="radio" name="coDel" value="${k}"${(cur ? cur === k : i === 0) ? " checked" : ""} /> ${ENTREGAS[k]}</label>`).join("");
  $("coErr").textContent = "";
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}
const openCart = (o) => {
  $("drawer").classList.toggle("open", o); $("overlay").classList.toggle("open", o);
  if (!o && step === "checkout") setStep("cart");
};

function sendOrder() {
  const pc = pedidosCfg();
  const needsForm = pc.datos !== "ninguno" || pc.entregas.length > 1;
  if (step === "cart" && needsForm) { setStep("checkout"); return; }

  const name = $("coName").value.trim();
  const phone = $("coPhone").value.trim();
  const delivery = document.querySelector('input[name="coDel"]:checked')?.value || pc.entregas[0] || "";
  const notes = $("coNotes").value.trim();
  if (pc.datos === "obligatorio") {
    if (!name) { $("coErr").textContent = "Escribe tu nombre"; $("coName").focus(); return; }
    if (phone.replace(/\D/g, "").length < 10) { $("coErr").textContent = "Escribe tu teléfono a 10 dígitos"; $("coPhone").focus(); return; }
  }

  const items = cart.map((i) => { const p = prodById(i.id); return { id: p.id, name: p.name, qty: i.qty, price: finalPrice(p) }; });
  const total = cartTotal();
  const lines = items.map((i) => `• ${i.name} x${i.qty} → ${money(i.price * i.qty)}`);
  const extra = [
    name && `👤 ${name}`, phone && `📱 ${phone}`,
    delivery && `🚚 ${ENTREGAS[delivery] || delivery}`, notes && `📝 ${notes}`,
  ].filter(Boolean);
  const text = `Hola ${cfg.name}, quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal: ${money(total)}${extra.length ? "\n\n" + extra.join("\n") : ""}\n\n¿Me confirman disponibilidad?`;

  // Primero abrir WhatsApp (el navegador solo lo permite en el clic), luego registrar
  window.open(waLink(cfg.whatsapp, text), "_blank");
  if (!isPreview) {
    saveLead(storeId, { type: "pedido", items, total, name, phone, delivery, notes });
    measure("order", { v: total });
  }
  cart = []; saveCart(); setStep("cart"); openCart(false); renderGrid();
  toast("¡Listo! Termina tu pedido en WhatsApp");
}

/* ── Eventos ── */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat],[data-add],[data-inc],[data-dec],[data-open],[data-ask]");
  if (!t) return;
  if (t.dataset.cat !== undefined) { cat = t.dataset.cat; render(cfg); return; }
  if (t.dataset.open) { openModal(t.dataset.open); return; }
  if (t.dataset.ask) { measure("ask", { p: t.dataset.ask }); return; } // el enlace abre WhatsApp solo
  if (t.dataset.add) { addToCart(t.dataset.add); return; }
  const id = t.dataset.inc || t.dataset.dec;
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  if (t.dataset.inc) item.qty++;
  else { item.qty--; if (item.qty <= 0) cart = cart.filter((i) => i.id !== id); }
  saveCart(); renderCart(); renderGrid();
});
$("search").addEventListener("input", renderGrid);
$("sort").addEventListener("change", renderGrid);
$("cartBtn").addEventListener("click", () => openCart(true));
$("closeCart").addEventListener("click", () => openCart(false));
$("backCart").addEventListener("click", () => setStep("cart"));
$("overlay").addEventListener("click", () => openCart(false));
$("sendOrder").addEventListener("click", sendOrder);
$("checkout").addEventListener("submit", (e) => { e.preventDefault(); sendOrder(); });
$("pmClose").addEventListener("click", closeModal);
$("pModal").addEventListener("click", (e) => { if (e.target === $("pModal")) closeModal(); });
$("pmAdd").addEventListener("click", () => { const id = modalId; closeModal(); addToCart(id); });
$("pmAsk").addEventListener("click", () => measure("ask", { p: modalId }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); openCart(false); } });
$("heroWa").addEventListener("click", () => measure("ask"));
$("waFab").addEventListener("click", () => measure("ask"));

/* ── Arranque ── */
function notFound() { $("loading").hidden = true; $("store").hidden = true; $("notfound").hidden = false; }

const params = new URLSearchParams(location.search);
if (params.get("preview")) {
  isPreview = true;
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.data?.type !== "tienda-preview") return;
    const keepScroll = scrollY;
    render(e.data.config);
    if (step === "checkout") prepareCheckout();
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
      .then((data) => {
        if (!data || !data.name) return notFound();
        render(data);
        // Una visita por sesión del navegador
        try { if (!sessionStorage.getItem("v-" + storeId)) { sessionStorage.setItem("v-" + storeId, "1"); measure("visit"); } }
        catch { measure("visit"); }
      })
      .catch(notFound);
  }
}
