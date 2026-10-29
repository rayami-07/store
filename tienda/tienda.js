/* ============================================================
   PLANTILLA DE TIENDA
   - ?t=<id>        carga la tienda guardada en Firebase (/stores/<id>)
   - ?preview=1     vista previa en vivo desde el creador (postMessage)
   Mide visitas, productos vistos, consultas y pedidos (stats.js)
============================================================ */
import { ESTILOS, GIROS, PAGOS, fotoEjemplo } from "./muestras.js";
import { DB_URL, track, saveLead } from "./stats.js";

// Quien ofrece la plataforma (sale en el pie y en la barra de demo)
export const PLATAFORMA = { nombre: "RAYAMI Tiendas", whatsapp: "525581074978" };
export const ENTREGAS = { recoger: "Recoger en tienda", domicilio: "Envío a domicilio", punto: "Punto de encuentro" };

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };
const waLink = (n, text) => `https://api.whatsapp.com/send?phone=${waNumber(n)}${text ? "&text=" + encodeURIComponent(text) : ""}`;

let cfg = null;
let cart = [];
let cat = "";
let storeId = "";
let isPreview = false;
let isSample = false;   // ejemplo dentro de la página de servicios: no abre WhatsApp
const qp = new URLSearchParams(location.search);
const mesa = (qp.get("mesa") || "").replace(/[^\w -]/g, "").slice(0, 12);
let step = "cart"; // cart | checkout
let modalId = "";
let modalSel = {}; // opciones elegidas en la ficha: { Talla: "M" }

const measure = (t, extra) => { if (!isPreview && !isTrial) track(storeId, t, extra); };

