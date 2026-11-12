/* ============================================================
   LÓGICA DE MENSAJES (sin dependencias de Firebase, para poder probarla)
   - extraerEntrantes(body): convierte el aviso (webhook) de Meta en
     una lista de mensajes con el mismo formato para los 3 canales.
   - guardarEntrante(db, m): lo guarda en el CRM del negocio dueño del canal
     y crea el prospecto si es la primera vez que escribe.
   - armarEnvio(canal, cuenta, cfg, para, texto): la petición para contestar.

   Estructura en la base de datos:
     channels/<canal>_<cuenta>      { base, tid, canal, nombre }  (qué negocio es dueño del número/página)
     secrets/<canal>_<cuenta>       { token, pageId }             (solo el servidor lo lee)
     <base>/chats/<convId>          resumen de la conversación
     <base>/mensajes/<convId>/<id>  cada mensaje
     <base>/prospectos/<id>         el prospecto que se crea solo
   <base> es "crm" (CRM de Raúl) o "tenantData/<tid>" (cada negocio).
============================================================ */

const VENTANA_MS = 24 * 60 * 60 * 1000; // Meta deja contestar libre 24 h desde el último mensaje del cliente

const NOMBRE_CANAL = { whatsapp: "WhatsApp", messenger: "Facebook", instagram: "Instagram" };

// Las llaves de Realtime Database no aceptan . # $ [ ] /
const llave = (s) => String(s).replace(/[.#$\[\]\/]/g, "_").slice(0, 120);

function textoDe(msg) {
  if (!msg) return "";
  if (msg.text && typeof msg.text === "object") return msg.text.body || "";
  if (typeof msg.text === "string") return msg.text;
  if (msg.button) return msg.button.text || "[botón]";
  if (msg.interactive) {
    const i = msg.interactive;
    return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || "[respuesta]";
  }
  const tipos = { image: "[imagen]", audio: "[audio]", video: "[video]", document: "[documento]", sticker: "[sticker]", location: "[ubicación]", contacts: "[contacto]", reaction: "[reacción]" };
  if (msg.type && tipos[msg.type]) {
    const cap = msg[msg.type] && msg[msg.type].caption;
    return tipos[msg.type] + (cap ? " " + cap : "");
  }
  if (Array.isArray(msg.attachments) && msg.attachments.length) {
    const t = msg.attachments[0].type;
    return ({ image: "[imagen]", audio: "[audio]", video: "[video]", file: "[archivo]", fallback: "[enlace]" })[t] || "[adjunto]";
  }
  return "[mensaje]";
}

/** Devuelve [{canal, cuenta, contactoId, nombre, texto, ts, msgId, anuncio}] */
function extraerEntrantes(body) {
  const out = [];
  if (!body || !Array.isArray(body.entry)) return out;

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        if (ch.field !== "messages" || !Array.isArray(v.messages)) continue;
        const cuenta = v.metadata && v.metadata.phone_number_id;
        const nombres = {};
        (v.contacts || []).forEach((c) => { nombres[c.wa_id] = c.profile && c.profile.name; });
        for (const m of v.messages) {
          out.push({
            canal: "whatsapp", cuenta, contactoId: m.from, nombre: nombres[m.from] || "",
            texto: textoDe(m), ts: Number(m.timestamp) * 1000 || Date.now(), msgId: m.id,
            anuncio: m.referral ? (m.referral.headline || m.referral.source_url || "anuncio") : "",
          });
        }
      }
    }
  } else if (body.object === "page" || body.object === "instagram") {
    const canal = body.object === "page" ? "messenger" : "instagram";
    for (const entry of body.entry) {
      for (const ev of entry.messaging || []) {
        if (!ev.message || ev.message.is_echo) continue; // los "echo" son mensajes que mandó el propio negocio
        out.push({
          canal, cuenta: entry.id, contactoId: ev.sender && ev.sender.id, nombre: "",
          texto: textoDe(ev.message), ts: Number(ev.timestamp) || Date.now(), msgId: ev.message.mid,
          anuncio: ev.referral ? (ev.referral.source || "anuncio") : "",
        });
      }
    }
  }
  return out.filter((m) => m.cuenta && m.contactoId && m.msgId);
}

