/* ============================================================
   CREADOR DE TIENDAS — genera demos en /stores/<id>
   Solo el admin puede entrar (Firebase Authentication + reglas)
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { GIROS, ESTILOS, COLORES, fotoEjemplo, productosDeEjemplo,
  PLANTILLAS, FORMAS, BOTONES, PORTADAS, TEMA_BASE, plantillasPara, plantillaDelGiro, disenoDePlantilla, temaDe, contraste, inkFor,
  TEXTURAS, INTENSIDADES, TEXTURA_EN, texturaCSS, ANIMACIONES, MOVIMIENTO, tresOpciones } from "../tienda/muestras.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL, listAll, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { aggregate, money, pct, ago } from "../tienda/stats.js";

const FB_CONFIG = {
  apiKey: "AIzaSyDDVxmRmKb9yIZSV0ZxkPKvQPOK-oAGMWU",
  authDomain: "rayami-store.firebaseapp.com",
  databaseURL: "https://rayami-store-default-rtdb.firebaseio.com",
  projectId: "rayami-store",
  storageBucket: "rayami-store.firebasestorage.app",
  messagingSenderId: "57542479161",
  appId: "1:57542479161:web:425e75300b964e1f526ce8",
};
const app = initializeApp(FB_CONFIG);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const ADMIN_EMAILS = ["raulbenitez563@gmail.com"];

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TIENDA_URL = new URL("../tienda/", location.href).href;
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };

/* ── Estado del formulario ── */
let state = blank();
let editingId = "";
let editingStamp = 0;   // updatedAt de la tienda cuando la abriste (para no pisar cambios del dueño)
let samplesUntouched = true; // si no han editado productos, cambiar de giro carga sus ejemplos
let pagosTouched = false;
let designTouched = false;   // si no han tocado el diseño, cambiar de giro pone la plantilla del giro
const openRows = new Set();   // productos con "descripción y opciones" abiertos

function blank(giro = "ropa") {
  const g = GIROS[giro];
  const d = disenoDePlantilla(plantillaDelGiro(giro));
  return { plan: "pedidos", name: "", giro, tagline: "", whatsapp: "", horario: "", aviso: "", logo: "", color: d.color, estilo: d.estilo, tema: d.tema, products: productosDeEjemplo(giro),
    pedidos: { datos: "opcional", entregas: ["recoger", "domicilio"] },
    pagos: { metodos: ["entrega", "transferencia"], anticipado: !!g.pagoAnticipado, banco: "", clabe: "", titular: "", link: "" } };
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ── Login ── */
onAuthStateChanged(auth, (u) => {
  const ok = u && ADMIN_EMAILS.includes((u.email || "").toLowerCase());
  $("loginView").hidden = !!ok;
  $("appView").hidden = !ok;
  if (ok) { fillForm(); loadDemos(); if (!editingId) openGiroPick(true); }
});
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("lErr").textContent = "";
  try {
    const { user } = await signInWithEmailAndPassword(auth, $("lEmail").value.trim().toLowerCase(), $("lPass").value);
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) { await signOut(auth); $("lErr").textContent = "Esta cuenta no es de administrador."; }
  } catch { $("lErr").textContent = "Correo o contraseña incorrectos."; }
});
$("logout").addEventListener("click", () => signOut(auth));

/* ── Vista previa en vivo ── */
const frame = $("preview");
let frameReady = false;
window.addEventListener("message", (e) => {
  if (e.origin === location.origin && e.data?.type === "tienda-ready") { frameReady = true; pushPreview(); }
});
frame.addEventListener("load", () => { frameReady = true; pushPreview(); });
// Siempre la versión más reciente de la plantilla (evita copias viejas en caché)
frame.src = `../tienda/?preview=1&v=${Date.now()}`;
let previewTimer;
function pushPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (!frameReady) return;
    frame.contentWindow.postMessage({ type: "tienda-preview", config: { ...configOut(), status: "demo" } }, location.origin);
  }, 120);
}

/* ── Formulario ── */
function fillForm() {
  $("fGiro").innerHTML = Object.entries(GIROS).map(([k, g]) => `<option value="${k}">${g.emoji} ${g.label}</option>`).join("");
  $("fName").value = state.name;
  $("fGiro").value = state.giro;
  $("fTagline").value = state.tagline;
  $("fTagline").placeholder = GIROS[state.giro].tagline;
  $("fWa").value = state.whatsapp;
  $("fHorario").value = state.horario;
  $("fAviso").value = state.aviso;
  document.querySelectorAll('#optPlan input').forEach((r) => (r.checked = r.value === (state.plan || "pedidos")));
  renderLogo(); renderDiseno(); renderProds(); renderPedidos(); renderPagos();
  $("editingNote").hidden = !editingId;
  $("editingNote").textContent = editingId ? `Editando la demo "${state.name}". Al guardar se actualiza el mismo link.` : "";
  pushPreview();
}

const bind = (id, key, after) => $(id).addEventListener("input", () => { state[key] = $(id).value; after?.(); pushPreview(); });
bind("fName", "name");
bind("fTagline", "tagline");
bind("fWa", "whatsapp");
bind("fHorario", "horario");
bind("fAviso", "aviso");
$("fGiro").addEventListener("change", () => {
  state.giro = $("fGiro").value;
  $("fTagline").placeholder = GIROS[state.giro].tagline;
  if (!designTouched) Object.assign(state, disenoDePlantilla(plantillaDelGiro(state.giro)));
  if (samplesUntouched) state.products = productosDeEjemplo(state.giro);
  if (!pagosTouched) { state.pagos.anticipado = !!GIROS[state.giro].pagoAnticipado; renderPagos(); }
  renderDiseno(); renderProds(); pushPreview();
});

/* Imágenes: se reducen en el navegador antes de guardarlas */
function resizeImage(file, max, type = "image/jpeg", quality = 0.78) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d");
      if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL(type, quality));
    };
    img.onerror = () => fail(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

function renderLogo() {
  $("logoBox").innerHTML = state.logo ? `<img src="${esc(state.logo)}" alt="Logo" />` : `<i class="fa-regular fa-image"></i>`;
  $("logoRemove").hidden = !state.logo;
}
$("fLogo").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { state.logo = await resizeImage(f, 320, "image/png"); renderLogo(); pushPreview(); }
  catch (err) { toast(err.message); }
  e.target.value = "";
});
$("logoRemove").addEventListener("click", () => { state.logo = ""; renderLogo(); pushPreview(); });

/* ── Paso 1: ¿de qué es el negocio? ──
   Al elegir, se usa la misma lógica que cambiar el giro en el formulario
   (ejemplos del giro y su plantilla, si aún no se tocaron) */
function renderGiroPick() {
  $("giroGrid").innerHTML = Object.entries(GIROS).map(([k, g]) => {
    const p = PLANTILLAS[plantillaDelGiro(k)];
    return `<button type="button" class="giro-card${k === state.giro && !$("giroPick").dataset.nueva ? " active" : ""}" data-giro="${k}">
      <span class="giro-emoji">${g.emoji}</span><b>${esc(g.label)}</b>
      <span class="giro-dots"><i style="background:${p.fondo}"></i><i style="background:${p.color}"></i><i style="background:${p.tarjetas}"></i></span>
    </button>`;
  }).join("");
}
function openGiroPick(nueva) {
  $("giroPick").dataset.nueva = nueva ? "1" : "";
  $("giroSkip").textContent = nueva ? "Saltar por ahora" : "Cerrar";
  renderGiroPick();
  $("giroPick").hidden = false; $("storeForm").hidden = true; scrollTo(0, 0);
}
function closeGiroPick() { $("giroPick").hidden = true; $("storeForm").hidden = false; }
$("giroGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-giro]"); if (!b) return;
  $("fGiro").value = b.dataset.giro; $("fGiro").dispatchEvent(new Event("change"));
  closeGiroPick();
  toast(`${GIROS[b.dataset.giro].emoji} ${GIROS[b.dataset.giro].label}: escoge una plantilla en Diseño`);
});
$("giroSkip").addEventListener("click", closeGiroPick);
document.addEventListener("click", (e) => { if (e.target.closest("[data-pickgiro]")) openGiroPick(false); });

/* ── Diseño: plantillas + ajustes ──
   state.color y state.estilo (como antes) + state.tema = { plantilla, fondo, tarjetas, texto, forma, botones, portada } */
const TEMA_KEYS = ["fondo", "tarjetas", "texto", "forma", "botones", "portada", "textura", "intensidad", "texturaEn", "animacion", "avisoMov", "ofertas", "chipsFijas", "mov"];
const norm = (c) => String(c || "").toLowerCase();
function tplModificada() {
  const k = state.tema?.plantilla; if (!PLANTILLAS[k]) return false;
  const d = disenoDePlantilla(k);
  return norm(d.color) !== norm(state.color) || d.estilo !== state.estilo || TEMA_KEYS.some((t) => norm(d.tema[t]) !== norm(state.tema[t]));
}
function changed() { designTouched = true; renderPlantillas(); renderTexturas(); renderContraste(); renderProds(); pushPreview(); }

function miniTpl(k) {
  const p = PLANTILLAS[k], st = ESTILOS[p.estilo] || ESTILOS.moderno;
  const r = FORMAS[p.forma].r, br = BOTONES[p.botones].r, colorHero = p.portada === "color";
  const tx = p.textura && p.textura !== "ninguna" ? texturaCSS(p.textura, TEXTURAS[p.textura]?.marca ? p.color : p.texto, "fuerte") : null;
  return `<span class="tpl-mini" style="background-color:${p.fondo};color:${p.texto}${tx ? `;background-image:${tx.img.replaceAll('"', "'")};background-size:${tx.size}` : ""}">
      <span class="tpl-hero" style="${colorHero ? `background:${p.color};color:${inkFor(p.color)};border-radius:${r}` : ""}">
        <b style="font-family:${st.display};font-weight:${st.weight};${st.upper ? "text-transform:uppercase" : ""}">Aa</b>
        <i style="background:${colorHero ? "currentColor" : p.color};border-radius:${br}"></i>
      </span>
      <span class="tpl-grid">${`<i style="background:${p.tarjetas};border-radius:${r}"></i>`.repeat(3)}</span>
    </span>`;
}
function renderPlantillas() {
  const { sugeridas, otras } = plantillasPara(state.giro);
  const cur = state.tema?.plantilla, mod = tplModificada();
  const card = (k, sug) => `<button type="button" class="tpl${k === cur ? " active" : ""}" data-tpl="${k}" aria-pressed="${k === cur}">
      ${miniTpl(k)}<span class="tpl-name">${esc(PLANTILLAS[k].label)}${k === cur && mod ? " <small>· ajustada</small>" : sug ? " <small>· sugerida</small>" : ""}</span>
    </button>`;
  $("plantillas").innerHTML = `<div class="tpl-grid-wrap">${sugeridas.map((k) => card(k, true)).join("")}</div>
    <details class="tpl-more"${sugeridas.includes(cur) || !cur ? "" : " open"}><summary>Ver otras plantillas (${otras.length})</summary>
      <div class="tpl-grid-wrap">${otras.map((k) => card(k, false)).join("")}</div></details>`;
  $("resetTpl").hidden = !mod;
  $("tplHint").textContent = !PLANTILLAS[cur]
    ? "Esta tienda tiene el diseño de antes. Escoge una plantilla para cambiarlo, o ajústalo abajo."
    : "Escoge una base y luego ajusta lo que quieras. Los cambios se ven al momento en la vista previa.";
}
$("plantillas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tpl]"); if (!b) return;
  Object.assign(state, disenoDePlantilla(b.dataset.tpl));
  designTouched = true; renderDiseno(); renderProds(); pushPreview();
});
$("resetTpl").addEventListener("click", () => {
  Object.assign(state, disenoDePlantilla(state.tema.plantilla)); renderDiseno(); renderProds(); pushPreview(); toast("Plantilla restablecida");
});

