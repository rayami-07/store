/* ============================================================
   CATÁLOGOS DE EJEMPLO POR GIRO
   Se usan para que una demo nunca se vea vacía. En el creador
   se pueden editar o reemplazar por los productos reales.
============================================================ */

export const GIROS = {
  ropa: {
    label: "Ropa",
    emoji: "👕",
    estilo: "moderno",
    tagline: "Ropa urbana para todos los días",
    categorias: ["Playeras", "Sudaderas", "Pantalones", "Accesorios"],
    variantes: [{ nombre: "Talla", opciones: ["CH", "M", "G", "XG"] }, { nombre: "Color", opciones: ["Negro", "Blanco", "Gris"] }],
    productos: [
      ["Playera básica de algodón", 249, "Playeras", "👕"],
      ["Sudadera con capucha", 549, "Sudaderas", "🧥"],
      ["Jeans corte recto", 599, "Pantalones", "👖"],
      ["Gorra bordada", 299, "Accesorios", "🧢"],
      ["Chamarra de mezclilla", 899, "Sudaderas", "🧥", 749],
      ["Pants jogger", 449, "Pantalones", "👖"],
    ],
  },
  calzado: {
    label: "Calzado",
    emoji: "👟",
    estilo: "moderno",
    tagline: "Tenis y zapatos para cada ocasión",
    categorias: ["Tenis", "Botas", "Sandalias", "Formal"],
    variantes: [{ nombre: "Talla", opciones: ["23", "24", "25", "26", "27", "28", "29"] }],
    productos: [
      ["Tenis urbanos blancos", 1199, "Tenis", "👟"],
      ["Tenis para correr", 1499, "Tenis", "👟", 1299],
      ["Botín de piel", 1299, "Botas", "🥾"],
      ["Sandalias de playa", 399, "Sandalias", "🩴"],
      ["Zapato casual", 899, "Formal", "👞"],
      ["Tenis de lona", 599, "Tenis", "👟"],
    ],
  },
  comida: {
    label: "Comida",
    emoji: "🍔",
    estilo: "amigable",
    tagline: "Hecho al momento, directo a tu mesa",
    pagoAnticipado: true,
    categorias: ["Platillos", "Bebidas", "Postres"],
    productos: [
      ["Hamburguesa clásica", 129, "Platillos", "🍔"],
      ["Orden de tacos al pastor", 85, "Platillos", "🌮"],
      ["Pizza mediana", 189, "Platillos", "🍕", 159],
      ["Ensalada César", 110, "Platillos", "🥗"],
      ["Agua fresca 1 L", 45, "Bebidas", "🥤"],
      ["Rebanada de pastel de chocolate", 65, "Postres", "🍰"],
    ],
  },
  belleza: {
    label: "Belleza",
    emoji: "💄",
    estilo: "elegante",
    tagline: "Cuidado y belleza que se nota",
    categorias: ["Maquillaje", "Cuidado de la piel", "Cabello", "Fragancias"],
    productos: [
      ["Kit de cuidado facial", 650, "Cuidado de la piel", "🧴"],
      ["Labial mate", 189, "Maquillaje", "💄"],
      ["Perfume 50 ml", 799, "Fragancias", "🌸", 690],
      ["Mascarilla capilar", 249, "Cabello", "💆"],
      ["Set de brochas", 349, "Maquillaje", "🖌️"],
      ["Esmalte de uñas", 99, "Maquillaje", "💅"],
    ],
  },
  mascotas: {
    label: "Mascotas",
    emoji: "🐶",
    estilo: "amigable",
    tagline: "Todo para tu mejor amigo",
    categorias: ["Alimento", "Camas", "Accesorios", "Higiene"],
    productos: [
      ["Croquetas 4 kg", 459, "Alimento", "🦴"],
      ["Cama para perro mediana", 549, "Camas", "🛏️"],
      ["Collar ajustable", 149, "Accesorios", "🐕"],
      ["Juguete mordedera", 99, "Accesorios", "🎾", 79],
      ["Arenero para gato", 299, "Higiene", "🐈"],
      ["Shampoo para mascota", 129, "Higiene", "🫧"],
    ],
  },
  ferreteria: {
    label: "Ferretería",
    emoji: "🔧",
    estilo: "moderno",
    tagline: "Herramienta y material para tu obra",
    categorias: ["Herramientas", "Pintura", "Electricidad"],
    productos: [
      ["Taladro inalámbrico", 1299, "Herramientas", "🔩", 1149],
      ["Juego de desarmadores", 249, "Herramientas", "🪛"],
      ["Cinta métrica 5 m", 89, "Herramientas", "📏"],
      ["Pintura vinílica 4 L", 399, "Pintura", "🎨"],
      ["Martillo de uña", 149, "Herramientas", "🔨"],
      ["Extensión eléctrica 5 m", 159, "Electricidad", "🔌"],
    ],
  },
  accesorios: {
    label: "Accesorios",
    emoji: "⌚",
    estilo: "elegante",
    tagline: "Detalles que completan tu estilo",
    categorias: ["Relojes", "Lentes", "Bolsas", "Joyería"],
    productos: [
      ["Reloj análogo", 699, "Relojes", "⌚"],
      ["Lentes de sol", 349, "Lentes", "🕶️"],
      ["Cartera de piel", 399, "Bolsas", "👛"],
      ["Mochila urbana", 549, "Bolsas", "🎒", 479],
      ["Pulsera de acero", 199, "Joyería", "📿"],
      ["Bolsa crossbody", 449, "Bolsas", "👜"],
    ],
  },
  otro: {
    label: "Otro giro",
    emoji: "🛍️",
    estilo: "moderno",
    tagline: "Calidad y buen precio, directo contigo",
    categorias: ["Productos", "Promociones"],
    productos: [
      ["Producto destacado", 499, "Productos", "⭐"],
      ["Producto 2", 299, "Productos", "🛍️"],
      ["Producto 3", 199, "Productos", "🛍️"],
      ["Paquete promoción", 899, "Promociones", "🎁", 749],
      ["Producto 5", 349, "Productos", "🛍️"],
      ["Producto 6", 149, "Productos", "🛍️"],
    ],
  },
};

