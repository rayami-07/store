// App de finanzas RAYAMI: login, datos en Realtime Database y pantalla. Los cálculos viven en calculos.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { resultadosMes, historial, validarMes, avisosMes, fmtMXN, fmtPct, fmtDias, num, totalGastos } from "./calculos.js";

// Misma configuración que el resto del sitio (crm, tienda).
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
const WA_RAYAMI = "525581074978";
const SERVICIO_URL = new URL("../../servicios/finanzas/", location.href).href;

// ---------- Estado ----------
const S = { user: null, negocios: {}, negocioId: null, modo: "simple", meses: {}, offMeses: null, offNegocios: null, mesRes: null, editando: false };

// ---------- Utilidades de DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function msg(id, texto, tipo = "err") {
  const el = document.getElementById(id); if (!el) return;
  if (!texto || (Array.isArray(texto) && !texto.length)) { el.className = "msg"; el.innerHTML = ""; return; }
  el.className = `msg show ${tipo}`;
  el.innerHTML = Array.isArray(texto) ? `<ul>${texto.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : esc(texto);
}
let toastT;
function toast(texto, ms = 3500) {
  const t = $("#toast"); t.textContent = texto; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), ms);
}
function ocupado(btn, si) {
  if (!btn) return;
  if (si) { btn.dataset.txt = btn.innerHTML; btn.innerHTML = '<span class="cargando"></span>'; btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.txt || btn.innerHTML; btn.disabled = false; }
}
const mesLabel = (clave) => {
  const [y, m] = clave.split("-").map(Number);
  const n = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return n.charAt(0).toUpperCase() + n.slice(1);
};
const mesActualClave = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

// Errores de Firebase en español de negocio
function errorTexto(e) {
  const c = e?.code || "";
  const t = {
    "auth/invalid-email": "Ese correo no se ve bien. Revísalo.",
    "auth/user-not-found": "No encontramos una cuenta con ese correo.",
    "auth/wrong-password": "La contraseña no es correcta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use": "Ya hay una cuenta con ese correo. Entra con tu contraseña o recupérala.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet e intenta de nuevo.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
    "auth/operation-not-allowed": "Este método de acceso no está activado todavía. Usa correo y contraseña.",
    "auth/unauthorized-domain": "Este dominio no está autorizado para Google. Usa correo y contraseña.",
    "PERMISSION_DENIED": "No se pudo guardar: tu acceso no está activo. Escríbenos por WhatsApp para activarlo.",
  };
  if (t[c]) return t[c];
  if (/permission_denied/i.test(e?.message || "")) return t.PERMISSION_DENIED;
  if (!navigator.onLine) return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  return "Algo falló. Intenta de nuevo en un momento.";
}
addEventListener("offline", () => toast("Sin conexión: puedes seguir capturando, pero no se guardará hasta que vuelva el internet.", 6000));
addEventListener("online", () => toast("Volvió la conexión."));

// ---------- Rutas en la base ----------
const pUser = () => `finanzas/${S.user.uid}`;
const pNegocios = () => `${pUser()}/negocios`;
const pMeses = () => `${pNegocios()}/${S.negocioId}/meses`;

// ---------- Auth: pestañas y formularios ----------
$("#tab-login").addEventListener("click", () => cambiarAuthTab("login"));
$("#tab-registro").addEventListener("click", () => cambiarAuthTab("registro"));
function cambiarAuthTab(cual) {
  $("#tab-login").setAttribute("aria-selected", String(cual === "login"));
  $("#tab-registro").setAttribute("aria-selected", String(cual === "registro"));
  $("#form-login").hidden = cual !== "login"; $("#form-registro").hidden = cual !== "registro";
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-login", "");
  const f = e.target, btn = f.querySelector('[type="submit"]');
  if (!f.email.value.trim() || !f.password.value) return msg("msg-login", "Escribe tu correo y tu contraseña.");
  ocupado(btn, true);
  try { await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); }
  catch (err) { msg("msg-login", errorTexto(err)); }
  finally { ocupado(btn, false); }
});

$("#form-registro").addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-registro", "");
  const f = e.target, btn = f.querySelector('[type="submit"]');
  const errs = [];
  if (!f.nombre.value.trim()) errs.push("Dinos tu nombre.");
  if (!f.email.value.trim()) errs.push("Escribe tu correo.");
  if (f.password.value.length < 6) errs.push("La contraseña debe tener al menos 6 caracteres.");
  if (!f.privacidad.checked) errs.push("Necesitas aceptar el aviso de privacidad.");
  if (errs.length) return msg("msg-registro", errs);
  ocupado(btn, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    await updateProfile(cred.user, { displayName: f.nombre.value.trim() }).catch(() => {});
    await guardarPerfil(cred.user, f.nombre.value.trim(), true);
  } catch (err) { msg("msg-registro", errorTexto(err)); }
  finally { ocupado(btn, false); }
});

async function conGoogle(desdeRegistro) {
  const id = desdeRegistro ? "msg-registro" : "msg-login";
  msg(id, "");
  if (desdeRegistro && !$("#form-registro").privacidad.checked) return msg(id, "Primero acepta el aviso de privacidad.");
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    await guardarPerfil(cred.user, cred.user.displayName || "", true);
  } catch (err) { msg(id, errorTexto(err)); }
}
$("#btn-google").addEventListener("click", () => conGoogle(false));
$("#btn-google-reg").addEventListener("click", () => conGoogle(true));

$("#btn-olvide").addEventListener("click", async () => {
  const email = $("#form-login").email.value.trim();
  if (!email) return msg("msg-login", "Escribe tu correo arriba y vuelve a dar clic.");
  try { await sendPasswordResetEmail(auth, email); msg("msg-login", "Te mandamos un correo para cambiar tu contraseña.", "ok"); }
  catch (err) { msg("msg-login", errorTexto(err)); }
});

async function guardarPerfil(user, nombre, acepto) {
  // Solo crea el perfil si no existe (para no pisar aceptoPrivacidad al volver a entrar con Google)
  try {
    const snap = await get(ref(db, `finanzas/${user.uid}/perfil`));
    if (snap.exists()) return;
    await set(ref(db, `finanzas/${user.uid}/perfil`), { nombre: nombre || "", email: user.email || "", aceptoPrivacidad: !!acepto, creado: serverTimestamp() });
  } catch (err) { toast(errorTexto(err)); }
}

$("#btn-salir").addEventListener("click", () => signOut(auth));

// ---------- Sesión y acceso ----------
// Cada cuenta nueva queda "pendiente" en finanzasAcceso/<uid>. Raúl la activa desde el creador
// (con vigencia) cuando paga; las reglas de Firebase impiden guardar datos si no está activa.
const ADMIN_EMAIL = "raulbenitez563@gmail.com";
const PLAN_WA = (email) => `https://api.whatsapp.com/send?phone=${WA_RAYAMI}&text=${encodeURIComponent(`Hola, ya me registré en RAYAMI Finanzas con ${email}. Quiero activar mi cuenta.`)}`;
const fFecha = (t) => new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function detener() {
  for (const k of ["offNegocios", "offMeses", "offAcceso"]) if (S[k]) { S[k](); S[k] = null; }
}
function accesoVigente(a, user) {
  if ((user?.email || "").toLowerCase() === ADMIN_EMAIL) return true;
  return !!a && (a.estado === "activo" || a.estado === "prueba") && Number(a.venceTs) > Date.now();
}
async function crearSolicitud(user) {
  // Un momento para que el nombre (updateProfile) alcance a guardarse antes de registrar la solicitud
  await new Promise((r) => setTimeout(r, 900));
  try {
    // Cada cuenta nueva arranca con 14 días de prueba (las reglas solo permiten esto al crearla, una vez)
    await set(ref(db, `finanzasAcceso/${user.uid}`), { estado: "prueba", venceTs: Date.now() + 14 * 86400000, email: user.email || "", nombre: (auth.currentUser?.displayName || "").slice(0, 60), ts: serverTimestamp() });
  } catch (err) { toast(errorTexto(err)); }
}
function pintarBloqueo(a, user) {
  const email = user.email || "";
  let titulo = "Tu cuenta está lista", texto = "Falta activarla. Escríbenos por WhatsApp para activar tu acceso y empezar a capturar tus meses.";
  if (a && a.estado === "pausado") { titulo = "Tu acceso está en pausa"; texto = "Escríbenos para reactivarlo y seguir capturando tus meses."; }
  else if (a && a.estado === "prueba") { titulo = "Terminó tu prueba de 14 días"; texto = "Esperamos que te haya servido ver tus números. Tus datos siguen guardados: escríbenos para activar tu acceso y seguir capturando."; }
  else if (a && a.estado === "activo") { titulo = "Tu acceso venció"; texto = `Tu acceso llegó hasta el ${fFecha(a.venceTs)}. Escríbenos para renovarlo y seguir capturando.`; }
  $("#bloq-titulo").textContent = titulo; $("#bloq-texto").textContent = texto;
  $("#bloq-wa").href = PLAN_WA(email);
}
function aplicarAcceso(a, user) {
  const ok = accesoVigente(a, user);
  $("#view-bloqueo").hidden = ok; $("#view-app").hidden = !ok;
  if (!ok) { if (S.offNegocios) { S.offNegocios(); S.offNegocios = null; } if (S.offMeses) { S.offMeses(); S.offMeses = null; } pintarBloqueo(a, user); return; }
  const aviso = $("#aviso-vence"), dias = a && a.venceTs ? Math.ceil((a.venceTs - Date.now()) / 86400000) : null;
  const esAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;
  const prueba = a && a.estado === "prueba";
  aviso.hidden = esAdmin || dias === null || (!prueba && dias > 5);
  if (!aviso.hidden && prueba) aviso.innerHTML = `Estás en tu prueba gratis: te ${dias === 1 ? "queda 1 día" : `quedan ${dias} días`} (hasta el ${esc(fFecha(a.venceTs))}). <a href="${PLAN_WA(user.email || "")}" target="_blank" rel="noopener">Escríbenos para activar tu acceso</a>.`;
  else if (!aviso.hidden) aviso.innerHTML = `Tu acceso vence el ${esc(fFecha(a.venceTs))}. <a href="${PLAN_WA(user.email || "")}" target="_blank" rel="noopener">Escríbenos para renovarlo</a>.`;
  if (!S.offNegocios) iniciarApp();
}
function iniciarApp() {
  S.offNegocios = onValue(ref(db, pNegocios()), (snap) => {
    S.negocios = snap.val() || {};
    const ids = Object.keys(S.negocios);
    if (!ids.length) { S.negocioId = null; mostrarFormNegocio(false); pintarSelectNegocios(); return; }
    if (!S.negocioId || !S.negocios[S.negocioId]) S.negocioId = localStorage.getItem("fin:negocio") in S.negocios ? localStorage.getItem("fin:negocio") : ids[0];
    pintarSelectNegocios();
    if ($("#view-negocio").hidden) elegirNegocio(S.negocioId);
  }, (err) => toast(errorTexto(err)));
}
$("#btn-salir-bloq").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  S.user = user;
  detener();
  $("#view-auth").hidden = !!user; $("#view-app").hidden = true; $("#view-bloqueo").hidden = true;
  if (!user) { S.negocios = {}; S.negocioId = null; S.meses = {}; return; }
  $("#usuario").textContent = user.displayName || user.email || "";
  S.offAcceso = onValue(ref(db, `finanzasAcceso/${user.uid}`), (snap) => {
    if (!snap.exists()) { crearSolicitud(user); return; }
    aplicarAcceso(snap.val(), user);
  }, (err) => toast(errorTexto(err)));
});

