// App de finanzas RAYAMI: login, datos en Realtime Database y pantalla. Los cálculos viven en calculos.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { resultadosMes, resultadosEmpresa, historial, validarMes, validarDia, avisosMes, resumenDias, listaCategorias, idCategoria, CATEGORIAS_BASE, CAMPOS_EMPRESA, GRUPOS_EMPRESA, fmtMXN, fmtPct, fmtDias, num, totalGastos } from "./calculos.js";

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
const S = { user: null, negocios: {}, negocioId: null, modo: "simple", meses: {}, dias: {}, categorias: null, offMeses: null, offDias: null, offNegocios: null, mesRes: null, editando: false, editandoDia: false, captura: localStorage.getItem("fin:captura") === "dia" ? "dia" : "mes", formDesdeDiario: false };

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
const pNeg = () => `${pNegocios()}/${S.negocioId}`;
const pMeses = () => `${pNeg()}/meses`;
const pDias = () => `${pNeg()}/dias`;

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
  for (const k of ["offNegocios", "offMeses", "offDias", "offAcceso"]) if (S[k]) { S[k](); S[k] = null; }
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
  if (!ok) { for (const k of ["offNegocios", "offMeses", "offDias"]) if (S[k]) { S[k](); S[k] = null; } S.cargado = null; pintarBloqueo(a, user); return; }
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
    if (S.cargado !== S.negocioId) { if ($("#view-negocio").hidden) elegirNegocio(S.negocioId); }
    else { // mismo negocio: solo refrescar categorías y modo si cambiaron desde otro dispositivo
      S.categorias = S.negocios[S.negocioId].categorias || null;
      if (!S.editando) pintarGastosForm(leerGastosForm());
      if (!$("#view-ajustes").hidden) pintarCategorias();
    }
  }, (err) => toast(errorTexto(err)));
}
$("#btn-salir-bloq").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  S.user = user;
  detener();
  $("#view-auth").hidden = !!user; $("#view-app").hidden = true; $("#view-bloqueo").hidden = true;
  S.cargado = null;
  if (!user) { S.negocios = {}; S.negocioId = null; S.meses = {}; S.dias = {}; return; }
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
  $("#view-negocio").hidden = false; $("#view-main").hidden = true; $("#view-ajustes").hidden = true;
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
    await set(nuevo, { nombre, giro: f.giro.value, modo: "simple", creado: serverTimestamp(), categorias: CATEGORIAS_BASE });
    S.negocioId = nuevo.key; localStorage.setItem("fin:negocio", nuevo.key);
    elegirNegocio(nuevo.key);
  } catch (err) { msg("msg-negocio", errorTexto(err)); }
  finally { ocupado(btn, false); }
});

function elegirNegocio(id) {
  if (!id || !S.negocios[id]) return;
  S.negocioId = id; S.cargado = id; localStorage.setItem("fin:negocio", id);
  const n = S.negocios[id];
  S.modo = ["avanzado", "empresa"].includes(n.modo) ? n.modo : "simple";
  S.categorias = n.categorias || null;
  $("#view-negocio").hidden = true; $("#view-ajustes").hidden = true; $("#view-main").hidden = false;
  $("#sel-negocio").value = id;
  if (S.offMeses) S.offMeses(); if (S.offDias) S.offDias();
  S.meses = {}; S.dias = {}; S.editando = false; S.editandoDia = false;
  S.offMeses = onValue(ref(db, pMeses()), (snap) => {
    S.meses = snap.val() || {};
    if (!S.editando) cargarMesEnForm($("#form-mes").mes.value); else revisarMesExiste();
    pintarSelectMesRes(); pintarResultados(); pintarHistorial();
  }, (err) => toast(errorTexto(err)));
  S.offDias = onValue(ref(db, pDias()), (snap) => {
    S.dias = snap.val() || {};
    if (!S.editandoDia) cargarDiaEnForm($("#form-dia").fecha.value);
    pintarDiasMes(); if (!S.editando) revisarDiario();
  }, (err) => toast(errorTexto(err)));
  const f = $("#form-mes"); if (!f.mes.value) f.mes.value = mesActualClave();
  const fd = $("#form-dia"); if (!fd.fecha.value) fd.fecha.value = hoyISO(); fd.fecha.max = hoyISO();
  pintarModo(); pintarCaptura();
  cargarMesEnForm(f.mes.value); cargarDiaEnForm(fd.fecha.value);
  cambiarTab("capturar");
}