function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
const finalPrice = (p) => (p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price);
const photoOf = (p) => p.photo || fotoEjemplo(p.emoji || (GIROS[cfg.giro] || GIROS.otro).emoji, cfg.color);
const pedidosCfg = () => ({ datos: "opcional", entregas: ["recoger", "domicilio"], ...(cfg.pedidos || {}) });
const pagosCfg = () => {
  const pc = { metodos: ["entrega", "transferencia"], anticipado: false, banco: "", clabe: "", titular: "", link: "", ...(cfg.pagos || {}) };
  // Si cobra antes, "pago al recibir" no aplica
  pc.metodos = (pc.metodos || []).filter((m) => PAGOS[m] && !(pc.anticipado && m === "entrega"));
  return pc;
};
const isVitrina = () => cfg.plan === "vitrina"; // paquete catálogo/menú: sin carrito
let isTrial = false; // modo prueba: el prospecto ve sus cambios guardados en su celular
export const TRIAL_KEY = (id) => "tienda-prueba-" + id;
const varsOf = (p) => (p.variantes || []).filter((g) => g && g.nombre && (g.opciones || []).length);
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
  $("aviso").textContent = mesa ? `Estás pidiendo para la mesa ${mesa}` : (cfg.aviso || "");
  $("heroEyebrow").textContent = cfg.name || "";
  $("heroTitle").textContent = cfg.tagline || giro.tagline;
  const first = cfg.products[0];
  $("heroImg").src = first ? photoOf(first) : fotoEjemplo(giro.emoji, cfg.color);

  const hello = `Hola ${cfg.name || ""}, vi su tienda en línea y tengo una pregunta`;
  $("heroWa").href = waLink(cfg.whatsapp, hello);
  $("waFab").href = waLink(cfg.whatsapp, hello);
  $("ftrContact").innerHTML = cfg.whatsapp ? `WhatsApp: <b>${esc(cfg.whatsapp)}</b>${cfg.horario ? " · " + esc(cfg.horario) : ""}` : "";
  $("ftrMade").innerHTML = `Tienda creada con <a href="${new URL("../servicios/", location.href).href}" target="_blank" rel="noopener">${esc(PLATAFORMA.nombre)}</a>`;

  const isDemo = cfg.status === "demo";
  $("demoBar").hidden = !isDemo;
  $("demoCta").href = waLink(PLATAFORMA.whatsapp, `Hola, vi la vista previa de mi tienda "${cfg.name}" y la quiero`);
  $("demoPanel").href = storeId ? `panel.html?t=${storeId}` : "#";
  $("demoPanel").hidden = !storeId;
  const tb = $("demoTry");
  if (tb) { tb.href = storeId ? `editar.html?t=${storeId}` : "#"; tb.hidden = !storeId; tb.textContent = isTrial ? "Seguir editando" : "Pruébala: agrega tus productos"; }
  $("trialBar") && ($("trialBar").hidden = !isTrial);

  const used = new Set(cfg.products.map((p) => p.category).filter(Boolean));
  const cats = [...(cfg.categorias || []).filter((c) => used.has(c)), ...[...used].filter((c) => !(cfg.categorias || []).includes(c))];
  if (cat && !used.has(cat)) cat = "";
  $("chips").innerHTML = cats.length > 1
    ? [`<button class="chip${cat ? "" : " active"}" data-cat="">Todo</button>`, ...cats.map((c) => `<button class="chip${c === cat ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)].join("")
    : "";

  $("cartBtn").hidden = isVitrina();
  if (isVitrina()) openCart(false);
  renderGrid();
  renderCart();
  $("loading").hidden = true;
  $("notfound").hidden = true;
  $("store").hidden = false;
}

const askText = (p, sel) => `Hola ${cfg.name}, me interesa "${p.name}"${sel ? ` (${sel})` : ""} de ${money(finalPrice(p))}. ¿Me pueden dar más información?`;

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
    const off = !!p.agotado;
    const askBtn = `<a class="ask${isVitrina() ? " ask-wide" : ""}" href="${waLink(cfg.whatsapp, askText(p))}" target="_blank" rel="noopener" data-ask="${esc(p.id)}" aria-label="Preguntar por ${esc(p.name)}" title="Preguntar por WhatsApp"><i class="fa-brands fa-whatsapp"></i>${isVitrina() ? " Preguntar" : ""}</a>`;
    const buyBtn = off ? `<button class="add" disabled>Agotado</button>`
      : varsOf(p).length
        ? `<button class="add${inCart ? " in" : ""}" data-open="${esc(p.id)}">${inCart ? "En tu pedido ✓" : "Elegir opciones"}</button>`
        : `<button class="add${inCart ? " in" : ""}" data-add="${esc(p.id)}">${inCart ? "En tu pedido ✓" : "Agregar"}</button>`;
    return `<article class="card${off ? " sold-out" : ""}">
      <div class="card-img" data-open="${esc(p.id)}"><img src="${esc(photoOf(p))}" alt="${esc(p.name)}" loading="lazy" />${off ? `<span class="tag-off">Agotado</span>` : sale ? `<span class="tag-sale">Oferta</span>` : ""}</div>
      <div class="card-name" data-open="${esc(p.id)}">${esc(p.name)}</div>
      ${p.category ? `<div class="card-cat">${esc(p.category)}</div>` : ""}
      <div class="card-price">${sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : money(p.price)}</div>
      <div class="card-actions">${isVitrina() ? askBtn : buyBtn + askBtn}</div>
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
  modalSel = {};
  renderVars(p);
  $("pmErr").textContent = "";
  $("pmAdd").textContent = !varsOf(p).length && cart.some((i) => i.id === id) ? "Ver mi pedido" : "Agregar al pedido";
  $("pmAdd").hidden = isVitrina() || !!p.agotado;
  $("pmAsk").innerHTML = `<i class="fa-brands fa-whatsapp"></i> ${p.agotado ? "Preguntar cuándo llega" : "Preguntar"}`;
  $("pModal").hidden = false;
  document.body.style.overflow = "hidden";
  measure("view", { p: id });
}
function renderVars(p) {
  $("pmVars").innerHTML = varsOf(p).map((g) => `<div class="var-group"><b>${esc(g.nombre)}</b><div class="var-opts">${
    g.opciones.map((o) => `<button type="button" class="var-opt${modalSel[g.nombre] === o ? " on" : ""}" data-var="${esc(g.nombre)}" data-val="${esc(o)}">${esc(o)}</button>`).join("")
  }</div></div>`).join("");
}
const varText = (sel) => Object.entries(sel).map(([k, v]) => `${k}: ${v}`).join(" · ");

function closeModal() { $("pModal").hidden = true; document.body.style.overflow = ""; modalId = ""; }

/* ── Carrito ── */
const CART_KEY = () => "tienda-cart-" + (storeId || "preview");
function saveCart() { try { localStorage.setItem(CART_KEY(), JSON.stringify(cart)); } catch {} }
function loadCart() { try { cart = JSON.parse(localStorage.getItem(CART_KEY()) || "[]"); } catch { cart = []; } }
const cartTotal = () => cart.reduce((t, i) => t + i.qty * finalPrice(prodById(i.id)), 0);

function addToCart(id, v = "") {
  const p = prodById(id);
  if (varsOf(p).length && !v) { openModal(id); return; }
  const key = id + "|" + v;
  const line = cart.find((i) => (i.key || i.id + "|") === key);
  if (line) { line.qty++; toast("Agregaste otra pieza"); saveCart(); renderCart(); renderGrid(); return; }
  cart.push({ key, id, v, qty: 1 });
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
  const needsForm = checkoutNeeded();
  $("askCart").hidden = n === 0 || step === "checkout";
  $("sendLabel").textContent = step === "cart" && needsForm ? "Continuar" : "Enviar pedido por WhatsApp";
  $("cartList").innerHTML = n === 0
    ? `<p class="vacio">Tu pedido está vacío. Agrega productos desde el catálogo.</p>`
    : cart.map((i) => {
        const p = prodById(i.id);
        return `<div class="line">
          <img src="${esc(photoOf(p))}" alt="" />
          <div><b>${esc(p.name)}</b>${i.v ? `<small class="var">${esc(i.v)}</small>` : ""}<small>${money(finalPrice(p))} c/u</small></div>
          <div class="qty"><button data-dec="${esc(i.key || i.id + "|")}" aria-label="Menos">−</button><span>${i.qty}</span><button data-inc="${esc(i.key || i.id + "|")}" aria-label="Más">+</button></div>
        </div>`;
      }).join("");
}

function checkoutNeeded() {
  const pc = pedidosCfg(), pg = pagosCfg();
  return pc.datos !== "ninguno" || pc.entregas.length > 1 || pg.metodos.length > 1 || pg.metodos.includes("transferencia") || pg.metodos.includes("link");
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
  const pg = pagosCfg();
  const curPay = document.querySelector('input[name="coPayM"]:checked')?.value;
  $("coPay").hidden = pg.metodos.length === 0;
  $("coPay").innerHTML = `<legend>¿Cómo vas a pagar?</legend>` + pg.metodos.map((k, i) =>
    `<label class="radio"><input type="radio" name="coPayM" value="${k}"${(curPay ? curPay === k : i === 0) ? " checked" : ""} /> ${PAGOS[k]}</label>`).join("");
  renderPayBox();
  $("coErr").textContent = "";
}

function renderPayBox() {
  const pg = pagosCfg();
  const m = document.querySelector('input[name="coPayM"]:checked')?.value;
  const box = $("payBox");
  const parts = [];
  if (pg.anticipado) parts.push(`<span class="warn">Este negocio prepara tu pedido cuando recibe el pago.</span>`);
  if (m === "transferencia" && (pg.clabe || pg.banco)) {
    parts.push(`${pg.banco ? `<div>Banco: <b>${esc(pg.banco)}</b></div>` : ""}
      ${pg.clabe ? `<div class="row"><span>CLABE / cuenta: <code id="clabeTxt">${esc(pg.clabe)}</code></span><button type="button" id="copyClabe">Copiar</button></div>` : ""}
      ${pg.titular ? `<div>A nombre de: <b>${esc(pg.titular)}</b></div>` : ""}
      <div>Al enviar tu pedido, manda tu comprobante por el mismo chat.</div>`);
  } else if (m === "transferencia") {
    parts.push(`<div>El negocio te compartirá sus datos para transferir por WhatsApp.</div>`);
  }
  if (m === "link") {
    parts.push(pg.link ? `<div class="row"><span>Paga con tarjeta de forma segura.</span><a class="btn btn-outline" style="height:34px;padding:0 14px" href="${esc(pg.link)}" target="_blank" rel="noopener">Abrir link de pago</a></div>`
      : `<div>El negocio te enviará el link de pago por WhatsApp.</div>`);
  }
  if (m === "entrega") parts.push(`<div>Pagas cuando recibes o recoges tu pedido.</div>`);
  box.innerHTML = parts.join("");
  box.hidden = parts.length === 0;
  $("copyClabe")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(pg.clabe); toast("CLABE copiada"); }
    catch { const r = document.createRange(); r.selectNodeContents($("clabeTxt")); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Selecciona y copia"); }
  });
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}
const openCart = (o) => {
  $("drawer").classList.toggle("open", o); $("overlay").classList.toggle("open", o);
  if (!o && step === "checkout") setStep("cart");
};

