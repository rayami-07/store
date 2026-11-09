// Pruebas con mensajes simulados de Meta: node test/procesar.test.js
const assert = require("assert");
const { extraerEntrantes, guardarEntrante, armarEnvio, normalizaWa } = require("../procesar");

function memDb(data) {
  const at = (p) => p.split("/").reduce((o, k) => (o == null ? undefined : o[k]), data);
  const put = (p, v) => { const ks = p.split("/"); let o = data; ks.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {})); o[ks.at(-1)] = JSON.parse(JSON.stringify(v)); };
  return {
    data,
    get: async (p) => { const v = at(p); return v === undefined ? null : JSON.parse(JSON.stringify(v)); },
    set: async (p, v) => put(p, v),
    update: async (p, obj) => { for (const [k, v] of Object.entries(obj)) put(`${p}/${k}`, v); },
  };
}

const wa = {
  object: "whatsapp_business_account",
  entry: [{ id: "WABA1", changes: [{ field: "messages", value: {
    messaging_product: "whatsapp", metadata: { display_phone_number: "5215511112222", phone_number_id: "PN123" },
    contacts: [{ profile: { name: "Lupita" }, wa_id: "5215599998888" }],
    messages: [{ from: "5215599998888", id: "wamid.AAA", timestamp: "1767000000", type: "text", text: { body: "Hola, ¿cuánto cuesta la afinación?" },
      referral: { headline: "Afinación a domicilio", source_type: "ad" } }],
  } }] }],
};
const waStatus = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "PN123" }, statuses: [{ id: "x", status: "read" }] } }] }] };
const msgr = { object: "page", entry: [{ id: "PAGE9", time: 1, messaging: [
  { sender: { id: "PSID1" }, recipient: { id: "PAGE9" }, timestamp: 1767000100000, message: { mid: "m_1", text: "¿Sigue disponible?" } },
  { sender: { id: "PAGE9" }, recipient: { id: "PSID1" }, timestamp: 1767000200000, message: { mid: "m_2", text: "Sí", is_echo: true } },
] }] };
const ig = { object: "instagram", entry: [{ id: "IG7", messaging: [{ sender: { id: "IGSID3" }, recipient: { id: "IG7" }, timestamp: 1767000300000, message: { mid: "ig_1", attachments: [{ type: "image" }] } }] }] };

(async () => {
  // 1) Lectura de los 3 formatos
  const e1 = extraerEntrantes(wa);
  assert.equal(e1.length, 1);
  assert.deepEqual([e1[0].canal, e1[0].cuenta, e1[0].contactoId, e1[0].nombre, e1[0].ts], ["whatsapp", "PN123", "5215599998888", "Lupita", 1767000000000]);
  assert.equal(e1[0].anuncio, "Afinación a domicilio");
  assert.equal(extraerEntrantes(waStatus).length, 0, "los estados (leído/entregado) no son mensajes");
  const e2 = extraerEntrantes(msgr);
  assert.equal(e2.length, 1, "se ignoran los echo");
  assert.deepEqual([e2[0].canal, e2[0].cuenta, e2[0].contactoId, e2[0].texto], ["messenger", "PAGE9", "PSID1", "¿Sigue disponible?"]);
  const e3 = extraerEntrantes(ig);
  assert.deepEqual([e3[0].canal, e3[0].texto], ["instagram", "[imagen]"]);

  // 2) Guardado en el negocio correcto
  const db = memDb({
    channels: { whatsapp_PN123: { base: "tenantData/taller1", tid: "taller1", canal: "whatsapp" }, messenger_PAGE9: { base: "crm", tid: null, canal: "messenger" } },
    tenants: { taller1: { estado: "activo" } },
  });
  const r1 = await guardarEntrante(db, e1[0]);
  assert.ok(r1.ok && r1.nuevo);
  const t = db.data.tenantData.taller1;
  const chat = t.chats["whatsapp_5215599998888"];
  assert.equal(chat.noLeidos, 1);
  assert.equal(chat.ventanaHasta, 1767000000000 + 86400000);
  const p = t.prospectos[chat.prospectoId];
  assert.deepEqual([p.negocio, p.whatsapp, p.origen, p.etapa], ["Lupita", "5599998888", "WhatsApp", 1]);
  assert.ok(p.notas[0].t.includes("anuncio: Afinación a domicilio"));

  // 3) Reintento de Meta: no duplica
  const r1b = await guardarEntrante(db, e1[0]);
  assert.equal(r1b.motivo, "duplicado");
  assert.equal(Object.keys(t.mensajes["whatsapp_5215599998888"]).length, 1);
  assert.equal(Object.keys(t.prospectos).length, 1);

  // 4) Segundo mensaje del mismo cliente: mismo prospecto, sube no leídos
  await guardarEntrante(db, { ...e1[0], msgId: "wamid.BBB", texto: "¿Y frenos?", ts: 1767000500000 });
  assert.equal(t.chats["whatsapp_5215599998888"].noLeidos, 2);
  assert.equal(Object.keys(t.prospectos).length, 1);

  // 5) Messenger (Marketplace de la Página) va al CRM de Raúl
  await guardarEntrante(db, e2[0]);
  assert.ok(db.data.crm.chats["messenger_PSID1"]);
  assert.equal(Object.values(db.data.crm.prospectos)[0].origen, "Facebook");

  // 6) Canal no conectado y negocio pausado
  assert.equal((await guardarEntrante(db, e3[0])).motivo, "canal-no-conectado");
  db.data.tenants.taller1.estado = "pausado";
  assert.equal((await guardarEntrante(db, { ...e1[0], msgId: "wamid.CCC" })).motivo, "negocio-pausado");

  // 7) Peticiones de envío
  const w = armarEnvio("whatsapp", "PN123", { token: "T" }, "5215599998888", "Hola");
  assert.equal(w.url, "https://graph.facebook.com/v23.0/PN123/messages");
  assert.equal(w.body.to, "525599998888", "México: se quita el 1 que WhatsApp agrega, si no Meta rechaza el envío");
  assert.equal(normalizaWa("5215599998888"), "525599998888");
  assert.equal(normalizaWa("525599998888"), "525599998888", "si ya viene sin el 1, se deja igual");
  assert.equal(normalizaWa("5491122223333"), "541122223333", "Argentina: mismo caso con el 9");
  assert.equal(normalizaWa("14155551234"), "14155551234", "otros países no se tocan");
  const m = armarEnvio("instagram", "IG7", { token: "T", pageId: "PAGE9" }, "IGSID3", "Hola");
  assert.equal(m.url, "https://graph.facebook.com/v23.0/PAGE9/messages");
  assert.equal(m.body.messaging_type, "RESPONSE");

  console.log("✔ Todas las pruebas pasaron");
})().catch((e) => { console.error("✘", e.message); process.exit(1); });