// ---------- Ajustes del negocio ----------
$("#btn-ajustes").addEventListener("click", abrirAjustes);
document.addEventListener("click", (e) => { if (e.target.closest("[data-ir-ajustes]")) abrirAjustes(); });
function abrirAjustes() {
  if (!S.negocioId) return;
  const n = S.negocios[S.negocioId], f = $("#form-ajustes");
  f.nombre.value = n.nombre || ""; f.giro.value = n.giro || "otro";
  msg("msg-ajustes", ""); msg("msg-categoria", "");
  pintarCategorias();
  $("#view-main").hidden = true; $("#view-ajustes").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#btn-ajustes-volver").addEventListener("click", () => { $("#view-ajustes").hidden = true; $("#view-main").hidden = false; });
$("#form-ajustes").addEventListener("submit", async (e) => {
  e.preventDefault(); const f = e.target, nombre = f.nombre.value.trim();
  if (nombre.length < 2) return msg("msg-ajustes", "Escribe el nombre del negocio.");
  try { await update(ref(db, pNeg()), { nombre, giro: f.giro.value }); msg("msg-ajustes", "Guardado.", "ok"); }
  catch (err) { msg("msg-ajustes", errorTexto(err)); }
});
function pintarCategorias() {
  const cats = listaCategorias(S.categorias);
  $("#lista-categorias").innerHTML = cats.map((c) => `<div class="cat-row" data-cat="${esc(c.id)}">
      <input type="text" value="${esc(c.nombre)}" maxlength="40" aria-label="Nombre de la categoría" />
      <button type="button" class="btn btn-ghost btn-sm" data-cat-del="${esc(c.id)}" aria-label="Borrar ${esc(c.nombre)}" ${cats.length <= 1 ? "disabled" : ""}><i class="fa-solid fa-trash"></i></button>
    </div>`).join("");
}
async function guardarCategorias(cats) {
  // cats: [{id, nombre, orden}] → mapa. Si el negocio nunca tuvo categorías propias, se crean a partir de las base.
  const mapa = {}; cats.forEach((c, i) => { mapa[c.id] = { nombre: c.nombre.slice(0, 40), orden: i + 1 }; });
  await set(ref(db, `${pNeg()}/categorias`), mapa);
  S.categorias = mapa;
}
$("#lista-categorias").addEventListener("change", async (e) => {
  const row = e.target.closest(".cat-row"); if (!row) return;
  const cats = listaCategorias(S.categorias).map((c) => (c.id === row.dataset.cat ? { ...c, nombre: e.target.value.trim() || c.nombre } : c));
  try { await guardarCategorias(cats); toast("Categoría renombrada."); } catch (err) { msg("msg-categoria", errorTexto(err)); }
});
$("#lista-categorias").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cat-del]"); if (!b) return;
  const cats = listaCategorias(S.categorias), c = cats.find((x) => x.id === b.dataset.catDel);
  if (!c || !confirm(`¿Quitar "${c.nombre}" de tus categorías? Los meses ya guardados conservan su monto.`)) return;
  try { await guardarCategorias(cats.filter((x) => x.id !== c.id)); pintarCategorias(); pintarGastosForm(leerGastosForm()); }
  catch (err) { msg("msg-categoria", errorTexto(err)); }
});
$("#form-categoria").addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-categoria", "");
  const inp = e.target.nombre, nombre = inp.value.trim();
  if (!nombre) return msg("msg-categoria", "Escribe el nombre de la categoría.");
  const cats = listaCategorias(S.categorias);
  if (cats.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) return msg("msg-categoria", "Ya tienes una categoría con ese nombre.");
  if (cats.length >= 20) return msg("msg-categoria", "Hasta 20 categorías. Junta las que casi no uses en una sola.");
  const existentes = Object.fromEntries(cats.map((c) => [c.id, 1]));
  try { await guardarCategorias([...cats, { id: idCategoria(nombre, existentes), nombre }]); inp.value = ""; pintarCategorias(); pintarGastosForm(leerGastosForm()); toast(`"${nombre}" agregada.`); }
  catch (err) { msg("msg-categoria", errorTexto(err)); }
});
$("#btn-borrar-negocio").addEventListener("click", async () => {
  const n = S.negocios[S.negocioId]; if (!n) return;
  if (!confirm(`¿Borrar "${n.nombre}" con todos sus meses y días? No se puede deshacer.`)) return;
  const escrito = prompt(`Para confirmar, escribe el nombre del negocio:\n${n.nombre}`);
  if ((escrito || "").trim().toLowerCase() !== n.nombre.trim().toLowerCase()) { toast("No coincide el nombre. No se borró nada."); return; }
  try {
    const id = S.negocioId;
    if (S.offMeses) { S.offMeses(); S.offMeses = null; } if (S.offDias) { S.offDias(); S.offDias = null; }
    S.cargado = null; S.negocioId = null; localStorage.removeItem("fin:negocio");
    await remove(ref(db, `${pNegocios()}/${id}`));
    toast("Negocio borrado."); $("#view-ajustes").hidden = true;
  } catch (err) { toast(errorTexto(err)); }
});

// ---------- Modo simple / avanzado / empresa ----------
const MODO_HINT = {
  simple: "Modo simple: solo los totales del mes. Ideal para empezar.",
  avanzado: "Modo avanzado: gastos por categoría y rentabilidad por producto.",
  empresa: "Modo empresa: además, balance, flujo de efectivo y razones financieras (liquidez, inventario, deuda).",
};
$$("[data-modo]").forEach((b) => b.addEventListener("click", () => setModo(b.dataset.modo)));
async function setModo(m) {
  S.modo = m; pintarModo();
  if (S.negocioId) update(ref(db, pNeg()), { modo: m }).catch((err) => toast(errorTexto(err)));
}
function pintarModo() {
  const av = S.modo !== "simple", emp = S.modo === "empresa";
  $$("[data-modo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === S.modo)));
  $("#modo-hint").textContent = MODO_HINT[S.modo];
  $("#gastos-simple").hidden = av; $("#gastos-avanzado").hidden = !av; $("#bloque-productos").hidden = !av; $("#bloque-empresa").hidden = !emp;
  if (av && !$("#productos").children.length) for (let i = 0; i < 3; i++) agregarFilaProducto();
  if (emp && !$("#bloque-empresa").children.length) pintarBloqueEmpresa({});
  // Al pasar de simple a avanzado, el total capturado se mueve a la última categoría para no perderlo
  const f = $("#form-mes"), g = leerGastosForm();
  if (av && f.gastosTotal.value && !totalGastos(g)) { const cats = listaCategorias(S.categorias); pintarGastosForm({ [cats[cats.length - 1].id]: f.gastosTotal.value }); }
  if (!av && !f.gastosTotal.value) { const t = totalGastos(g); if (t) f.gastosTotal.value = t; }
  if (S.mesRes) pintarResultados();
}

// ---------- Tabs y forma de captura ----------
$$('[role="tab"][data-tab]').forEach((b) => b.addEventListener("click", () => cambiarTab(b.dataset.tab)));
function cambiarTab(t) {
  $$('[role="tab"][data-tab]').forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
  ["capturar", "resultados", "historial"].forEach((k) => { $(`#tab-${k}`).hidden = k !== t; });
}
$$("[data-captura]").forEach((b) => b.addEventListener("click", () => { S.captura = b.dataset.captura; localStorage.setItem("fin:captura", S.captura); pintarCaptura(); }));
function pintarCaptura() {
  $$("[data-captura]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.captura === S.captura)));
  $("#captura-dia").hidden = S.captura !== "dia"; $("#captura-mes").hidden = S.captura !== "mes";
}

// ---------- Ayudas "¿qué es esto?" ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest(".ayuda-btn"); if (!b) return;
  e.preventDefault(); const a = document.getElementById(b.dataset.ayuda); if (a) a.hidden = !a.hidden;
});