function renderSwatches() {
  const custom = !COLORES.includes(norm(state.color));
  $("swatches").innerHTML = COLORES.map((c) => `<button type="button" class="sw${c === norm(state.color) ? " active" : ""}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join("")
    + `<input type="color" class="sw-custom${custom ? " active" : ""}" id="customColor" value="${state.color}" title="Otro color" aria-label="Otro color" />`;
  $("customColor").addEventListener("input", (e) => { state.color = e.target.value; changed(); });
  $("customColor").addEventListener("change", renderSwatches);
}
$("swatches").addEventListener("click", (e) => {
  const b = e.target.closest("[data-color]"); if (!b) return;
  state.color = b.dataset.color; renderSwatches(); changed();
});

function renderEstilos() {
  $("estilos").innerHTML = Object.entries(ESTILOS).map(([k, s]) =>
    `<button type="button" class="est${k === state.estilo ? " active" : ""}" data-estilo="${k}">
      <b style="font-family:${s.display};font-weight:${s.weight};${s.upper ? "text-transform:uppercase" : ""}">Aa</b><span>${s.label}</span>
    </button>`).join("");
}
$("estilos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-estilo]"); if (!b) return;
  state.estilo = b.dataset.estilo; renderEstilos(); changed();
});

/* Colores de la página */
for (const [id, k] of [["tFondo", "fondo"], ["tTarjetas", "tarjetas"], ["tTexto", "texto"]])
  $(id).addEventListener("input", (e) => { state.tema[k] = e.target.value; changed(); });
function renderContraste() {
  const t = state.tema, avisos = [];
  if (contraste(t.texto, t.fondo) < 4.5) avisos.push("el texto casi no se lee sobre el fondo");
  if (contraste(t.texto, t.tarjetas) < 3) avisos.push("el texto se pierde sobre las tarjetas");
  if (contraste(state.color, t.fondo) < 1.6) avisos.push("el color de la marca casi no se distingue del fondo");
  $("contrastWarn").hidden = !avisos.length;
  $("contrastWarn").innerHTML = avisos.length ? `<i class="fa-solid fa-triangle-exclamation"></i> Ojo: ${avisos.join("; ")}.` : "";
}

/* Forma, botones y portada */
const SEGS = [["optForma", "forma", FORMAS], ["optBotones", "botones", BOTONES], ["optPortada", "portada", PORTADAS],
  ["optIntensidad", "intensidad", INTENSIDADES], ["optTexEn", "texturaEn", TEXTURA_EN], ["optAnim", "animacion", ANIMACIONES], ["optMov", "mov", MOVIMIENTO]];
/* Interruptores: carrusel de ofertas, aviso en movimiento, categorías fijas */
const SWITCHES = [["swOfertas", "ofertas"], ["swAvisoMov", "avisoMov"], ["swChips", "chipsFijas"]];
for (const [id, k] of SWITCHES) $(id).addEventListener("change", (e) => { state.tema[k] = e.target.checked; changed(); });
// Aviso si eligió "Destacados" y no ha marcado ninguno con la estrella
function renderMovHint() {
  const m = state.tema?.mov, n = state.products.filter((p) => p.destacado).length;
  $("movHint").textContent = m === "destacados" ? (n ? `${n} producto${n !== 1 ? "s" : ""} marcado${n !== 1 ? "s" : ""} con ⭐.` : "Marca con la ⭐ los productos que quieres que pasen (en la lista de productos).")
    : m === "ofertas" ? "Pasan los productos que tienen precio de oferta." : m === "todos" ? "Pasan todos los productos disponibles." : "";
}
function renderSegs() {
  for (const [id, k, opts] of SEGS)
    $(id).innerHTML = Object.entries(opts).map(([v, o]) => `<button type="button" data-v="${v}" class="${state.tema[k] === v ? "active" : ""}">${o.label}</button>`).join("");
}
for (const [id, k] of SEGS)
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    state.tema[k] = b.dataset.v; renderSegs(); renderTexturas(); renderMovHint(); changed();
  });

/* Texturas: cada botón enseña la trama con los colores actuales de la tienda */
function renderTexturas() {
  const t = state.tema;
  $("optTextura").innerHTML = Object.entries(TEXTURAS).map(([k, tx]) => {
    const big = tx.tile && tx.tile[0] > 60;   // en la muestra chiquita, las tramas grandes se ven a escala
    const css = texturaCSS(k, tx.marca ? state.color : t.texto, t.intensidad === "suave" ? "media" : t.intensidad, { escala: big ? 0.45 : 0.8 });
    return `<button type="button" class="tex${t.textura === k ? " active" : ""}" data-tex="${k}">
      <span class="tex-sw" style="background-color:${t.fondo};background-image:${css.img.replaceAll('"', "'")};background-size:${css.size}">${k === "ninguna" ? '<i class="fa-solid fa-ban"></i>' : ""}</span>
      <span>${tx.label}</span></button>`;
  }).join("");
  $("texExtra").hidden = t.textura === "ninguna";
}
$("optTextura").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tex]"); if (!b) return;
  state.tema.textura = b.dataset.tex; renderTexturas(); changed();
});

function renderDiseno() {
  state.tema = { plantilla: "", ...temaDe(state), plantilla: state.tema?.plantilla || "" };
  renderPlantillas(); renderSwatches(); renderEstilos(); renderSegs(); renderTexturas(); renderContraste(); renderMovHint();
  $("tFondo").value = state.tema.fondo; $("tTarjetas").value = state.tema.tarjetas; $("tTexto").value = state.tema.texto;
  for (const [id, k] of SWITCHES) $(id).checked = !!state.tema[k];
  const g = GIROS[state.giro] || GIROS.otro; $("dhGiro").textContent = `${g.emoji} ${g.label}`;
}

$("optPlan").addEventListener("change", (e) => { state.plan = e.target.value; pushPreview(); });

/* Opciones de pedido */
function renderPedidos() {
  const pc = { datos: "opcional", entregas: ["recoger", "domicilio"], ...(state.pedidos || {}) };
  state.pedidos = pc;
  document.querySelectorAll('#optDatos input').forEach((r) => (r.checked = r.value === pc.datos));
  document.querySelectorAll('#optEntregas input').forEach((c) => (c.checked = pc.entregas.includes(c.value)));
}
$("optDatos").addEventListener("change", (e) => { state.pedidos.datos = e.target.value; pushPreview(); });
$("optEntregas").addEventListener("change", () => {
  state.pedidos.entregas = [...document.querySelectorAll('#optEntregas input:checked')].map((c) => c.value);
  pushPreview();
});

/* Pagos */
function renderPagos() {
  const pg = { metodos: ["entrega", "transferencia"], anticipado: false, banco: "", clabe: "", titular: "", link: "", ...(state.pagos || {}) };
  state.pagos = pg;
  document.querySelectorAll("#optPagos input").forEach((c) => (c.checked = pg.metodos.includes(c.value)));
  $("fAnticipado").checked = !!pg.anticipado;
  $("fBanco").value = pg.banco || ""; $("fClabe").value = pg.clabe || ""; $("fTitular").value = pg.titular || ""; $("fLink").value = pg.link || "";
  $("payTransfer").hidden = !pg.metodos.includes("transferencia");
  $("payLink").hidden = !pg.metodos.includes("link");
}
$("optPagos").addEventListener("change", () => {
  state.pagos.metodos = [...document.querySelectorAll("#optPagos input:checked")].map((c) => c.value);
  pagosTouched = true; renderPagos(); pushPreview();
});
$("fAnticipado").addEventListener("change", (e) => { state.pagos.anticipado = e.target.checked; pagosTouched = true; pushPreview(); });
for (const [id, k] of [["fBanco", "banco"], ["fClabe", "clabe"], ["fTitular", "titular"], ["fLink", "link"]])
  $(id).addEventListener("input", (e) => { state.pagos[k] = e.target.value.trim(); pagosTouched = true; pushPreview(); });

/* Productos */
let newCatRow = -1;   // fila donde se está escribiendo una categoría nueva
function renderProds() {
  const cats = GIROS[state.giro].categorias;
  const allCats = [...new Set([...cats, ...state.products.map((p) => p.category).filter(Boolean)])];
  $("prodCount").textContent = `(${state.products.length})`;
  $("prods").innerHTML = state.products.map((p, i) => `
    <div class="prod" data-i="${i}">
      <label class="prod-photo" title="Cambiar foto">
        <img src="${esc(p.photo || fotoEjemplo(p.emoji || GIROS[state.giro].emoji, state.color, state.tema?.tarjetas))}" alt="" />
        <i class="fa-solid fa-camera"></i>
        <input type="file" accept="image/*" hidden data-photo="${i}" />
      </label>
      <div class="prod-fields">
        <input value="${esc(p.name)}" data-f="name" placeholder="Nombre del producto" aria-label="Nombre" />
        <div class="prod-prices">
          <input value="${p.price || ""}" data-f="price" inputmode="decimal" placeholder="Precio" aria-label="Precio" />
          <input value="${p.salePrice || ""}" data-f="salePrice" inputmode="decimal" placeholder="Oferta" aria-label="Precio de oferta" />
          ${newCatRow === i
            ? `<input data-newcat="${i}" maxlength="30" placeholder="Ej. Tacos, Camisas" aria-label="Nombre de la categoría nueva" />`
            : `<select data-f="category" aria-label="Categoría">${allCats.map((c) => `<option${c === p.category ? " selected" : ""}>${esc(c)}</option>`).join("")}<option value="__new">+ Nueva…</option></select>`}
        </div>
      </div>
      <div class="prod-side">
        <button type="button" class="prod-star${p.destacado ? " on" : ""}" data-star="${i}" aria-pressed="${!!p.destacado}" title="${p.destacado ? "Quitar de destacados" : "Destacar (pasa en la tira en movimiento)"}"><i class="fa-${p.destacado ? "solid" : "regular"} fa-star"></i></button>
        <button type="button" class="prod-del" data-del="${i}" aria-label="Quitar producto"><i class="fa-solid fa-trash"></i></button>
      </div>
      <button type="button" class="prod-toggle" data-more="${esc(p.id)}">${openRows.has(p.id) ? "▾" : "▸"} Descripción y opciones${
        (p.variantes || []).length ? ` · <b>${(p.variantes || []).map((g) => esc(g.nombre)).join(", ")}</b>` : ""}</button>
      ${openRows.has(p.id) ? `<div class="prod-more">
        <textarea data-f="desc" maxlength="300" placeholder="Descripción: material, medidas, qué incluye…">${esc(p.desc || "")}</textarea>
        ${[0, 1].map((k) => { const g = (p.variantes || [])[k] || { nombre: "", opciones: [] }; return `<div class="var-row">
          <input data-vn="${k}" value="${esc(g.nombre)}" placeholder="${k ? "Color" : "Talla"}" aria-label="Nombre de la opción" />
          <input data-vv="${k}" value="${esc((g.opciones || []).join(", "))}" placeholder="${k ? "Negro, Blanco, Rojo" : "CH, M, G"}" aria-label="Valores separados por coma" />
        </div>`; }).join("")}
      </div>` : ""}
    </div>`).join("");
}
$("prods").addEventListener("input", (e) => {
  const row = e.target.closest(".prod");
  if (row && (e.target.dataset.vn !== undefined || e.target.dataset.vv !== undefined)) {
    const p = state.products[+row.dataset.i];
    const vars = [0, 1].map((k) => ({ ...((p.variantes || [])[k] || { nombre: "", opciones: [] }) }));
    const k = +(e.target.dataset.vn ?? e.target.dataset.vv);
    if (e.target.dataset.vn !== undefined) vars[k].nombre = e.target.value.trim();
    else vars[k].opciones = e.target.value.split(",").map((x) => x.trim()).filter(Boolean);
    p.variantes = vars.filter((g) => g.nombre || g.opciones.length);
    samplesUntouched = false; pushPreview(); return;
  }
  const f = e.target.dataset.f;
  if (!row || !f) return;
  const p = state.products[+row.dataset.i];
  p[f] = f === "price" || f === "salePrice" ? Number(String(e.target.value).replace(/[^\d.]/g, "")) || 0 : e.target.value;
  samplesUntouched = false; pushPreview();
});
$("prods").addEventListener("change", async (e) => {
  if (e.target.dataset.f === "category") {
    const i = +e.target.closest(".prod").dataset.i;
    if (e.target.value === "__new") { newCatRow = i; renderProds(); $("prods").querySelector(`[data-newcat="${i}"]`)?.focus(); return; }
    state.products[i].category = e.target.value; samplesUntouched = false; pushPreview(); return;
  }
  if (e.target.dataset.photo === undefined) return;
  const f = e.target.files[0]; if (!f) return;
  try {
    state.products[+e.target.dataset.photo].photo = await resizeImage(f, 700);
    samplesUntouched = false; renderProds(); pushPreview();
  } catch (err) { toast(err.message); }
});
$("prods").addEventListener("click", (e) => {
  const more = e.target.closest("[data-more]");
  if (more) { const id = more.dataset.more; openRows.has(id) ? openRows.delete(id) : openRows.add(id); renderProds(); return; }
  const star = e.target.closest("[data-star]");
  if (star) { const p = state.products[+star.dataset.star]; p.destacado = !p.destacado; if (!p.destacado) delete p.destacado; samplesUntouched = false; renderProds(); renderMovHint(); pushPreview(); return; }
  const d = e.target.closest("[data-del]"); if (!d) return;
  state.products.splice(+d.dataset.del, 1); samplesUntouched = false; renderProds(); pushPreview();
});
$("addProd").addEventListener("click", () => {
  const g = GIROS[state.giro];
  state.products.push({ id: "p" + Date.now().toString(36), name: "", price: 0, salePrice: 0, category: g.categorias[0], emoji: g.emoji, desc: "", photo: "" });
  samplesUntouched = false; renderProds(); pushPreview();
  $("prods").lastElementChild?.querySelector("input[data-f=name]")?.focus();
});
$("loadSamples").addEventListener("click", () => { state.products = productosDeEjemplo(state.giro); samplesUntouched = true; renderProds(); pushPreview(); });
$("newDemo").addEventListener("click", () => { state = blank(); editingId = ""; editingStamp = 0; samplesUntouched = true; pagosTouched = false; designTouched = false; openRows.clear(); $("result").hidden = true; fillForm(); openGiroPick(true); });

/* ── Fotos a Firebase Storage ──
   Las fotos nuevas llegan como texto (data:image/...). Al guardar se suben a
   Storage en tiendas/<id>/ y en la base solo queda el link.
   Si Storage aún no está activado, se quedan como estaban (respaldo). */
const isData = (s) => typeof s === "string" && s.startsWith("data:image/");
async function uploadPhoto(storeId, name, dataUrl) {
  const ext = dataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const r = sRef(storage, `tiendas/${storeId}/${name}-${Date.now().toString(36)}.${ext}`);
  await uploadString(r, dataUrl, "data_url", { cacheControl: "public,max-age=31536000" });
  return getDownloadURL(r);
}
async function photosToStorage(storeId, out) {
  const pend = (out.logo && isData(out.logo) ? 1 : 0) + out.products.filter((p) => isData(p.photo)).length;
  if (!pend) return { ok: true, n: 0 };
  let done = 0;
  const step = () => { $("saveBtn").innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Subiendo fotos ${++done}/${pend}…`; };
  try {
    if (isData(out.logo)) { out.logo = await uploadPhoto(storeId, "logo", out.logo); step(); }
    for (const p of out.products) {
      if (isData(p.photo)) { p.photo = await uploadPhoto(storeId, `p-${p.id}`, p.photo); step(); }
    }
    return { ok: true, n: pend };
  } catch (err) {
    console.warn("Storage no disponible, se guardan dentro de la base:", err.code || err.message);
    return { ok: false, n: pend };
  }
}
async function deleteStorePhotos(storeId) {
  try {
    const { items } = await listAll(sRef(storage, `tiendas/${storeId}`));
    await Promise.all(items.map((i) => deleteObject(i).catch(() => {})));
  } catch {}
}