export const ESTILOS = {
  moderno:  { label: "Moderno",  display: "'Barlow Condensed', 'Arial Narrow', sans-serif", upper: true,  weight: 900 },
  elegante: { label: "Elegante", display: "'Playfair Display', Georgia, serif",            upper: false, weight: 700 },
  amigable: { label: "Amigable", display: "'Fredoka', 'Trebuchet MS', sans-serif",         upper: false, weight: 600 },
  simple:   { label: "Simple",   display: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", upper: false, weight: 700 },
};

/* ============================================================
   DISEÑO DE LA TIENDA (tema)
   Cada tienda guarda: color + estilo (como antes) y "tema" con
   fondo, tarjetas, texto, forma, botones y portada.
   Las plantillas son combinaciones listas por giro; en el creador
   se elige una y luego se ajusta lo que se quiera.
   Una tienda sin "tema" se ve igual que siempre (TEMA_BASE).
============================================================ */
export const FORMAS = {
  recta:   { label: "Recta",   r: "0px" },
  suave:   { label: "Suave",   r: "10px" },
  redonda: { label: "Redonda", r: "22px" },
};
export const BOTONES = {
  pastilla:   { label: "Pastilla",   r: "100px" },
  redondeado: { label: "Redondeado", r: "10px" },
  recto:      { label: "Recto",      r: "0px" },
};
export const PORTADAS = {
  dividida: { label: "Texto y foto" },
  color:    { label: "Bloque de color" },
};
export const TEMA_BASE = { fondo: "#ffffff", tarjetas: "#f5f5f4", texto: "#111111", forma: "recta", botones: "pastilla", portada: "dividida" };

export const PLANTILLAS = {
  urbano:   { label: "Urbano",    giros: ["ropa", "calzado", "otro"], color: "#111111", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#f5f5f4", texto: "#111111", forma: "recta",   botones: "pastilla",   portada: "dividida" },
  noche:    { label: "Noche",     giros: ["ropa", "calzado"],         color: "#ff6a00", estilo: "moderno",
              fondo: "#0f0f0f", tarjetas: "#1c1c1c", texto: "#f5f5f4", forma: "recta",   botones: "pastilla",   portada: "dividida" },
  antojo:   { label: "Antojo",    giros: ["comida"],                  color: "#d62839", estilo: "amigable",
              fondo: "#fffaf3", tarjetas: "#f8ead8", texto: "#2b1d14", forma: "redonda", botones: "pastilla",   portada: "color" },
  cafe:     { label: "Café",      giros: ["comida"],                  color: "#6f4e37", estilo: "elegante",
              fondo: "#f8f4ee", tarjetas: "#ece3d6", texto: "#2a211b", forma: "suave",   botones: "redondeado", portada: "dividida" },
  fresco:   { label: "Fresco",    giros: ["comida", "belleza", "otro"], color: "#15803d", estilo: "simple",
              fondo: "#ffffff", tarjetas: "#eef6ef", texto: "#142318", forma: "suave",   botones: "pastilla",   portada: "dividida" },
  boutique: { label: "Boutique",  giros: ["belleza", "accesorios", "ropa"], color: "#9d4b6a", estilo: "elegante",
              fondo: "#fdf8f6", tarjetas: "#f4e9e6", texto: "#2d1f24", forma: "suave",   botones: "pastilla",   portada: "dividida" },
  lujo:     { label: "Lujo",      giros: ["accesorios", "belleza"],   color: "#c9a46a", estilo: "elegante",
              fondo: "#121110", tarjetas: "#1e1c1a", texto: "#f3efe8", forma: "recta",   botones: "recto",      portada: "dividida" },
  alegre:   { label: "Alegre",    giros: ["mascotas"],                color: "#0f766e", estilo: "amigable",
              fondo: "#f4fbf9", tarjetas: "#e0f1ec", texto: "#12302b", forma: "redonda", botones: "pastilla",   portada: "color" },
  taller:   { label: "Taller",    giros: ["ferreteria"],              color: "#f59e0b", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#f1f1ef", texto: "#1c1c1c", forma: "recta",   botones: "recto",      portada: "color" },
};

// Plantillas sugeridas para un giro (primero las del giro, luego las demás)
export function plantillasPara(giro) {
  const all = Object.keys(PLANTILLAS);
  const mine = all.filter((k) => PLANTILLAS[k].giros.includes(giro));
  return { sugeridas: mine.length ? mine : ["urbano"], otras: all.filter((k) => !mine.includes(k)) };
}
export const plantillaDelGiro = (giro) => plantillasPara(giro).sugeridas[0];

// Lo que una plantilla pone en la tienda: { color, estilo, tema }
export function disenoDePlantilla(key) {
  const p = PLANTILLAS[key] || PLANTILLAS.urbano;
  const { color, estilo, fondo, tarjetas, texto, forma, botones, portada } = p;
  return { color, estilo, tema: { plantilla: PLANTILLAS[key] ? key : "urbano", fondo, tarjetas, texto, forma, botones, portada } };
}

/* Utilidades de color */
const hex6 = (h) => {
  let s = String(h || "").trim().replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null;
};
const rgbOf = (h) => { const s = hex6(h) || "111111"; return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const mezcla = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
export const conAlfa = (h, a) => `rgba(${rgbOf(h).join(",")},${a})`;
export function luminancia(h) {
  const [r, g, b] = rgbOf(h).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Texto sobre el color de la marca: blanco, salvo que el color sea tan claro que el blanco no se lea
// (amarillos, dorados, pasteles). El naranja de siempre sigue con texto blanco.
export const inkFor = (h) => (luminancia(h) > 0.45 || contraste(h, "#ffffff") < 2.5 ? "#111111" : "#ffffff");
export const esOscuro = (h) => luminancia(h) < 0.2;

// Tema completo de una tienda (rellena lo que falte con TEMA_BASE)
export function temaDe(cfg = {}) {
  const t = { ...TEMA_BASE, ...(cfg.tema || {}) };
  for (const k of ["fondo", "tarjetas", "texto"]) if (!hex6(t[k])) t[k] = TEMA_BASE[k];
  if (!FORMAS[t.forma]) t.forma = TEMA_BASE.forma;
  if (!BOTONES[t.botones]) t.botones = TEMA_BASE.botones;
  if (!PORTADAS[t.portada]) t.portada = TEMA_BASE.portada;
  return t;
}

// Variables CSS que usa la tienda
export function variablesDeTema(cfg = {}) {
  const t = temaDe(cfg);
  const accent = hex6(cfg.color) ? cfg.color : "#111111";
  const st = ESTILOS[cfg.estilo] || ESTILOS.moderno;
  const dark = esOscuro(t.fondo);
  return {
    dark, portada: t.portada,
    vars: {
      "--accent": accent,
      "--accent-ink": inkFor(accent),
      "--accent-soft": conAlfa(accent, 0.1),
      "--display": st.display,
      "--display-weight": st.weight,
      "--display-case": st.upper ? "uppercase" : "none",
      "--bg": t.fondo,
      "--panel": t.tarjetas,
      "--ink": t.texto,
      "--muted": mezcla(t.texto, t.fondo, 0.42),
      "--line": mezcla(t.texto, t.fondo, 0.88),
      "--line-strong": mezcla(t.texto, t.fondo, 0.76),
      "--hdr-bg": conAlfa(t.fondo, 0.96),
      "--sale": dark ? "#fb923c" : "#c2410c",
      "--wa-ink": dark ? "#25d366" : "#128c4a",
      "--radius": FORMAS[t.forma].r,
      "--btn-radius": BOTONES[t.botones].r,
    },
  };
}

// Aplica el tema a la página (tienda pública o vista previa)
export function aplicarTema(cfg, doc = document) {
  const { dark, portada, vars } = variablesDeTema(cfg);
  const r = doc.documentElement;
  for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, String(v));
  r.style.colorScheme = dark ? "dark" : "light";
  r.dataset.portada = portada;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute("content", vars["--bg"]);
}

export const PAGOS = {
  entrega: "Pago al recibir",
  transferencia: "Transferencia",
  link: "Link de pago (tarjeta)",
};

export const COLORES = ["#111111", "#ff6a00", "#d62839", "#2563eb", "#0f766e", "#7c3aed", "#db2777", "#a16207"];

// Foto de ejemplo: fondo con el color de la marca + emoji del producto
// (fondo = color de tarjetas del tema; en tiendas oscuras la foto también es oscura)
export function fotoEjemplo(emoji, color = "#111111", fondo = "#f5f5f4") {
  const bg = hex6(fondo) ? "#" + hex6(fondo) : "#f5f5f4";
  const label = esOscuro(bg) ? "#8f8a84" : "#8a8580";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs><radialGradient id="g" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/>
    </radialGradient></defs>
    <rect width="600" height="600" fill="${bg}"/><rect width="600" height="600" fill="url(#g)"/>
    <text x="300" y="330" font-size="190" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="300" y="560" font-size="22" text-anchor="middle" fill="${label}" font-family="sans-serif">Foto de ejemplo</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

let seq = 0;
export function productosDeEjemplo(giroKey) {
  const g = GIROS[giroKey] || GIROS.otro;
  const acc = ["Gorra bordada"]; // productos sin talla dentro de giros con tallas
  return g.productos.map(([name, price, category, emoji, salePrice]) => ({
    id: "p" + Date.now().toString(36) + (seq++),
    name, price, category, emoji,
    salePrice: salePrice || 0,
    desc: "",
    photo: "",
    variantes: acc.includes(name) ? [] : JSON.parse(JSON.stringify(g.variantes || [])),
  }));
}
