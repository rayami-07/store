/* ============================================================
   MI TIENDA — panel del dueño  (tienda/mi-tienda.html?t=<id>)
   - El dueño entra con la cuenta que le crea el admin en el creador
   - Edita sus productos y los datos de su negocio (se guardan en Firebase)
   - Solo puede guardar si su tienda está "activa" (lo revisan las reglas)
   Quién es dueño de qué:
     storeOwners/<tienda>/<uid> = { email }
     userStores/<uid>/<tienda>  = true
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { ESTILOS, GIROS, fotoEjemplo } from "./muestras.js";
import { comprimirFoto, FOTO_GRANDE, FOTO_MINI, FOTO_BASE, FOTO_LOGO } from "./fotos.js";

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
const SOPORTE_WA = "525581074978";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const num = (v) => Number(String(v || "").replace(/[^\d.]/g, "")) || 0;
const digits = (v) => String(v || "").replace(/\D/g, "");
const waSend = (phone, text) => `https://api.whatsapp.com/send?${phone ? "phone=" + phone + "&" : ""}text=${encodeURIComponent(text)}`;
const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : Object.values(v || {}));
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firebase no acepta valores "undefined"
const validId = (s) => /^[a-z0-9-]{3,60}$/.test(s || "");
const TIENDA_URL = new URL("./", location.href).href;

let user = null, isAdmin = false;
let storeId = (new URLSearchParams(location.search).get("t") || "").trim().toLowerCase();
let store = null;       // la tienda tal como está en Firebase
let editing = null;     // id del producto en edición o "new"
let draftPhoto = "", draftFile = null, draftCombo = false, draftLogo = null;
let query = "";

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600);
}
function show(view) {
  for (const v of ["loading", "loginView", "pickView", "app"]) $(v).hidden = v !== view;
}
function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
function applyTheme(s) {
  const st = ESTILOS[s.estilo] || ESTILOS.moderno;
  const r = document.documentElement.style;
  r.setProperty("--accent", s.color || "#111111");
  r.setProperty("--accent-ink", inkFor(s.color));
  r.setProperty("--display", st.display);
  r.setProperty("--display-weight", st.weight);
  r.setProperty("--display-case", st.upper ? "uppercase" : "none");
}
const giro = () => GIROS[store.giro] || GIROS.otro;
const photoOf = (p) => p.photo || fotoEjemplo(p.emoji || giro().emoji, store.color);
const products = () => store.products;
const canEdit = () => isAdmin || store.status === "activa";
const fetchStore = (id) => get(ref(db, `stores/${id}`)).then((s) => s.val()).catch(() => null);

function authError(e) {
  const c = e?.code || "";
  if (c === "auth/invalid-email") return "Revisa que el correo esté bien escrito.";
  if (c === "auth/too-many-requests") return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  if (c === "auth/network-request-failed") return "Sin conexión. Revisa tu internet.";
  if (c === "auth/user-disabled") return "Esta cuenta está desactivada. Escríbenos.";
  if (c === "auth/weak-password") return "La contraseña nueva debe tener al menos 8 caracteres.";
  if (c === "auth/requires-recent-login") return "Por seguridad, sal y vuelve a entrar antes de cambiar la contraseña.";
  return "Correo o contraseña incorrectos.";
}
function saveError(e) {
  const c = String(e?.code || e?.message || "").toUpperCase();
  if (c.includes("PERMISSION")) return store.status !== "activa" ? "Tu tienda no está activa; no se pueden guardar cambios." : "No tienes permiso para cambiar esta tienda.";
  return "No se pudo guardar. Revisa tu conexión e intenta de nuevo.";
}

/* ── Entrar ── */
async function loginBrand() {
  if (!validId(storeId)) return;
  const s = await fetchStore(storeId);
  if (!s?.name) return;
  applyTheme(s);
  $("loginBrand").innerHTML = (s.logo ? `<img src="${esc(s.logo)}" alt="" />` : "") + `<span>${esc(s.name)}</span>`;
}
$("lEye").addEventListener("click", () => {
  const i = $("lPass"); i.type = i.type === "password" ? "text" : "password";
  $("lEye").innerHTML = `<i class="fa-regular fa-eye${i.type === "text" ? "-slash" : ""}"></i>`;
});
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("lErr").textContent = ""; $("lOk").hidden = true;
  const email = $("lEmail").value.trim().toLowerCase(), pass = $("lPass").value;
  if (!email || !pass) { $("lErr").textContent = "Escribe tu correo y tu contraseña."; return; }
  $("lBtn").disabled = true; $("lBtn").textContent = "Entrando…";
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch (err) { $("lErr").textContent = authError(err); }
  finally { $("lBtn").disabled = false; $("lBtn").textContent = "Entrar"; }
});
$("forgot").addEventListener("click", async () => {
  const email = $("lEmail").value.trim().toLowerCase();
  $("lErr").textContent = ""; $("lOk").hidden = true;
  if (!/^\S+@\S+\.\S+$/.test(email)) { $("lErr").textContent = "Escribe tu correo arriba y vuelve a tocar \"Olvidé mi contraseña\"."; $("lEmail").focus(); return; }
  try {
    // Al crear la contraseña, el botón "Continuar" lo regresa aquí
    try { await sendPasswordResetEmail(auth, email, { url: location.href }); }
    catch (err) { if (/continue-uri|unauthorized/i.test(err.code || "")) await sendPasswordResetEmail(auth, email); else throw err; }
    $("lOk").hidden = false;
    $("lOk").textContent = `Si ${email} tiene cuenta, te llegará un correo para crear una contraseña nueva. Revisa también "spam".`;
  } catch (err) { $("lErr").textContent = authError(err); }
});
document.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", () => signOut(auth)));

