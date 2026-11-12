/* ============================================================
   SERVIDOR DE MENSAJES — Firebase Cloud Functions (requiere plan Blaze)
   1) metaWebhook: la dirección a la que Meta avisa cada mensaje nuevo
      de WhatsApp, Messenger (incluye Marketplace de la Página) e Instagram.
   2) enviarMensaje: el CRM lo llama para contestar desde la pestaña Chats.

   Secretos (se configuran una vez con la terminal de Firebase):
     META_APP_SECRET   → "Clave secreta de la app" en developers.facebook.com
     META_VERIFY_TOKEN → una palabra que inventas tú y pones igual en Meta
============================================================ */
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { extraerEntrantes, guardarEntrante, armarEnvio, llave, decidirAuto, rutaAuto } = require("./procesar");

admin.initializeApp();
// Tope de copias corriendo a la vez: protege de cobros por errores o ataques
setGlobalOptions({ region: "us-central1", maxInstances: 5 });

const META_APP_SECRET = defineSecret("META_APP_SECRET");
const META_VERIFY_TOKEN = defineSecret("META_VERIFY_TOKEN");
const ADMIN_EMAILS = ["raulbenitez563@gmail.com"];
const GRAPH_VERSION = "v23.0";

const rtdb = () => admin.database();
const db = {
  get: async (p) => (await rtdb().ref(p).get()).val(),
  set: (p, v) => rtdb().ref(p).set(v),
  update: (p, o) => rtdb().ref(p).update(o),
};

function firmaValida(req, secreto) {
  const firma = req.get("x-hub-signature-256") || "";
  if (!firma.startsWith("sha256=") || !req.rawBody) return false;
  const esperada = "sha256=" + crypto.createHmac("sha256", secreto).update(req.rawBody).digest("hex");
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Respuesta automática (bienvenida / fuera de horario). Nunca debe tumbar el webhook: todo va en try/catch.
async function autoResponder(m, r) {
  try {
    if (!r || !r.ok || r.motivo || !r.base) return; // sin guardar, o duplicado de Meta
    const cfg = await db.get(rutaAuto(r.base));
    if (!cfg || !cfg.activa) return;
    const chat = await db.get(`${r.base}/chats/${r.convId}`);
    const d = decidirAuto(cfg, { nuevo: !!r.nuevo, ts: m.ts, chat });
    if (!d) return;
    const sec = await db.get(`secrets/${llave(`${m.canal}_${m.cuenta}`)}`);
    if (!sec || !sec.token) return;
    const pet = armarEnvio(m.canal, m.cuenta, sec, m.contactoId, d.texto, GRAPH_VERSION);
    const resp = await fetch(pet.url, { method: "POST", headers: pet.headers, body: JSON.stringify(pet.body) });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) { logger.warn("Respuesta automática rechazada por Meta", { status: resp.status, error: j.error }); return; }
    const ts = Date.now();
    const mid = llave((j.messages && j.messages[0] && j.messages[0].id) || j.message_id || `auto${ts}`);
    await db.set(`${r.base}/mensajes/${r.convId}/${mid}`, { dir: "out", texto: d.texto, ts, por: "auto" });
    await db.update(`${r.base}/chats/${r.convId}`, { autoTs: ts, ...(d.tipo === "fuera" ? { autoFueraTs: m.ts } : {}) });
  } catch (e) {
    logger.error("Error en respuesta automática", e);
  }
}

exports.metaWebhook = onRequest({ secrets: [META_APP_SECRET, META_VERIFY_TOKEN], timeoutSeconds: 30 }, async (req, res) => {
  // Paso de verificación cuando registras la dirección en Meta
  if (req.method === "GET") {
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === META_VERIFY_TOKEN.value()) {
      return res.status(200).send(String(req.query["hub.challenge"] || ""));
    }
    return res.sendStatus(403);
  }
  if (req.method !== "POST") return res.sendStatus(405);
  if (!firmaValida(req, META_APP_SECRET.value())) {
    logger.warn("Firma inválida en webhook");
    return res.sendStatus(401);
  }
  try {
    const entrantes = extraerEntrantes(req.body);
    for (const m of entrantes) {
      const r = await guardarEntrante(db, m);
      if (!r.ok) logger.info("Mensaje no guardado", { canal: m.canal, cuenta: m.cuenta, motivo: r.motivo });
      else await autoResponder(m, r);
    }
  } catch (e) {
    logger.error("Error procesando webhook", e);
  }
  // Siempre contestamos 200 rápido; si no, Meta reintenta y luego desactiva el webhook
  res.sendStatus(200);
});

exports.enviarMensaje = onCall({ timeoutSeconds: 20 }, async (req) => {
  const auth = req.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { tid, convId, texto } = req.data || {};
  const msg = String(texto || "").trim();
  if (!convId || !msg) throw new HttpsError("invalid-argument", "Falta el mensaje.");
  if (msg.length > 4000) throw new HttpsError("invalid-argument", "El mensaje es muy largo.");

  const esAdmin = ADMIN_EMAILS.includes(String(auth.token.email || "").toLowerCase());
  let base;
  if (!tid) {
    if (!esAdmin) throw new HttpsError("permission-denied", "Sin permiso.");
    base = "crm";
  } else {
    if (!esAdmin) {
      const [miembro, estado] = await Promise.all([db.get(`tenantMembers/${tid}/${auth.uid}`), db.get(`tenants/${tid}/estado`)]);
      if (!miembro || estado !== "activo") throw new HttpsError("permission-denied", "Sin permiso.");
    }
    base = `tenantData/${tid}`;
  }

  const id = llave(convId);
  const chat = await db.get(`${base}/chats/${id}`);
  if (!chat) throw new HttpsError("not-found", "No existe la conversación.");
  if (!chat.ventanaHasta || Date.now() > chat.ventanaHasta) {
    throw new HttpsError("failed-precondition", "ventana-cerrada");
  }
  const cfg = await db.get(`secrets/${llave(`${chat.canal}_${chat.cuenta}`)}`);
  if (!cfg || !cfg.token) throw new HttpsError("failed-precondition", "canal-sin-token");

  const pet = armarEnvio(chat.canal, chat.cuenta, cfg, chat.contactoId, msg, GRAPH_VERSION);
  const r = await fetch(pet.url, { method: "POST", headers: pet.headers, body: JSON.stringify(pet.body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    logger.warn("Meta rechazó el envío", { status: r.status, error: j.error });
    throw new HttpsError("internal", (j.error && j.error.message) || "Meta no aceptó el mensaje.");
  }
  const ts = Date.now();
  const mid = llave((j.messages && j.messages[0] && j.messages[0].id) || j.message_id || `out${ts}`);
  await db.set(`${base}/mensajes/${id}/${mid}`, { dir: "out", texto: msg, ts, por: auth.uid });
  await db.update(`${base}/chats/${id}`, { ultimo: { texto: msg.slice(0, 200), ts, dir: "out" }, noLeidos: 0, actualizado: ts });
  return { ok: true };
});