// ---------- Negocios ----------
function pintarSelectNegocios() {
  const sel = $("#sel-negocio");
  sel.innerHTML = Object.entries(S.negocios).map(([id, n]) => `<option value="${id}" ${id === S.negocioId ? "selected" : ""}>${esc(n.nombre)}</option>`).join("") || `<option value="">Sin negocio</option>`;
}
$("#sel-negocio").addEventListener("change", (e) => elegirNegocio(e.target.value));
$("#btn-nuevo-negocio").addEventListener("click", () => mostrarFormNegocio(true));
$("#btn-cancelar-negocio").addEventListener("click", () => { if (S.negocioId) elegirNegocio(S.negocioId); });

function mostrarFormNegocio(cancelable) {
  $("#view-negocio").hidden = false; $("#view-main").hidden = true;
  $("#btn-cancelar-negocio").hidden = !cancelable;
  $("#form-negocio").reset(); msg("msg-negocio", "");
}
$("#form-negocio").addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-negocio", "");
  const f = e.target, nombre = f.nombre.value.trim();
  if (nombre.length < 2) return msg("msg-negocio", "Escribe el nombre de tu negocio.");
  const btn = f.querySelector('[type="submit"]'); ocupado(btn, true);
  try {
    const nuevo = push(ref(db, pNegocios()));
    await set(nuevo, { nombre, giro: f.giro.value, modo: "simple", creado: serverTimestamp() });
    S.negocioId = nuevo.key; localStorage.setItem("fin:negocio", nuevo.key);
    elegirNegocio(nuevo.key);
  } catch (err) { msg("msg-negocio", errorTexto(err)); }
  finally { ocupado(btn, false); }
});

