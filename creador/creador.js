/* ============================================================
   CREADOR DE TIENDAS — genera demos en /stores/<id>
   Solo el admin puede entrar (Firebase Authentication + reglas)
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { GIROS, ESTILOS, COLORES, fotoEjemplo, productosDeEjemplo } from "../tienda/muestras.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL, listAll, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { aggregate, money, pct, ago } from "../tienda/stats.js";

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
const storage = getStorage(app);
const ADMIN_EMAILS = ["raulbenitez563@gmail.com"];

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TIENDA_URL = new URL("../tienda/", location.href).href;
const waNumber = (n) => { const d = String(n || "").replace(/\D/g, ""); return d.length === 10 ? "52" + d : d; };

/* ── Estado del formulario ── */
let state = blank();
let editingId = "";
let samplesUntouched = true; // si no han editado productos, cambiar de giro carga sus ejemplos
let pagosTouched = false;
const openRows = new Set();   // productos con "descripción y opciones" abiertos

function blank(giro = "ropa") {
  const g = GIROS[giro];
  return { plan: "pedidos", name: "", giro, tagline: "", whatsapp: "", horario: "", aviso: "", logo: "", color: COLORES[0], estilo: g.estilo, products: productosDeEjemplo(giro),
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
  renderLogo(); renderSwatches(); renderEstilos(); renderProds(); renderPedidos(); renderPagos();
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
  if (!pagosTouched) { state.pagos.anticipado = !!GIROS[state.giro].pagoAnticipado; renderPagos(); }
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
  if (e.target.dataset.f === "category") { state.products[+e.target.closest(".prod").dataset.i].category = e.target.value; samplesUntouched = false; pushPreview(); return; }
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
$("newDemo").addEventListener("click", () => { state = blank(); editingId = ""; samplesUntouched = true; pagosTouched = false; openRows.clear(); $("result").hidden = true; fillForm(); scrollTo(0, 0); });

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
    logo: state.logo, color: state.color, estilo: state.estilo, categorias: g.categorias,
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
  if (!out.name) { toast("Escribe el nombre del negocio"); $("fName").focus(); return; }
  if (String(out.whatsapp).replace(/\D/g, "").length < 10) { toast("Escribe el WhatsApp a 10 dígitos"); $("fWa").focus(); return; }
  if (!out.products.length) { toast("Agrega al menos un producto"); return; }
  const id = editingId || `${slugify(out.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const prev = editingId ? (await get(ref(db, `stores/${id}`))).val() : null;
  $("saveBtn").disabled = true;
  const saveLabel = $("saveBtn").innerHTML;
  try {
    const up = await photosToStorage(id, out);
    // Lo subido queda en el formulario como link, para no volver a subirlo
    if (up.ok && up.n) { state.logo = out.logo; out.products.forEach((p) => { const s = state.products.find((x) => x.id === p.id); if (s) s.photo = p.photo; }); }
    await set(ref(db, `stores/${id}`), { ...out, status: prev?.status || "demo", createdAt: prev?.createdAt || now, updatedAt: now });
    editingId = id;
    showResult(id, out);
    toast(up.n && !up.ok ? "✅ Demo guardada (fotos dentro de la base: Storage no está activo)" : "✅ Demo guardada");
    loadDemos();
  } catch (err) {
    toast(err.code === "PERMISSION_DENIED" ? "Falta actualizar las reglas de Firebase" : "No se pudo guardar: " + err.message);
    console.error(err);
  } finally { $("saveBtn").disabled = false; $("saveBtn").innerHTML = saveLabel; }
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
  if (!$("resumenView").hidden) loadResumen();
  $("demoList").innerHTML = list.length ? list.map(([id, s]) => {
    const n = Array.isArray(s.products) ? s.products.length : Object.keys(s.products || {}).length;
    const fecha = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";
    return `<div class="demo-item">
      <div class="demo-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${s.logo}" alt="" />` : esc((s.name || "?")[0])}</div>
      <div><div class="demo-name">${esc(s.name)}</div><div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)} · ${n} productos · ${fecha}</div></div>
      <div class="demo-actions">
        <a class="btn btn-light" href="${TIENDA_URL}?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver</a>
        <a class="btn btn-light" href="${TIENDA_URL}panel.html?t=${id}" target="_blank" rel="noopener"><i class="fa-solid fa-chart-column"></i> Panel</a>
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
    editingId = ed.dataset.edit; samplesUntouched = false; pagosTouched = true; openRows.clear();
    $("result").hidden = true; fillForm(); showView("editor");
  }
  if (rm) {
    const id = rm.dataset.remove;
    if (pendingDelete !== id) { pendingDelete = id; rm.innerHTML = "¿Borrar? Toca otra vez"; setTimeout(() => { if (pendingDelete === id) { pendingDelete = ""; loadDemos(); } }, 4000); return; }
    pendingDelete = "";
    try { await remove(ref(db, `stores/${id}`)); deleteStorePhotos(id); toast("Demo borrada"); if (editingId === id) editingId = ""; loadDemos(); }
    catch (err) { toast("No se pudo borrar"); }
  }
});

/* ── Navegación ── */
function showView(v) {
  document.querySelectorAll(".ttab").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  $("editorView").hidden = v !== "editor";
  $("demosView").hidden = v !== "demos";
  $("resumenView").hidden = v !== "resumen";
  if (v === "resumen") loadResumen();
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
    const st = s.status === "demo" ? "demo" : "activa";
    return `<tr>
      <td><div class="rstore"><div class="demo-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${s.logo}" alt="" />` : esc((s.name || "?")[0])}</div><div><b>${esc(s.name)}</b><div class="demo-meta">${esc((GIROS[s.giro] || GIROS.otro).label)}</div></div></div></td>
      <td><span class="status ${st}">${st === "demo" ? "Demo" : "Activa"}</span></td>
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
