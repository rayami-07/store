/* ============================================
   RAYAMI STORE — script.js
   ============================================

   ┌─────────────────────────────────────────┐
   │  CÓMO AGREGAR PRODUCTOS                 │
   │                                         │
   │  1. Busca el array PRODUCTS abajo       │
   │  2. Copia un bloque {} existente        │
   │  3. Pégalo al final (antes del ] )      │
   │  4. Llena los campos:                   │
   │     - name:     nombre del producto     │
   │     - price:    precio (número)         │
   │     - category: tenis / deportes /      │
   │                 ropa / mascotas /       │
   │                 usados / ofertas /      │
   │                 accesorios              │
   │     - condition: "Nuevo" / "Seminuevo"  │
   │                  / "Usado"              │
   │     - image:    URL de la foto o ""     │
   │     - emoji:    emoji si no hay foto    │
   │     - desc:     descripción corta       │
   │     - featured: true si va en          │
   │                 destacados, false si no │
   │     - originalPrice: precio tachado     │
   │                 (opcional, pon 0 si no) │
   └─────────────────────────────────────────┘

   EJEMPLO DE PRODUCTO:
   {
     id: 99,
     name: "Mi producto",
     price: 350,
     category: "ropa",
     condition: "Nuevo",
     image: "https://url-de-mi-foto.jpg",
     emoji: "👕",
     desc: "Talla M, color negro",
     featured: false,
     originalPrice: 0
   },

   ============================================ */

/* ── 📦 BASE DE DATOS DE PRODUCTOS ──────────── */
/* ↓↓↓ AGREGA TUS PRODUCTOS AQUÍ ↓↓↓           */

const PRODUCTS = [

  /* ===== TENIS ===== */
  {
    id: 1,
    name: "Tenis Nike Air Max",
    price: 950,
    category: "tenis",
    condition: "Seminuevo",
    image: "",
    emoji: "👟",
    desc: "Talla 27, poco uso, en buen estado",
    featured: true,
    originalPrice: 1800
  },
  {
    id: 2,
    name: "Tenis Adidas Runfalcon",
    price: 620,
    category: "tenis",
    condition: "Nuevo",
    image: "",
    emoji: "👟",
    desc: "Talla 26.5, caja original",
    featured: false,
    originalPrice: 0
  },
  {
    id: 3,
    name: "Tenis Puma Casual",
    price: 480,
    category: "tenis",
    condition: "Usado",
    image: "",
    emoji: "👟",
    desc: "Talla 27, para salir y caminar",
    featured: false,
    originalPrice: 0
  },

  /* ===== DEPORTES ===== */
  {
    id: 4,
    name: "Guantes de Box Everlast",
    price: 350,
    category: "deportes",
    condition: "Seminuevo",
    image: "",
    emoji: "🥊",
    desc: "12 oz, buen estado, se limpian",
    featured: true,
    originalPrice: 700
  },
  {
    id: 5,
    name: "Mancuernas 5 kg par",
    price: 280,
    category: "deportes",
    condition: "Usado",
    image: "",
    emoji: "🏋️",
    desc: "Hierro macizo, sin daños",
    featured: false,
    originalPrice: 0
  },
  {
    id: 6,
    name: "Cuerda para saltar",
    price: 80,
    category: "deportes",
    condition: "Nuevo",
    image: "",
    emoji: "🪢",
    desc: "Profesional, con mangos de foam",
    featured: false,
    originalPrice: 0
  },
  {
    id: 7,
    name: "Rodilleras deportivas",
    price: 120,
    category: "deportes",
    condition: "Nuevo",
    image: "",
    emoji: "🦵",
    desc: "Par, talla única, ajustables",
    featured: false,
    originalPrice: 0
  },

  /* ===== ROPA ===== */
  {
    id: 8,
    name: "Sudadera hoodie negra",
    price: 320,
    category: "ropa",
    condition: "Nuevo",
    image: "",
    emoji: "🧥",
    desc: "Talla L, frisa por dentro",
    featured: true,
    originalPrice: 500
  },
  {
    id: 9,
    name: "Pants deportivo gris",
    price: 180,
    category: "ropa",
    condition: "Seminuevo",
    image: "",
    emoji: "👖",
    desc: "Talla M, cómodo para gym",
    featured: false,
    originalPrice: 0
  },

  /* ===== MASCOTAS ===== */
  {
    id: 10,
    name: "Arnés para perro mediano",
    price: 150,
    category: "mascotas",
    condition: "Nuevo",
    image: "",
    emoji: "🐕",
    desc: "Ajustable, colores variados",
    featured: false,
    originalPrice: 0
  },
  {
    id: 11,
    name: "Cama para mascota L",
    price: 220,
    category: "mascotas",
    condition: "Nuevo",
    image: "",
    emoji: "🛏️",
    desc: "Lavable, suave, 60x50 cm",
    featured: false,
    originalPrice: 350
  },

  /* ===== USADOS ===== */
  {
    id: 12,
    name: "Mochila escolar negra",
    price: 90,
    category: "usados",
    condition: "Usado",
    image: "",
    emoji: "🎒",
    desc: "Varias bolsas, cierre funcional",
    featured: false,
    originalPrice: 0
  },
  {
    id: 13,
    name: "Audífonos JBL T450",
    price: 250,
    category: "usados",
    condition: "Seminuevo",
    image: "",
    emoji: "🎧",
    desc: "Funcionan perfecto, sin cable",
    featured: true,
    originalPrice: 600
  },

  /* ===== OFERTAS ===== */
  {
    id: 14,
    name: "Combo box: guantes + vendas",
    price: 400,
    category: "ofertas",
    condition: "Nuevo",
    image: "",
    emoji: "📦",
    desc: "Kit completo para entrenar",
    featured: true,
    originalPrice: 650
  },
  {
    id: 15,
    name: "Tenis + calcetas pack",
    price: 750,
    category: "ofertas",
    condition: "Nuevo",
    image: "",
    emoji: "🛍️",
    desc: "Oferta especial del día",
    featured: false,
    originalPrice: 1050
  },

  /* ===== ACCESORIOS ===== */
  {
    id: 16,
    name: "Gorra snapback negra",
    price: 160,
    category: "accesorios",
    condition: "Nuevo",
    image: "",
    emoji: "🧢",
    desc: "Talla única, ajustable",
    featured: false,
    originalPrice: 0
  },
  {
    id: 17,
    name: "Cinturón de cuero café",
    price: 110,
    category: "accesorios",
    condition: "Seminuevo",
    image: "",
    emoji: "🪢",
    desc: "Talla 32-34, piel genuina",
    featured: false,
    originalPrice: 0
  }

  /* ↑↑↑ AGREGA MÁS PRODUCTOS AQUÍ ↑↑↑
     (copia el bloque {} y pega antes del ] )  */
];