function elegirNegocio(id) {
  if (!id || !S.negocios[id]) return;
  S.negocioId = id; localStorage.setItem("fin:negocio", id);
  S.modo = S.negocios[id].modo === "avanzado" ? "avanzado" : "simple";
  pintarModo();
  $("#view-negocio").hidden = true; $("#view-main").hidden = false;
  $("#sel-negocio").value = id;
  if (S.offMeses) S.offMeses();
  S.meses = {};
  S.offMeses = onValue(ref(db, pMeses()), (snap) => {
    S.meses = snap.val() || {};
    // Si estamos editando no pisamos lo que el usuario escribe; solo refrescamos avisos y listas.
    if (!S.editando) cargarMesEnForm($("#form-mes").mes.value);
    else revisarMesExiste();
    pintarSelectMesRes(); pintarResultados(); pintarHistorial();
  }, (err) => toast(errorTexto(err)));
  // Mes por defecto: el actual
  const f = $("#form-mes"); if (!f.mes.value) f.mes.value = mesActualClave();
  S.editando = false; cargarMesEnForm(f.mes.value);
  cambiarTab("capturar");
}

// ---------- Modo simple / avanzado ----------
$("#modo-simple").addEventListener("click", () => setModo("simple"));
$("#modo-avanzado").addEventListener("click", () => setModo("avanzado"));
async function setModo(m) {
  S.modo = m; pintarModo();
  if (S.negocioId) update(ref(db, `${pNegocios()}/${S.negocioId}`), { modo: m }).catch((err) => toast(errorTexto(err)));
}
function pintarModo() {
  const av = S.modo === "avanzado";
  $("#modo-simple").setAttribute("aria-pressed", String(!av)); $("#modo-avanzado").setAttribute("aria-pressed", String(av));
  $("#gastos-simple").hidden = av; $("#gastos-avanzado").hidden = !av; $("#bloque-productos").hidden = !av;
  if (av && !$("#productos").children.length) for (let i = 0; i < 3; i++) agregarFilaProducto();
  // Al pasar de simple a avanzado, el total capturado se mueve a "otros" para no perderlo
  const f = $("#form-mes");
  if (av && f.gastosTotal.value && !f.renta.value && !f.sueldos.value && !f.servicios.value && !f.otros.value) f.otros.value = f.gastosTotal.value;
  if (!av && !f.gastosTotal.value) { const t = totalGastos({ renta: f.renta.value, sueldos: f.sueldos.value, servicios: f.servicios.value, otros: f.otros.value }); if (t) f.gastosTotal.value = t; }
}

