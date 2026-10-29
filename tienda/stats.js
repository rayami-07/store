/* ============================================================
   ESTADÍSTICAS DE TIENDAS
   - track(): guarda un evento (visita, vista de producto, consulta, pedido)
   - saveLead(): guarda un pedido o consulta con datos opcionales
   - aggregate(): convierte eventos y pedidos en números para los paneles
   - sampleData(): datos de ejemplo para enseñar el panel en una demo
============================================================ */
export const DB_URL = "https://rayami-store-default-rtdb.firebaseio.com";
const SERVER_TS = { ".sv": "timestamp" };

// Escritura sin sesión por REST: las reglas solo permiten CREAR, nunca leer
export function track(storeId, t, extra = {}) {
  if (!storeId) return;
  try {
    fetch(`${DB_URL}/events/${storeId}.json`, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t, ts: SERVER_TS, ...extra }),
    }).catch(() => {});
  } catch {}
}

export function saveLead(storeId, lead) {
  if (!storeId) return Promise.resolve();
  return fetch(`${DB_URL}/leads/${storeId}.json`, {
    method: "POST", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...lead, status: "nuevo", ts: SERVER_TS }),
  }).catch(() => {});
}

export const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// events: {id:{t,ts,p?}}  leads: {id:{type,total,items,ts,...}}
export function aggregate(events, leads, days = 30, now = Date.now()) {
  const from = now - days * 86400000;
  const byDay = {};
  for (let i = days - 1; i >= 0; i--) byDay[dayKey(now - i * 86400000)] = { visit: 0, view: 0, ask: 0, order: 0, sales: 0 };
  const prods = {};
  const tot = { visit: 0, view: 0, ask: 0, order: 0, sales: 0, lastTs: 0 };
  const bump = (pid, k, v = 1) => { if (!pid) return; (prods[pid] ||= { view: 0, ask: 0, order: 0, sales: 0 })[k] += v; };

  for (const e of Object.values(events || {})) {
    if (!e || !e.ts) continue;
    tot.lastTs = Math.max(tot.lastTs, e.ts);
    if (e.ts < from) continue;
    const d = byDay[dayKey(e.ts)];
    if (e.t === "visit") { tot.visit++; d && d.visit++; }
    if (e.t === "view") { tot.view++; d && d.view++; bump(e.p, "view"); }
    if (e.t === "ask") { tot.ask++; d && d.ask++; bump(e.p, "ask"); }
  }
  const recent = [];
  for (const [id, l] of Object.entries(leads || {})) {
    if (!l || !l.ts) continue;
    tot.lastTs = Math.max(tot.lastTs, l.ts);
    if (l.ts < from) continue;
    recent.push({ id, ...l });
    if (l.type !== "pedido" || l.status === "cancelado") continue;
    const d = byDay[dayKey(l.ts)];
    tot.order++; tot.sales += Number(l.total) || 0;
    if (d) { d.order++; d.sales += Number(l.total) || 0; }
    for (const it of l.items || []) { bump(it.id, "order", Number(it.qty) || 1); bump(it.id, "sales", (Number(it.qty) || 1) * (Number(it.price) || 0)); }
  }
  recent.sort((a, b) => b.ts - a.ts);
  tot.conversion = tot.visit ? tot.order / tot.visit : 0;
  tot.ticket = tot.order ? tot.sales / tot.order : 0;
  return { totals: tot, days: Object.entries(byDay).map(([k, v]) => ({ day: k, ...v })), products: prods, recent };
}

/* ── Datos de ejemplo (deterministas por tienda) ── */
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
const NOMBRES = ["María G.", "Juan P.", "Ana L.", "Carlos R.", "Fernanda S.", "Luis M.", "Sofía T.", "Diego H.", "Valeria C.", "Jorge A."];

export function sampleData(storeId, products, now = Date.now()) {
  const r = rng(storeId || "demo");
  const events = {}, leads = {};
  const prods = (products || []).filter((p) => p && p.id);
  if (!prods.length) return { events, leads };
  const price = (p) => (p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price) || 0;
  let n = 0;
  for (let d = 29; d >= 0; d--) {
    const base = 18 + (29 - d) * 1.4;                 // tendencia al alza
    const weekend = [0, 6].includes(new Date(now - d * 86400000).getDay()) ? 1.35 : 1;
    const visits = Math.round((base + r() * 14) * weekend);
    const dayStart = now - d * 86400000 - 10 * 3600000;
    for (let i = 0; i < visits; i++) {
      const ts = dayStart + r() * 9 * 3600000;
      events["v" + n++] = { t: "visit", ts };
      const views = Math.floor(r() * 3.2);
      for (let k = 0; k < views; k++) {
        const p = prods[Math.floor(Math.pow(r(), 1.6) * prods.length)];
        events["e" + n++] = { t: "view", ts: ts + 30000, p: p.id };
        if (r() < 0.09) events["a" + n++] = { t: "ask", ts: ts + 60000, p: p.id };
      }
      if (r() < 0.045) {
        const p = prods[Math.floor(Math.pow(r(), 1.6) * prods.length)];
        const qty = r() < 0.8 ? 1 : 2;
        const conDatos = r() < 0.7;
        leads["l" + n++] = {
          type: "pedido", ts: ts + 120000, status: d > 2 ? "entregado" : "nuevo",
          items: [{ id: p.id, name: p.name, qty, price: price(p) }], total: qty * price(p),
          name: conDatos ? NOMBRES[Math.floor(r() * NOMBRES.length)] : "",
          phone: conDatos ? "55••••" + String(1000 + Math.floor(r() * 8999)) : "",
          delivery: r() < 0.5 ? "domicilio" : "recoger",
        };
      }
    }
  }
  return { events, leads };
}

export const money = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("es-MX");
export const pct = (x) => (x * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "%";
export function ago(ts, now = Date.now()) {
  if (!ts) return "sin actividad";
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