/* ============================================
   CONFIGURACIÓN
   ============================================ */
const WA_NUMBER = "5581074978"; /* ← Tu número de WhatsApp */

/* ============================================
   ESTADO GLOBAL
   ============================================ */
let currentCategory = "todos";
let currentSearch    = "";

/* ============================================
   UTILIDADES
   ============================================ */
function formatPrice(n) {
  return "$" + n.toLocaleString("es-MX");
}

function badgeClass(condition) {
  if (condition === "Nuevo")     return "badge-nuevo";
  if (condition === "Seminuevo") return "badge-seminuevo";
  return "badge-usado";
}

function waLink(product) {
  const msg = encodeURIComponent(
    `Hola, vi tu catálogo y me interesa: *${product.name}* (${formatPrice(product.price)}) 🔥 ¿Sigue disponible?`
  );
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
}

/* ============================================
   RENDER DE TARJETA
   ============================================ */
function renderCard(product) {
  const hasFeaturedStar = product.featured
    ? `<span class="pc-featured-star">⭐</span>` : "";

  const imgHTML = product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />`
    : `<div class="pc-placeholder">${product.emoji}</div>`;

  const originalHTML = product.originalPrice > 0
    ? `<span class="pc-original">${formatPrice(product.originalPrice)}</span>` : "";

  return `
    <div class="product-card">
      <div class="pc-img-wrap">
        ${imgHTML}
        <span class="pc-badge ${badgeClass(product.condition)}">${product.condition}</span>
        ${hasFeaturedStar}
      </div>
      <div class="pc-info">
        <span class="pc-cat">${product.category}</span>
        <h3 class="pc-name">${product.name}</h3>
        <p class="pc-desc">${product.desc}</p>
        <div class="pc-price">
          ${formatPrice(product.price)}${originalHTML}
        </div>
      </div>
      <a href="${waLink(product)}" target="_blank" class="pc-wa-btn">
        💬 Preguntar por WhatsApp
      </a>
    </div>
  `;
}

/* ============================================
   FILTRAR PRODUCTOS
   ============================================ */
function getFiltered() {
  return PRODUCTS.filter(p => {
    const matchCat    = currentCategory === "todos" || p.category === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        p.desc.toLowerCase().includes(currentSearch.toLowerCase());
    return matchCat && matchSearch;
  });
}

/* ============================================
   RENDER SECCIONES
   ============================================ */
function renderCatalog() {
  const grid   = document.getElementById("productGrid");
  const empty  = document.getElementById("emptyState");
  const count  = document.getElementById("productCount");
  const filtered = getFiltered();

  count.textContent = `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML  = "";
    empty.style.display = "block";
  } else {
    grid.innerHTML       = filtered.map(renderCard).join("");
    empty.style.display  = "none";
  }
}

function renderFeatured() {
  const grid = document.getElementById("featuredGrid");
  const featured = PRODUCTS.filter(p => p.featured);
  grid.innerHTML = featured.map(renderCard).join("");
}

function renderRecent() {
  const grid = document.getElementById("recentGrid");
  /* Muestra los últimos 4 productos agregados (los últimos en el array) */
  const recent = [...PRODUCTS].slice(-4).reverse();
  grid.innerHTML = recent.map(renderCard).join("");
}

/* ============================================
   CATEGORÍAS — clic
   ============================================ */
function initCategories() {
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;

      /* Scroll al catálogo */
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
      renderCatalog();
    });
  });
}

/* ============================================
   BÚSQUEDA
   ============================================ */
function initSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    currentSearch = input.value.trim();
    /* Al buscar, resetea categoría */
    if (currentSearch !== "") {
      currentCategory = "todos";
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      document.querySelector('[data-cat="todos"]').classList.add("active");
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
    }
    renderCatalog();
  });
}

/* ============================================
   NAVBAR — scroll + hamburger
   ============================================ */
function initNavbar() {
  /* Scroll effect */
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("navbar");
    if (window.scrollY > 40) {
      nav.style.background = "rgba(10,10,10,.98)";
    } else {
      nav.style.background = "rgba(13,13,13,.92)";
    }
  });

  /* Hamburger toggle */
  const btn  = document.getElementById("hamburger");
  const menu = document.getElementById("mobileMenu");
  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  /* Cierra menú al hacer clic en un link */
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => menu.classList.remove("open"));
  });
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  renderFeatured();
  renderCatalog();
  renderRecent();
  initCategories();
  initSearch();
  initNavbar();
});
