/* ============================================================
   CATÁLOGOS DE EJEMPLO POR GIRO
   Se usan para que una demo nunca se vea vacía. En el creador
   se pueden editar o reemplazar por los productos reales.
============================================================ */

export const GIROS = {
  ropa: {
    label: "Ropa",
    plantilla: "street",   // plantilla con la que arranca este giro
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
    plantilla: "street",
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
    label: "Comida / restaurante",
    plantilla: "sabor",
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
    plantilla: "boutique",
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
    plantilla: "patitas",
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
    plantilla: "obra",
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
    plantilla: "lujo",
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
  cafeteria: {
    label: "Cafetería",
    plantilla: "horno",
    emoji: "☕",
    estilo: "elegante",
    tagline: "Café de especialidad y algo rico para acompañar",
    pagoAnticipado: true,
    categorias: ["Calientes", "Fríos", "Panes", "Postres"],
    variantes: [{ nombre: "Tamaño", opciones: ["Chico", "Mediano", "Grande"] }],
    productos: [
      ["Latte", 55, "Calientes", "☕"],
      ["Capuchino", 55, "Calientes", "☕"],
      ["Frappé de moka", 75, "Fríos", "🧋", 65],
      ["Cold brew", 60, "Fríos", "🥤"],
      ["Croissant de jamón y queso", 65, "Panes", "🥐"],
      ["Rebanada de pay de queso", 60, "Postres", "🍰"],
    ],
  },
  panaderia: {
    label: "Panadería y repostería",
    plantilla: "horno",
    emoji: "🥐",
    estilo: "amigable",
    tagline: "Pan recién horneado todos los días",
    categorias: ["Pan dulce", "Pasteles", "Galletas", "Bebidas"],
    productos: [
      ["Concha", 14, "Pan dulce", "🍞"],
      ["Cuernito", 16, "Pan dulce", "🥐"],
      ["Pastel de tres leches (8 personas)", 380, "Pasteles", "🎂", 340],
      ["Cupcakes (6 piezas)", 150, "Pasteles", "🧁"],
      ["Galletas de chispas (docena)", 90, "Galletas", "🍪"],
      ["Chocolate caliente", 40, "Bebidas", "☕"],
    ],
  },
  barberia: {
    label: "Barbería",
    plantilla: "barberia",
    emoji: "💈",
    estilo: "moderno",
    tagline: "Cortes y arreglo de barba con estilo",
    categorias: ["Cortes", "Barba", "Productos"],
    productos: [
      ["Corte clásico", 150, "Cortes", "💇‍♂️"],
      ["Degradado (fade)", 180, "Cortes", "💈"],
      ["Corte + barba", 250, "Cortes", "✂️", 220],
      ["Arreglo de barba", 100, "Barba", "🧔"],
      ["Cera para cabello", 180, "Productos", "🫙"],
      ["Aceite para barba", 220, "Productos", "🧴"],
    ],
  },
  floreria: {
    label: "Florería",
    plantilla: "floral",
    emoji: "💐",
    estilo: "elegante",
    tagline: "Flores frescas para cada momento",
    categorias: ["Ramos", "Arreglos", "Plantas", "Regalos"],
    productos: [
      ["Ramo de 12 rosas", 450, "Ramos", "🌹", 399],
      ["Ramo de girasoles", 380, "Ramos", "🌻"],
      ["Arreglo en caja", 650, "Arreglos", "💐"],
      ["Orquídea en maceta", 520, "Plantas", "🪴"],
      ["Suculenta mini", 90, "Plantas", "🌵"],
      ["Globo + chocolates", 220, "Regalos", "🎈"],
    ],
  },
  papeleria: {
    label: "Papelería",
    plantilla: "escolar",
    emoji: "✏️",
    estilo: "amigable",
    tagline: "Todo para la escuela y la oficina",
    categorias: ["Escolar", "Oficina", "Arte", "Impresiones"],
    productos: [
      ["Cuaderno profesional", 45, "Escolar", "📒"],
      ["Caja de colores (24)", 120, "Arte", "🖍️", 99],
      ["Juego de geometría", 55, "Escolar", "📐"],
      ["Paquete de plumas (10)", 60, "Oficina", "🖊️"],
      ["Mochila escolar", 450, "Escolar", "🎒"],
      ["Impresión a color (hoja)", 5, "Impresiones", "🖨️"],
    ],
  },
  abarrotes: {
    label: "Abarrotes",
    plantilla: "mercado",
    emoji: "🛒",
    estilo: "simple",
    tagline: "Tu tiendita de confianza, con entrega a domicilio",
    categorias: ["Despensa", "Bebidas", "Botanas", "Limpieza"],
    productos: [
      ["Arroz 1 kg", 32, "Despensa", "🍚"],
      ["Aceite 1 L", 45, "Despensa", "🫗"],
      ["Refresco 2 L", 38, "Bebidas", "🥤", 34],
      ["Papas fritas", 20, "Botanas", "🍟"],
      ["Detergente 1 kg", 42, "Limpieza", "🧼"],
      ["Huevo (12 piezas)", 48, "Despensa", "🥚"],
    ],
  },
  tecnologia: {
    label: "Celulares y tecnología",
    plantilla: "nitido",
    emoji: "📱",
    estilo: "simple",
    tagline: "Celulares, accesorios y tecnología",
    categorias: ["Celulares", "Audio", "Cargadores", "Fundas"],
    productos: [
      ["Audífonos inalámbricos", 599, "Audio", "🎧", 499],
      ["Cargador rápido 20 W", 249, "Cargadores", "🔌"],
      ["Funda uso rudo", 199, "Fundas", "📱"],
      ["Bocina bluetooth", 449, "Audio", "🔊"],
      ["Mica de cristal", 99, "Fundas", "🛡️"],
      ["Smartwatch", 899, "Celulares", "⌚"],
    ],
  },
  deportes: {
    label: "Deportes",
    plantilla: "energia",
    emoji: "🏋️",
    estilo: "moderno",
    tagline: "Equípate para entrenar",
    categorias: ["Ropa deportiva", "Balones", "Gym", "Accesorios"],
    variantes: [{ nombre: "Talla", opciones: ["CH", "M", "G", "XG"] }],
    productos: [
      ["Playera dry-fit", 299, "Ropa deportiva", "👕"],
      ["Short deportivo", 279, "Ropa deportiva", "🩳", 239],
      ["Balón de futbol", 399, "Balones", "⚽"],
      ["Mancuernas 5 kg (par)", 699, "Gym", "🏋️"],
      ["Tapete de yoga", 349, "Gym", "🧘"],
      ["Botella térmica", 199, "Accesorios", "🥤"],
    ],
  },
  jugueteria: {
    label: "Juguetería y regalos",
    plantilla: "juguetes",
    emoji: "🧸",
    estilo: "amigable",
    tagline: "Juguetes y regalos que sacan sonrisas",
    categorias: ["Juguetes", "Peluches", "Juegos de mesa", "Regalos"],
    productos: [
      ["Peluche de oso", 299, "Peluches", "🧸"],
      ["Carrito a control remoto", 549, "Juguetes", "🚗", 479],
      ["Juego de mesa familiar", 399, "Juegos de mesa", "🎲"],
      ["Rompecabezas 500 piezas", 249, "Juegos de mesa", "🧩"],
      ["Muñeca", 349, "Juguetes", "🪆"],
      ["Caja de regalo sorpresa", 199, "Regalos", "🎁"],
    ],
  },
  muebles: {
    label: "Muebles y decoración",
    plantilla: "roble",
    emoji: "🛋️",
    estilo: "elegante",
    tagline: "Muebles que hacen hogar",
    categorias: ["Sala", "Comedor", "Recámara", "Decoración"],
    productos: [
      ["Sillón de 3 plazas", 8999, "Sala", "🛋️", 7999],
      ["Mesa de centro", 2499, "Sala", "🪵"],
      ["Comedor 4 sillas", 9999, "Comedor", "🪑"],
      ["Cabecera matrimonial", 3499, "Recámara", "🛏️"],
      ["Lámpara de piso", 1299, "Decoración", "💡"],
      ["Espejo decorativo", 899, "Decoración", "🪞"],
    ],
  },
  otro: {
    label: "Otro giro",
    plantilla: "urbano",
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
  foto:     { label: "Foto grande" },
};
// Animaciones al hacer scroll: los productos y secciones aparecen al bajar
export const ANIMACIONES = { ninguna: { label: "Ninguna" }, suave: { label: "Suaves" }, dinamica: { label: "Dinámicas" } };
export const TEMA_BASE = { fondo: "#ffffff", tarjetas: "#f5f5f4", texto: "#111111", forma: "recta", botones: "pastilla", portada: "dividida",
  textura: "ninguna", intensidad: "suave", texturaEn: "fondo",
  animacion: "ninguna", avisoMov: false, ofertas: false, chipsFijas: false };

/* Texturas (tramas): dibujos SVG que se repiten. Toman el color del texto o de la marca,
   así combinan solas con cualquier diseño. tile = tamaño del cuadrito que se repite. */
export const TEXTURAS = {
  ninguna:   { label: "Ninguna" },
  puntos:    { label: "Puntos",     tile: [22, 22], svg: (c, o) => `<circle cx="11" cy="11" r="1.7" fill="${c}" fill-opacity="${o * 1.8}"/>` },
  cuadricula:{ label: "Cuadrícula", tile: [26, 26], svg: (c, o) => `<path d="M26 .5H.5V26" fill="none" stroke="${c}" stroke-opacity="${o}"/>` },
  rayas:     { label: "Rayas",      tile: [16, 16], svg: (c, o) => `<path d="M-4 4 4-4M0 16 16 0M12 20 20 12" stroke="${c}" stroke-opacity="${o}" stroke-width="1.5"/>` },
  renglones: { label: "Renglones",  tile: [8, 28],  svg: (c, o) => `<path d="M0 27.5H8" stroke="${c}" stroke-opacity="${o * 1.2}"/>` },
  rombos:    { label: "Rombos",     tile: [24, 24], svg: (c, o) => `<path d="M12 .5 23.5 12 12 23.5 .5 12Z" fill="none" stroke="${c}" stroke-opacity="${o}"/>` },
  ondas:     { label: "Ondas",      tile: [40, 16], svg: (c, o) => `<path d="M0 8c10-8 10 8 20 0s10 8 20 0" fill="none" stroke="${c}" stroke-opacity="${o * 1.2}" stroke-width="1.5"/>` },
  zigzag:    { label: "Zigzag",     tile: [24, 14], svg: (c, o) => `<path d="M0 11 6 3l6 8 6-8 6 8" fill="none" stroke="${c}" stroke-opacity="${o * 1.2}" stroke-width="1.5"/>` },
  cruces:    { label: "Cruces",     tile: [28, 28], svg: (c, o) => `<path d="M14 10v8M10 14h8" stroke="${c}" stroke-opacity="${o * 1.5}" stroke-width="1.5" stroke-linecap="round"/>` },
  papel:     { label: "Papel",      tile: [180, 180], svg: (c, o) => {
      const [r, g, b] = rgbOf(c).map((v) => (v / 255).toFixed(3));
      return `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${(o * 4).toFixed(2)} 0"/></filter><rect width="180" height="180" filter="url(#n)"/>`;
    } },
  mantel:    { label: "Mantel", marca: true, tile: [32, 32], svg: (c, o) => `<rect width="16" height="32" fill="${c}" fill-opacity="${o * 0.9}"/><rect width="32" height="16" fill="${c}" fill-opacity="${o * 0.9}"/>` },
  confeti:   { label: "Confeti", marca: true, tile: [96, 96], svg: (c, o) => `<g fill="${c}" fill-opacity="${Math.min(1, o * 3.5)}">
      <rect x="10" y="14" width="10" height="4" rx="2" transform="rotate(-25 15 16)"/><circle cx="62" cy="20" r="3"/>
      <rect x="40" y="52" width="10" height="4" rx="2" transform="rotate(35 45 54)"/><circle cx="18" cy="74" r="2.5"/>
      <rect x="72" y="72" width="9" height="4" rx="2" transform="rotate(-60 76 74)"/><path d="M84 36l3 6-6 0Z"/></g>` },
};
export const INTENSIDADES = { suave: { label: "Suave", o: 0.06 }, media: { label: "Media", o: 0.11 }, fuerte: { label: "Fuerte", o: 0.18 } };
export const TEXTURA_EN = { fondo: { label: "Fondo" }, portada: { label: "Portada" }, ambos: { label: "Las dos" } };

// CSS de una textura: { img: 'url("data:...")', size: "22px 22px" } (o img "none")
export function texturaCSS(key, color, intensidad = "suave", { escala = 1, mas = 1 } = {}) {
  const tx = TEXTURAS[key];
  if (!tx || !tx.svg) return { img: "none", size: "auto" };
  const [w, h] = tx.tile, o = Math.min(0.5, (INTENSIDADES[intensidad] || INTENSIDADES.suave).o * mas);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${tx.svg("#" + (hex6(color) || "111111"), o)}</svg>`;
  return { img: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: `${Math.round(w * escala)}px ${Math.round(h * escala)}px` };
}

export const PLANTILLAS = {
  urbano:   { label: "Urbano",    giros: ["ropa", "calzado", "otro", "deportes"], color: "#111111", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#f5f5f4", texto: "#111111", forma: "recta",   botones: "pastilla",   portada: "dividida" },
  noche:    { label: "Noche",     giros: ["ropa", "calzado", "deportes", "barberia"],         color: "#ff6a00", estilo: "moderno",
              fondo: "#0f0f0f", tarjetas: "#1c1c1c", texto: "#f5f5f4", forma: "recta",   botones: "pastilla",   portada: "dividida" },
  antojo:   { label: "Antojo",    giros: ["comida"],                  color: "#d62839", estilo: "amigable",
              fondo: "#fffaf3", tarjetas: "#f8ead8", texto: "#2b1d14", forma: "redonda", botones: "pastilla",   portada: "color" },
  cafe:     { label: "Café",      giros: ["comida", "cafeteria", "panaderia"],                  color: "#6f4e37", estilo: "elegante",
              fondo: "#f8f4ee", tarjetas: "#ece3d6", texto: "#2a211b", forma: "suave",   botones: "redondeado", portada: "dividida" },
  fresco:   { label: "Fresco",    giros: ["comida", "belleza", "otro", "abarrotes", "cafeteria"], color: "#15803d", estilo: "simple",
              fondo: "#ffffff", tarjetas: "#eef6ef", texto: "#142318", forma: "suave",   botones: "pastilla",   portada: "dividida" },
  boutique: { label: "Boutique",  giros: ["belleza", "accesorios", "ropa", "floreria"], color: "#9d4b6a", estilo: "elegante",
              fondo: "#fdf8f6", tarjetas: "#f4e9e6", texto: "#2d1f24", forma: "suave",   botones: "pastilla",   portada: "dividida" },
  lujo:     { label: "Lujo",      giros: ["accesorios", "belleza", "barberia", "muebles"],   color: "#c9a46a", estilo: "elegante",
              fondo: "#121110", tarjetas: "#1e1c1a", texto: "#f3efe8", forma: "recta",   botones: "recto",      portada: "dividida" },
  alegre:   { label: "Alegre",    giros: ["mascotas", "jugueteria"],                color: "#0f766e", estilo: "amigable",
              fondo: "#f4fbf9", tarjetas: "#e0f1ec", texto: "#12302b", forma: "redonda", botones: "pastilla",   portada: "color" },
  taller:   { label: "Taller",    giros: ["ferreteria"],              color: "#f59e0b", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#f1f1ef", texto: "#1c1c1c", forma: "recta",   botones: "recto",      portada: "color" },
  // ── Con textura ──
  fondita:  { label: "Fondita",   giros: ["comida"],                  color: "#c0392b", estilo: "amigable",
              fondo: "#fffdf7", tarjetas: "#fbe9e4", texto: "#3b1f1a", forma: "redonda", botones: "pastilla",   portada: "color",
              textura: "mantel", intensidad: "suave", texturaEn: "fondo" },
  pizarron: { label: "Pizarrón",  giros: ["comida", "cafeteria"],                  color: "#f2c14e", estilo: "amigable",
              fondo: "#1f2b25", tarjetas: "#2a3831", texto: "#f2efe6", forma: "suave",   botones: "redondeado", portada: "dividida",
              textura: "papel", intensidad: "media", texturaEn: "fondo" },
  fiesta:   { label: "Fiesta",    giros: ["comida", "mascotas", "otro", "jugueteria", "panaderia", "abarrotes", "papeleria"], color: "#e4007c", estilo: "amigable",
              fondo: "#fff8ef", tarjetas: "#ffe9d6", texto: "#2b1a12", forma: "redonda", botones: "pastilla",   portada: "color",
              textura: "confeti", intensidad: "media", texturaEn: "fondo" },
  dulce:    { label: "Dulce",     giros: ["comida", "belleza", "panaderia", "floreria"],       color: "#d9668b", estilo: "amigable",
              fondo: "#fff7fa", tarjetas: "#fde6ee", texto: "#3d2530", forma: "redonda", botones: "pastilla",   portada: "dividida",
              textura: "puntos", intensidad: "suave", texturaEn: "fondo" },
  natural:  { label: "Natural",   giros: ["belleza", "comida", "otro", "floreria", "cafeteria", "muebles"], color: "#5a6b3b", estilo: "elegante",
              fondo: "#f6f3ea", tarjetas: "#e9e4d4", texto: "#2e3326", forma: "suave",   botones: "pastilla",   portada: "dividida",
              textura: "papel", intensidad: "suave", texturaEn: "fondo" },
  deportivo:{ label: "Deportivo", giros: ["calzado", "ropa", "deportes"],         color: "#2563eb", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#eef1f5", texto: "#0b1220", forma: "recta",   botones: "pastilla",   portada: "color",
              textura: "rayas", intensidad: "media", texturaEn: "portada" },
  barberia: { label: "Barbería",  giros: ["belleza", "otro", "barberia"],         color: "#b8873b", estilo: "moderno",
              fondo: "#151515", tarjetas: "#222222", texto: "#f1ece4", forma: "recta",   botones: "recto",      portada: "dividida",
              textura: "rayas", intensidad: "suave", texturaEn: "fondo" },
  tecno:    { label: "Tecno",     giros: ["accesorios", "otro", "tecnologia", "ferreteria"],      color: "#7c3aed", estilo: "simple",
              fondo: "#0b0b14", tarjetas: "#171728", texto: "#ecebf7", forma: "suave",   botones: "redondeado", portada: "dividida",
              textura: "cuadricula", intensidad: "media", texturaEn: "fondo" },
  minimal:  { label: "Minimal",   giros: ["ropa", "accesorios", "otro", "muebles", "tecnologia", "barberia", "ferreteria", "papeleria"], color: "#1a1a1a", estilo: "simple",
              fondo: "#fafafa", tarjetas: "#efefef", texto: "#1a1a1a", forma: "recta",   botones: "recto",      portada: "dividida" },
  patitas:  { label: "Patitas",   giros: ["mascotas"],                color: "#f97316", estilo: "amigable",
              fondo: "#fffaf2", tarjetas: "#ffedd5", texto: "#3a2414", forma: "redonda", botones: "pastilla",   portada: "color",
              textura: "puntos", intensidad: "media", texturaEn: "fondo" },
  obra:     { label: "Obra",      giros: ["ferreteria"],              color: "#ea580c", estilo: "moderno",
              fondo: "#fafaf9", tarjetas: "#ececea", texto: "#1c1917", forma: "recta",   botones: "recto",      portada: "dividida",
              textura: "cuadricula", intensidad: "media", texturaEn: "fondo" },
  // ── Modernas: foto grande, animaciones y secciones ──
  horno:    { label: "Horno",     giros: ["panaderia", "cafeteria", "comida"], color: "#b45309", estilo: "elegante",
              fondo: "#fdf8f1", tarjetas: "#f3e6d3", texto: "#3a2615", forma: "redonda", botones: "pastilla",   portada: "foto",
              textura: "papel", intensidad: "suave", texturaEn: "fondo", animacion: "suave", ofertas: true, chipsFijas: true },
  floral:   { label: "Floral",    giros: ["floreria", "belleza"],     color: "#c2557a", estilo: "elegante",
              fondo: "#fbf7f2", tarjetas: "#f1e6e1", texto: "#2f2a24", forma: "redonda", botones: "pastilla",   portada: "foto",
              textura: "ondas", intensidad: "suave", texturaEn: "fondo", animacion: "suave", ofertas: true },
  escolar:  { label: "Escolar",   giros: ["papeleria", "jugueteria"], color: "#2563eb", estilo: "amigable",
              fondo: "#fffdf5", tarjetas: "#fdf3c7", texto: "#1e293b", forma: "suave",   botones: "pastilla",   portada: "color",
              textura: "renglones", intensidad: "media", texturaEn: "fondo", animacion: "suave", avisoMov: true, chipsFijas: true },
  mercado:  { label: "Mercado",   giros: ["abarrotes", "comida"],     color: "#16a34a", estilo: "simple",
              fondo: "#fbfdf7", tarjetas: "#eef6e4", texto: "#1b2a14", forma: "suave",   botones: "redondeado", portada: "color",
              animacion: "suave", avisoMov: true, ofertas: true, chipsFijas: true },
  energia:  { label: "Energía",   giros: ["deportes", "calzado", "ropa"], color: "#a3e635", estilo: "moderno",
              fondo: "#0c0c0c", tarjetas: "#1a1a1a", texto: "#f5f5f5", forma: "recta",   botones: "recto",      portada: "foto",
              textura: "rayas", intensidad: "suave", texturaEn: "fondo", animacion: "dinamica", avisoMov: true, ofertas: true },
  juguetes: { label: "Juguetes",  giros: ["jugueteria", "mascotas"],  color: "#f43f5e", estilo: "amigable",
              fondo: "#fffaf0", tarjetas: "#fdecc8", texto: "#2d1b0e", forma: "redonda", botones: "pastilla",   portada: "color",
              textura: "confeti", intensidad: "media", texturaEn: "fondo", animacion: "dinamica", ofertas: true },
  roble:    { label: "Roble",     giros: ["muebles"],                 color: "#7c5a3a", estilo: "elegante",
              fondo: "#f7f3ee", tarjetas: "#e9e1d6", texto: "#2b2219", forma: "suave",   botones: "recto",      portada: "foto",
              textura: "papel", intensidad: "suave", texturaEn: "fondo", animacion: "suave", ofertas: true },
  nitido:   { label: "Nítido",    giros: ["tecnologia", "accesorios", "papeleria", "ferreteria"], color: "#0ea5e9", estilo: "simple",
              fondo: "#f8fafc", tarjetas: "#eef2f6", texto: "#0f172a", forma: "suave",   botones: "redondeado", portada: "foto",
              textura: "cuadricula", intensidad: "suave", texturaEn: "fondo", animacion: "dinamica", ofertas: true, chipsFijas: true },
  street:   { label: "Street",    giros: ["ropa", "calzado", "barberia"],         color: "#ef4444", estilo: "moderno",
              fondo: "#ffffff", tarjetas: "#f2f2f2", texto: "#0a0a0a", forma: "recta",   botones: "recto",      portada: "foto",
              animacion: "dinamica", avisoMov: true, ofertas: true },
  sabor:    { label: "Sabor",     giros: ["comida", "cafeteria", "abarrotes"],     color: "#ea580c", estilo: "amigable",
              fondo: "#fffaf5", tarjetas: "#ffedd5", texto: "#2a1407", forma: "redonda", botones: "pastilla",   portada: "foto",
              animacion: "dinamica", avisoMov: true, ofertas: true, chipsFijas: true },
};

// Plantillas sugeridas para un giro (primero las del giro, luego las demás)
export function plantillasPara(giro) {
  const all = Object.keys(PLANTILLAS);
  const pref = GIROS[giro]?.plantilla;
  const mine = all.filter((k) => PLANTILLAS[k].giros.includes(giro)).sort((a, b) => (b === pref) - (a === pref));
  return { sugeridas: mine.length ? mine : ["urbano"], otras: all.filter((k) => !mine.includes(k)) };
}
export const plantillaDelGiro = (giro) => plantillasPara(giro).sugeridas[0];

// 3 plantillas que se vean distintas entre sí para presentar opciones a un cliente:
// 1) la del giro, 2) una con fondo contrario (clara/oscura), 3) una con otra portada
export function tresOpciones(giro) {
  const { sugeridas } = plantillasPara(giro);
  const comodin = [...plantillasPara("otro").sugeridas, ...Object.keys(PLANTILLAS)];   // si al giro le faltan
  const out = [sugeridas[0]];
  const dark = (k) => luminancia(PLANTILLAS[k].fondo) < 0.2;
  const portadaNueva = (k) => !out.some((o) => PLANTILLAS[o].portada === PLANTILLAS[k].portada);
  const pick = (pool, test) => { const k = pool.find((x) => !out.includes(x) && test(x)); if (k) out.push(k); return !!k; };
  pick(sugeridas, (k) => dark(k) !== dark(out[0])) || pick(sugeridas, portadaNueva) || pick(sugeridas, () => true) || pick(comodin, () => true);
  pick(sugeridas, portadaNueva) || pick(sugeridas, () => true) || pick(comodin, portadaNueva) || pick(comodin, () => true);
  return out.slice(0, 3);
}

// Lo que una plantilla pone en la tienda: { color, estilo, tema }
export function disenoDePlantilla(key) {
  const p = PLANTILLAS[key] || PLANTILLAS.urbano;
  const { color, estilo, fondo, tarjetas, texto, forma, botones, portada } = p;
  const { textura, intensidad, texturaEn, animacion, avisoMov, ofertas, chipsFijas } = { ...TEMA_BASE, ...p };
  return { color, estilo, tema: { plantilla: PLANTILLAS[key] ? key : "urbano", fondo, tarjetas, texto, forma, botones, portada,
    textura, intensidad, texturaEn, animacion, avisoMov, ofertas, chipsFijas } };
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
  if (!TEXTURAS[t.textura]) t.textura = TEMA_BASE.textura;
  if (!INTENSIDADES[t.intensidad]) t.intensidad = TEMA_BASE.intensidad;
  if (!TEXTURA_EN[t.texturaEn]) t.texturaEn = TEMA_BASE.texturaEn;
  if (!ANIMACIONES[t.animacion]) t.animacion = TEMA_BASE.animacion;
  for (const k of ["avisoMov", "ofertas", "chipsFijas"]) t[k] = t[k] === true;
  return t;
}

// Variables CSS que usa la tienda
export function variablesDeTema(cfg = {}) {
  const t = temaDe(cfg);
  const accent = hex6(cfg.color) ? cfg.color : "#111111";
  const st = ESTILOS[cfg.estilo] || ESTILOS.moderno;
  const dark = esOscuro(t.fondo);
  // Textura: en el fondo usa el color del texto (o de la marca, según la textura);
  // sobre una portada de color usa el color que va encima de la marca
  const tx = TEXTURAS[t.textura] || {}, enFondo = t.texturaEn !== "portada", enPortada = t.texturaEn !== "fondo";
  const texFondo = texturaCSS(t.textura, tx.marca ? accent : t.texto, t.intensidad);
  // (sobre el color de la marca se ve menos, por eso va un poco más marcada)
  const texHero = t.portada === "color" ? texturaCSS(t.textura, inkFor(accent), t.intensidad, { mas: 1.6 }) : texFondo;
  return {
    dark, portada: t.portada, texHero: enPortada && t.textura !== "ninguna", animacion: t.animacion, chipsFijas: t.chipsFijas,
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
      "--tex-fondo": enFondo ? texFondo.img : "none",
      "--tex-fondo-size": texFondo.size,
      "--tex-hero": enPortada ? texHero.img : "none",
      "--tex-hero-size": texHero.size,
    },
  };
}

// Aplica el tema a la página (tienda pública o vista previa)
export function aplicarTema(cfg, doc = document) {
  const { dark, portada, texHero, animacion, chipsFijas, vars } = variablesDeTema(cfg);
  const r = doc.documentElement;
  for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, String(v));
  r.style.colorScheme = dark ? "dark" : "light";
  r.dataset.portada = portada;
  r.dataset.texHero = texHero ? "1" : "";
  r.dataset.anim = animacion;
  r.dataset.chipsFijas = chipsFijas ? "1" : "";
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


/* ============================================================
   FOTOS REALES DE EJEMPLO (Unsplash, licencia libre: uso comercial
   gratis, sin pedir permiso). Una por producto de ejemplo, en el
   mismo orden que GIROS[giro].productos. Se cargan directo de
   Unsplash a la medida que se necesita.
============================================================ */
export const FOTOS = {
  ropa: ["1581655353564-df123a1eb820", "1620799140188-3b2a02fd9a77", "1602293589930-45aad59ba3ab", "1588850561407-ed78c282e89b", "1611312449408-fcece27cdbb7", "1594633312681-425c7b97ccd1"],
  calzado: ["1600269452121-4f2416e55c28", "1542291026-7eec264c27ff", "1608256246200-53e635b5b65f", "1603487742131-4160ec999306", "1777987601431-8d27d2039cc4", "1641997465126-c73cc4070337"],
  comida: ["1568901346375-23c9450c58cd", "1768716697797-35dffd4b27f7", "1513104890138-7c749659a591", "1782839577893-da9383e55c96", "1622268348720-507f204d29b4", "1517427294546-5aa121f68e8a"],
  belleza: ["1583209814683-c023dd293cc6", "1512496015851-a90fb38ba796", "1458538977777-0549b2370168", "1560264641-1b5191cc63e2", "1596462502278-27bfdc403348", "1763987300719-fd27c51a3227"],
  mascotas: ["1714068691210-073dc52c6c1d", "1581888227599-779811939961", "1586671267731-da2cf3ceeb80", "1591946614720-90a587da4a36", "1517451330947-7809dead78d5", "1647002380358-fc70ed2f04e0"],
  ferreteria: ["1504148455328-c376907d081c", "1581621293775-7aac902d7032", "1703756291638-b1774ae3c186", "1525909002-1b05e0c869d8", "1607870411590-d5e9e06da09a", "1650501386688-41f6d0251875"],
  accesorios: ["1620625515032-6ed0c1790c75", "1511499767150-a48a237f0083", "1775379557015-938546264440", "1622560480654-d96214fdc887", "1619119069152-a2b331eb392a", "1620786514684-ff35b5aae55e"],
  cafeteria: ["1760175445000-0e01e193d1cd", "1509042239860-f550ce710b93", "1718267050202-9b1b6bfb8545", "1461023058943-07fcbe16d735", "1639667852145-466e29aa49fd", "1524351199678-941a58a3df50"],
  panaderia: ["1617859047277-9f47d2bd9696", "1623334044303-241021148842", "1588195538326-c5b1e9f80a1b", "1614707267537-b85aaf00c4b7", "1499636136210-6f4ee915583e", "1637572815755-c4b80092dce1"],
  barberia: ["1503951914875-452162b0f3f1", "1647140655214-e4a2d914971f", "1605497788044-5a32c7078486", "1599351431202-1e0f0137899a", "1775126251039-214af64257ff", "1515377905703-c4788e51af15"],
  floreria: ["1578439231583-9eca0a363860", "1593026238161-ac5f86e5ef79", "1589100534833-475e31a17b4e", "1611850916723-9a5f14e9e20e", "1485955900006-10f4d324d411", "1479750178258-aec5879046ce"],
  papeleria: ["1695131020187-d3dcdab5016b", "1513542789411-b6a5d4f31634", "1529651795107-e5a141e34843", "1583485088034-697b5bc54ccd", "1765516833058-c322c800fee1", "1612815154858-60aa4c59eaa6"],
  abarrotes: ["1686820740687-426a7b9b2043", "1474979266404-7eaacbcd87c5", "1648569883125-d01072540b4c", "1613919113640-25732ec5e61f", "1782292016926-849449fd171d", "1506976785307-8732e854ad03"],
  tecnologia: ["1590658268037-6bf12165a8df", "1557767382-97b28f5488e7", "1535157412991-2ef801c1748b", "1608043152269-423dbba4e7e1", "1772831902679-3f41c106d7a2", "1579586337278-3befd40fd17a"],
  deportes: ["1532202193792-e95ef22f1bce", "1554139844-af2fc8ad3a3a", "1579952363873-27f3bade9f55", "1638536532686-d610adfc8e5c", "1646239646963-b0b9be56d6b5", "1625708458528-802ec79b1ed8"],
  jugueteria: ["1602734846297-9299fc2d4703", "1508896694512-1eade558679c", "1629760946220-5693ee4c46ac", "1612611741189-a9b9eb01d515", "1612506001235-f0d0892aa11b", "1549465220-1a8b9238cd48"],
  muebles: ["1555041469-a586c61ea9bc", "1777513538143-8525eb3943f6", "1604578762246-41134e37f9cc", "1757417983938-2c2a931d41aa", "1774477178005-bff823e43be8", "1612392549386-b6969764af6f"],
  otro: ["1617825295690-28ae56c56135", "1595246135406-803418233494", "1626320290598-03656e931a31", "1549465220-1a8b9238cd48", "1648587456176-4969b0124b12", "1600009723489-027195d6b3d3"],
};
export const fotoReal = (id, w = 700) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${w}&q=70`;

let seq = 0;
// fotos: true = con fotos reales; false = con dibujo de ejemplo (emoji)
export function productosDeEjemplo(giroKey, { fotos = true } = {}) {
  const g = GIROS[giroKey] || GIROS.otro;
  const acc = ["Gorra bordada"]; // productos sin talla dentro de giros con tallas
  const fotosGiro = FOTOS[GIROS[giroKey] ? giroKey : "otro"] || [];
  return g.productos.map(([name, price, category, emoji, salePrice], i) => ({
    id: "p" + Date.now().toString(36) + (seq++),
    name, price, category, emoji,
    salePrice: salePrice || 0,
    desc: "",
    photo: fotos && fotosGiro[i] ? fotoReal(fotosGiro[i]) : "",
    variantes: acc.includes(name) ? [] : JSON.parse(JSON.stringify(g.variantes || [])),
  }));
}