onAuthStateChanged(auth, async (u) => {
  user = u;
  if (!u) { store = null; $("lPass").value = ""; show("loginView"); loginBrand(); return; }
  show("loading");
  isAdmin = ADMIN_EMAILS.includes((u.email || "").toLowerCase());
  let ids = [];
  try { ids = Object.keys((await get(ref(db, `userStores/${u.uid}`))).val() || {}); } catch (err) { console.warn(err); }
  // El admin puede entrar a cualquier tienda para dar soporte (?t=<id>)
  if (isAdmin && validId(storeId) && !ids.includes(storeId)) ids.push(storeId);
  if (ids.includes(storeId)) return open(storeId);
  if (ids.length === 1) return open(ids[0]);
  pick(ids);
});

async function pick(ids) {
  show("pickView");
  if (!ids.length) {
    $("pickTitle").textContent = "Sin tienda";
    $("pickText").textContent = `La cuenta ${user.email} todavía no tiene una tienda asignada. Si acabas de contratar, escríbenos.`;
    $("pickList").innerHTML = `<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waSend(SOPORTE_WA, `Hola, entré a Mi tienda con ${user.email} y no aparece mi tienda`)}"><i class="fa-brands fa-whatsapp"></i> Escribir a soporte</a>`;
    return;
  }
  $("pickTitle").textContent = "Elige tu tienda";
  $("pickText").textContent = "Tu cuenta maneja varias tiendas.";
  const list = await Promise.all(ids.map(async (id) => [id, await fetchStore(id)]));
  $("pickList").innerHTML = list.filter(([, s]) => s?.name).map(([id, s]) => `<button class="pick" data-pick="${esc(id)}">
    <span class="pick-logo" style="background:${esc(s.color || "#111")}">${s.logo ? `<img src="${esc(s.logo)}" alt="" />` : esc(s.name[0])}</span>
    <span><b>${esc(s.name)}</b><br /><small class="muted">${esc((GIROS[s.giro] || GIROS.otro).label)}</small></span><i class="fa-solid fa-chevron-right"></i>
  </button>`).join("");
}
$("pickList").addEventListener("click", (e) => { const b = e.target.closest("[data-pick]"); if (b) open(b.dataset.pick); });

/* ── Abrir la tienda ── */
async function open(id) {
  show("loading");
  const s = await fetchStore(id);
  if (!s?.name) { pick([]); return; }
  storeId = id;
  store = { ...s, products: asList(s.products) };
  if (new URLSearchParams(location.search).get("t") !== id) history.replaceState(null, "", `?t=${id}`);
  applyTheme(store);
  document.title = `Mi tienda · ${store.name}`;
  $("name").textContent = store.name;
  $("logo").hidden = !store.logo; if (store.logo) $("logo").src = store.logo;
  const st = store.status === "activa" ? ["Activa", true] : store.status === "pausada" ? ["Pausada", false] : ["Demo", false];
  $("statusPill").textContent = st[0]; $("statusPill").classList.toggle("on", st[1]);
  $("paused").hidden = store.status === "activa" || isAdmin;
  $("paused").querySelector("b").textContent = store.status === "pausada" ? "Tu tienda está pausada." : "Tu tienda aún no está activa.";
  $("pausedWa").href = waSend(SOPORTE_WA, `Hola, soy de ${store.name} y quiero activar mi tienda`);
  // Link corto (rayamistore.com/<nombre>) si el admin ya le creó uno
  const link = store.corto ? new URL(`../${store.corto}`, TIENDA_URL).href : `${TIENDA_URL}?t=${id}`;
  $("qView").href = link;
  $("qPanel").href = `panel.html?t=${id}`;
  $("qShare").href = waSend("", `Ya puedes ver nuestros productos y hacer tu pedido aquí:\n${link}`);
  $("helpWa").href = waSend(SOPORTE_WA, `Hola, soy de ${store.name} y necesito ayuda con mi tienda`);
  $("accEmail").textContent = `Entraste como ${user.email}`;
  showVigencia(store.status === "activa" ? await get(ref(db, `storeAdmin/${id}/vigencia`)).then((x) => x.val()).catch(() => null) : null);
  render(); fillBiz();
  show("app");
}
// Vigencia del plan: se ve en Cuenta y, si está por vencer, como aviso arriba
function showVigencia(iso) {
  $("renew").hidden = true; $("accPlan").hidden = true;
  if (!iso) return;
  const fecha = new Date(iso + "T12:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const dias = Math.round((new Date(iso + "T12:00") - hoy) / 86400000);
  const plan = store.plan === "vitrina" ? "Vitrina" : "Pedidos";
  $("accPlan").hidden = false;
  $("accPlan").innerHTML = `Plan <b>${plan}</b> · vigente hasta el <b>${fecha}</b>`;
  if (dias > 5) return;
  $("renew").hidden = false;
  $("renewTxt").innerHTML = dias < 0 ? `<b>Tu plan venció el ${fecha}.</b> Renuévalo para que tu tienda siga en línea.`
    : `<b>Tu plan vence ${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}</b> (${fecha}). Renuévalo para que tu tienda siga en línea.`;
  $("renewWa").href = waSend(SOPORTE_WA, `Hola, soy de ${store.name} y quiero renovar mi plan ${plan}`);
}
$("qCopy").addEventListener("click", async () => {
  const link = store.corto ? new URL(`../${store.corto}`, TIENDA_URL).href : `${TIENDA_URL}?t=${storeId}`;
  try { await navigator.clipboard.writeText(link); toast("Link copiado"); } catch { toast(link); }
});

/* ── Pestañas ── */
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.tab === "pedidos") loadPedidos();
  if (b.dataset.tab === "clientes") loadClientes();
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab-pane").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  scrollTo(0, 0);
}));