function sampleBlock() {
  if (!isSample) return false;
  toast("En tu tienda, aquí se abre WhatsApp con el pedido listo");
  return true;
}

function sendOrder() {
  const pc = pedidosCfg(), pg = pagosCfg();
  if (step === "cart" && checkoutNeeded()) { setStep("checkout"); return; }

  const name = $("coName").value.trim();
  const phone = $("coPhone").value.trim();
  const delivery = document.querySelector('input[name="coDel"]:checked')?.value || pc.entregas[0] || "";
  const notes = $("coNotes").value.trim();
  const pay = document.querySelector('input[name="coPayM"]:checked')?.value || pg.metodos[0] || "";
  if (pc.datos === "obligatorio") {
    if (!name) { $("coErr").textContent = "Escribe tu nombre"; $("coName").focus(); return; }
    if (phone.replace(/\D/g, "").length < 10) { $("coErr").textContent = "Escribe tu teléfono a 10 dígitos"; $("coPhone").focus(); return; }
  }

  const items = cartItems();
  const total = cartTotal();
  const extra = [
    mesa && `Mesa: ${mesa}`,
    name && `Nombre: ${name}`, phone && `Teléfono: ${phone}`,
    delivery && `Entrega: ${ENTREGAS[delivery] || delivery}`,
    pay && `Pago: ${PAGOS[pay] || pay}${pay === "transferencia" ? " (te envío el comprobante)" : ""}`,
    notes && `Nota: ${notes}`,
  ].filter(Boolean);
  const text = `Hola ${cfg.name}, quiero hacer este pedido:\n\n${itemLines(items)}\n\n*Total: ${money(total)}*${extra.length ? "\n\n" + extra.join("\n") : ""}\n\n${pg.anticipado ? "Quedo atento(a) para hacer el pago." : "¿Me confirman disponibilidad?"}`;

  // Primero abrir WhatsApp (el navegador solo lo permite en el clic), luego registrar
  if (sampleBlock()) { cart = []; saveCart(); setStep("cart"); openCart(false); renderGrid(); return; }
  window.open(waLink(cfg.whatsapp, text), "_blank");
  if (!isPreview) {
    if (!isTrial) saveLead(storeId, { type: "pedido", items, total, name, phone, delivery, notes, pay, ...(mesa ? { mesa } : {}) });
    measure("order", { v: total });
  }
  cart = []; saveCart(); setStep("cart"); openCart(false); renderGrid();
  toast("¡Listo! Termina tu pedido en WhatsApp");
}