// ---------- Tabs ----------
$$('[role="tab"][data-tab]').forEach((b) => b.addEventListener("click", () => cambiarTab(b.dataset.tab)));
function cambiarTab(t) {
  $$('[role="tab"][data-tab]').forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
  ["capturar", "resultados", "historial"].forEach((k) => { $(`#tab-${k}`).hidden = k !== t; });
}

// ---------- Ayudas "¿qué es esto?" ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest(".ayuda-btn"); if (!b) return;
  e.preventDefault(); const a = document.getElementById(b.dataset.ayuda); if (a) a.hidden = !a.hidden;
});

// ---------- Captura ----------
const formMes = $("#form-mes");
formMes.mes.addEventListener("change", () => { S.editando = false; cargarMesEnForm(formMes.mes.value); });
formMes.addEventListener("input", () => { S.editando = true; });
$("#btn-add-prod").addEventListener("click", () => agregarFilaProducto());

function agregarFilaProducto(p = {}) {
  const row = document.createElement("div"); row.className = "prod-row";
  row.innerHTML = `
    <label class="field"><span class="lbl">Producto</span><input type="text" data-k="nombre" maxlength="40" placeholder="Nombre" value="${esc(p.nombre || "")}" /></label>
    <label class="field"><span class="lbl">Precio</span><span class="money"><input type="text" inputmode="decimal" data-k="precio" placeholder="0" value="${p.precio ?? ""}" /></span></label>
    <label class="field"><span class="lbl">Costo</span><span class="money"><input type="text" inputmode="decimal" data-k="costo" placeholder="0" value="${p.costo ?? ""}" /></span></label>
    <label class="field"><span class="lbl">Unidades</span><input type="text" inputmode="numeric" data-k="unidades" placeholder="0" value="${p.unidades ?? ""}" /></label>
    <button type="button" class="btn btn-ghost btn-sm quitar" aria-label="Quitar producto"><i class="fa-solid fa-xmark"></i><span class="txt">Quitar</span></button>`;
  row.querySelector(".quitar").addEventListener("click", () => { row.remove(); S.editando = true; });
  $("#productos").appendChild(row);
}
function leerProductos() {
  return $$("#productos .prod-row").map((r) => Object.fromEntries($$("input", r).map((i) => [i.dataset.k, i.value.trim()])))
    .filter((p) => p.nombre || p.precio || p.costo || p.unidades);
}
function leerForm() {
  const f = formMes, av = S.modo === "avanzado";
  const gastos = av ? { renta: f.renta.value, sueldos: f.sueldos.value, servicios: f.servicios.value, otros: f.otros.value } : { otros: f.gastosTotal.value };
  return { ventas: f.ventas.value.trim(), costoVentas: f.costoVentas.value.trim(), caja: f.caja.value.trim(), gastos, productos: av ? leerProductos() : [] };
}
function cargarMesEnForm(clave) {
  const f = formMes, m = (clave && S.meses[clave]) || null;
  const vals = (v) => (v == null || v === 0 ? "" : String(v));
  f.ventas.value = vals(m?.ventas); f.costoVentas.value = vals(m?.costoVentas); f.caja.value = vals(m?.caja);
  const g = m?.gastos || {};
  f.renta.value = vals(g.renta); f.sueldos.value = vals(g.sueldos); f.servicios.value = vals(g.servicios); f.otros.value = vals(g.otros);
  f.gastosTotal.value = m ? (totalGastos(g) ? String(totalGastos(g)) : "") : "";
  $("#productos").innerHTML = "";
  const prods = Object.values(m?.productos || {});
  if (prods.length) prods.forEach((p) => agregarFilaProducto(p)); else if (S.modo === "avanzado") for (let i = 0; i < 3; i++) agregarFilaProducto();
  $("#btn-borrar-mes").hidden = !m;
  msg("msg-mes", ""); revisarMesExiste();
}
function revisarMesExiste() {
  const clave = formMes.mes.value;
  const existe = clave && S.meses[clave];
  msg("msg-mes-existe", existe ? `Ya capturaste ${mesLabel(clave)}. Estás editándolo: al guardar se reemplaza, no se duplica.` : "", "warn");
}