// ---------- Captura por mes ----------
const formMes = $("#form-mes");
formMes.mes.addEventListener("change", () => { S.editando = false; cargarMesEnForm(formMes.mes.value); });
formMes.addEventListener("input", (e) => { if (e.target.name !== "mes") S.editando = true; });
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
/** Campos de gastos por categoría (modo avanzado/empresa). "valores" = {cat: monto} para prellenar. */
function pintarGastosForm(valores = {}) {
  const cats = listaCategorias(S.categorias);
  const ids = new Set(cats.map((c) => c.id));
  const extra = Object.keys(valores).filter((k) => !ids.has(k) && num(valores[k]) > 0).map((k) => ({ id: k, nombre: `${k} (categoría borrada)` }));
  const vals = (v) => (v == null || v === 0 || v === "" ? "" : String(v));
  $("#gastos-avanzado").innerHTML = [...cats, ...extra].map((c) => `<label class="field"><span>${esc(c.nombre)}</span><span class="money"><input type="text" inputmode="decimal" data-gasto="${esc(c.id)}" placeholder="0" value="${esc(vals(valores[c.id]))}" data-diario /></span></label>`).join("");
  if (S.formDesdeDiario) $$("#gastos-avanzado input").forEach((i) => { i.disabled = true; });
}
function leerGastosForm() { return Object.fromEntries($$("#gastos-avanzado input[data-gasto]").map((i) => [i.dataset.gasto, i.value.trim()])); }
/** Campos extra del modo empresa, agrupados. */
function pintarBloqueEmpresa(valores = {}) {
  const vals = (v) => (v == null || v === 0 ? "" : String(v));
  $("#bloque-empresa").innerHTML = Object.entries(GRUPOS_EMPRESA).map(([g, info]) => `<div class="bloque">
      <h3>${esc(info.titulo)}</h3><p class="sub">${esc(info.sub)}</p>
      <div class="gastos-grid">${Object.entries(CAMPOS_EMPRESA).filter(([, c]) => c.grupo === g).map(([k, c]) => `
        <label class="field"><span>${esc(c.label)} <button type="button" class="ayuda-btn" data-ayuda="a-emp-${k}">¿qué es esto?</button></span>
          <span class="ayuda" id="a-emp-${k}" hidden>${esc(c.ayuda)}</span>
          <span class="money"><input type="text" inputmode="decimal" name="emp-${k}" placeholder="0" value="${vals(valores[k])}" /></span></label>`).join("")}</div>
    </div>`).join("");
}
function leerEmpresaForm() { return Object.fromEntries(Object.keys(CAMPOS_EMPRESA).map((k) => [k, (formMes.elements[`emp-${k}`]?.value || "").trim()])); }
function leerForm() {
  const f = formMes, av = S.modo !== "simple";
  const gastos = av ? leerGastosForm() : { otros: f.gastosTotal.value };
  const out = { ventas: f.ventas.value.trim(), costoVentas: f.costoVentas.value.trim(), caja: f.caja.value.trim(), gastos, productos: av ? leerProductos() : [] };
  if (S.modo === "empresa") out.empresa = leerEmpresaForm();
  return out;
}
function cargarMesEnForm(clave) {
  const f = formMes, m = (clave && S.meses[clave]) || null;
  const vals = (v) => (v == null || v === 0 ? "" : String(v));
  S.formDesdeDiario = !!m?.desdeDiario;
  f.ventas.value = vals(m?.ventas); f.costoVentas.value = vals(m?.costoVentas); f.caja.value = vals(m?.caja);
  const g = m?.gastos || {};
  pintarGastosForm(g);
  f.gastosTotal.value = m ? (totalGastos(g) ? String(totalGastos(g)) : "") : "";
  $("#productos").innerHTML = "";
  const prods = Object.values(m?.productos || {});
  if (prods.length) prods.forEach((p) => agregarFilaProducto(p)); else if (S.modo !== "simple") for (let i = 0; i < 3; i++) agregarFilaProducto();
  pintarBloqueEmpresa(m?.empresa || {});
  $("#btn-borrar-mes").hidden = !m;
  msg("msg-mes", ""); revisarMesExiste(); revisarDiario();
}
function revisarMesExiste() {
  const clave = formMes.mes.value;
  const existe = clave && S.meses[clave];
  msg("msg-mes-existe", existe ? `Ya capturaste ${mesLabel(clave)}. Estás editándolo: al guardar se reemplaza, no se duplica.` : "", "warn");
}
/** Aviso de "este mes viene del diario" y bloqueo de los campos que se arman solos. */
function revisarDiario() {
  const clave = formMes.mes.value, m = S.meses[clave], rd = resumenDias(S.dias, clave);
  const bloquear = S.formDesdeDiario;
  $$("#form-mes [data-diario]").forEach((i) => { i.disabled = bloquear; });
  const el = $("#msg-diario");
  if (bloquear) {
    el.className = "msg show ok";
    el.innerHTML = `Ventas, costo y gastos de este mes vienen de tu diario (${rd.n} día${rd.n === 1 ? "" : "s"}). Para cambiarlos edita los días en <b>Día a día</b>. Caja y productos sí los capturas aquí. <button type="button" class="link-btn" id="btn-mes-manual">Capturar este mes a mano</button>`;
    $("#btn-mes-manual").addEventListener("click", () => { S.formDesdeDiario = false; S.editando = true; revisarDiario(); });
  } else if (rd.n > 0) {
    el.className = "msg show warn";
    el.innerHTML = `Tienes ${rd.n} día${rd.n === 1 ? "" : "s"} de ${mesLabel(clave)} en tu diario (ventas ${fmtMXN(rd.ventas)}, compras ${fmtMXN(rd.costoVentas)}, gastos ${fmtMXN(totalGastos(rd.gastos))}). <button type="button" class="link-btn" id="btn-usar-diario">Usar esos totales</button>`;
    $("#btn-usar-diario").addEventListener("click", () => {
      formMes.ventas.value = rd.ventas || ""; formMes.costoVentas.value = rd.costoVentas || ""; formMes.gastosTotal.value = totalGastos(rd.gastos) || "";
      pintarGastosForm(rd.gastos); S.formDesdeDiario = true; S.editando = true; revisarDiario();
    });
  } else { el.className = "msg"; el.innerHTML = ""; }
}