/* ── Fotos: a Storage (duenos/<uid>/<tienda>/) o, si no está activo, dentro de la base ──
   Las fotos se comprimen en el celular antes de subir (ver fotos.js).
   Cada producto guarda 2 versiones: "photo" (grande, para la ficha) y
   "photoMini" (chica, para el catálogo). Así la tienda carga rápido y gasta menos datos. */
const isData = (s) => typeof s === "string" && s.startsWith("data:image/");
const extDe = (dataUrl) => (dataUrl.match(/^data:image\/(png|webp|jpeg)/)?.[1] || "jpg").replace("jpeg", "jpg");
async function subir(name, dataUrl) {
  const r = sRef(storage, `duenos/${user.uid}/${storeId}/${name}-${Date.now().toString(36)}.${extDe(dataUrl)}`);
  await uploadString(r, dataUrl, "data_url", { cacheControl: "public,max-age=31536000" });
  return await getDownloadURL(r);
}
async function storePhoto(name, dataUrl) {
  if (!isData(dataUrl)) return dataUrl;
  try { return await subir(name, dataUrl); }
  catch (err) {
    console.warn("Storage no disponible, la foto se guarda en la base:", err.code || err.message);
    return dataUrl;
  }
}
/** Foto de producto: grande + miniatura en Storage. Si Storage no está activo,
    una sola foto mediana dentro de la base (para no inflar las descargas). */
async function storeProductPhoto(name, grande, file) {
  if (!isData(grande)) return { photo: grande };
  try {
    const mini = await comprimirFoto(file, FOTO_MINI);
    const [photo, photoMini] = await Promise.all([subir(name, grande), subir(name + "-mini", mini)]);
    return { photo, photoMini };
  } catch (err) {
    console.warn("Storage no disponible, la foto se guarda en la base:", err.code || err.message);
    return { photo: await comprimirFoto(file, FOTO_BASE), photoMini: null };
  }
}

/* ── Guardar en Firebase ── */
async function saveProducts(next, msg) {
  if (!canEdit()) { toast("Tu tienda no está activa; no se pueden guardar cambios."); return false; }
  try {
    await update(ref(db, `stores/${storeId}`), { products: clean(next), updatedAt: serverTimestamp() });
    store.products = next;
    render();
    toast(msg);
    return true;
  } catch (err) { console.error(err); toast(saveError(err)); return false; }
}

/* ── Inventario: "stock" es opcional. Vacío = sin control; 0 = agotado automático ── */
const LOW = 3;
const tracked = (p) => p.stock !== undefined && p.stock !== null && p.stock !== "";
const isOff = (p) => !!p.agotado || (tracked(p) && Number(p.stock) <= 0);
const stockBadge = (p) => !tracked(p) ? "" : Number(p.stock) <= 0 ? "" : `<span class="badge${Number(p.stock) <= LOW ? " low" : ""}">${Number(p.stock) <= LOW ? "Quedan" : "Hay"} ${Number(p.stock)}</span>`;