formMes.addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-mes", "");
  const clave = formMes.mes.value;
  if (!/^\d{4}-\d{2}$/.test(clave)) return msg("msg-mes", "Elige el mes que vas a capturar.");
  if (clave > mesActualClave()) return msg("msg-mes", "Ese mes todavía no termina. Captura meses ya cerrados.");
  const datos = leerForm();
  const errs = validarMes(datos, S.modo);
  if (errs.length) return msg("msg-mes", errs);
  const avisos = avisosMes(datos);
  if (avisos.length && !confirm(avisos.join("\n\n") + "\n\n¿Guardar de todos modos?")) return;
  const gastos = Object.fromEntries(Object.entries(datos.gastos).map(([k, v]) => [k, num(v)]));
  const productos = {}; datos.productos.forEach((p, i) => { productos[`p${i + 1}`] = { nombre: p.nombre.slice(0, 40), precio: num(p.precio), costo: num(p.costo), unidades: num(p.unidades) }; });
  const mes = { ventas: num(datos.ventas), costoVentas: num(datos.costoVentas), caja: num(datos.caja), gastos, actualizado: serverTimestamp() };
  if (Object.keys(productos).length) mes.productos = productos;
  const btn = $("#btn-guardar"); ocupado(btn, true);
  try {
    await set(ref(db, `${pMeses()}/${clave}`), mes);
    S.editando = false; S.mesRes = clave;
    toast(`${mesLabel(clave)} guardado.`);
    cambiarTab("resultados"); pintarSelectMesRes(); pintarResultados();
    window.scrollTo({ top: $("#tab-resultados").offsetTop - 80, behavior: "smooth" });
  } catch (err) { msg("msg-mes", errorTexto(err) + " Tus datos siguen en pantalla; vuelve a intentar."); }
  finally { ocupado(btn, false); }
});