const fechaMx = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
const nuevoId = (ts) => "p" + ts.toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Guarda un mensaje entrante. db = { get(path), set(path, val), update(path, obj) } (promesas).
 * Devuelve {ok, motivo, base, convId, prospectoId}.
 */
async function guardarEntrante(db, m) {
  const canalKey = llave(`${m.canal}_${m.cuenta}`);
  const destino = await db.get(`channels/${canalKey}`);
  if (!destino || !destino.base) return { ok: false, motivo: "canal-no-conectado" };
  if (destino.tid) {
    const estado = await db.get(`tenants/${destino.tid}/estado`);
    if (estado !== "activo") return { ok: false, motivo: "negocio-pausado" };
  }
  const base = destino.base;
  const convId = llave(`${m.canal}_${m.contactoId}`);
  const msgKey = llave(m.msgId);

  // Meta a veces reintenta el mismo aviso: si ya lo guardamos, no lo duplicamos
  const ya = await db.get(`${base}/mensajes/${convId}/${msgKey}`);
  if (ya) return { ok: true, motivo: "duplicado", base, convId };

  const chat = (await db.get(`${base}/chats/${convId}`)) || null;
  let prospectoId = chat && chat.prospectoId;
  const nombre = m.nombre || (chat && chat.nombre) || "";

  if (!prospectoId) {
    prospectoId = nuevoId(m.ts);
    const iso = new Date(m.ts).toISOString();
    const quien = nombre || (m.canal === "whatsapp" ? "+" + m.contactoId : `Contacto de ${NOMBRE_CANAL[m.canal]}`);
    await db.set(`${base}/prospectos/${prospectoId}`, {
      negocio: quien, giro: "", contacto: nombre,
      whatsapp: m.canal === "whatsapp" ? String(m.contactoId).slice(-10) : "",
      colonia: "", origen: NOMBRE_CANAL[m.canal], etapa: 1, etapaPrevia: 1, proximo: fechaMx(m.ts),
      criterios: {}, interes: "", pagaria: 0, objecion: "—",
      notas: [{ f: iso, t: `Llegó por mensaje de ${NOMBRE_CANAL[m.canal]}${m.anuncio ? ` (anuncio: ${m.anuncio})` : ""}: "${String(m.texto).slice(0, 200)}"`, sys: true }],
      creado: iso, actualizado: iso, chatId: convId,
    });
  }

  await db.set(`${base}/mensajes/${convId}/${msgKey}`, { dir: "in", texto: String(m.texto).slice(0, 4000), ts: m.ts });
  await db.update(`${base}/chats/${convId}`, {
    canal: m.canal, cuenta: String(m.cuenta), contactoId: String(m.contactoId), nombre,
    prospectoId, noLeidos: ((chat && chat.noLeidos) || 0) + 1,
    ultimo: { texto: String(m.texto).slice(0, 200), ts: m.ts, dir: "in" },
    ventanaHasta: m.ts + VENTANA_MS, actualizado: m.ts,
    ...(m.anuncio ? { anuncio: String(m.anuncio).slice(0, 120) } : {}),
  });
  return { ok: true, base, convId, prospectoId, nuevo: !chat };
}


/* ---------- Respuestas automáticas ----------
   Configuración (la edita el dueño en el CRM):
     <config>/autorespuesta = {
       activa: true,
       bienvenida: "texto",                       // al primer mensaje de un contacto nuevo
       fuera: { activa: true, texto: "texto",     // cuando escriben fuera de horario
                desde: "09:00", hasta: "18:00", dias: [1,2,3,4,5,6] }  // 0 = domingo
     }
   <config> es "crm/config" (CRM de Raúl) o "tenants/<tid>/config" (cada negocio).
*/
const TZ_AUTO = "America/Mexico_City";
const HORA_FUERA_MS = 12 * 60 * 60 * 1000; // el aviso de "fuera de horario" se manda máximo una vez cada 12 h por contacto

