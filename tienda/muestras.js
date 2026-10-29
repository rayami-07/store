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
};

export const PAGOS = {
  entrega: "Pago al recibir",
  transferencia: "Transferencia",
  link: "Link de pago (tarjeta)",
};

export const COLORES = ["#111111", "#ff6a00", "#d62839", "#2563eb", "#0f766e", "#7c3aed", "#db2777", "#a16207"];

// Foto de ejemplo: fondo con el color de la marca + emoji del producto
export function fotoEjemplo(emoji, color = "#111111") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs><radialGradient id="g" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/>
    </radialGradient></defs>
    <rect width="600" height="600" fill="#f5f5f4"/><rect width="600" height="600" fill="url(#g)"/>
    <text x="300" y="330" font-size="190" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
    <text x="300" y="560" font-size="22" text-anchor="middle" fill="#8a8580" font-family="sans-serif">Foto de ejemplo</text>
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