$("#btn-borrar-mes").addEventListener("click", async () => {
  const clave = formMes.mes.value; if (!S.meses[clave]) return;
  if (!confirm(`¿Borrar ${mesLabel(clave)}? Esto no se puede deshacer.`)) return;
  try { await remove(ref(db, `${pMeses()}/${clave}`)); toast("Mes borrado."); S.editando = false; cargarMesEnForm(clave); }
  catch (err) { toast(errorTexto(err)); }
});

// ---------- Resultados ----------
$("#sel-mes-res").addEventListener("change", (e) => { S.mesRes = e.target.value; pintarResultados(); });
$("#btn-editar-mes").addEventListener("click", () => { if (S.mesRes) { formMes.mes.value = S.mesRes; S.editando = false; cargarMesEnForm(S.mesRes); cambiarTab("capturar"); } });

function clavesOrdenadas() { return Object.keys(S.meses).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort(); }
function pintarSelectMesRes() {
  const claves = clavesOrdenadas().reverse();
  if (!S.mesRes || !S.meses[S.mesRes]) S.mesRes = claves[0] || null;
  $("#sel-mes-res").innerHTML = claves.map((k) => `<option value="${k}" ${k === S.mesRes ? "selected" : ""}>${mesLabel(k)}</option>`).join("") || `<option value="">Sin meses</option>`;
}
function pintarResultados() {
  const cont = $("#res-contenido");
  if (!S.mesRes || !S.meses[S.mesRes]) { cont.innerHTML = `<div class="card vacio">Todavía no has capturado ningún mes. Ve a <b>Capturar</b> y llena tu primer mes.</div>`; return; }
  const claves = clavesOrdenadas(), i = claves.indexOf(S.mesRes);
  const anterior = i > 0 ? S.meses[claves[i - 1]] : null;
  const r = resultadosMes({ ...S.meses[S.mesRes], anterior });
  const negocio = S.negocios[S.negocioId]?.nombre || "mi negocio";
  const s = r.semaforo;
  const kpi = (color, titulo, val, frase) => `<div class="kpi ${color}"><small><span class="dot ${color}"></span>${titulo}</small><div class="val">${val}</div><p>${esc(frase)}</p></div>`;
  const prodTabla = r.productos.length ? `
    <div class="card" style="margin-top:12px"><h3>Rentabilidad por producto</h3><p class="sub">Ordenados por lo que dejan en total. La barra es su parte de la ganancia bruta.</p>
    <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Producto</th><th class="n">Precio</th><th class="n">Costo</th><th class="n">Margen</th><th class="n">Vendidos</th><th class="n">Deja</th><th>Parte</th></tr></thead><tbody>
    ${r.productos.map((p) => `<tr class="${p.color}"><td>${esc(p.nombre)}</td><td class="n">${fmtMXN(p.precio)}</td><td class="n">${fmtMXN(p.costo)}</td><td class="n">${fmtPct(p.margenPct)}</td><td class="n">${p.unidades}</td><td class="n"><b>${fmtMXN(p.contribucion)}</b></td><td><div class="barra"><span style="width:${Math.round(p.participacion * 100)}%"></span></div></td></tr>`).join("")}
    </tbody></table></div></div>` : "";

  const textoWA = [
    `Resultados de ${negocio} · ${mesLabel(S.mesRes)}`,
    `Ventas: ${fmtMXN(r.ventas)} | Costo de ventas: ${fmtMXN(r.costoVentas)} | Gastos fijos: ${fmtMXN(r.gastos)}`,
    `Utilidad bruta: ${fmtMXN(r.utilidadBruta)} (${fmtPct(r.margenBruto)})`,
    `Utilidad neta: ${fmtMXN(r.utilidadNeta)} (${fmtPct(r.margenNeto)})`,
    `Punto de equilibrio: ${fmtMXN(r.puntoEquilibrio)} al mes`,
    `Caja: ${fmtMXN(r.caja)} → alcanza ${fmtDias(r.diasCaja)}`,
    `Recomendación: ${r.recomendacion}`,
    `— Calculado en rayamistore.com/finanzas/app/`,
  ].join("\n");
  const waCompartir = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoWA)}`;
  const waAyuda = `https://api.whatsapp.com/send?phone=${WA_RAYAMI}&text=${encodeURIComponent("Hola, quiero que me ayuden a interpretar mis resultados de finanzas.\n\n" + textoWA)}`;

  cont.innerHTML = `
    <div class="res-hero">
      <small>${mesLabel(S.mesRes)} · ${esc(negocio)}</small>
      <div class="big ${r.utilidadNeta < 0 ? "neg" : ""}">${r.utilidadNeta < 0 ? "−" : ""}${fmtMXN(Math.abs(r.utilidadNeta))}</div>
      <p>${esc(r.frases.utilidad)}</p>
    </div>
    <div class="kpis">
      ${kpi(s.margenBruto, "Margen bruto", fmtPct(r.margenBruto), r.frases.margenBruto)}
      ${kpi(s.cobertura, "Punto de equilibrio", fmtMXN(r.puntoEquilibrio), r.frases.equilibrio)}
      ${kpi(s.diasCaja, "Días de caja", Number.isFinite(r.diasCaja) ? Math.round(r.diasCaja) : "—", r.frases.caja)}
      ${kpi(s.margenNeto, "Margen neto", fmtPct(r.margenNeto), r.utilidadNeta >= 0 ? `De cada $100 vendidos, te quedan ${Math.round(r.margenNeto * 100)} libres después de pagar todo.` : "No quedó nada libre este mes: los gastos se llevaron más que la ganancia bruta.")}
    </div>
    <div class="reco"><i class="fa-solid fa-lightbulb"></i><div><small>Tu recomendación del mes</small><p>${esc(r.recomendacion)}</p></div></div>
    ${prodTabla}
    <div class="acciones" style="margin-top:16px">
      <a class="btn btn-wa" href="${waCompartir}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Enviar mis resultados por WhatsApp</a>
      <a class="btn btn-line" href="${waAyuda}" target="_blank" rel="noopener"><i class="fa-solid fa-comments"></i> Quiero que me ayuden a interpretarlos</a>
    </div>
    <p style="margin-top:10px;font-size:13px;color:var(--muted)">La ayuda es parte del <a href="${SERVICIO_URL}" style="color:var(--orange-deep)">servicio de Finanzas</a> de RAYAMI. Los semáforos usan umbrales generales para negocios pequeños; no sustituyen a tu contador.</p>`;
}