formMes.addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-mes", "");
  const clave = formMes.mes.value;
  if (!/^\d{4}-\d{2}$/.test(clave)) return msg("msg-mes", "Elige el mes que vas a capturar.");
  if (clave > mesActualClave()) return msg("msg-mes", "Ese mes todavía no empieza.");
  const datos = leerForm();
  const errs = validarMes(datos, S.modo);
  if (errs.length) return msg("msg-mes", errs);
  const avisos = avisosMes(datos);
  if (avisos.length && !confirm(avisos.join("\n\n") + "\n\n¿Guardar de todos modos?")) return;
  const gastos = Object.fromEntries(Object.entries(datos.gastos).map(([k, v]) => [k, num(v)]).filter(([, v]) => v > 0));
  const productos = {}; datos.productos.forEach((p, i) => { productos[`p${i + 1}`] = { nombre: p.nombre.slice(0, 40), precio: num(p.precio), costo: num(p.costo), unidades: num(p.unidades) }; });
  const mes = { ventas: num(datos.ventas), costoVentas: num(datos.costoVentas), caja: num(datos.caja), gastos, actualizado: serverTimestamp() };
  if (Object.keys(productos).length) mes.productos = productos;
  if (datos.empresa) { const emp = Object.fromEntries(Object.entries(datos.empresa).map(([k, v]) => [k, num(v)]).filter(([, v]) => v > 0)); if (Object.keys(emp).length) mes.empresa = emp; }
  else if (S.meses[clave]?.empresa) mes.empresa = S.meses[clave].empresa; // no perder lo capturado en modo empresa si ahora está en otro modo
  const rd = resumenDias(S.dias, clave);
  if (S.formDesdeDiario) { Object.assign(mes, { ventas: rd.ventas, costoVentas: rd.costoVentas, gastos: rd.gastos, desdeDiario: true }); }
  else if (rd.n > 0) mes.desdeDiario = false;
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
  const rd = resumenDias(S.dias, clave);
  if (!confirm(`¿Borrar ${mesLabel(clave)}?${rd.n ? ` Los ${rd.n} días del diario se conservan.` : ""} Esto no se puede deshacer.`)) return;
  try { await remove(ref(db, `${pMeses()}/${clave}`)); toast("Mes borrado."); S.editando = false; cargarMesEnForm(clave); }
  catch (err) { toast(errorTexto(err)); }
});