/* ── Guardar ── */
function configOut() {
  const g = GIROS[state.giro];
  return {
    plan: state.plan || "pedidos",
    name: state.name.trim(), giro: state.giro, tagline: state.tagline.trim(),
    whatsapp: state.whatsapp.trim(), horario: state.horario.trim(), aviso: state.aviso.trim(),
    logo: state.logo, color: state.color, estilo: state.estilo,
    categorias: [...new Set([...g.categorias, ...state.products.map((p) => p.category).filter(Boolean)])],
    tema: { ...temaDe(state), plantilla: state.tema?.plantilla || "" },
    pedidos: { datos: state.pedidos?.datos || "opcional", entregas: state.pedidos?.entregas || [] },
    pagos: { ...state.pagos },
    products: state.products.filter((p) => p.name.trim()).map((p) => ({
      ...p, name: p.name.trim(), desc: (p.desc || "").trim(),
      variantes: (p.variantes || []).filter((g) => g.nombre && (g.opciones || []).length),
    })),
  };
}
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tienda";

$("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = configOut();
  // Si falta un dato y estás en la pestaña Diseño, te regresa a Editar para llenarlo
  const needForm = () => { if ($("editorView").classList.contains("solo-diseno")) showView("editor"); };
  if (!out.name) { needForm(); toast("Escribe el nombre del negocio"); $("fName").focus(); return; }
  if (String(out.whatsapp).replace(/\D/g, "").length < 10) { needForm(); toast("Escribe el WhatsApp a 10 dígitos"); $("fWa").focus(); return; }
  if (!out.products.length) { needForm(); toast("Agrega al menos un producto"); return; }
  const id = editingId || `${slugify(out.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const prev = editingId ? (await get(ref(db, `stores/${id}`))).val() : null;
  if (prev && editingStamp && (prev.updatedAt || 0) > editingStamp) {
    toast("El dueño cambió esta tienda después de que la abriste. Ábrela otra vez desde Mis tiendas para no borrar sus cambios.");
    loadDemos(); return;
  }
  $("saveBtn").disabled = true;
  const saveLabel = $("saveBtn").innerHTML;
  try {
    const up = await photosToStorage(id, out);
    // Lo subido queda en el formulario como link, para no volver a subirlo
    if (up.ok && up.n) { state.logo = out.logo; out.products.forEach((p) => { const s = state.products.find((x) => x.id === p.id); if (s) s.photo = p.photo; }); }
    await set(ref(db, `stores/${id}`), { ...out, status: prev?.status || "demo", createdAt: prev?.createdAt || now, updatedAt: now,
      ...(prev?.opcion ? { opcion: prev.opcion } : {}), ...(prev?.corto ? { corto: prev.corto } : {}), ...(prev?.lealtad ? { lealtad: prev.lealtad } : {}), ...(prev?.urgencia ? { urgencia: prev.urgencia } : {}) });
    // Si es una de las "3 opciones", el contenido (productos, nombre, logo, WhatsApp,
    // pagos…) se copia a las otras; solo el diseño queda distinto en cada una.
    let otras = 0;
    if (prev?.opcion?.grupo) {
      const { color, estilo, tema, ...contenido } = out;
      const hermanas = Object.entries(demos).filter(([k, x]) => k !== id && x.opcion?.grupo === prev.opcion.grupo);
      for (const [k] of hermanas) await update(ref(db, `stores/${k}`), { ...contenido, updatedAt: now });
      otras = hermanas.length;
      demos[id] = { ...out, opcion: prev.opcion, ...(prev.corto ? { corto: prev.corto } : {}) };
    }
    editingId = id; editingStamp = now;
    showResult(id, out, prev?.opcion);
    toast(up.n && !up.ok ? "✅ Demo guardada (fotos dentro de la base: Storage no está activo)"
      : otras ? `✅ Guardada en las ${otras + 1} opciones (cada una conserva su diseño)` : "✅ Demo guardada");
    loadDemos();
  } catch (err) {
    toast(err.code === "PERMISSION_DENIED" ? "Falta actualizar las reglas de Firebase" : "No se pudo guardar: " + err.message);
    console.error(err);
  } finally { $("saveBtn").disabled = false; $("saveBtn").innerHTML = saveLabel; }
});

// Mensaje para mandar las 3 opciones juntas (link de comparación)
function opMsg(grupo, name) {
  return `Hola, le preparé 3 opciones de cómo se vería la tienda en línea de ${name}. Puede verlas y comparar aquí:\n${compararLink(grupo)}\n\n¿Cuál le gusta más?`;
}
function showResult(id, out, opcion) {
  // Si es parte de 3 opciones, se manda el link que compara las 3
  const link = opcion?.grupo ? compararLink(opcion.grupo) : `${TIENDA_URL}?t=${id}`;
  $("resLink").value = link;
  $("openLink").href = link;
  const msg = opcion?.grupo ? opMsg(opcion.grupo, out.name)
    : `Hola, le preparé una muestra de cómo se vería la tienda en línea de ${out.name}. Puede verla aquí:\n${link}\n\nSus clientes ven sus productos y le mandan el pedido directo por WhatsApp.`;
  $("sendWa").href = `https://wa.me/${waNumber(out.whatsapp)}?text=${encodeURIComponent(msg)}`;
  $("result").hidden = false;
  $("editingNote").hidden = false;
  $("editingNote").textContent = `Editando la demo "${out.name}". Al guardar se actualiza el mismo link.`;
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
$("copyLink").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("resLink").value); toast("Link copiado"); }
  catch { $("resLink").select(); toast("Selecciona y copia el link"); }
});