function rutaAuto(base) {
  return base === "crm" ? "crm/config/autorespuesta" : `tenants/${String(base).split("/")[1]}/config/autorespuesta`;
}

const aMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** ¿Este momento cae fuera del horario de atención configurado? */
function fueraDeHorario(f, ts, tz = TZ_AUTO) {
  if (!f) return false;
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ts));
  const get = (t) => (partes.find((x) => x.type === t) || {}).value;
  const dia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get("weekday")];
  const min = Number(get("hour")) * 60 + Number(get("minute"));
  const dias = Array.isArray(f.dias) ? f.dias.map(Number) : [1, 2, 3, 4, 5, 6];
  if (!dias.includes(dia)) return true;
  const d = aMin(f.desde), h = aMin(f.hasta);
  if (d == null || h == null || d === h) return false; // sin horario válido: no se considera fuera
  return d < h ? min < d || min >= h : !(min >= d || min < h); // d > h = horario que cruza la medianoche
}

/**
 * Decide si hay que contestar solo. Devuelve { tipo, texto } o null.
 * ctx = { nuevo: es el primer mensaje del contacto, ts: hora del mensaje, chat: conversación ya guardada }
 */
function decidirAuto(cfg, ctx) {
  if (!cfg || !cfg.activa) return null;
  const limpia = (t) => String(t || "").trim().slice(0, 1000);
  const f = cfg.fuera;
  if (f && f.activa && limpia(f.texto) && fueraDeHorario(f, ctx.ts, cfg.tz || TZ_AUTO)) {
    const ult = (ctx.chat && ctx.chat.autoFueraTs) || 0;
    if (ctx.ts - ult >= HORA_FUERA_MS) return { tipo: "fuera", texto: limpia(f.texto) };
    return null; // ya se le avisó hace poco; tampoco se manda la bienvenida fuera de horario
  }
  if (ctx.nuevo && limpia(cfg.bienvenida)) return { tipo: "bienvenida", texto: limpia(cfg.bienvenida) };
  return null;
}

/** Petición HTTP para contestar por cada canal (API de Meta). */
/**
 * México entrega el número del cliente como 521XXXXXXXXXX (WhatsApp agrega un 1
 * después del 52), pero para contestarle hay que usar 52XXXXXXXXXX. Si no se
 * quita, Meta responde "Recipient phone number not in allowed list".
 * Argentina tiene el mismo caso con el 9 (549 -> 54).
 */
function normalizaWa(num) {
  const n = String(num || "").replace(/\D/g, "");
  if (/^521\d{10}$/.test(n)) return "52" + n.slice(3);
  if (/^549\d{10}$/.test(n)) return "54" + n.slice(3);
  return n;
}

function armarEnvio(canal, cuenta, cfg, para, texto, version = "v23.0") {
  const g = `https://graph.facebook.com/${version}`;
  if (canal === "whatsapp") {
    return {
      url: `${g}/${cuenta}/messages`,
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: { messaging_product: "whatsapp", recipient_type: "individual", to: normalizaWa(para), type: "text", text: { preview_url: true, body: texto } },
    };
  }
  // Messenger (incluye chats de Marketplace de la Página) e Instagram usan la Página y su token
  const pagina = canal === "instagram" ? (cfg.pageId || cuenta) : cuenta;
  return {
    url: `${g}/${pagina}/messages`,
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: { recipient: { id: para }, messaging_type: "RESPONSE", message: { text: texto } },
  };
}

module.exports = { extraerEntrantes, guardarEntrante, armarEnvio, normalizaWa, llave, VENTANA_MS, NOMBRE_CANAL, decidirAuto, fueraDeHorario, rutaAuto };
