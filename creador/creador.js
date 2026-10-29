/* ============================================================
   CREADOR DE TIENDAS — genera demos en /stores/<id>
   Solo el admin puede entrar (Firebase Authentication + reglas)
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { GIROS, ESTILOS, COLORES, fotoEjemplo, productosDeEjemplo } from "../tienda/muestras.js";

const app = initializeApp({
  apiKey: "AIzaSyDDVxmRmKb9yIZSV0ZxkPKvQPOK-oAGMWU",
  authDomain: "rayami-store.firebaseapp.com",
  databaseURL: "https://rayami-store-default-rtdb.firebaseio.com",
  projectId: "rayami-store",
  storageBucket: "rayami-store.firebasestorage.app",
  messagingSenderId: "57542479161",
  appId: "1:57542479161:web:425e75300b964e1f526ce8",
});
const db = getDatabase(app);
const auth = getAuth(app);
const ADMIN_EMAILS = ["raulbenitez563@gmail.com"];

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TIENDA_URL = new URL("../tienda/", location.href).href;
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };

/* ── Estado del formulario ── */
let state = blank();
let editingId = "";
let samplesUntouched = true; // si no han editado productos, cambiar de giro carga sus ejemplos

function blank(giro = "ropa") {
  const g = GIROS[giro];
  return { name: "", giro, tagline: "", whatsapp: "", horario: "", aviso: "", logo: "", color: COLORES[0], estilo: g.estilo, products: productosDeEjemplo(giro) };
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
  if (ok) { fillForm(); loadDemos(); }
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
  renderLogo(); renderSwatches(); renderEstilos(); renderProds();
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
  state.estilo = GIROS[state.giro].estilo;
  $("fTagline").placeholder = GIROS[state.giro].tagline;
  if (samplesUntouched) state.products = productosDeEjemplo(state.giro);
  renderEstilos(); renderProds(); pushPreview();
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
  $("logoBox").innerHTML = state.logo ? `<img src="${state.logo}" alt="Logo" />` : `<i class="fa-regular fa-image"></i>`;
  $("logoRemove").hidden = !state.logo;
}
$("fLogo").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { state.logo = await resizeImage(f, 320, "image/png"); renderLogo(); pushPreview(); }
  catch (err) { toast(err.message); }
  e.target.value = "";
});
$("logoRemove").addEventListener("click", () => { state.logo = ""; renderLogo(); pushPreview(); });