function cartItems() {
  return cart.map((i) => { const p = prodById(i.id); return { id: p.id, name: p.name, v: i.v || "", qty: i.qty, price: finalPrice(p) }; });
}
const itemLines = (items) => items.map((i) => `- ${i.name}${i.v ? ` (${i.v})` : ""} x${i.qty}: ${money(i.price * i.qty)}`).join("\n");

// Solo preguntar: manda los productos del carrito como duda, sin datos personales
function askCart() {
  const items = cartItems();
  if (sampleBlock()) return;
  const text = `Hola ${cfg.name}, tengo dudas sobre estos productos antes de hacer mi pedido:\n\n${itemLines(items)}\n\n¿Me pueden ayudar?`;
  window.open(waLink(cfg.whatsapp, text), "_blank");
  if (!isPreview && !isTrial) { saveLead(storeId, { type: "consulta", items, total: cartTotal() }); measure("ask"); }
}

/* ── Eventos ── */
document.addEventListener("click", (e) => {
  if (isSample && e.target.closest('a[href*="whatsapp.com"]')) { e.preventDefault(); sampleBlock(); }
}, true);
document.addEventListener("click", (e) => {
  const vb = e.target.closest("[data-var]");
  if (vb) {
    modalSel[vb.dataset.var] = vb.dataset.val;
    renderVars(prodById(modalId)); $("pmErr").textContent = "";
    $("pmAsk").href = waLink(cfg.whatsapp, askText(prodById(modalId), varText(modalSel)));
    return;
  }
  if (e.target.closest('input[name="coPayM"]')) { setTimeout(renderPayBox, 0); }
  const t = e.target.closest("[data-cat],[data-add],[data-inc],[data-dec],[data-open],[data-ask]");
  if (!t) return;
  if (t.dataset.cat !== undefined) { cat = t.dataset.cat; render(cfg); return; }
  if (t.dataset.open) { openModal(t.dataset.open); return; }
  if (t.dataset.ask) { measure("ask", { p: t.dataset.ask }); return; } // el enlace abre WhatsApp solo
  if (t.dataset.add) { addToCart(t.dataset.add); return; }
  const key = t.dataset.inc || t.dataset.dec;
  const item = cart.find((i) => (i.key || i.id + "|") === key);
  if (!item) return;
  if (t.dataset.inc) item.qty++;
  else { item.qty--; if (item.qty <= 0) cart = cart.filter((i) => i !== item); }
  saveCart(); renderCart(); renderGrid();
});
$("search")?.addEventListener("input", renderGrid);
$("sort")?.addEventListener("change", renderGrid);
$("cartBtn")?.addEventListener("click", () => openCart(true));
$("closeCart")?.addEventListener("click", () => openCart(false));
$("backCart")?.addEventListener("click", () => setStep("cart"));
$("overlay")?.addEventListener("click", () => openCart(false));
$("sendOrder")?.addEventListener("click", sendOrder);
$("checkout")?.addEventListener("submit", (e) => { e.preventDefault(); sendOrder(); });
$("pmClose")?.addEventListener("click", closeModal);
$("pModal")?.addEventListener("click", (e) => { if (e.target === $("pModal")) closeModal(); });
$("pmAdd")?.addEventListener("click", () => {
  const id = modalId, p = prodById(id);
  if (!varsOf(p).length && cart.some((i) => i.id === id)) { closeModal(); openCart(true); return; }
  const faltan = varsOf(p).filter((g) => !modalSel[g.nombre]).map((g) => g.nombre.toLowerCase());
  if (faltan.length) { $("pmErr").textContent = `Elige ${faltan.join(" y ")}`; return; }
  const v = varText(modalSel);
  closeModal(); addToCart(id, v);
});
$("askCart")?.addEventListener("click", askCart);
$("pmAsk")?.addEventListener("click", () => measure("ask", { p: modalId }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); openCart(false); } });
$("heroWa")?.addEventListener("click", () => measure("ask"));
$("waFab")?.addEventListener("click", () => measure("ask"));

/* ── Arranque ── */
function notFound() { $("loading").hidden = true; $("store").hidden = true; $("notfound").hidden = false; }

const params = qp;
if (params.get("preview")) {
  isPreview = true;
  isSample = !!params.get("muestra");
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
        if (params.get("prueba")) {
          try {
            const local = JSON.parse(localStorage.getItem(TRIAL_KEY(storeId)) || "null");
            if (local) { isTrial = true; data = { ...data, ...local }; }
          } catch {}
        }
        render(data);
        // Una visita por sesión del navegador
        try { if (!sessionStorage.getItem("v-" + storeId)) { sessionStorage.setItem("v-" + storeId, "1"); measure("visit"); } }
        catch { measure("visit"); }
      })
      .catch(notFound);
  }
}