// ---------- Captura día a día ----------
const formDia = $("#form-dia");
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fechaLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }); };
formDia.fecha.addEventListener("change", () => { S.editandoDia = false; cargarDiaEnForm(formDia.fecha.value); pintarDiasMes(); });
formDia.addEventListener("input", (e) => { if (e.target.name !== "fecha") S.editandoDia = true; });
$$("[data-dia]").forEach((b) => b.addEventListener("click", () => {
  let f = formDia.fecha.value || hoyISO();
  if (b.dataset.dia === "hoy") f = hoyISO();
  else { const [y, m, d] = f.split("-").map(Number); const dt = new Date(y, m - 1, d + Number(b.dataset.dia)); f = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; }
  if (f > hoyISO()) return;
  formDia.fecha.value = f; S.editandoDia = false; cargarDiaEnForm(f); pintarDiasMes();
}));
$("#btn-add-gasto-dia").addEventListener("click", () => agregarGastoDia());
function agregarGastoDia(cat = "", monto = "") {
  const cats = listaCategorias(S.categorias);
  const row = document.createElement("div"); row.className = "gasto-dia";
  row.innerHTML = `<select aria-label="Categoría">${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === cat ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}${cat && !cats.some((c) => c.id === cat) ? `<option value="${esc(cat)}" selected>${esc(cat)} (borrada)</option>` : ""}</select>
    <span class="money"><input type="text" inputmode="decimal" placeholder="0" value="${esc(monto === 0 ? "" : String(monto))}" aria-label="Monto" /></span>
    <button type="button" class="btn btn-ghost btn-sm quitar" aria-label="Quitar gasto"><i class="fa-solid fa-xmark"></i></button>`;
  row.querySelector(".quitar").addEventListener("click", () => { row.remove(); S.editandoDia = true; });
  $("#gastos-dia").appendChild(row);
}
function leerGastosDia() {
  const g = {};
  $$("#gastos-dia .gasto-dia").forEach((r) => { const cat = r.querySelector("select").value, v = r.querySelector("input").value.trim(); if (v !== "") g[cat] = (g[cat] ? String(num(g[cat]) + num(v)) : v); });
  return g;
}
function cargarDiaEnForm(fecha) {
  const d = (fecha && S.dias[fecha]) || null;
  const vals = (v) => (v == null || v === 0 ? "" : String(v));
  formDia.ventas.value = vals(d?.ventas); formDia.compras.value = vals(d?.compras); formDia.nota.value = d?.nota || "";
  $("#gastos-dia").innerHTML = "";
  const g = Object.entries(d?.gastos || {}).filter(([, v]) => num(v) > 0);
  if (g.length) g.forEach(([c, v]) => agregarGastoDia(c, v)); else agregarGastoDia();
  $("#btn-borrar-dia").hidden = !d;
  msg("msg-dia", "");
  msg("msg-dia-existe", d ? `Ya anotaste el ${fechaLabel(fecha)}. Estás editándolo.` : "", "warn");
}
/** Vuelve a sumar los días del mes y lo escribe en el mes (salvo que ese mes se capture a mano). */
async function rearmarMes(clave, dias) {
  const m = S.meses[clave], rd = resumenDias(dias, clave);
  if (m && m.desdeDiario === false) return "manual";
  if (rd.n === 0) {
    if (!m) return;
    const soloDiario = !num(m.caja) && !m.productos && !m.empresa;
    if (soloDiario) await remove(ref(db, `${pMeses()}/${clave}`));
    else await update(ref(db, `${pMeses()}/${clave}`), { ventas: 0, costoVentas: 0, gastos: null, desdeDiario: true, actualizado: serverTimestamp() });
    return;
  }
  await update(ref(db, `${pMeses()}/${clave}`), { ventas: rd.ventas, costoVentas: rd.costoVentas, gastos: Object.keys(rd.gastos).length ? rd.gastos : null, desdeDiario: true, actualizado: serverTimestamp() });
}
formDia.addEventListener("submit", async (e) => {
  e.preventDefault(); msg("msg-dia", "");
  const fecha = formDia.fecha.value;
  const datos = { fecha, ventas: formDia.ventas.value.trim(), compras: formDia.compras.value.trim(), gastos: leerGastosDia() };
  if (fecha > hoyISO()) return msg("msg-dia", "Ese día todavía no llega.");
  const errs = validarDia(datos); if (errs.length) return msg("msg-dia", errs);
  const gastos = Object.fromEntries(Object.entries(datos.gastos).map(([k, v]) => [k, num(v)]).filter(([, v]) => v > 0));
  const dia = { ventas: num(datos.ventas), compras: num(datos.compras), actualizado: serverTimestamp() };
  if (Object.keys(gastos).length) dia.gastos = gastos;
  const nota = formDia.nota.value.trim(); if (nota) dia.nota = nota.slice(0, 120);
  const btn = $("#btn-guardar-dia"); ocupado(btn, true);
  try {
    await set(ref(db, `${pDias()}/${fecha}`), dia);
    const manual = await rearmarMes(fecha.slice(0, 7), { ...S.dias, [fecha]: dia });
    S.editandoDia = false;
    toast(manual === "manual" ? `${fechaLabel(fecha)} guardado. Ese mes lo capturaste a mano, así que no se suma solo.` : `${fechaLabel(fecha)} guardado. ${mesLabel(fecha.slice(0, 7))} ya está actualizado.`);
    pintarDiasMes();
  } catch (err) { msg("msg-dia", errorTexto(err) + " Tus datos siguen en pantalla; vuelve a intentar."); }
  finally { ocupado(btn, false); }
});
$("#btn-borrar-dia").addEventListener("click", async () => {
  const fecha = formDia.fecha.value; if (!S.dias[fecha]) return;
  if (!confirm(`¿Borrar lo anotado el ${fechaLabel(fecha)}?`)) return;
  try {
    await remove(ref(db, `${pDias()}/${fecha}`));
    const copia = { ...S.dias }; delete copia[fecha];
    await rearmarMes(fecha.slice(0, 7), copia);
    S.editandoDia = false; toast("Día borrado."); cargarDiaEnForm(fecha);
  } catch (err) { toast(errorTexto(err)); }
});
function pintarDiasMes() {
  const fecha = formDia.fecha.value || hoyISO(), clave = fecha.slice(0, 7);
  const rd = resumenDias(S.dias, clave);
  const cont = $("#dias-mes");
  const lista = Object.entries(S.dias).filter(([f]) => f.startsWith(clave + "-")).sort((a, b) => b[0].localeCompare(a[0]));
  if (!lista.length) { cont.innerHTML = `<p class="vacio" style="padding:12px 0">Todavía no anotas ningún día de ${mesLabel(clave)}.</p>`; return; }
  const m = S.meses[clave];
  cont.innerHTML = `<div class="dias-head"><h3>${mesLabel(clave)}: ${rd.n} día${rd.n === 1 ? "" : "s"}</h3>
      <small class="muted">Ventas ${fmtMXN(rd.ventas)} · Compras ${fmtMXN(rd.costoVentas)} · Gastos ${fmtMXN(totalGastos(rd.gastos))} · Queda ${fmtMXN(rd.ventas - rd.costoVentas - totalGastos(rd.gastos))}</small>
      ${m && m.desdeDiario === false ? `<small class="muted">Este mes lo capturaste a mano: la suma del diario no lo cambia.</small>` : ""}
      <button type="button" class="btn btn-ghost btn-sm" id="btn-ver-res-dia"><i class="fa-solid fa-gauge-high"></i> Ver resultados del mes</button></div>
    <div class="tabla-wrap"><table class="tabla tabla-dias"><thead><tr><th>Día</th><th class="n">Ventas</th><th class="n">Compras</th><th class="n">Gastos</th><th>Nota</th></tr></thead><tbody>
    ${lista.map(([f, d]) => `<tr data-fecha="${f}" class="${f === fecha ? "sel" : ""}"><td>${fechaLabel(f)}</td><td class="n">${fmtMXN(num(d.ventas))}</td><td class="n">${fmtMXN(num(d.compras))}</td><td class="n">${fmtMXN(totalGastos(d.gastos))}</td><td class="nota">${esc(d.nota || "")}</td></tr>`).join("")}
    </tbody></table></div><p class="hint" style="margin-top:6px">Toca un día para editarlo.</p>`;
  $("#btn-ver-res-dia").addEventListener("click", () => { S.mesRes = clave; pintarSelectMesRes(); pintarResultados(); cambiarTab("resultados"); window.scrollTo({ top: $("#tab-resultados").offsetTop - 80, behavior: "smooth" }); });
  $$("tr[data-fecha]", cont).forEach((tr) => tr.addEventListener("click", () => { formDia.fecha.value = tr.dataset.fecha; S.editandoDia = false; cargarDiaEnForm(tr.dataset.fecha); pintarDiasMes(); formDia.scrollIntoView({ behavior: "smooth", block: "start" }); }));
}

