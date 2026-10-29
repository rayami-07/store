/* ============================================================
   PANEL DEL NEGOCIO  (tienda/panel.html?t=<id>)
   - Demo sin sesión: muestra datos de ejemplo para enseñar el panel
   - Admin con sesión: muestra los datos reales (y puede ver el ejemplo)
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ESTILOS, GIROS, fotoEjemplo } from "./muestras.js";
import { DB_URL, aggregate, sampleData, money, pct, ago } from "./stats.js";

const app = initializeApp({
  apiKey: "AIzaSyDDVxmRmKb9yIZSV0ZxkPKvQPOK-oAGMWU",
  authDomain: "rayami-store.firebaseapp.com",
  databaseURL: DB_URL,
  projectId: "rayami-store",
  appId: "1:57542479161:web:425e75300b964e1f526ce8",
});
const db = getDatabase(app);
const auth = getAuth(app);
const ADMIN_EMAILS = ["raulbenitez563@gmail.com"];

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const storeId = (new URLSearchParams(location.search).get("t") || "").trim();

let store = null, real = null, sample = null, useSample = true, isAdmin = false;
let days = 30, metric = "visit";

function inkFor(hex) {
  const h = (hex || "#111111").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#111111" : "#ffffff";
}
function hexA(hex, a) {
  const h = (hex || "#111111").replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

function applyBrand() {
  const st = ESTILOS[store.estilo] || ESTILOS.moderno;
  const r = document.documentElement.style;
  r.setProperty("--accent", store.color || "#111111");
  r.setProperty("--accent-ink", inkFor(store.color));
  r.setProperty("--accent-soft", hexA(store.color, 0.1));
  r.setProperty("--display", st.display);
  r.setProperty("--display-weight", st.weight);
  r.setProperty("--display-case", st.upper ? "uppercase" : "none");
  document.title = `Panel · ${store.name}`;
  $("name").textContent = store.name;
  $("logo").hidden = !store.logo; if (store.logo) $("logo").src = store.logo;
  $("storeLink").href = `./?t=${storeId}`;
}

function banner() {
  const b = $("banner");
  b.hidden = false;
  if (useSample) {
    b.className = "banner sample";
    b.innerHTML = `<i class="fa-solid fa-flask"></i><span><b>Datos de ejemplo.</b> Así se verá tu panel cuando tu tienda reciba visitas y pedidos.</span>`
      + (isAdmin ? `<button id="toggleData">Ver datos reales</button>` : "");
  } else {
    b.className = "banner real";
    b.innerHTML = `<i class="fa-solid fa-circle-check"></i><span><b>Datos reales</b> de esta tienda.</span>`
      + (isAdmin && store.status === "demo" ? `<button id="toggleData">Ver datos de ejemplo</button>` : "");
  }
  $("toggleData")?.addEventListener("click", () => { useSample = !useSample; draw(); });
}

function kpiTile(label, value, sub, hero) {
  return `<div class="kpi${hero ? " hero" : ""}"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
}

function drawChart(rows) {
  const W = Math.max(520, $("chart").clientWidth || 760), H = 240, padL = 44, padB = 26, padT = 18, padR = 8;
  const vals = rows.map((r) => r[metric]);
  const max = Math.max(1, ...vals);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const nice = Math.ceil(max / step) * step;
  const ticks = [0, nice / 2, nice];
  const iw = W - padL - padR, ih = H - padT - padB;
  const bw = iw / rows.length;
  const y = (v) => padT + ih - (v / nice) * ih;
  const fmt = (v) => (metric === "sales" ? money(v) : Math.round(v).toLocaleString("es-MX"));
  const label = (d) => { const [, m, dd] = d.split("-"); return `${+dd}/${+m}`; };
  const every = rows.length > 14 ? 5 : 1;
  const best = vals.indexOf(Math.max(...vals));
  $("chart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${$("chartTitle").textContent}">
    ${ticks.map((t) => `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${metric === "sales" ? (t >= 1000 ? "$" + t / 1000 + "k" : "$" + t) : t}</text>`).join("")}
    ${rows.map((r, i) => {
      const h = Math.max(r[metric] > 0 ? 2 : 0, (r[metric] / nice) * ih);
      const x = padL + i * bw + bw * 0.18;
      return `<rect class="bar${i === rows.length - 1 ? " last" : " past"}" x="${x}" y="${padT + ih - h}" width="${bw * 0.64}" height="${h}" rx="2"><title>${label(r.day)}: ${fmt(r[metric])}</title></rect>`
        + (i % every === 0 || i === rows.length - 1 ? `<text x="${x + bw * 0.32}" y="${H - 8}" text-anchor="middle">${label(r.day)}</text>` : "");
    }).join("")}
    ${vals[best] > 0 ? `<text class="val" x="${padL + best * bw + bw / 2}" y="${y(vals[best]) - 5}" text-anchor="middle">${fmt(vals[best])}</text>` : ""}
  </svg>`;
}

function draw() {
  const src = useSample ? sample : real;
  const a = aggregate(src.events, src.leads, days);
  const t = a.totals;
  banner();
  $("kpis").innerHTML = [
    kpiTile("Ventas", money(t.sales), `${t.order} pedido${t.order !== 1 ? "s" : ""}`, true),
    kpiTile("Visitas", t.visit.toLocaleString("es-MX"), `últimos ${days} días`),
    kpiTile("Productos vistos", t.view.toLocaleString("es-MX"), t.visit ? `${(t.view / t.visit).toFixed(1)} por visita` : ""),
    kpiTile("Consultas", t.ask.toLocaleString("es-MX"), "preguntas por WhatsApp"),
    kpiTile("Conversión", pct(t.conversion), "visitas que piden"),
    kpiTile("Ticket promedio", money(t.ticket), "por pedido"),
  ].join("");

  $("chartTitle").textContent = { visit: "Visitas por día", order: "Pedidos por día", sales: "Ventas por día" }[metric];
  drawChart(a.days);

  const products = (Array.isArray(store.products) ? store.products : Object.values(store.products || {}));
  const rows = products.map((p) => ({ p, s: a.products[p.id] || { view: 0, ask: 0, order: 0, sales: 0 } }))
    .sort((x, y) => (y.s.sales - x.s.sales) || (y.s.view - x.s.view)).slice(0, 8);
  const maxView = Math.max(1, ...rows.map((r) => r.s.view));
  $("topProducts").innerHTML = rows.length ? rows.map(({ p, s }) => `<tr>
      <td><div class="pcell"><img src="${esc(p.photo || fotoEjemplo(p.emoji || (GIROS[store.giro] || GIROS.otro).emoji, store.color))}" alt="" /><div><div>${esc(p.name)}</div><div class="meter"><i style="width:${(s.view / maxView) * 100}%"></i></div></div></div></td>
      <td class="num">${s.view}</td><td class="num">${s.ask}</td><td class="num">${s.order}</td><td class="num">${money(s.sales)}</td>
    </tr>`).join("") : `<tr><td colspan="5" class="empty">Aún no hay productos.</td></tr>`;

  const ENT = { recoger: "Recoger", domicilio: "Domicilio", punto: "Punto de encuentro" };
  const recent = a.recent.filter((l) => l.type === "pedido").slice(0, 8);
  $("orders").innerHTML = recent.length ? recent.map((l) => {
    const items = (l.items || []).map((i) => `${i.name}${i.qty > 1 ? " x" + i.qty : ""}`).join(", ");
    const who = l.name || "Cliente sin nombre";
    const contact = l.phone ? (useSample ? l.phone : l.phone) : "sin teléfono";
    return `<div class="order">
      <b>${esc(who)}</b><span class="amt">${money(l.total)}</span>
      <small>${esc(items)}</small><span class="pill ${esc(l.status || "nuevo")}">${l.status === "entregado" ? "Entregado" : "Nuevo"}</span>
      <small>${esc(contact)}${l.delivery ? " · " + esc(ENT[l.delivery] || l.delivery) : ""} · ${ago(l.ts)}</small>
    </div>`;
  }).join("") : `<p class="empty">Todavía no hay pedidos en este periodo.</p>`;
}

let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (store) draw(); }, 150); });
document.querySelectorAll("[data-days]").forEach((b) => b.addEventListener("click", () => {
  days = +b.dataset.days; document.querySelectorAll("[data-days]").forEach((x) => x.classList.toggle("active", x === b)); draw();
}));
document.querySelectorAll("[data-metric]").forEach((b) => b.addEventListener("click", () => {
  metric = b.dataset.metric; document.querySelectorAll("[data-metric]").forEach((x) => x.classList.toggle("active", x === b)); draw();
}));

async function start(user) {
  isAdmin = !!user && ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  if (!/^[a-z0-9-]{3,60}$/.test(storeId)) return lock();
  try { store = await fetch(`${DB_URL}/stores/${storeId}.json`).then((r) => (r.ok ? r.json() : null)); } catch { store = null; }
  if (!store || !store.name) return lock();
  const products = Array.isArray(store.products) ? store.products : Object.values(store.products || {});
  sample = sampleData(storeId, products);
  real = { events: {}, leads: {} };
  if (isAdmin) {
    try {
      const [ev, ld] = await Promise.all([get(ref(db, `events/${storeId}`)), get(ref(db, `leads/${storeId}`))]);
      real = { events: ev.val() || {}, leads: ld.val() || {} };
    } catch (e) { console.warn(e); }
    useSample = false;
  } else if (store.status === "demo") {
    useSample = true;
  } else {
    return lock(); // tiendas reales: el dueño entrará con su cuenta (siguiente etapa)
  }
  applyBrand();
  draw();
  $("loading").hidden = true;
  $("app").hidden = false;
}
function lock() { $("loading").hidden = true; $("locked").hidden = false; }

let started = false;
onAuthStateChanged(auth, (u) => { if (started) return; started = true; start(u); });