// ---------- Historial con gráficas SVG ----------
function pintarHistorial() {
  const cont = $("#hist-contenido");
  const h = historial(S.meses);
  if (!h.length) { cont.innerHTML = `<div class="vacio">Aún no hay meses capturados.</div>`; return; }
  const ult = h.slice(-12);
  const labels = ult.map((m) => { const [y, mm] = m.clave.split("-"); return ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][+mm - 1] + " " + y.slice(2); });
  cont.innerHTML = `
    <div class="charts">
      <div class="chart"><h4>Ventas</h4>${svgBarras(ult.map((m) => m.ventas), labels)}</div>
      <div class="chart"><h4>Utilidad neta</h4>${svgBarras(ult.map((m) => m.utilidadNeta), labels)}</div>
      <div class="chart"><h4>Margen neto</h4>${svgLinea(ult.map((m) => m.margenNeto * 100), labels, "%")}</div>
    </div>
    <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Mes</th><th class="n">Ventas</th><th class="n">Utilidad</th><th class="n">Margen</th><th class="n">P. equilibrio</th><th class="n">Días caja</th></tr></thead><tbody>
    ${[...h].reverse().map((m) => `<tr class="${m.semaforo.margenNeto}"><td>${mesLabel(m.clave)}</td><td class="n">${fmtMXN(m.ventas)}</td><td class="n" style="color:${m.utilidadNeta < 0 ? "#b3261e" : "inherit"}">${fmtMXN(m.utilidadNeta)}</td><td class="n">${fmtPct(m.margenNeto)}</td><td class="n">${fmtMXN(m.puntoEquilibrio)}</td><td class="n">${Number.isFinite(m.diasCaja) ? Math.round(m.diasCaja) : "—"}</td></tr>`).join("")}
    </tbody></table></div>`;
}
const fmtCorto = (n) => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));
function svgBarras(vals, labels) {
  const W = 320, H = 170, padL = 34, padB = 26, padT = 14;
  const max = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const min = Math.min(0, ...vals);
  const rango = Math.max(1, Math.max(0, ...vals) - min);
  const y = (v) => padT + (1 - (v - min) / rango) * (H - padT - padB);
  const y0 = y(0), n = vals.length, paso = (W - padL) / n, bw = Math.min(40, paso * 0.6);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de barras">`;
  s += `<line class="ax" x1="${padL}" x2="${W}" y1="${y0}" y2="${y0}"/>`;
  s += `<text x="0" y="${padT + 4}">${fmtCorto(Math.max(0, ...vals))}</text><text x="0" y="${y0 + 4}">0</text>`;
  if (min < 0) s += `<text x="0" y="${y(min)}">${fmtCorto(min)}</text>`;
  vals.forEach((v, i) => {
    const x = padL + paso * i + (paso - bw) / 2, yv = y(v);
    const top = Math.min(yv, y0), hgt = Math.max(1, Math.abs(yv - y0));
    s += `<rect class="bar ${v < 0 ? "neg" : ""}" x="${x}" y="${top}" width="${bw}" height="${hgt}" rx="4"><title>${labels[i]}: ${fmtMXN(v)}</title></rect>`;
    if (n <= 8 || i % 2 === 0) s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`;
  });
  return s + `</svg>`;
}
function svgLinea(vals, labels, suf = "") {
  const W = 320, H = 170, padL = 34, padB = 26, padT = 14;
  const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals), rango = Math.max(1, hi - lo);
  const y = (v) => padT + (1 - (v - lo) / rango) * (H - padT - padB);
  const n = vals.length, paso = (W - padL) / Math.max(1, n), x = (i) => padL + paso * i + paso / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de línea">`;
  s += `<line class="ax" x1="${padL}" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>`;
  s += `<text x="0" y="${padT + 4}">${Math.round(hi)}${suf}</text><text x="0" y="${y(0) + 4}">0${suf}</text>`;
  if (lo < 0) s += `<text x="0" y="${y(lo)}">${Math.round(lo)}${suf}</text>`;
  if (n > 1) s += `<path class="ln" d="${vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}"/>`;
  vals.forEach((v, i) => {
    s += `<circle class="pt" cx="${x(i)}" cy="${y(v)}" r="4"><title>${labels[i]}: ${Math.round(v)}${suf}</title></circle>`;
    if (n <= 8 || i % 2 === 0) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`;
  });
  return s + `</svg>`;
}