function renderSwatches() {
  const custom = !COLORES.includes(state.color);
  $("swatches").innerHTML = COLORES.map((c) => `<button type="button" class="sw${c === state.color ? " active" : ""}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join("")
    + `<input type="color" class="sw-custom${custom ? " active" : ""}" id="customColor" value="${state.color}" title="Otro color" aria-label="Otro color" />`;
  $("customColor").addEventListener("input", (e) => { state.color = e.target.value; pushPreview(); });
  $("customColor").addEventListener("change", renderSwatches);
}
$("swatches").addEventListener("click", (e) => {
  const b = e.target.closest("[data-color]"); if (!b) return;
  state.color = b.dataset.color; renderSwatches(); renderProds(); pushPreview();
});

function renderEstilos() {
  $("estilos").innerHTML = Object.entries(ESTILOS).map(([k, s]) =>
    `<button type="button" class="est${k === state.estilo ? " active" : ""}" data-estilo="${k}">
      <b style="font-family:${s.display};font-weight:${s.weight};${s.upper ? "text-transform:uppercase" : ""}">Aa</b><span>${s.label}</span>
    </button>`).join("");
}
$("estilos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-estilo]"); if (!b) return;
  state.estilo = b.dataset.estilo; renderEstilos(); pushPreview();
});

/* Productos */
function renderProds() {
  const cats = GIROS[state.giro].categorias;
  const allCats = [...new Set([...cats, ...state.products.map((p) => p.category).filter(Boolean)])];
  $("prodCount").textContent = `(${state.products.length})`;
  $("prods").innerHTML = state.products.map((p, i) => `
    <div class="prod" data-i="${i}">
      <label class="prod-photo" title="Cambiar foto">
        <img src="${esc(p.photo || fotoEjemplo(p.emoji || GIROS[state.giro].emoji, state.color))}" alt="" />
        <i class="fa-solid fa-camera"></i>
        <input type="file" accept="image/*" hidden data-photo="${i}" />
      </label>
      <div class="prod-fields">
        <input value="${esc(p.name)}" data-f="name" placeholder="Nombre del producto" aria-label="Nombre" />
        <div class="prod-prices">
          <input value="${p.price || ""}" data-f="price" inputmode="decimal" placeholder="Precio" aria-label="Precio" />
          <input value="${p.salePrice || ""}" data-f="salePrice" inputmode="decimal" placeholder="Oferta" aria-label="Precio de oferta" />
          <select data-f="category" aria-label="Categoría">${allCats.map((c) => `<option${c === p.category ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
        </div>
      </div>
      <button type="button" class="prod-del" data-del="${i}" aria-label="Quitar producto"><i class="fa-solid fa-trash"></i></button>
    </div>`).join("");
}
$("prods").addEventListener("input", (e) => {
  const row = e.target.closest(".prod"); const f = e.target.dataset.f;
  if (!row || !f) return;
  const p = state.products[+row.dataset.i];
  p[f] = f === "price" || f === "salePrice" ? Number(String(e.target.value).replace(/[^\d.]/g, "")) || 0 : e.target.value;
  samplesUntouched = false; pushPreview();
});
$("prods").addEventListener("change", async (e) => {
  if (e.target.dataset.f === "category") { state.products[+e.target.closest(".prod").dataset.i].category = e.target.value; samplesUntouched = false; pushPreview(); return; }
  if (e.target.dataset.photo === undefined) return;
  const f = e.target.files[0]; if (!f) return;
  try {
    state.products[+e.target.dataset.photo].photo = await resizeImage(f, 700);
    samplesUntouched = false; renderProds(); pushPreview();
  } catch (err) { toast(err.message); }
});
$("prods").addEventListener("click", (e) => {
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
$("newDemo").addEventListener("click", () => { state = blank(); editingId = ""; samplesUntouched = true; $("result").hidden = true; fillForm(); scrollTo(0, 0); });

/* ── Guardar ── */
function configOut() {
  const g = GIROS[state.giro];
  return {
    name: state.name.trim(), giro: state.giro, tagline: state.tagline.trim(),
    whatsapp: state.whatsapp.trim(), horario: state.horario.trim(), aviso: state.aviso.trim(),
    logo: state.logo, color: state.color, estilo: state.estilo, categorias: g.categorias,
    products: state.products.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim() })),
  };
}
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tienda";

$("storeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = configOut();
  if (!out.name) { toast("Escribe el nombre del negocio"); $("fName").focus(); return; }
  if (String(out.whatsapp).replace(/\D/g, "").length < 10) { toast("Escribe el WhatsApp a 10 dígitos"); $("fWa").focus(); return; }
  if (!out.products.length) { toast("Agrega al menos un producto"); return; }
  const id = editingId || `${slugify(out.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const prev = editingId ? (await get(ref(db, `stores/${id}`))).val() : null;
  $("saveBtn").disabled = true;
  try {
    await set(ref(db, `stores/${id}`), { ...out, status: "demo", createdAt: prev?.createdAt || now, updatedAt: now });
    editingId = id;
    showResult(id, out);
    toast("✅ Demo guardada");
    loadDemos();
  } catch (err) {
    toast(err.code === "PERMISSION_DENIED" ? "Falta actualizar las reglas de Firebase" : "No se pudo guardar: " + err.message);
    console.error(err);
  } finally { $("saveBtn").disabled = false; }
});

function showResult(id, out) {
  const link = `${TIENDA_URL}?t=${id}`;
  $("resLink").value = link;
  $("openLink").href = link;
  const msg = `Hola, le preparé una muestra de cómo se vería la tienda en línea de ${out.name}. Puede verla aquí:\n${link}\n\nSus clientes ven sus productos y le mandan el pedido directo por WhatsApp.`;
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
let demos = {};
async function loadDemos() {
  try { demos = (await get(ref(db, "stores"))).val() || {}; }
  catch (err) { demos = {}; console.warn(err); }
  const list = Object.entries(demos).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  $("demoCount").textContent = list.length ? `(${list.length})` : "";
  $("demoList").innerHTML = list.length ? list.map(([id, s]) => {
    const n = Array.isArray(s.products) ? s.products.length : Object.keys(s.products || {}).length;
    const fecha = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";
    return `<div class="demo-item">
      <div class="demo-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${s.logo}" alt="" />` : esc((s.name || "?")[0])}</div>
      <div><div class="demo-name">${esc(s.name)}</div><div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)} · ${n} productos · ${fecha}</div></div>
      <div class="demo-actions">
        <a class="btn btn-light" href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver</a>
        <button class="btn btn-light" data-edit="${id}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="btn btn-ghost danger" data-remove="${id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join("") : `<div class="empty-demos">Todavía no tienes demos. Crea la primera en la pestaña <b>Editar</b>.</div>`;
}
let pendingDelete = "";
$("demoList").addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-edit]"), rm = e.target.closest("[data-remove]");
  if (ed) {
    const s = demos[ed.dataset.edit];
    state = { ...blank(s.giro || "otro"), ...s, products: Array.isArray(s.products) ? s.products : Object.values(s.products || {}) };
    editingId = ed.dataset.edit; samplesUntouched = false;
    $("result").hidden = true; fillForm(); showView("editor");
  }
  if (rm) {
    const id = rm.dataset.remove;
    if (pendingDelete !== id) { pendingDelete = id; rm.innerHTML = "¿Borrar? Toca otra vez"; setTimeout(() => { if (pendingDelete === id) { pendingDelete = ""; loadDemos(); } }, 4000); return; }
    pendingDelete = "";
    try { await remove(ref(db, `stores/${id}`)); toast("Demo borrada"); if (editingId === id) editingId = ""; loadDemos(); }
    catch (err) { toast("No se pudo borrar"); }
  }
});

/* ── Navegación ── */
function showView(v) {
  document.querySelectorAll(".ttab").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  $("editorView").hidden = v !== "editor";
  $("demosView").hidden = v !== "demos";
}
document.querySelectorAll(".ttab").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll(".mtab").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".mtab").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".editor .pane").forEach((p) => p.classList.toggle("show-pane", p.dataset.pane === b.dataset.pane));
}));
document.querySelector('.editor .pane[data-pane="form"]').classList.add("show-pane");
document.querySelectorAll(".dev").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".dev").forEach((x) => x.classList.toggle("active", x === b));
  $("frameWrap").className = "frame-wrap " + b.dataset.dev;
}));