// ---------- Resultados ----------
$("#sel-mes-res").addEventListener("change", (e) => { S.mesRes = e.target.value; pintarResultados(); });
$("#btn-editar-mes").addEventListener("click", () => { if (S.mesRes) { formMes.mes.value = S.mesRes; S.editando = false; cargarMesEnForm(S.mesRes); S.captura = "mes"; pintarCaptura(); cambiarTab("capturar"); } });

function clavesOrdenadas() { return Object.keys(S.meses).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort(); }
function pintarSelectMesRes() {
  const claves = clavesOrdenadas().reverse();
  if (!S.mesRes || !S.meses[S.mesRes]) S.mesRes = claves[0] || null;
  $("#sel-mes-res").innerHTML = claves.map((k) => `<option value="${k}" ${k === S.mesRes ? "selected" : ""}>${mesLabel(k)}${k === mesActualClave() ? " (en curso)" : ""}</option>`).join("") || `<option value="">Sin meses</option>`;
}
const kpi = (color, titulo, val, frase) => `<div class="kpi ${color}"><small><span class="dot ${color}"></span>${titulo}</small><div class="val">${val}</div><p>${esc(frase)}</p></div>`;
function pintarResultados() {
  const cont = $("#res-contenido"); $("#res-empresa").innerHTML = "";
  if (!S.mesRes || !S.meses[S.mesRes]) { cont.innerHTML = `<div class="card vacio">Todavía no has capturado ningún mes. Ve a <b>Capturar</b> y llena tu primer mes (o anótalo día a día).</div>`; return; }
  const claves = clavesOrdenadas(), i = claves.indexOf(S.mesRes);
  const anterior = i > 0 ? S.meses[claves[i - 1]] : null;
  const mes = S.meses[S.mesRes];
  const r = resultadosMes({ ...mes, anterior });
  const negocio = S.negocios[S.negocioId]?.nombre || "mi negocio";
  const s = r.semaforo, emp = S.modo === "empresa";
  const E = emp ? resultadosEmpresa({ ...mes, anterior }) : null;
  const rd = resumenDias(S.dias, S.mesRes);
  const prodTabla = r.productos.length ? `
    <div class="card" style="margin-top:12px"><h3>Rentabilidad por producto</h3><p class="sub">Ordenados por lo que dejan en total. La barra es su parte de la ganancia bruta.</p>
    <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Producto</th><th class="n">Precio</th><th class="n">Costo</th><th class="n">Margen</th><th class="n">Vendidos</th><th class="n">Deja</th><th>Parte</th></tr></thead><tbody>
    ${r.productos.map((p) => `<tr class="${p.color}"><td>${esc(p.nombre)}</td><td class="n">${fmtMXN(p.precio)}</td><td class="n">${fmtMXN(p.costo)}</td><td class="n">${fmtPct(p.margenPct)}</td><td class="n">${p.unidades}</td><td class="n"><b>${fmtMXN(p.contribucion)}</b></td><td><div class="barra"><span style="width:${Math.round(p.participacion * 100)}%"></span></div></td></tr>`).join("")}
    </tbody></table></div></div>` : "";

  const utilidadHero = emp ? E.resultados.utilidadNeta : r.utilidadNeta;
  const fraseHero = emp
    ? (utilidadHero >= 0 ? `Utilidad neta del mes después de gastos, depreciación, intereses e impuestos (${fmtPct(E.resultados.margenNeto)} de las ventas).` : `Pérdida neta del mes: después de gastos, depreciación, intereses e impuestos no quedó nada.`)
    : r.frases.utilidad;
  const textoWA = [
    `Resultados de ${negocio} · ${mesLabel(S.mesRes)}`,
    `Ventas: ${fmtMXN(r.ventas)} | Costo de ventas: ${fmtMXN(r.costoVentas)} | Gastos fijos: ${fmtMXN(r.gastos)}`,
    `Utilidad bruta: ${fmtMXN(r.utilidadBruta)} (${fmtPct(r.margenBruto)})`,
    `Utilidad ${emp ? "de operación" : "neta"}: ${fmtMXN(r.utilidadNeta)} (${fmtPct(r.margenNeto)})`,
    ...(emp ? [`Utilidad neta: ${fmtMXN(E.resultados.utilidadNeta)} (${fmtPct(E.resultados.margenNeto)})`] : []),
    `Punto de equilibrio: ${fmtMXN(r.puntoEquilibrio)} al mes`,
    `Caja: ${fmtMXN(r.caja)} → alcanza ${fmtDias(r.diasCaja)}`,
    `Recomendación: ${r.recomendacion}`,
    `— Calculado en rayamistore.com/finanzas/app/`,
  ].join("\n");
  const waCompartir = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoWA)}`;
  const waAyuda = `https://api.whatsapp.com/send?phone=${WA_RAYAMI}&text=${encodeURIComponent("Hola, quiero que me ayuden a interpretar mis resultados de finanzas.\n\n" + textoWA)}`;

  cont.innerHTML = `
    <div class="res-hero">
      <small>${mesLabel(S.mesRes)} · ${esc(negocio)}${mes.desdeDiario ? ` · ${rd.n} día${rd.n === 1 ? "" : "s"} del diario` : ""}${S.mesRes === mesActualClave() ? " · mes en curso" : ""}</small>
      <div class="big ${utilidadHero < 0 ? "neg" : ""}">${utilidadHero < 0 ? "−" : ""}${fmtMXN(Math.abs(utilidadHero))}</div>
      <p>${esc(fraseHero)}</p>
    </div>
    <div class="kpis">
      ${kpi(s.margenBruto, "Margen bruto", fmtPct(r.margenBruto), r.frases.margenBruto)}
      ${kpi(s.cobertura, "Punto de equilibrio", fmtMXN(r.puntoEquilibrio), r.frases.equilibrio)}
      ${kpi(s.diasCaja, "Días de caja", Number.isFinite(r.diasCaja) ? Math.round(r.diasCaja) : "—", r.frases.caja)}
      ${kpi(s.margenNeto, emp ? "Margen de operación" : "Margen neto", fmtPct(r.margenNeto), r.utilidadNeta >= 0 ? `De cada $100 vendidos, te quedan ${Math.round(r.margenNeto * 100)} ${emp ? "antes de depreciación, intereses e impuestos" : "libres después de pagar todo"}.` : "No quedó nada libre este mes: los gastos se llevaron más que la ganancia bruta.")}
    </div>
    <div class="reco"><i class="fa-solid fa-lightbulb"></i><div><small>Tu recomendación del mes</small><p>${esc(r.recomendacion)}</p></div></div>
    ${prodTabla}
    <div class="acciones" style="margin-top:16px">
      <a class="btn btn-wa" href="${waCompartir}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Enviar mis resultados por WhatsApp</a>
      <a class="btn btn-line" href="${waAyuda}" target="_blank" rel="noopener"><i class="fa-solid fa-comments"></i> Quiero que me ayuden a interpretarlos</a>
    </div>
    <p style="margin-top:10px;font-size:13px;color:var(--muted)">La ayuda es parte del <a href="${SERVICIO_URL}" style="color:var(--orange-deep)">servicio de Finanzas</a> de RAYAMI. Los semáforos usan umbrales generales para negocios pequeños; no sustituyen a tu contador.</p>`;
  if (emp) pintarEmpresa(E, negocio, !!mes.empresa, !!anterior);
}