/* ── Mis demos ── */
let demos = {}, owners = {}, admins = {};
const STATUS = { demo: "Demo", activa: "Activa", pausada: "Pausada" };
const statusOf = (s) => (STATUS[s?.status] ? s.status : "activa");
async function loadDemos() {
  try { demos = (await get(ref(db, "stores"))).val() || {}; }
  catch (err) { demos = {}; console.warn(err); }
  try { owners = (await get(ref(db, "storeOwners"))).val() || {}; }
  catch (err) { owners = {}; console.warn("Faltan las reglas de storeOwners:", err.code || err.message); }
  try { admins = (await get(ref(db, "storeAdmin"))).val() || {}; } catch { admins = {}; }
  const list = Object.entries(demos).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  $("demoCount").textContent = list.length ? `(${list.length})` : "";
  if (!$("resumenView").hidden) loadResumen();
  // Las "3 opciones" de un mismo cliente se muestran como UNA tarjeta (se abre para ver cada una)
  const grupos = {};
  for (const [id, x] of list) if (x.opcion?.grupo && statusOf(x) === "demo") (grupos[x.opcion.grupo] ||= []).push([id, x]);
  for (const g of Object.keys(grupos)) { if (grupos[g].length < 2) delete grupos[g]; else grupos[g].sort((m, n) => m[1].opcion.n - n[1].opcion.n); }
  // Separadas por estado: clientes activos (los que vencen pronto primero), pausadas y demos
  const vistos = new Set();
  const secc = { activa: [], pausada: [], demo: [] };
  for (const [id, x] of list) {
    const g = x.opcion?.grupo, st = statusOf(x);
    if (grupos[g]) { if (!vistos.has(g)) { vistos.add(g); secc.demo.push({ html: groupHTML(g, grupos[g]), t: x.updatedAt || 0 }); } continue; }
    const vig = admins[id]?.vigencia || "9999-12-31";
    secc[st].push({ html: itemHTML(id, x), t: x.updatedAt || 0, vig });
  }
  secc.activa.sort((a, b) => a.vig.localeCompare(b.vig));
  const total = secc.activa.length + secc.pausada.length + secc.demo.length;
  $("demoCount").textContent = total ? `(${total})` : "";
  const SEC = [
    ["activa", "Clientes activos", "fa-circle-check", "Ordenados por fecha de vencimiento: arriba los que hay que cobrar primero."],
    ["pausada", "Pausadas", "fa-circle-pause", "Sus clientes ven \"no disponible\"."],
    ["demo", "Demos", "fa-flask", "Muestras para prospectos; todavía no pagan."],
  ];
  const filtro = demoFilter;
  $("demoFilters").innerHTML = [["todas", "Todas", total], ...SEC.map(([k, l]) => [k, l, secc[k].length])]
    .map(([k, l, n]) => `<button type="button" class="dfil${filtro === k ? " active" : ""}" data-dfil="${k}"${n || k === "todas" ? "" : " disabled"}>${l} <span>${n}</span></button>`).join("");
  const html = SEC.filter(([k]) => secc[k].length && (filtro === "todas" || filtro === k))
    .map(([k, l, ic, hint]) => `<section class="dsec">
        <div class="dsec-head"><h3><i class="fa-solid ${ic}"></i> ${l} <span>${secc[k].length}</span></h3><small class="muted">${hint}</small></div>
        ${secc[k].map((x) => x.html).join("")}
      </section>`).join("");
  $("demoList").innerHTML = total ? html : `<div class="empty-demos">Todavía no tienes demos. Crea la primera en la pestaña <b>Editar</b>.</div>`;
}
let demoFilter = "todas";
const openGroups = new Set();
const nProds = (s) => (Array.isArray(s.products) ? s.products.length : Object.keys(s.products || {}).length);
const fcorta = (t) => (t ? new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "");
const logoBox = (s) => `<div class="demo-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${esc(s.logo)}" alt="" />` : esc((s.name || "?")[0])}</div>`;
const tplName = (s) => PLANTILLAS[s.tema?.plantilla]?.label || "Diseño propio";
function opWaLink(grupo, s) {
  const tel = String(s.whatsapp || "").replace(/\D/g, "").length >= 10 && waNumber(s.whatsapp) !== "52" + RAUL_WA ? `phone=${waNumber(s.whatsapp)}&` : "";
  return `https://api.whatsapp.com/send?${tel}text=${encodeURIComponent(opMsg(grupo, s.name))}`;
}
function itemHTML(id, s) {
  return `<div class="demo-item">
      ${logoBox(s)}
      <div><div class="demo-name">${esc(s.name)}<span class="status ${statusOf(s)}">${STATUS[statusOf(s)]}</span></div><div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)} · ${nProds(s)} productos · ${fcorta(s.updatedAt)}${listState(s, admins[id] || {})}${
        Object.values(owners[id] || {}).length ? ` · <i class="fa-solid fa-user"></i> ${Object.values(owners[id]).map((o) => esc(o.email)).join(", ")}` : ""}</div></div>
      <div class="demo-actions">
        <a class="btn btn-light" href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver</a>
        <a class="btn btn-light" href="${TIENDA_URL}panel.html?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-chart-column"></i> Panel</a>
        <button class="btn btn-light" data-copy="${linkTienda(id)}" title="Copiar el link de la tienda"><i class="fa-regular fa-copy"></i> Link</button>
        <button class="btn btn-light" data-edit="${id}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="btn btn-light" data-owner="${id}"><i class="fa-solid fa-${({ demo: "bolt", activa: "key", pausada: "play" })[statusOf(s)]}"></i> ${({ demo: "Activar", activa: "Vigencia y dueños", pausada: "Reactivar" })[statusOf(s)]}</button>
        <button class="btn btn-ghost danger" data-remove="${id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}
function groupHTML(grupo, members) {
  const [, s] = members[0], open = openGroups.has(grupo);
  const fecha = Math.max(...members.map(([, x]) => x.updatedAt || 0));
  return `<div class="demo-item demo-group${open ? " open" : ""}">
      ${logoBox(s)}
      <div><div class="demo-name">${esc(s.name)}<span class="status demo">Demo</span><span class="op-badge">${members.length} opciones de diseño</span></div>
        <div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)} · ${nProds(s)} productos · ${fcorta(fecha)}</div>
        <div class="op-chips">${members.map(([, x]) => `<span class="op-chip"><span class="op-dot" style="background:${esc(x.color || "#111")}"></span>${x.opcion.n} · ${esc(tplName(x))}</span>`).join("")}</div></div>
      <div class="demo-actions">
        <a class="btn btn-light" href="${compararLink(grupo)}" target="_blank" rel="noopener"><i class="fa-solid fa-table-columns"></i> Comparar</a>
        <a class="btn btn-light" href="${opWaLink(grupo, s)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Mandar las ${members.length}</a>
        <button class="btn btn-light" data-gtoggle="${esc(grupo)}" aria-expanded="${open}"><i class="fa-solid fa-chevron-${open ? "up" : "down"}"></i> ${open ? "Ocultar" : "Ver las " + members.length}</button>
        <button class="btn btn-dark" data-pick="${esc(grupo)}"><i class="fa-solid fa-bolt"></i> Elegir y activar</button>
      </div>
      ${open ? `<div class="group-kids">${members.map(([id, x]) => `<div class="kid">
          <span class="op-dot" style="background:${esc(x.color || "#111")}"></span>
          <b>Opción ${x.opcion.n}</b><span class="muted">${esc(tplName(x))}</span>
          <span class="kid-acts">
            <a class="btn btn-light" href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver</a>
            <button class="btn btn-light" data-edit="${id}" title="Lo que cambies (menos el diseño) se copia a las demás"><i class="fa-solid fa-pen"></i> Editar</button>
            <button class="btn btn-ghost danger" data-remove="${id}" aria-label="Borrar la opción ${x.opcion.n}"><i class="fa-solid fa-trash"></i></button>
          </span></div>`).join("")}
        <p class="hint">Al editar cualquiera, los productos, precios y datos se copian a las demás; cada una conserva su diseño.</p></div>` : ""}
    </div>`;
}

/* Elegir la opción que le gustó al cliente: se queda esa, se borran las otras y se abre "Activar" */
let pickGrupo = "";
function openPick(grupo) {
  pickGrupo = grupo;
  const members = Object.entries(demos).filter(([, x]) => x.opcion?.grupo === grupo).sort((a, b) => a[1].opcion.n - b[1].opcion.n);
  $("pickBody").innerHTML = `<p class="muted" style="margin:0">Se queda la que elijas. <b>Las otras se borran</b> y después activas la tienda.</p>
    <div class="pick-opts">${members.map(([id, x], i) => `<label class="pick-opt">
        <input type="radio" name="pickOp" value="${esc(id)}"${i === 0 ? " checked" : ""} />
        <span class="tpl">${PLANTILLAS[x.tema?.plantilla] ? miniTpl(x.tema.plantilla) : `<span class="tpl-mini" style="background:${esc(x.color || "#111")}"></span>`}</span>
        <b>Opción ${x.opcion.n}</b><small>${esc(tplName(x))}</small>
        <a href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener">Ver <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
      </label>`).join("")}</div>
    <button type="button" class="btn btn-dark" id="pickGo"><i class="fa-solid fa-check"></i> Quedarme con esta y activar</button>`;
  $("pickModal").hidden = false;
}
$("pickClose").addEventListener("click", () => { $("pickModal").hidden = true; });
$("pickModal").addEventListener("click", async (e) => {
  if (e.target === $("pickModal")) { $("pickModal").hidden = true; return; }
  const go = e.target.closest("#pickGo"); if (!go) return;
  const keep = document.querySelector('input[name="pickOp"]:checked')?.value; if (!keep) return;
  if (go.dataset.confirm !== "1") { go.dataset.confirm = "1"; go.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ¿Seguro? Se borran las otras. Toca otra vez`; return; }
  go.disabled = true;
  try {
    const borrar = Object.keys(demos).filter((k) => k !== keep && demos[k].opcion?.grupo === pickGrupo);
    const changes = { [`stores/${keep}/opcion`]: null };
    for (const k of borrar) {
      changes[`stores/${k}`] = null; changes[`storeAdmin/${k}`] = null;
      // Si la que se borra tenía link corto y la elegida no, el link pasa a la elegida
      const c = demos[k].corto;
      if (c && !demos[keep].corto && !changes[`stores/${keep}/corto`]) { changes[`links/${c}`] = keep; changes[`stores/${keep}/corto`] = c; }
      else if (c) changes[`links/${c}`] = null;
    }
    await update(ref(db), changes);
    const quedan = { ...demos }; borrar.forEach((k) => delete quedan[k]);
    for (const k of borrar) if (!Object.values(quedan).some((x) => JSON.stringify(x).includes(`tiendas%2F${k}%2F`))) deleteStorePhotos(k);
    $("pickModal").hidden = true;
    toast("Listo, se quedó la opción elegida");
    await loadDemos();
    openOwner(keep);   // sigue con Activar: vigencia y correo del dueño
  } catch (err) { console.error(err); toast(permErr(err)); go.disabled = false; }
});

// Lo que importa de cada estado, en una línea de la lista
function listState(s, a) {
  const st = statusOf(s);
  if (st === "activa") { const v = vigInfo(a.vigencia); return ` · <span class="vig ${v.cls}">${a.vigencia ? `Vence ${fdate(a.vigencia)}` : "Sin vigencia"}${v.cls !== "ok" ? ` (${v.t.toLowerCase()})` : ""}</span>`; }
  if (st === "pausada") return ` · <span class="vig bad">Pausada ${a.pausadaEl ? "desde " + fdate(a.pausadaEl) : ""}</span>`;
  return "";
}
let pendingDelete = "";
// Copiar cualquier link o mensaje (botones con data-copy)
async function copyText(text, msg = "Link copiado") {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch { prompt("Copia el texto:", text); }
}
$("demoList").addEventListener("click", async (e) => {
  const cp = e.target.closest("[data-copy]");
  if (cp) { copyText(cp.dataset.copy); return; }
  const df = e.target.closest("[data-dfil]");
  if (df) { demoFilter = df.dataset.dfil; loadDemos(); return; }
  const gt = e.target.closest("[data-gtoggle]");
  if (gt) { const g = gt.dataset.gtoggle; openGroups.has(g) ? openGroups.delete(g) : openGroups.add(g); loadDemos(); return; }
  const pk = e.target.closest("[data-pick]");
  if (pk) { openPick(pk.dataset.pick); return; }
  const ed = e.target.closest("[data-edit]"), rm = e.target.closest("[data-remove]"), ow = e.target.closest("[data-owner]");
  if (ow) openOwner(ow.dataset.owner);
  if (ed) {
    const s = demos[ed.dataset.edit];
    state = { ...blank(s.giro || "otro"), ...s, products: Array.isArray(s.products) ? s.products : Object.values(s.products || {}) };
    // Tiendas hechas antes del editor de diseño: se conserva cómo se veían
    if (!s.tema) state.tema = { ...TEMA_BASE, plantilla: "" };
    state.tema = { ...state.tema };
    editingId = ed.dataset.edit; editingStamp = s.updatedAt || 0; samplesUntouched = false; pagosTouched = true; designTouched = true; openRows.clear();
    $("result").hidden = true; fillForm(); showView("editor");
  }
  if (rm) {
    const id = rm.dataset.remove;
    if (pendingDelete !== id) { pendingDelete = id; rm.innerHTML = "¿Borrar? Toca otra vez"; setTimeout(() => { if (pendingDelete === id) { pendingDelete = ""; loadDemos(); } }, 4000); return; }
    pendingDelete = "";
    try {
      // También se quita el acceso de sus dueños (la cuenta de correo sigue existiendo)
      const links = {};
      for (const uid of Object.keys(owners[id] || {})) { links[`storeOwners/${id}/${uid}`] = null; links[`userStores/${uid}/${id}`] = null; }
      links[`storeAdmin/${id}`] = null;
      if (demos[id]?.corto) links[`links/${demos[id].corto}`] = null;
      if (Object.keys(links).length) await update(ref(db), links);
      await remove(ref(db, `stores/${id}`));
      // Si otra demo (por ejemplo una de sus "opciones") usa estas fotos, no se borran
      const enUso = Object.entries(demos).some(([k, x]) => k !== id && JSON.stringify(x).includes(`tiendas%2F${id}%2F`));
      if (!enUso) deleteStorePhotos(id); toast("Demo borrada"); if (editingId === id) editingId = ""; loadDemos(); }
    catch (err) { toast("No se pudo borrar"); }
  }
});

/* ── 3 opciones de diseño para un cliente ──
   Crea 3 demos del mismo negocio (mismos productos con fotos reales) con
   plantillas distintas, ligadas por opcion.grupo, y arma el link de
   tienda/opciones.html para compararlas lado a lado. */
const RAUL_WA = "5581074978";
let opTpls = [];
function compararLink(grupo) {
  const ids = Object.entries(demos).filter(([, s]) => s.opcion?.grupo === grupo).sort((a, b) => a[1].opcion.n - b[1].opcion.n).map(([id]) => id);
  return `${TIENDA_URL}opciones.html?t=${ids.join(",")}`;
}
/* "Partir de": negocio nuevo (productos de ejemplo) o una demo que ya tienes.
   Con una demo, la Opción 1 es esa misma demo (con su diseño actual, sin cambiarla)
   y se crean 2 copias con diseños distintos: mismos productos, logo, WhatsApp y pagos. */
const opBase = () => demos[$("opBase").value] ? $("opBase").value : "";
function opGiroSel() { const b = opBase(); return b ? demos[b].giro || "otro" : $("opGiro").value; }
function opPlantillas() {
  const b = opBase(), giro = opGiroSel();
  if (!b) return tresOpciones(giro);
  const cur = demos[b].tema?.plantilla;
  const resto = [...tresOpciones(giro), ...plantillasPara(giro).sugeridas, ...plantillasPara(giro).otras].filter((k, i, a) => k !== cur && a.indexOf(k) === i);
  return ["__actual", resto[0], resto[1]];
}
function renderOpTpls() {
  const g = opGiroSel(), { sugeridas, otras } = plantillasPara(g), b = opBase();
  $("opTpls").innerHTML = opTpls.map((k, i) => k === "__actual" ? `<div class="op-tpl">
      <div class="op-n">Opción 1</div>
      <div class="tpl active" style="cursor:default">${PLANTILLAS[demos[b].tema?.plantilla] ? miniTpl(demos[b].tema.plantilla) : `<span class="tpl-mini" style="background:${esc(demos[b].color || "#111")}"></span>`}</div>
      <b class="op-actual">Su demo actual</b>
    </div>` : `<div class="op-tpl">
      <div class="op-n">Opción ${i + 1}</div>
      <div class="tpl active" style="cursor:default">${miniTpl(k)}</div>
      <select data-op="${i}" aria-label="Plantilla de la opción ${i + 1}">
        <optgroup label="Sugeridas">${sugeridas.map((x) => `<option value="${x}"${x === k ? " selected" : ""}>${esc(PLANTILLAS[x].label)}</option>`).join("")}</optgroup>
        <optgroup label="Otras">${otras.map((x) => `<option value="${x}"${x === k ? " selected" : ""}>${esc(PLANTILLAS[x].label)}</option>`).join("")}</optgroup>
      </select>
    </div>`).join("");
}
function renderOpBase() {
  const b = opBase();
  $("opNewFields").hidden = !!b;
  $("opColorWrap").hidden = !b;
  $("opBaseHint").textContent = b
    ? `La Opción 1 es "${demos[b].name}" tal como está. Se crean 2 copias con otros diseños, con sus mismos productos, logo y WhatsApp.`
    : "Se crean 3 demos nuevas con productos de ejemplo del giro.";
  opTpls = opPlantillas(); renderOpTpls();
}
$("opOpen").addEventListener("click", () => {
  $("opForm").hidden = false; $("opResult").hidden = true; $("opForm").reset();
  $("opGiro").innerHTML = Object.entries(GIROS).map(([k, g]) => `<option value="${k}">${g.emoji} ${g.label}</option>`).join("");
  $("opGiro").value = "comida";
  // Solo demos que aún no tienen opciones
  const base = Object.entries(demos).filter(([, s]) => statusOf(s) === "demo" && !s.opcion?.grupo)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  $("opBase").innerHTML = `<option value="">Negocio nuevo (productos de ejemplo)</option>`
    + (base.length ? `<optgroup label="Una demo que ya tengo">${base.map(([id, s]) => `<option value="${id}">${esc(s.name)} · ${esc((GIROS[s.giro] || GIROS.otro).label)}</option>`).join("")}</optgroup>` : "");
  renderOpBase(); $("opModal").hidden = false; $("opBase").focus();
});
$("opClose").addEventListener("click", () => { $("opModal").hidden = true; });
$("opBase").addEventListener("change", renderOpBase);
$("opGiro").addEventListener("change", () => { opTpls = opPlantillas(); renderOpTpls(); });
$("opTpls").addEventListener("change", (e) => { const s = e.target.closest("[data-op]"); if (!s) return; opTpls[+s.dataset.op] = s.value; renderOpTpls(); });
$("opForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const baseId = opBase(), base = baseId ? demos[baseId] : null;
  const name = base ? base.name : $("opName").value.trim();
  const giro = opGiroSel(), g = GIROS[giro] || GIROS.otro;
  const wa = base ? base.whatsapp : String($("opWa").value).replace(/\D/g, "").length >= 10 ? $("opWa").value.trim() : RAUL_WA;
  if (!name) { toast("Escribe el nombre del negocio"); $("opName").focus(); return; }
  $("opCreate").disabled = true;
  const grupo = baseId || `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, now = Date.now(), ids = [];
  const products = base ? (Array.isArray(base.products) ? base.products : Object.values(base.products || {})) : productosDeEjemplo(giro);
  const keepColor = base && $("opColor").checked && base.color;
  try {
    for (const [i, k] of opTpls.entries()) {
      const opcion = { grupo, n: i + 1, total: opTpls.length };
      if (k === "__actual") {   // la demo original solo queda marcada como Opción 1
        await update(ref(db, `stores/${baseId}`), { opcion });
        demos[baseId] = { ...base, opcion };
        ids.push(baseId); continue;
      }
      const id = `${grupo}-op${i + 1}`;
      const diseno = disenoDePlantilla(k);
      if (keepColor) diseno.color = base.color;
      const nuevo = base
        ? { ...base, ...diseno, products, status: "demo", createdAt: now, updatedAt: now, opcion, corto: null }
        : { plan: "pedidos", name, giro, tagline: "", whatsapp: wa, horario: "", aviso: "",
            logo: "", categorias: g.categorias, ...diseno,
            pedidos: { datos: "opcional", entregas: ["recoger", "domicilio"] },
            pagos: { metodos: ["entrega", "transferencia"], anticipado: !!g.pagoAnticipado, banco: "", clabe: "", titular: "", link: "" },
            products, status: "demo", createdAt: now, updatedAt: now, opcion };
      await set(ref(db, `stores/${id}`), nuevo);
      ids.push(id);
    }
    const link = `${TIENDA_URL}opciones.html?t=${ids.join(",")}`;
    $("opLink").value = link; $("opView").href = link;
    const msg = `Hola, le preparé 3 opciones de cómo se vería la tienda en línea de ${name}. Puede verlas y comparar aquí:\n${link}\n\n¿Cuál le gusta más?`;
    $("opSend").href = `https://wa.me/${waNumber(wa === RAUL_WA ? "" : wa)}?text=${encodeURIComponent(msg)}`;
    const label = (k) => (k === "__actual" ? "Su demo actual" : PLANTILLAS[k].label);
    $("opLinks").innerHTML = ids.map((id, i) => `<a href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener">Opción ${i + 1}: ${esc(label(opTpls[i]))} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join("");
    $("opForm").hidden = true; $("opResult").hidden = false;
    toast("✅ 3 opciones creadas"); loadDemos();
  } catch (err) {
    toast(err.code === "PERMISSION_DENIED" ? "Falta actualizar las reglas de Firebase" : "No se pudo crear: " + err.message);
  } finally { $("opCreate").disabled = false; }
});
$("opCopy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("opLink").value); toast("Link copiado"); } catch { $("opLink").select(); }
});

/* ── Navegación ── */
function showView(v) {
  document.querySelectorAll(".ttab").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  $("editorView").hidden = v !== "editor" && v !== "diseno";
  $("editorView").classList.toggle("solo-diseno", v === "diseno");
  $("demosView").hidden = v !== "demos";
  $("resumenView").hidden = v !== "resumen";
  if (v === "resumen") loadResumen();
  if (v === "diseno") {
    // Pestaña Diseño: misma tienda que se está editando, solo con plantillas y ajustes
    $("dhName").textContent = state.name.trim() ? `"${state.name.trim()}"` : "la tienda nueva";
    $("ajustes").open = true;
    scrollTo(0, 0); document.querySelector(".form-col")?.scrollTo?.(0, 0);
  }
}
document.querySelectorAll(".ttab").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
// El nombre y el WhatsApp son obligatorios: si faltan, el navegador no deja guardar
// y los campos están en Editar, así que primero se cambia de pestaña
$("saveBtn").addEventListener("click", () => {
  if ($("editorView").classList.contains("solo-diseno") && !$("storeForm").checkValidity()) showView("editor");
});
$("disenoHead").addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) showView(g.dataset.goto); });
document.querySelectorAll(".mtab").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".mtab").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".editor .pane").forEach((p) => p.classList.toggle("show-pane", p.dataset.pane === b.dataset.pane));
}));
document.querySelectorAll('.editor .pane[data-pane="form"]').forEach((p) => p.classList.add("show-pane"));
document.querySelectorAll(".dev").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".dev").forEach((x) => x.classList.toggle("active", x === b));
  $("frameWrap").className = "frame-wrap " + b.dataset.dev;
}));

/* ── Resumen: la página maestra de todas las tiendas ── */
let rdays = 30;
async function loadResumen() {
  let events = {}, leads = {};
  try {
    const [ev, ld] = await Promise.all([get(ref(db, "events")), get(ref(db, "leads"))]);
    events = ev.val() || {}; leads = ld.val() || {};
  } catch (err) { console.warn(err); }
  const rows = Object.entries(demos).map(([id, s]) => ({ id, s, a: aggregate(events[id], leads[id], rdays) }))
    .sort((x, y) => (y.a.totals.lastTs || 0) - (x.a.totals.lastTs || 0));
  const T = rows.reduce((t, r) => { for (const k of ["visit", "ask", "order", "sales"]) t[k] += r.a.totals[k]; return t; }, { visit: 0, ask: 0, order: 0, sales: 0 });
  const abiertas = rows.filter((r) => r.a.totals.visit > 0).length;
  $("rkpis").innerHTML = [
    ["Tiendas", rows.length, `${abiertas} con visitas`],
    ["Visitas", T.visit.toLocaleString("es-MX")],
    ["Consultas", T.ask.toLocaleString("es-MX")],
    ["Pedidos", T.order.toLocaleString("es-MX")],
    ["Ventas", money(T.sales)],
  ].map(([l, v, sub]) => `<div class="rkpi"><span>${l}</span><b>${v}</b>${sub ? `<span>${sub}</span>` : ""}</div>`).join("");
  $("rbody").innerHTML = rows.length ? rows.map(({ id, s, a }) => {
    const t = a.totals;
    const fresh = t.lastTs && Date.now() - t.lastTs < 86400000;
    const st = statusOf(s);
    return `<tr>
      <td><div class="rstore"><div class="demo-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${esc(s.logo)}" alt="" />` : esc((s.name || "?")[0])}</div><div><b>${esc(s.name)}</b><div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)}</div></div></div></td>
      <td><span class="status ${st}">${STATUS[st]}</span></td>
      <td class="num">${t.visit}</td><td class="num">${t.ask}</td><td class="num">${t.order}</td>
      <td class="num">${money(t.sales)}</td><td class="num">${t.visit ? pct(t.conversion) : "—"}</td>
      <td class="${fresh ? "fresh" : "muted"}">${ago(t.lastTs)}</td>
      <td><div class="acts"><a class="btn btn-light" href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener">Tienda</a><a class="btn btn-light" href="${TIENDA_URL}panel.html?t=${id}" target="_blank" rel="noopener">Panel</a></div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" class="muted" style="text-align:center;padding:32px">Todavía no hay tiendas.</td></tr>`;
}
document.querySelectorAll("[data-rdays]").forEach((b) => b.addEventListener("click", () => {
  rdays = +b.dataset.rdays; document.querySelectorAll("[data-rdays]").forEach((x) => x.classList.toggle("active", x === b)); loadResumen();
}));


/* ============================================================
   ESTADO DE LA TIENDA, VIGENCIA Y DUEÑOS
   - Demo:    fecha de creación, notas y "Activar tienda" (vigencia + dueño opcional)
   - Activa:  desde cuándo, vigencia (extender), dueños (agregar / quitar), pausar
   - Pausada: cuándo y por qué, reactivar con nueva vigencia
   Datos privados (solo admin) en storeAdmin/<tienda>:
     { notas, activadaEl, vigencia:"AAAA-MM-DD", pausadaEl, motivoPausa, historial }
   El dueño solo puede leer su "vigencia" (para avisarle cuándo renovar).
   Cuentas de dueños: storeOwners/<tienda>/<uid> y userStores/<uid>/<tienda>.
   La cuenta se crea con una "app secundaria" para no cerrar tu sesión de admin.
============================================================ */
const MI_TIENDA_URL = new URL("../tienda/mi-tienda.html", location.href).href;
// Entrada única para todos los dueños: escriben su correo y llegan a SU tienda
const ENTRAR_URL = new URL("../entrar/", location.href).href;
/* Link corto: rayamistore.com/<nombre> (lo resuelve /404.html con links/<nombre> en Firebase) */
const SITE_URL = new URL("../", location.href).href;
const RESERVADOS = ["tienda", "creador", "crm", "ropa", "entrar", "servicios", "privacidad", "quiero-mi-tienda", "icons", "functions",
  "admin", "api", "app", "login", "www", "mail", "rayami", "rayamistore", "soporte", "ayuda", "blog", "precios", "planes", "leads-y-crm", "empieza", "analisis", "preguntas", "gracias"];
const linkTienda = (id) => (demos[id]?.corto ? SITE_URL + demos[id].corto : `${TIENDA_URL}?t=${id}`);
const MOTIVOS = ["Falta de pago", "Lo pidió el cliente", "Cambios en la tienda", "Otro"];
let omId = "", omAdmin = {}, omPausing = false, omWelcome = "", appAlta = null;

const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const todayISO = () => isoLocal(new Date());
function addMonths(iso, n) {
  const d = iso ? new Date(iso + "T12:00") : new Date();
  const day = d.getDate(); d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0); // 31 ene + 1 mes = 28/29 feb
  return isoLocal(d);
}
const fdate = (v) => (v ? new Date(typeof v === "number" ? v : v + "T12:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—");
// Días de calendario entre hoy y la fecha (vence el 5, hoy es 2 → faltan 3)
const daysLeft = (iso) => Math.round((new Date(iso + "T12:00") - new Date(todayISO() + "T12:00")) / 86400000);
function vigInfo(iso) {
  if (!iso) return { t: "Sin vigencia registrada", cls: "warn" };
  const d = daysLeft(iso);
  if (d < 0) return { t: `Vencida hace ${-d} día${d !== -1 ? "s" : ""}`, cls: "bad" };
  if (d === 0) return { t: "Vence hoy", cls: "bad" };
  if (d <= 5) return { t: `Vence en ${d} día${d !== 1 ? "s" : ""}`, cls: "warn" };
  return { t: `Faltan ${d} días`, cls: "ok" };
}
function genPass() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return [...crypto.getRandomValues(new Uint32Array(10))].map((n) => abc[n % abc.length]).join("");
}
const hist = (accion, detalle = "") => ({ [`storeAdmin/${omId}/historial/h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`]: { ts: Date.now(), accion, detalle } });
const permErr = (err) => (String(err?.code || err?.message || "").toUpperCase().includes("PERMISSION") ? "Falta publicar las reglas nuevas en Firebase" : "No se pudo guardar. Revisa tu conexión");

async function openOwner(id) {
  omId = id; omPausing = false; omWelcome = "";
  try { omAdmin = (await get(ref(db, `storeAdmin/${id}`))).val() || {}; } catch (err) { omAdmin = {}; console.warn(err); }
  renderOM();
  $("ownerModal").hidden = false;
}
function closeOwner() { $("ownerModal").hidden = true; omId = ""; loadDemos(); }
$("omClose").addEventListener("click", closeOwner);
$("ownerModal").addEventListener("click", (e) => { if (e.target === $("ownerModal")) closeOwner(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("ownerModal").hidden) closeOwner(); });

/* Piezas de la ventana */
const vigPicker = (id, val) => `<div class="vig-row">
    <input type="date" id="${id}" value="${val}" min="${todayISO()}" aria-label="Vigente hasta" />
    <div class="vig-quick">${[[1, "1 mes"], [3, "3 meses"], [12, "1 año"]].map(([n, l]) => `<button type="button" class="chip" data-vq="${id}" data-n="${n}">${l}</button>`).join("")}</div>
  </div>`;
const ownerFields = (opt) => `
    <label><span>Correo del dueño${opt ? ' <span class="muted">(opcional, puedes agregarlo después)</span>' : ""}</span><input type="email" id="oEmail" autocapitalize="off" placeholder="dueno@gmail.com" /></label>
    <p class="hint">Le llega un correo de bienvenida de RAYAMI Store para que él cree su contraseña.</p>
    <label id="oPassWrap" hidden>Contraseña que ya usa en RAYAMI<input id="oPass" type="password" autocomplete="off" /></label>`;
function ownersList() {
  const list = Object.entries(owners[omId] || {});
  return list.length ? list.map(([uid, o]) => `<div class="owner"><span><i class="fa-solid fa-user"></i> ${esc(o.email)}${o.ts ? `<small class="muted"> · desde ${fdate(o.ts)}</small>` : ""}</span>
      <span class="owner-acts"><button type="button" class="btn btn-ghost" data-resend="${esc(o.email)}" title="Le llega un correo para crear o cambiar su contraseña">Reenviar correo</button>
    <button type="button" class="btn btn-ghost danger" data-unlink="${esc(uid)}">Quitar acceso</button></span></div>`).join("")
    : `<p class="hint" style="margin:0">Nadie tiene acceso todavía.</p>`;
}

function renderOM() {
  const s = demos[omId]; if (!s) return;
  const a = omAdmin, st = statusOf(s);
  $("omTitle").innerHTML = `${esc(s.name)} <span class="status ${st}">${STATUS[st]}</span>`;
  $("omSub").textContent = `${(GIROS[s.giro] || GIROS.otro).label} · Paquete ${s.plan === "vitrina" ? "Vitrina" : "Pedidos"}`;
  let html = "";

  if (omWelcome) html += `<div class="om-done">
      <b><i class="fa-solid fa-circle-check"></i> Listo. Mándale estos datos al dueño:</b>
      <pre id="omMsg">${esc(omWelcome)}</pre>
      <div class="res-actions">
        <a class="btn btn-wa" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?phone=${waNumber(s.whatsapp)}&text=${encodeURIComponent(omWelcome)}"><i class="fa-brands fa-whatsapp"></i> Mandar por WhatsApp</a>
        <button type="button" class="btn btn-light" data-act="copy"><i class="fa-regular fa-copy"></i> Copiar</button>
      </div></div>`;

  /* Ficha del estado */
  const facts = st === "demo"
    ? [["Creada", fdate(s.createdAt)], ["Última edición", fdate(s.updatedAt)], ["Qué ve el cliente", "La tienda con la barra de \"Vista previa\""], ["Dueño", "No puede editar"]]
    : st === "activa"
      ? [["Activa desde", fdate(a.activadaEl)], ["Vigente hasta", `${fdate(a.vigencia)} <span class="vig ${vigInfo(a.vigencia).cls}">${vigInfo(a.vigencia).t}</span>`], ["Qué ve el cliente", "Su tienda completa, sin barra de demo"], ["Dueño", "Edita sus productos y datos"]]
      : [["Pausada desde", fdate(a.pausadaEl)], ["Motivo", esc(a.motivoPausa || "—")], ["Vigencia anterior", fdate(a.vigencia)], ["Qué ve el cliente", "\"Esta tienda no está disponible\""], ["Dueño", "Entra, pero no puede guardar cambios"]];
  html += `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;

  /* Links para mandarle al cliente cuando los pierda */
  const ownersN = Object.keys(owners[omId] || {}).length;
  const tiendaLink = linkTienda(omId);
  html += `<section class="om-sec"><h4>Links</h4>
    <div class="link-line"><div><b>Tienda</b><small>Para sus clientes: redes, estados, QR</small><code>${esc(tiendaLink)}</code></div>
      <button type="button" class="btn btn-light" data-copy="${esc(tiendaLink)}"><i class="fa-regular fa-copy"></i> Copiar</button></div>
    <div class="short-box"><b>Link corto</b> <small class="muted">gratis, fácil de dictar o poner en un letrero</small>
      <div class="short-row"><span>${esc(SITE_URL.replace(/^https?:\/\//, ""))}</span><input id="shortIn" maxlength="30" autocapitalize="off" spellcheck="false" value="${esc(s.corto || "")}" placeholder="${esc(slugify(s.name).replace(/-/g, "").slice(0, 30))}" aria-label="Link corto" />
        <button type="button" class="btn btn-light" data-act="short">${s.corto ? "Cambiar" : "Crear"}</button></div>
      <p class="err" id="shortErr"></p></div>
    ${st !== "demo" ? `<div class="link-line"><div><b>Entrada del dueño</b><small>La misma para todos tus clientes: entran con su correo</small><code>${esc(ENTRAR_URL)}</code></div>
      <button type="button" class="btn btn-light" data-copy="${esc(ENTRAR_URL)}"><i class="fa-regular fa-copy"></i> Copiar</button></div>` : ""}
    ${ownersN ? `<div class="res-actions">
      <button type="button" class="btn btn-light" data-copy-msg="1"><i class="fa-regular fa-copy"></i> Copiar mensaje con sus links</button>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?phone=${waNumber(s.whatsapp)}&text=${encodeURIComponent(reminder())}"><i class="fa-brands fa-whatsapp"></i> Mandárselo</a>
    </div>` : ""}
  </section>`;

  /* Acciones según el estado */
  if (st === "demo") {
    html += `<section class="om-sec"><h4>Activar tienda</h4>
      <p class="hint">Cuando el cliente pague. Quita la barra de demo y le permite editar.</p>
      <div class="field-label">Vigente hasta</div>${vigPicker("aVig", addMonths("", 1))}
      ${ownerFields(true)}
      <p class="err" id="oErr"></p>
      <button type="button" class="btn btn-dark" data-act="activar"><i class="fa-solid fa-bolt"></i> Activar tienda</button>
    </section>`;
  }
  if (st === "activa") {
    const base = a.vigencia && daysLeft(a.vigencia) >= 0 ? a.vigencia : todayISO();
    html += `<section class="om-sec"><h4>Vigencia</h4>
      <p class="hint">Cuando pague otro periodo, extiéndela. Se suma a partir de ${a.vigencia && daysLeft(a.vigencia) >= 0 ? "la fecha actual de vencimiento" : "hoy"}.</p>
      <div class="vig-quick">${[[1, "+1 mes"], [3, "+3 meses"], [12, "+1 año"]].map(([n, l]) => `<button type="button" class="chip" data-ext="${n}">${l}<small>${fdate(addMonths(base, n))}</small></button>`).join("")}</div>
      <div class="vig-row"><input type="date" id="eVig" value="${a.vigencia || ""}" aria-label="Otra fecha" /><button type="button" class="btn btn-light" data-act="setvig">Guardar fecha</button></div>
    </section>
    <section class="om-sec"><h4>Dueños con acceso</h4>
      <div class="owners">${ownersList()}</div>
      <details class="add-owner"${Object.keys(owners[omId] || {}).length ? "" : " open"}><summary><i class="fa-solid fa-user-plus"></i> Agregar ${Object.keys(owners[omId] || {}).length ? "otro correo" : "un correo"}</summary>
        ${ownerFields(false)}
        <p class="err" id="oErr"></p>
        <button type="button" class="btn btn-dark" data-act="owner"><i class="fa-solid fa-user-plus"></i> Crear cuenta y dar acceso</button>
      </details>
    </section>
    <section class="om-sec">${omPausing ? `<h4>Pausar tienda</h4>
        <p class="hint">Sus clientes verán "no disponible" y el dueño no podrá guardar cambios. Puedes reactivarla cuando quieras.</p>
        <label>Motivo<select id="pMotivo">${MOTIVOS.map((m) => `<option>${m}</option>`).join("")}</select></label>
        <label>Detalle <span class="muted">(opcional)</span><input id="pDetalle" maxlength="120" placeholder="Ej. debe el mes de diciembre" /></label>
        <div class="res-actions"><button type="button" class="btn btn-light" data-act="nopausa">Cancelar</button><button type="button" class="btn btn-dark warn" data-act="pausar"><i class="fa-solid fa-circle-pause"></i> Confirmar pausa</button></div>`
      : `<button type="button" class="btn btn-light" data-act="pausa"><i class="fa-solid fa-circle-pause"></i> Pausar tienda</button>`}
    </section>`;
  }
  if (st === "pausada") {
    html += `<section class="om-sec"><h4>Reactivar tienda</h4>
      <p class="hint">Cuando se resuelva el motivo de la pausa.</p>
      <div class="field-label">Vigente hasta</div>${vigPicker("rVig", a.vigencia && daysLeft(a.vigencia) > 0 ? a.vigencia : addMonths("", 1))}
      <button type="button" class="btn btn-dark" data-act="reactivar"><i class="fa-solid fa-play"></i> Reactivar tienda</button>
    </section>
    <section class="om-sec"><h4>Dueños con acceso</h4><div class="owners">${ownersList()}</div></section>`;
  }

  /* Comunes: notas e historial */
  const h = Object.values(a.historial || {}).sort((x, y) => y.ts - x.ts).slice(0, 12);
  html += `<section class="om-sec"><h4>Notas</h4>
      <textarea id="omNotas" rows="3" maxlength="1000" placeholder="Lo que platicaste, qué le interesa, cuánto paga, a qué día cobrar…">${esc(a.notas || "")}</textarea>
      <button type="button" class="btn btn-light" data-act="notas"><i class="fa-solid fa-floppy-disk"></i> Guardar notas</button>
    </section>
    ${h.length ? `<section class="om-sec"><h4>Historial</h4><ul class="hist">${h.map((x) => `<li><span>${fdate(x.ts)}</span><b>${esc(x.accion)}</b>${x.detalle ? ` <span class="muted">${esc(x.detalle)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}
    ${st !== "demo" ? `<button type="button" class="link-btn" data-act="todemo">Regresar a demo</button>` : ""}`;
  $("omBody").innerHTML = html;
}

/* Botones de fechas rápidas: 1 mes / 3 meses / 1 año desde hoy */
$("omBody").addEventListener("click", (e) => {
  const q = e.target.closest("[data-vq]");
  if (q) { $(q.dataset.vq).value = addMonths("", +q.dataset.n); }
});

async function commit(changes, msg) {
  await update(ref(db), changes);
  try { omAdmin = (await get(ref(db, `storeAdmin/${omId}`))).val() || {}; } catch {}
  toast(msg);
}
const authAltaGet = () => getAuth(appAlta || (appAlta = initializeApp(FB_CONFIG, "alta-duenos")));
// Correo de bienvenida = correo de "crear contraseña" de Firebase (el texto se edita en
// Firebase → Authentication → Plantillas). Al terminar, el botón "Continuar" lo lleva a Mi tienda.
async function sendInvite(email) {
  const a = authAltaGet();
  try { await sendPasswordResetEmail(a, email, { url: `${MI_TIENDA_URL}?t=${omId}` }); }
  catch (err) {
    if (/continue-uri|unauthorized|invalid-continue/i.test(err.code || "")) await sendPasswordResetEmail(a, email); // dominio aún no autorizado
    else throw err;
  }
}
async function addOwner(email, pass, invite) {
  const authAlta = authAltaGet();
  let cred, existed = false;
  try { cred = await createUserWithEmailAndPassword(authAlta, email, invite ? genPass() + genPass() : pass); }
  catch (err) {
    if (err.code !== "auth/email-already-in-use") throw err;
    if (invite) { const x = new Error("existe"); x.code = "ya-existe-correo"; throw x; }
    existed = true;
    try { cred = await signInWithEmailAndPassword(authAlta, email, pass); }
    catch { const x = new Error("existe"); x.code = "ya-existe"; throw x; }
  }
  const uid = cred.user.uid;
  await signOut(authAlta);
  let mailed = false;
  if (invite) { try { await sendInvite(email); mailed = true; } catch (err) { console.warn("No se pudo enviar el correo:", err.code || err.message); } }
  return { uid, existed, mailed, changes: { [`storeOwners/${omId}/${uid}`]: { email, ts: Date.now() }, [`userStores/${uid}/${omId}`]: true } };
}
function ownerErr(err) {
  const c = err?.code || "";
  return c === "ya-existe-correo" ? "Ese correo ya tiene cuenta en RAYAMI (quizá del CRM). Escribe la contraseña que ya usa para vincularla, o usa otro correo." :
    c === "ya-existe" ? "La contraseña no coincide con la de esa cuenta. Pídesela al dueño o usa otro correo." :
    c === "auth/invalid-email" ? "El correo no es válido." :
    c === "auth/weak-password" ? "La contraseña es muy débil." :
    c === "auth/operation-not-allowed" ? "Activa \"Correo/contraseña\" en Firebase Authentication." :
    String(c || err?.message || "").toUpperCase().includes("PERMISSION") ? "Firebase no dejó guardar. Publica las reglas nuevas." :
    "No se pudo crear. Revisa tu conexión e intenta de nuevo.";
}
function readOwnerFields(required) {
  const email = ($("oEmail")?.value || "").trim().toLowerCase(), pass = $("oPass")?.value || "";
  // Siempre correo de bienvenida; solo si el correo ya tenía cuenta se pide su contraseña para vincularla
  const invite = !!$("oPassWrap")?.hidden;
  if (!email && !required) return { email: "" };
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Revisa el correo del dueño.");
  if (!invite && !pass) throw new Error("Escribe la contraseña que ya usa.");
  if (ADMIN_EMAILS.includes(email)) throw new Error("Ese es tu correo de administrador; usa el del dueño.");
  return { email, pass, invite };
}
function welcome(email, pass, mailed) {
  const s = demos[omId];
  const head = `Hola, bienvenido a RAYAMI Store. Tu tienda en línea de ${s.name} ya está lista.\n\n`
    + `Tu tienda (compártela con tus clientes):\n${linkTienda(omId)}\n\n`
    + `Para agregar productos, cambiar precios y ver tus ventas entra aquí con tu correo:\n${ENTRAR_URL}\n\n`;
  if (mailed) return head + `Te enviamos un correo a ${email} para que crees tu contraseña. Si no lo ves, revisa "Spam" o "Promociones".\n\nDespués entra con tu correo y esa contraseña.`;
  return head + `Correo: ${email}\n`
    + (pass ? `Contraseña temporal: ${pass}\n\nTe recomiendo cambiarla en la pestaña "Cuenta".` : `Contraseña: la misma que ya usas.`);
}

// Recordatorio de links (sin contraseña) para cuando el dueño pierde su acceso
function reminder() {
  const s = demos[omId];
  const emails = Object.values(owners[omId] || {}).map((o) => o.email).join(" o ");
  return `Hola, te comparto los links de ${s.name}:\n\n`
    + `Tu tienda (para tus clientes):\n${linkTienda(omId)}\n\n`
    + `Para administrarla entra aquí con tu correo${emails ? ` (${emails})` : ""}:\n${ENTRAR_URL}\n\n`
    + `Si no recuerdas tu contraseña, toca "Olvidé mi contraseña" y te llega un correo para crear una nueva.`;
}
$("omBody").addEventListener("click", async (e) => {
  const cp = e.target.closest("[data-copy]");
  if (cp) { copyText(cp.dataset.copy); return; }
  if (e.target.closest("[data-copy-msg]")) { copyText(reminder(), "Mensaje copiado"); return; }
  const rs = e.target.closest("[data-resend]");
  if (rs) {
    rs.disabled = true;
    try { await sendInvite(rs.dataset.resend); await update(ref(db), hist("Correo reenviado", rs.dataset.resend)); toast(`Correo enviado a ${rs.dataset.resend}`); }
    catch (err) { toast(err.code === "auth/too-many-requests" ? "Demasiados envíos seguidos. Espera unos minutos." : "No se pudo enviar el correo"); }
    rs.disabled = false; return;
  }
  const unl = e.target.closest("[data-unlink]");
  if (unl) {
    if (unl.dataset.confirm !== "1") { unl.dataset.confirm = "1"; unl.textContent = "¿Seguro? Toca otra vez"; return; }
    const uid = unl.dataset.unlink, email = owners[omId]?.[uid]?.email || "";
    try {
      await commit({ [`storeOwners/${omId}/${uid}`]: null, [`userStores/${uid}/${omId}`]: null, ...hist("Acceso quitado", email) }, "Acceso quitado");
      delete owners[omId][uid]; renderOM();
    } catch (err) { toast(permErr(err)); }
    return;
  }
  const ext = e.target.closest("[data-ext]");
  const btn = e.target.closest("[data-act]");
  const act = ext ? "ext" : btn?.dataset.act;
  if (!act) return;
  const s = demos[omId], a = omAdmin;
  const busy = (on) => { if (btn) btn.disabled = on; };
  try {
    if (act === "copy") { try { await navigator.clipboard.writeText(omWelcome); toast("Mensaje copiado"); } catch { toast("Selecciona y copia el mensaje"); } return; }
    if (act === "short") {
      // "Tacos Lupita" → "tacoslupita" (sin espacios ni acentos; los guiones que escribas se respetan)
      const slug = ($("shortIn").value || $("shortIn").placeholder).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/\s+/g, "").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      const err = (t) => { $("shortErr").textContent = t; };
      if (slug.length < 3) return err("Usa al menos 3 letras o números.");
      if (RESERVADOS.includes(slug)) return err("Ese nombre está reservado. Prueba otro.");
      if (slug === s.corto) return err("");
      busy(true);
      const dueno = (await get(ref(db, `links/${slug}`))).val();
      if (dueno && dueno !== omId) { busy(false); return err(`"${slug}" ya lo usa otra tienda. Prueba otro, por ejemplo ${slug}-izcalli.`); }
      const ch = { [`links/${slug}`]: omId, [`stores/${omId}/corto`]: slug, ...hist("Link corto", SITE_URL + slug) };
      if (s.corto && s.corto !== slug) ch[`links/${s.corto}`] = null;
      await commit(ch, `Link corto listo: ${SITE_URL.replace(/^https?:\/\//, "")}${slug}`);
      demos[omId] = { ...s, corto: slug };
      renderOM(); return;
    }
    if (act === "pausa") { omPausing = true; renderOM(); return; }
    if (act === "nopausa") { omPausing = false; renderOM(); return; }

    if (act === "activar") {
      const vig = $("aVig").value;
      if (!vig) { $("oErr").textContent = "Elige hasta cuándo está pagada."; return; }
      let o; try { o = readOwnerFields(false); } catch (err) { $("oErr").textContent = err.message; return; }
      busy(true); $("oErr").textContent = "";
      let changes = {
        [`stores/${omId}/status`]: "activa", [`stores/${omId}/updatedAt`]: Date.now(),
        [`storeAdmin/${omId}/activadaEl`]: Date.now(), [`storeAdmin/${omId}/vigencia`]: vig,
        [`storeAdmin/${omId}/pausadaEl`]: null, [`storeAdmin/${omId}/motivoPausa`]: null,
        ...hist("Activada", `vigente hasta ${fdate(vig)}`),
      };
      let ow = null;
      if (o.email) {
        try { ow = await addOwner(o.email, o.pass, o.invite); }
        catch (err) { if (err.code === "ya-existe-correo") { $("oPassWrap").hidden = false; $("oPass").focus(); } $("oErr").textContent = ownerErr(err); busy(false); return; }
        changes = { ...changes, ...ow.changes, ...hist("Acceso dado", o.email + (ow.mailed ? " · correo de bienvenida enviado" : "")) };
      }
      await commit(changes, "Tienda activada");
      demos[omId] = { ...s, status: "activa" };
      if (ow) { (owners[omId] ||= {})[ow.uid] = { email: o.email, ts: Date.now() }; omWelcome = welcome(o.email, ow.existed || o.invite ? "" : o.pass, ow.mailed); if (o.invite && !ow.mailed) toast("Cuenta creada, pero no se pudo enviar el correo. Usa \"Reenviar correo\"."); }
      renderOM(); return;
    }
    if (act === "owner") {
      let o; try { o = readOwnerFields(true); } catch (err) { $("oErr").textContent = err.message; return; }
      busy(true); $("oErr").textContent = "";
      let ow; try { ow = await addOwner(o.email, o.pass, o.invite); } catch (err) { if (err.code === "ya-existe-correo") { $("oPassWrap").hidden = false; $("oPass").focus(); } $("oErr").textContent = ownerErr(err); busy(false); return; }
      await commit({ ...ow.changes, ...hist("Acceso dado", o.email + (ow.mailed ? " · correo de bienvenida enviado" : "")) }, ow.mailed || !o.invite ? "Acceso listo" : "Cuenta creada, pero no se pudo enviar el correo. Usa \"Reenviar correo\".");
      (owners[omId] ||= {})[ow.uid] = { email: o.email, ts: Date.now() };
      omWelcome = welcome(o.email, ow.existed || o.invite ? "" : o.pass, ow.mailed);
      renderOM(); return;
    }
    if (act === "ext") {
      const base = a.vigencia && daysLeft(a.vigencia) >= 0 ? a.vigencia : todayISO();
      const vig = addMonths(base, +ext.dataset.ext);
      ext.disabled = true;
      await commit({ [`storeAdmin/${omId}/vigencia`]: vig, ...hist("Vigencia extendida", `hasta ${fdate(vig)}`) }, `Vigente hasta ${fdate(vig)}`);
      renderOM(); return;
    }
    if (act === "setvig") {
      const vig = $("eVig").value; if (!vig) { toast("Elige una fecha"); return; }
      busy(true);
      await commit({ [`storeAdmin/${omId}/vigencia`]: vig, ...hist("Vigencia cambiada", `hasta ${fdate(vig)}`) }, `Vigente hasta ${fdate(vig)}`);
      renderOM(); return;
    }
    if (act === "pausar") {
      const motivo = $("pMotivo").value, det = $("pDetalle").value.trim();
      busy(true);
      await commit({
        [`stores/${omId}/status`]: "pausada", [`stores/${omId}/updatedAt`]: Date.now(),
        [`storeAdmin/${omId}/pausadaEl`]: Date.now(), [`storeAdmin/${omId}/motivoPausa`]: det ? `${motivo}: ${det}` : motivo,
        ...hist("Pausada", det ? `${motivo}: ${det}` : motivo),
      }, "Tienda pausada");
      demos[omId] = { ...s, status: "pausada" }; omPausing = false; omWelcome = "";
      renderOM(); return;
    }
    if (act === "reactivar") {
      const vig = $("rVig").value; if (!vig) { toast("Elige hasta cuándo está pagada"); return; }
      busy(true);
      await commit({
        [`stores/${omId}/status`]: "activa", [`stores/${omId}/updatedAt`]: Date.now(),
        [`storeAdmin/${omId}/vigencia`]: vig, [`storeAdmin/${omId}/pausadaEl`]: null, [`storeAdmin/${omId}/motivoPausa`]: null,
        ...hist("Reactivada", `vigente hasta ${fdate(vig)}`),
      }, "Tienda reactivada");
      demos[omId] = { ...s, status: "activa" };
      renderOM(); return;
    }
    if (act === "todemo") {
      if (btn.dataset.confirm !== "1") { btn.dataset.confirm = "1"; btn.textContent = "¿Regresarla a demo? El dueño ya no podrá editar. Toca otra vez"; return; }
      await commit({ [`stores/${omId}/status`]: "demo", [`stores/${omId}/updatedAt`]: Date.now(), ...hist("Regresada a demo") }, "La tienda volvió a ser demo");
      demos[omId] = { ...s, status: "demo" }; omWelcome = "";
      renderOM(); return;
    }
    if (act === "notas") {
      busy(true);
      await commit({ [`storeAdmin/${omId}/notas`]: $("omNotas").value.trim() || null }, "Notas guardadas");
      busy(false); return;
    }
  } catch (err) { console.error(err); toast(permErr(err)); busy(false); }
});

/* Categoría nueva escrita en la fila del producto: Enter o salir del campo la guarda; Esc cancela */
function saveNewCat(input, keep = true) {
  const i = +input.dataset.newcat, v = input.value.trim().replace(/\s+/g, " ");
  newCatRow = -1;
  if (keep && v) {
    const nombre = v[0].toUpperCase() + v.slice(1);
    state.products[i].category = nombre; samplesUntouched = false; pushPreview();
    toast(`Categoría "${nombre}" agregada`);
  }
  renderProds();
}
$("prods").addEventListener("keydown", (e) => {
  if (!e.target.dataset.newcat) return;
  if (e.key === "Enter") { e.preventDefault(); saveNewCat(e.target); }
  if (e.key === "Escape") saveNewCat(e.target, false);
});
$("prods").addEventListener("focusout", (e) => { if (e.target.dataset?.newcat !== undefined && newCatRow !== -1) saveNewCat(e.target); });

$("demoFilters").addEventListener("click", (e) => { const b = e.target.closest("[data-dfil]"); if (b && !b.disabled) { demoFilter = b.dataset.dfil; loadDemos(); } });