/* ── Lista de productos ── */
function render() {
  const all = products();
  const q = query.trim().toLowerCase();
  const list = q ? all.filter((p) => `${p.name} ${p.category || ""}`.toLowerCase().includes(q)) : all;
  $("count").textContent = `(${all.length})`;
  $("search").hidden = all.length < 8;
  $("list").innerHTML = list.length ? list.map((p) => {
    const sale = p.salePrice > 0 && p.salePrice < p.price;
    return `<div class="item${isOff(p) ? " off" : ""}">
      <img src="${esc(photoOf(p))}" alt="" loading="lazy" />
      <div>
        <div class="item-name">${esc(p.name)}</div>
        <div class="item-meta">
          ${sale ? `<span class="sale">${money(p.salePrice)}</span><s>${money(p.price)}</s>` : `<span>${money(p.price)}</span>`}
          ${p.category ? `<span>· ${esc(p.category)}</span>` : ""}
          ${isOff(p) ? `<span class="badge off">Agotado</span>` : stockBadge(p)}
          ${(p.variantes || []).length ? `<span class="badge">${(p.variantes || []).map((g) => esc(g.nombre)).join(", ")}</span>` : ""}
        </div>
      </div>
      <div class="item-actions">
        <button class="mini" data-edit="${esc(p.id)}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="mini${p.destacado ? " on" : ""}" data-star="${esc(p.id)}" title="Pasa en la tira de productos en movimiento"><i class="fa-${p.destacado ? "solid" : "regular"} fa-star"></i> Destacado</button>
        <button class="mini${p.agotado ? " on" : ""}" data-off="${esc(p.id)}"><i class="fa-solid fa-ban"></i> ${p.agotado ? "Agotado" : "Marcar agotado"}</button>
        <button class="mini danger" data-del="${esc(p.id)}" aria-label="Borrar ${esc(p.name)}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join("") : `<p class="muted">${q ? "Ningún producto coincide con tu búsqueda." : "Aún no tienes productos. Agrega el primero."}</p>`;
}
$("search").addEventListener("input", (e) => { query = e.target.value; render(); });

$("list").addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-edit]"), off = e.target.closest("[data-off]"), del = e.target.closest("[data-del]");
  const star = e.target.closest("[data-star]");
  if (star) {
    star.disabled = true;
    const p = products().find((x) => x.id === star.dataset.star);
    await saveProducts(products().map((x) => (x.id === p.id ? { ...x, destacado: !x.destacado } : x)),
      p.destacado ? `"${p.name}" ya no es destacado` : `"${p.name}" ahora es destacado`);
    return;
  }
  if (ed) openSheet(ed.dataset.edit);
  if (off) {
    off.disabled = true;
    const p = products().find((x) => x.id === off.dataset.off);
    await saveProducts(products().map((x) => (x.id === p.id ? { ...x, agotado: !x.agotado } : x)),
      p.agotado ? `"${p.name}" ya está disponible` : `"${p.name}" marcado como agotado`);
  }
  if (del) {
    const id = del.dataset.del;
    if (del.dataset.confirm !== "1") { del.dataset.confirm = "1"; del.innerHTML = "¿Borrar? Toca otra vez"; setTimeout(render, 3500); return; }
    del.disabled = true;
    await saveProducts(products().filter((p) => p.id !== id), "Producto borrado");
  }
});

/* ── Hoja de producto ── */
function categories() {
  return [...new Set([...(store.categorias || giro().categorias || []), ...products().map((p) => p.category).filter(Boolean)])];
}
function openSheet(id, combo = false) {
  editing = id;
  const p = id === "new" ? null : products().find((x) => x.id === id);
  draftCombo = p ? p.category === "Combos" || !!p.combo : combo;
  draftPhoto = p?.photo || ""; draftFile = null;
  $("sheetTitle").textContent = p ? "Editar producto" : draftCombo ? "Agregar combo" : "Agregar producto";
  $("fName").value = p?.name || "";
  $("fName").placeholder = draftCombo ? "Ej. Combo 2 tacos + refresco" : "Ej. Tenis blancos";
  $("fPrice").value = p?.price || "";
  $("fSale").value = p?.salePrice || "";
  $("fStock").value = tracked(p || {}) ? p.stock : "";
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
  $("fPhotoPrev").src = draftPhoto || (p ? photoOf(p) : fotoEjemplo(draftCombo ? "🎁" : giro().emoji, store.color));
  $("fErr").textContent = "";
  $("sheet").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("fName").focus(), 50);
}
function closeSheet() { $("sheet").hidden = true; document.body.style.overflow = ""; editing = null; }

$("fPhoto").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  $("fPhotoPrev").style.opacity = ".5";
  try { draftPhoto = await comprimirFoto(f, FOTO_GRANDE); draftFile = f; $("fPhotoPrev").src = draftPhoto; }
  catch (err) { toast(err.message); }
  finally { $("fPhotoPrev").style.opacity = ""; }
  e.target.value = "";
});
$("fCat").addEventListener("change", () => { $("newCatWrap").hidden = $("fCat").value !== "__new"; if (!$("newCatWrap").hidden) $("fNewCat").focus(); });

$("pForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("fName").value.trim();
  const price = num($("fPrice").value);
  const salePrice = num($("fSale").value);
  const category = $("fCat").value === "__new" ? $("fNewCat").value.trim() : $("fCat").value;
  if (!name) { $("fErr").textContent = "Escribe el nombre"; $("fName").focus(); return; }
  if (!price) { $("fErr").textContent = "Escribe el precio"; $("fPrice").focus(); return; }
  if (salePrice && salePrice >= price) { $("fErr").textContent = "El precio de oferta debe ser menor al precio normal"; $("fSale").focus(); return; }
  if (!category) { $("fErr").textContent = "Escribe el nombre de la categoría"; $("fNewCat").focus(); return; }
  if (editing === "new" && products().length >= 300) { $("fErr").textContent = "Llegaste al máximo de 300 productos."; return; }
  const variantes = [["v0n", "v0v"], ["v1n", "v1v"]].map(([n, v]) => ({
    nombre: $(n).value.trim(), opciones: $(v).value.split(",").map((x) => x.trim()).filter(Boolean),
  })).filter((g) => g.nombre && g.opciones.length);
  const prev = editing === "new" ? null : products().find((x) => x.id === editing);
  const id = prev?.id || "p" + Date.now().toString(36);
  const btn = $("fSave"); btn.disabled = true; btn.textContent = isData(draftPhoto) ? "Subiendo foto…" : "Guardando…";
  try {
    const fotos = draftFile && isData(draftPhoto)
      ? await storeProductPhoto(`p-${id}`, draftPhoto, draftFile)
      : { photo: draftPhoto, photoMini: draftPhoto === prev?.photo ? prev?.photoMini : null };
    const item = {
      ...(prev || { id, emoji: draftCombo ? "🎁" : giro().emoji }),
      name, price, salePrice, category, desc: $("fDesc").value.trim(), variantes, ...fotos,
      ...(draftCombo ? { combo: true } : {}),
    };
    const st = $("fStock").value.trim();
    if (st === "") delete item.stock; else item.stock = Math.max(0, Math.min(99999, Math.floor(num(st))));
    if (item.stock > 0 && item.agotado) item.agotado = false; // si repones piezas, vuelve a estar disponible
    if (!item.photoMini) delete item.photoMini; // sin miniatura: la tienda usa la foto normal
    const next = prev ? products().map((x) => (x.id === prev.id ? item : x)) : [item, ...products()];
    if (await saveProducts(next, prev ? "Producto actualizado" : "Producto agregado")) closeSheet();
  } finally { btn.disabled = false; btn.textContent = "Guardar"; }
});
$("addProd").addEventListener("click", () => openSheet("new", false));
$("addCombo").addEventListener("click", () => openSheet("new", true));
$("sheetClose").addEventListener("click", closeSheet);
$("sheetCancel").addEventListener("click", closeSheet);
$("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });

/* ── Pedidos: el dueño confirma la venta y se descuenta el inventario ── */
let pedidos = [];
const fechaCorta = (ms) => new Date(ms).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
async function loadPedidos() {
  try {
    const snap = await get(ref(db, `leads/${storeId}`));
    pedidos = Object.entries(snap.val() || {}).map(([id, l]) => ({ id, ...l })).filter((l) => l.type === "pedido").sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 60);
  } catch (err) { console.error(err); $("pedList").innerHTML = `<p class="err">No pude cargar tus pedidos.</p>`; return; }
  renderPedidos();
}
function renderPedidos() {
  const nuevos = pedidos.filter((l) => !l.status || l.status === "nuevo").length;
  $("pedBadge").hidden = !nuevos; $("pedBadge").textContent = nuevos;
  $("pedCount").textContent = pedidos.length ? `(${pedidos.length})` : "";
  $("pedList").innerHTML = pedidos.length ? pedidos.map((l) => {
    const items = asList(l.items);
    const pend = !l.status || l.status === "nuevo";
    const tag = l.status === "vendido" ? `<span class="tag2 ok">Vendido</span>` : l.status === "cancelado" ? `<span class="tag2 no">Cancelado</span>` : `<span class="tag2">Nuevo</span>`;
    const sinStock = pend ? items.filter((i) => { const p = products().find((x) => x.id === i.id); return p && tracked(p) && Number(p.stock) < (i.qty || 1); }) : [];
    return `<div class="ped${pend ? "" : " done"}">
      <div class="ped-top"><span>${esc(l.name || "Cliente")} <small>${l.phone ? "· " + esc(l.phone) : ""}</small></span><span>${money(l.total)} ${tag}</span></div>
      <small class="muted">${l.ts ? fechaCorta(l.ts) : ""}${l.delivery ? " · " + esc(l.delivery) : ""}${l.mesa ? " · mesa " + esc(l.mesa) : ""}</small>
      <ul>${items.map((i) => `<li>${esc(i.qty || 1)} × ${esc(i.name)}${i.v ? ` (${esc(i.v)})` : ""}</li>`).join("")}</ul>
      ${sinStock.length ? `<div class="warn">⚠ No alcanza el inventario de: ${sinStock.map((i) => esc(i.name)).join(", ")}</div>` : ""}
      ${pend ? `<div class="acts"><button class="btn btn-dark" data-sold="${esc(l.id)}"><i class="fa-solid fa-check"></i> Marcar vendido</button><button class="mini" data-cancel="${esc(l.id)}">Cancelar</button></div>` : ""}
    </div>`;
  }).join("") : `<p class="muted">Aún no hay pedidos. Cuando tus clientes manden uno, aparece aquí.</p>`;
}
$("pedList").addEventListener("click", async (e) => {
  const sold = e.target.closest("[data-sold]"), cancel = e.target.closest("[data-cancel]");
  const btn = sold || cancel; if (!btn) return;
  const l = pedidos.find((x) => x.id === (sold ? sold.dataset.sold : cancel.dataset.cancel));
  if (!l || (l.status && l.status !== "nuevo")) return;
  btn.disabled = true;
  try {
    const up = {};
    let selloA = "";
    if (sold) {
      // Inventario fresco desde Firebase (por si cambió desde otro celular) y descuento solo de lo que se controla
      const fresh = asList((await get(ref(db, `stores/${storeId}/products`))).val());
      const next = fresh.map((p) => {
        const it = asList(l.items).filter((i) => i.id === p.id).reduce((n, i) => n + (Number(i.qty) || 1), 0);
        if (!it || !tracked(p)) return p;
        const left = Math.max(0, Number(p.stock) - it);
        return { ...p, stock: left };
      });
      up[`stores/${storeId}/products`] = clean(next);
      // Clientes frecuentes: la venta suma un sello al WhatsApp del cliente
      const lea = lealtad(), k = telKey(l.phone);
      if (lea.activo && k.length === 10) {
        const prev = (await get(ref(db, `clientes/${storeId}/${k}`))).val() || nuevoCliente(l.name, k);
        const r = conCompra(prev, lea, l);
        up[`clientes/${storeId}/${k}`] = clean({ ...r.c, name: prev.name || (l.name || "").slice(0, 60) });
        selloA = r.sello ? `+1 sello para ${prev.name || l.name || "tu cliente"}` : `Sin sello: la compra es menor a ${money(lea.minimo)}`;
      }
      up[`stores/${storeId}/updatedAt`] = serverTimestamp();
      store.products = next;
    }
    up[`leads/${storeId}/${l.id}/status`] = sold ? "vendido" : "cancelado";
    await update(ref(db), up);
    l.status = sold ? "vendido" : "cancelado";
    renderPedidos(); render();
    toast(sold ? (selloA ? `Venta registrada. ${selloA}` : "Venta registrada. Inventario actualizado") : "Pedido cancelado");
    if (selloA) clientes = [];
  } catch (err) { console.error(err); toast(saveError(err)); btn.disabled = false; }
});

/* ── Clientes frecuentes: tarjeta de sellos por número de WhatsApp ── */
const telKey = (t) => digits(t).slice(-10);
const waIntl = (t) => "52" + telKey(t);
const lealtad = () => ({ activo: false, meta: 10, premio: "", plazo: 0, minimo: 0, ...(store.lealtad || {}) });
// Plazo: la tarjeta empieza con el primer sello (inicio) y vence "plazo" meses después
const masMeses = (ts, m) => { const d = new Date(ts); d.setMonth(d.getMonth() + m); return d.getTime(); };
const venceEn = (c, l) => (l.plazo && c.inicio ? masMeses(c.inicio, l.plazo) : 0);
const vencida = (c, l) => { const v = venceEn(c, l); return !!v && Date.now() > v; };
const sellosDe = (c, l) => (vencida(c, l) ? 0 : Number(c.sellos) || 0);
// Suma un sello; si la tarjeta venció o estaba vacía, empieza una nueva desde hoy
const resumenItems = (items) => asList(items).map((i) => `${Number(i.qty) || 1} × ${i.name}${i.v ? ` (${i.v})` : ""}`).join(", ").slice(0, 140);
// Registra qué compró y cuánto; el sello solo cuenta si la compra llega al mínimo
const conCompra = (c, l, pedido) => {
  const total = Number(pedido.total) || 0;
  const base = { ultimo: resumenItems(pedido.items), ultimoTotal: total, gastado: (Number(c.gastado) || 0) + total };
  if (total < (Number(l.minimo) || 0)) return { c: { ...c, ...base, visitas: (Number(c.visitas) || 0) + 1, ultima: Date.now() }, sello: false };
  return { c: { ...conSello(c, l), ...base }, sello: true };
};
const conSello = (c, l) => { const n = sellosDe(c, l), now = Date.now(); return { ...c, sellos: n + 1, inicio: n === 0 ? now : c.inicio || now, visitas: (Number(c.visitas) || 0) + 1, ultima: now }; };
const nuevoCliente = (name, phone) => ({ name: String(name || "").slice(0, 60), phone: telKey(phone), sellos: 0, canjes: 0, visitas: 0, alta: Date.now() });
let clientes = [];
function fillLealtad() {
  const l = lealtad();
  $("lActivo").checked = !!l.activo; $("lMeta").value = l.meta; $("lPremio").value = l.premio || ""; $("lPlazo").value = String(l.plazo || 0); $("lMinimo").value = l.minimo ? String(l.minimo) : ""; $("lErr").textContent = "";
}
async function loadClientes() {
  fillLealtad();
  try {
    const snap = await get(ref(db, `clientes/${storeId}`));
    clientes = Object.entries(snap.val() || {}).map(([k, c]) => ({ k, ...c }));
  } catch (err) { console.error(err); $("cliList").innerHTML = `<p class="err">No pude cargar tus clientes.</p>`; return; }
  renderClientes();
}
function renderClientes() {
  const l = lealtad(), q = $("cliBuscar").value.trim().toLowerCase();
  const list = clientes.filter((c) => !q || String(c.name || "").toLowerCase().includes(q) || String(c.phone || "").includes(q))
    .sort((a, b) => (b.ultima || b.alta || 0) - (a.ultima || a.alta || 0));
  $("cliCount").textContent = clientes.length ? `(${clientes.length})` : "";
  $("cliList").innerHTML = list.length ? list.map((c) => {
    const n = sellosDe(c, l), listo = n >= l.meta, v = venceEn(c, l), venc = vencida(c, l) && (Number(c.sellos) || 0) > 0;
    const fechaV = v ? new Date(v).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "";
    const dots = Array.from({ length: l.meta }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    const msg = listo
      ? `Hola ${c.name || ""}, ¡completaste tus ${l.meta} sellos en ${store.name}! Tu premio: ${l.premio || "un regalo"}. Te esperamos para entregártelo.`
      : `Hola ${c.name || ""}, llevas ${n} de ${l.meta} sellos en ${store.name}. ¡Te faltan ${l.meta - n} para tu premio${l.premio ? ": " + l.premio : ""}${v && !venc && n ? ` (tienes hasta el ${fechaV})` : ""}!`;
    return `<div class="cli${listo ? " ready" : ""}">
      <div class="cli-top"><b>${esc(c.name || "Cliente")}</b><small>${esc(c.phone || "")}</small></div>
      <div class="sellos" aria-label="${n} de ${l.meta} sellos">${dots}</div>
      <small class="muted">${n} de ${l.meta} sellos${venc ? ` · <b class="vence">su tarjeta venció; empieza de nuevo</b>` : v && n && !listo ? ` · <b class="vence">vence el ${fechaV}</b>` : ""}${c.canjes ? ` · ${c.canjes} premio(s) entregado(s)` : ""}${c.ultima ? ` · última compra ${fechaCorta(c.ultima)}` : ""}</small>
      ${c.ultimo ? `<small>Compró: ${esc(c.ultimo)}${c.ultimoTotal ? ` · ${money(c.ultimoTotal)}` : ""}</small>` : ""}
      ${c.gastado ? `<small class="muted">Total gastado: ${money(c.gastado)} en ${Number(c.visitas) || 0} compra(s)</small>` : ""}
      <div class="acts">
        <button class="mini" data-sello="${esc(c.k)}"><i class="fa-solid fa-plus"></i> 1 sello${l.minimo ? ` (compra desde ${money(l.minimo)})` : ""}</button>
        ${listo ? `<button class="btn btn-dark" data-canje="${esc(c.k)}"><i class="fa-solid fa-gift"></i> Entregar premio</button>` : ""}
        <a class="mini" target="_blank" rel="noopener" href="${esc(waSend(waIntl(c.phone), msg))}"><i class="fa-brands fa-whatsapp"></i> Avisar</a>
      </div>
    </div>`;
  }).join("") : `<p class="muted">${clientes.length ? "Sin resultados." : "Aún no hay clientes. Se agregan solos cuando marcas un pedido como vendido, o agrégalos aquí arriba."}</p>`;
}
async function saveCliente(c, msg) {
  if (!canEdit()) { toast("Tu tienda no está activa; no se pueden guardar cambios."); return false; }
  const { k, ...data } = c;
  try { await update(ref(db), { [`clientes/${storeId}/${k}`]: clean(data) }); toast(msg); return true; }
  catch (err) { console.error(err); toast(saveError(err)); return false; }
}
$("cliBuscar").addEventListener("input", renderClientes);
$("cliList").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-sello],[data-canje]"); if (!b) return;
  const c = clientes.find((x) => x.k === (b.dataset.sello || b.dataset.canje)); if (!c) return;
  const l = lealtad(), n = sellosDe(c, l);
  const next = b.dataset.sello
    ? conSello(c, l)
    : { ...c, sellos: Math.max(0, n - l.meta), inicio: n - l.meta > 0 ? Date.now() : 0, canjes: (Number(c.canjes) || 0) + 1 };
  b.disabled = true;
  if (await saveCliente(next, b.dataset.sello ? `+1 sello para ${c.name || "tu cliente"}` : "Premio entregado. Empieza una tarjeta nueva")) Object.assign(c, next);
  renderClientes();
});
$("cliAdd").addEventListener("submit", async (e) => {
  e.preventDefault();
  const k = telKey($("cPhone").value);
  if (k.length !== 10) { toast("Escribe el WhatsApp a 10 dígitos"); $("cPhone").focus(); return; }
  if (clientes.some((c) => c.k === k)) { toast("Ese número ya está en tu lista"); return; }
  const c = { k, ...nuevoCliente($("cName").value.trim(), k) };
  if (await saveCliente(c, "Cliente agregado")) { clientes.push(c); $("cName").value = ""; $("cPhone").value = ""; renderClientes(); }
});
$("lForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("lErr").textContent = "";
  if (!canEdit()) { $("lErr").textContent = "Tu tienda no está activa; no se pueden guardar cambios."; return; }
  const meta = Math.floor(num($("lMeta").value));
  if (meta < 2 || meta > 30) { $("lErr").textContent = "Elige entre 2 y 30 sellos."; $("lMeta").focus(); return; }
  const premio = $("lPremio").value.trim();
  if ($("lActivo").checked && !premio) { $("lErr").textContent = "Escribe cuál es el premio."; $("lPremio").focus(); return; }
  const plazo = Number($("lPlazo").value) || 0;
  const minimo = Math.max(0, Math.floor(num($("lMinimo").value)));
  const lealtadNueva = { activo: $("lActivo").checked, meta, premio, plazo, minimo };
  const btn = $("lSave"); btn.disabled = true;
  try {
    await update(ref(db, `stores/${storeId}`), { lealtad: lealtadNueva, updatedAt: serverTimestamp() });
    store.lealtad = lealtadNueva; renderClientes();
    toast(lealtadNueva.activo ? "Listo: tus clientes ya ven la tarjeta de sellos" : "Guardado");
  } catch (err) { console.error(err); $("lErr").textContent = saveError(err); }
  finally { btn.disabled = false; }
});

/* ── Mi negocio ── */
function renderLogo() {
  const l = draftLogo ?? store.logo;
  $("logoBox").innerHTML = l ? `<img src="${esc(l)}" alt="Logo" />` : `<i class="fa-regular fa-image"></i>`;
}
function payVisibility() {
  const m = [...document.querySelectorAll("#bPagos input:checked")].map((c) => c.value);
  $("bTransfer").hidden = !m.includes("transferencia");
  $("bLinkWrap").hidden = !m.includes("link");
}
function fillBiz() {
  draftLogo = null; renderLogo();
  $("bTagline").value = store.tagline || "";
  $("bWa").value = store.whatsapp || "";
  $("bHorario").value = store.horario || "";
  $("bAviso").value = store.aviso || "";
  const ent = store.pedidos?.entregas || ["recoger", "domicilio"];
  document.querySelectorAll("#bEntregas input").forEach((c) => (c.checked = ent.includes(c.value)));
  const pg = { metodos: ["entrega", "transferencia"], ...(store.pagos || {}) };
  document.querySelectorAll("#bPagos input").forEach((c) => (c.checked = (pg.metodos || []).includes(c.value)));
  // Si la tienda cobra por adelantado, "pago al recibir" no aplica
  const entrega = document.querySelector('#bPagos input[value="entrega"]');
  entrega.closest("label").hidden = !!pg.anticipado;
  $("bBanco").value = pg.banco || ""; $("bTitular").value = pg.titular || ""; $("bClabe").value = pg.clabe || ""; $("bLink").value = pg.link || "";
  $("bErr").textContent = "";
  payVisibility();
}
$("bPagos").addEventListener("change", payVisibility);
$("bLogo").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { draftLogo = await comprimirFoto(f, FOTO_LOGO); renderLogo(); }
  catch (err) { toast(err.message); }
  e.target.value = "";
});
$("bizForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("bErr").textContent = "";
  if (!canEdit()) { $("bErr").textContent = "Tu tienda no está activa; no se pueden guardar cambios."; return; }
  const wa = $("bWa").value.trim();
  if (digits(wa).length < 10) { $("bErr").textContent = "Escribe tu WhatsApp a 10 dígitos."; $("bWa").focus(); return; }
  const entregas = [...document.querySelectorAll("#bEntregas input:checked")].map((c) => c.value);
  if (store.plan !== "vitrina" && !entregas.length) { $("bErr").textContent = "Elige al menos una forma de entrega."; return; }
  const metodos = [...document.querySelectorAll("#bPagos input:checked")].map((c) => c.value);
  const clabe = digits($("bClabe").value);
  if (metodos.includes("transferencia") && clabe && clabe.length < 10) { $("bErr").textContent = "Revisa la CLABE (18 dígitos) o el número de cuenta."; $("bClabe").focus(); return; }
  const link = $("bLink").value.trim();
  if (link && !/^https?:\/\//i.test(link)) { $("bErr").textContent = "El link de pago debe empezar con https://"; $("bLink").focus(); return; }
  const btn = $("bSave"); btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando…`;
  try {
    const changes = {
      tagline: $("bTagline").value.trim(), whatsapp: wa, horario: $("bHorario").value.trim(), aviso: $("bAviso").value.trim(),
      pedidos: clean({ datos: "opcional", ...(store.pedidos || {}), entregas }),
      pagos: clean({ ...(store.pagos || {}), metodos, banco: $("bBanco").value.trim(), titular: $("bTitular").value.trim(), clabe, link }),
      updatedAt: serverTimestamp(),
    };
    if (draftLogo) changes.logo = await storePhoto("logo", draftLogo);
    await update(ref(db, `stores/${storeId}`), changes);
    Object.assign(store, changes);
    if (changes.logo) { $("logo").src = changes.logo; $("logo").hidden = false; }
    draftLogo = null;
    toast("Cambios guardados");
  } catch (err) { console.error(err); $("bErr").textContent = saveError(err); }
  finally { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar cambios`; }
});

/* ── Cuenta ── */
$("passForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("pErr").textContent = "";
  const old = $("pOld").value, nueva = $("pNew").value;
  if (!old) { $("pErr").textContent = "Escribe tu contraseña actual."; return; }
  if (nueva.length < 8) { $("pErr").textContent = "La contraseña nueva debe tener al menos 8 caracteres."; return; }
  $("pBtn").disabled = true;
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, old));
    await updatePassword(user, nueva);
    $("pOld").value = ""; $("pNew").value = "";
    toast("Contraseña cambiada");
  } catch (err) {
    $("pErr").textContent = ["auth/wrong-password", "auth/invalid-credential"].includes(err?.code) ? "La contraseña actual no es correcta." : authError(err);
  } finally { $("pBtn").disabled = false; }
});