// ---------- Modo empresa: razones y estados financieros ----------
function pintarEmpresa(E, negocio, hayDatos, hayAnterior) {
  const cont = $("#res-empresa");
  if (!hayDatos) { cont.innerHTML = `<div class="card vacio">Para ver balance, flujo de efectivo y razones financieras, llena los campos de empresa de este mes en <b>Capturar</b> (activos, pasivos, depreciación, intereses, impuestos).</div>`; return; }
  const { resultados: R, balance: B, flujo: F, razones: Z, semaforo: s, frases: fr, notas } = E;
  const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : (x === Infinity ? "∞" : "—"));
  const fd = (x) => (Number.isFinite(x) ? Math.round(x) + " d" : (x === Infinity ? "∞" : "—"));
  const fx = (x) => (Number.isFinite(x) ? x.toFixed(1) + "×" : (x === Infinity ? "∞" : "—"));
  const fila = (lbl, v, cls = "") => `<tr class="${cls}"><td>${lbl}</td><td class="n">${fmtMXN(v)}</td></tr>`;
  const tabla = (titulo, filas, nota = "") => `<div class="card estado"><h3>${titulo}</h3>${nota ? `<p class="sub">${nota}</p>` : ""}<table class="tabla edo"><tbody>${filas}</tbody></table></div>`;
  const gastosCat = listaCategorias(S.categorias);
  const gm = S.meses[S.mesRes].gastos || {};
  const filasGastos = Object.entries(gm).filter(([, v]) => num(v) > 0).map(([k, v]) => fila(`&nbsp;&nbsp;${esc(gastosCat.find((c) => c.id === k)?.nombre || k)}`, -num(v), "sub")).join("");
  const edoResultados = tabla("Estado de resultados", [
    fila("Ventas", R.ventas), fila("Costo de ventas", -R.costoVentas), fila("<b>Utilidad bruta</b>", R.utilidadBruta, "tot"),
    filasGastos, fila("Gastos fijos", -R.gastosFijos), fila("<b>EBITDA</b> (operación antes de depreciación)", R.ebitda, "tot"),
    fila("Depreciación y amortización", -R.depreciacion), fila("<b>Utilidad de operación</b> (EBIT)", R.utilidadOperativa, "tot"),
    fila("Intereses", -R.intereses), fila("Utilidad antes de impuestos", R.uai), fila("Impuestos", -R.impuestos), fila("<b>Utilidad neta</b>", R.utilidadNeta, "tot big"),
  ].join(""), `Margen EBITDA ${fmtPct(R.margenEbitda)} · margen neto ${fmtPct(R.margenNeto)}`);
  const edoBalance = tabla("Balance al cierre", [
    fila("Caja y bancos", B.caja), fila("Cuentas por cobrar", B.cuentasPorCobrar), fila("Inventario", B.inventario), fila("Otros activos circulantes", B.otrosActivosCirc), fila("<b>Activo circulante</b>", B.activoCirc, "tot"),
    fila("Activo fijo (neto)", B.activoFijo), fila("<b>Activo total</b>", B.activoTotal, "tot big"),
    fila("Cuentas por pagar", B.cuentasPorPagar), fila("Deuda a corto plazo", B.deudaCortoPlazo), fila("<b>Pasivo circulante</b>", B.pasivoCirc, "tot"),
    fila("Deuda a largo plazo", B.deudaLargoPlazo), fila("<b>Pasivo total</b>", B.pasivoTotal, "tot"),
    fila("<b>Capital</b> (lo que es de los dueños)", B.capital, "tot big"),
  ].join(""), "Capital = activo total − pasivo total.");
  const edoFlujo = tabla("Flujo de efectivo (método indirecto)", [
    fila("Utilidad neta", F.utilidadNeta), fila("+ Depreciación (no fue dinero)", F.depreciacion),
    ...(F.conAnterior ? [fila("± Cambio en cuentas por cobrar", F.dCuentasPorCobrar), fila("± Cambio en inventario", F.dInventario), fila("± Cambio en otros activos", F.dOtrosActivos), fila("± Cambio en cuentas por pagar", F.dCuentasPorPagar)] : []),
    fila("<b>Flujo de operación</b>", F.operativo, "tot"),
    fila("Compra de activos fijos", F.capex), fila("<b>Flujo de inversión</b>", F.inversion, "tot"),
    fila("Préstamos recibidos", F.prestamosRecibidos), fila("Pagos a capital", F.pagosDeuda), fila("Aportaciones de dueños", F.aportaciones), fila("Retiros o dividendos", F.retiros), fila("<b>Flujo de financiamiento</b>", F.financiamiento, "tot"),
    fila("<b>Flujo neto del mes</b>", F.neto, "tot big"),
    ...(F.conAnterior ? [fila("Caja al inicio (mes anterior)", F.cajaInicial), fila("Caja al cierre según el flujo", F.cajaFinalCalculada), fila("Caja real capturada", F.cajaReal), fila(`<b>Diferencia</b> ${Math.abs(F.diferencia) < 1 ? "✓ cuadra" : "(revisar)"}`, F.diferencia, "tot")] : []),
  ].join(""), F.conAnterior ? "Parte de la utilidad y ajusta lo que no fue dinero, comparando los saldos con el mes anterior." : "Sin mes anterior no se calculan los cambios en capital de trabajo.");
  const texto = [
    `${negocio} · ${mesLabel(S.mesRes)} · Estados financieros`,
    `ESTADO DE RESULTADOS`, `Ventas ${fmtMXN(R.ventas)} | Costo ${fmtMXN(R.costoVentas)} | Utilidad bruta ${fmtMXN(R.utilidadBruta)}`,
    `Gastos fijos ${fmtMXN(R.gastosFijos)} | EBITDA ${fmtMXN(R.ebitda)} | Depreciación ${fmtMXN(R.depreciacion)} | Utilidad de operación ${fmtMXN(R.utilidadOperativa)}`,
    `Intereses ${fmtMXN(R.intereses)} | Impuestos ${fmtMXN(R.impuestos)} | UTILIDAD NETA ${fmtMXN(R.utilidadNeta)} (${fmtPct(R.margenNeto)})`,
    `BALANCE`, `Activo circulante ${fmtMXN(B.activoCirc)} | Activo fijo ${fmtMXN(B.activoFijo)} | Activo total ${fmtMXN(B.activoTotal)}`,
    `Pasivo circulante ${fmtMXN(B.pasivoCirc)} | Pasivo total ${fmtMXN(B.pasivoTotal)} | Capital ${fmtMXN(B.capital)}`,
    `FLUJO DE EFECTIVO`, `Operación ${fmtMXN(F.operativo)} | Inversión ${fmtMXN(F.inversion)} | Financiamiento ${fmtMXN(F.financiamiento)} | Neto ${fmtMXN(F.neto)}`,
    `RAZONES`, `Razón circulante ${f2(Z.razonCirculante)} | Prueba del ácido ${f2(Z.pruebaAcido)} | Días inventario ${fd(Z.diasInventario)} | Rotación ${fx(Z.rotacionInventario)}/año`,
    `Días cobro ${fd(Z.diasCobro)} | Días pago ${fd(Z.diasPago)} | Ciclo de efectivo ${fd(Z.cicloEfectivo)} | Apalancamiento ${fmtPct(Z.apalancamiento)} | Cobertura intereses ${fx(Z.coberturaIntereses)}`,
    `ROA ${fmtPct(Z.roa)} | ROE ${fmtPct(Z.roe)} (anualizados)`,
    `— Calculado en rayamistore.com/finanzas/app/`,
  ].join("\n");
  cont.innerHTML = `
    <div class="card"><h2>Razones financieras</h2><p class="sub">Lo que un banco o un socio revisaría. Umbrales generales: compáralos con tu giro.</p></div>
    ${notas.length ? `<div class="msg show warn" style="margin-top:12px"><ul style="margin:0;padding-left:18px">${notas.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
    <div class="kpis kpis-emp">
      ${kpi(s.razonCirculante, "Razón circulante", f2(Z.razonCirculante), fr.razonCirculante)}
      ${kpi(s.pruebaAcido, "Prueba del ácido", f2(Z.pruebaAcido), fr.pruebaAcido)}
      ${kpi(s.diasInventario, "Días de inventario", fd(Z.diasInventario), fr.diasInventario)}
      ${kpi(s.diasCobro, "Días de cobro", fd(Z.diasCobro), fr.diasCobro)}
      ${kpi(s.cicloEfectivo, "Ciclo de efectivo", fd(Z.cicloEfectivo), fr.cicloEfectivo)}
      ${kpi(s.apalancamiento, "Apalancamiento", fmtPct(Z.apalancamiento), fr.apalancamiento)}
      ${kpi(s.coberturaIntereses, "Cobertura de intereses", fx(Z.coberturaIntereses), fr.coberturaIntereses)}
      ${kpi(Z.roa > 0 ? "verde" : "rojo", "Rentabilidad (ROA / ROE)", `${fmtPct(Z.roa)} / ${fmtPct(Z.roe)}`, fr.rentabilidad)}
    </div>
    <div class="estados" id="estados">${edoResultados}${edoBalance}${edoFlujo}</div>
    <div class="acciones" style="margin-top:16px">
      <button type="button" class="btn btn-line" id="btn-imprimir"><i class="fa-solid fa-print"></i> Imprimir o guardar en PDF</button>
      <button type="button" class="btn btn-ghost" id="btn-copiar-edos"><i class="fa-regular fa-copy"></i> Copiar como texto</button>
      <a class="btn btn-wa" href="https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Enviar por WhatsApp</a>
    </div>
    <p style="margin-top:10px;font-size:13px;color:var(--muted)">Estos estados son de gestión, para que entiendas tu negocio; no son los estados financieros fiscales que presenta tu contador.</p>`;
  $("#btn-imprimir").addEventListener("click", () => { document.title = `${negocio} - ${mesLabel(S.mesRes)} - Estados financieros`; window.print(); });
  $("#btn-copiar-edos").addEventListener("click", async () => { try { await navigator.clipboard.writeText(texto); toast("Copiado."); } catch { prompt("Copia el texto:", texto); } });
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
