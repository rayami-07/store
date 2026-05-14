/* ============================================
   RAYAMI STORE + ADMIN — script.js
   Firebase Realtime Database + Multi-foto
   ============================================ */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, remove, onValue, push }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ── Firebase config ── */
const firebaseConfig = {
  apiKey:            "AIzaSyDDVxmRmKb9yIZSV0ZxkPKvQPOK-oAGMWU",
  authDomain:        "rayami-store.firebaseapp.com",
  databaseURL:       "https://rayami-store-default-rtdb.firebaseio.com",
  projectId:         "rayami-store",
  storageBucket:     "rayami-store.firebasestorage.app",
  messagingSenderId: "57542479161",
  appId:             "1:57542479161:web:425e75300b964e1f526ce8",
};
const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* ── Configuración ── */
const ADMIN_USER = "rayami";
const ADMIN_PASS = "rayami2025";
const WA_NUMBER  = "5581074978";
const MAX_PHOTOS = 5;

/* ── Estado global ── */
let currentCategory = "todos";
let currentSearch   = "";
let editingId       = null;   // fbKey del producto en edición
let deletingId      = null;
let currentPhotoTab = "url";
let currentPhotos   = [];     // array de fotos del formulario (URLs o base64)
let isLoggedIn      = false;
let allProducts     = [];
let cart            = [];   // [{fbKey, name, price, qty}]

/* ============================================
   FIREBASE
============================================================ */
function initFirebase() {
  onValue(ref(db, "products"), (snapshot) => {
    const data = snapshot.val();
    allProducts = data
      ? Object.entries(data).map(([fbKey, p]) => ({ ...p, fbKey }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];
    renderAll();
    if (isLoggedIn) { renderAdminTable(); renderAdminStats(); }
  });
}

/* Ticker global — actualiza contadores cada segundo */
function startCountdownTicker() {
  setInterval(() => {
    allProducts.forEach(p => {
      if (!p.promoEnd || p.promoEnd === 0) return;
      const cdEl = document.getElementById(`cd-${p.fbKey || p.createdAt}`);
      if (!cdEl) return;

      const diff = p.promoEnd - Date.now();
      if (diff <= 0) {
        cdEl.innerHTML = `<span class="pc-countdown-expired">Promoción finalizada</span>`;
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const pad  = n => String(n).padStart(2,"0");

      const d = cdEl.querySelector(".cd-d"); if(d) d.textContent = days;
      const h = cdEl.querySelector(".cd-h"); if(h) h.textContent = pad(hrs);
      const m = cdEl.querySelector(".cd-m"); if(m) m.textContent = pad(mins);
      const s = cdEl.querySelector(".cd-s"); if(s) s.textContent = pad(secs);
    });
  }, 1000);
}

async function fbSave(product) {
  const { fbKey, ...data } = product;
  if (fbKey) {
    await set(ref(db, `products/${fbKey}`), data);
  } else {
    await push(ref(db, "products"), data);
  }
}

async function fbDelete(fbKey) {
  await remove(ref(db, `products/${fbKey}`));
}

/* ============================================
   UTILIDADES
============================================================ */
function formatPrice(n) {
  return "$" + Number(n).toLocaleString("es-MX");
}
function badgeClass(c) {
  return c === "Nuevo" ? "badge-nuevo" : c === "Seminuevo" ? "badge-seminuevo" : "badge-usado";
}
function waLink(p) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Hola, vi tu catálogo y me interesa: *${p.name}* (${formatPrice(p.price)}) 🔥 ¿Sigue disponible?`
  )}`;
}
function showToast(msg, ms = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), ms);
}

/* ============================================
   CARRUSEL — render
============================================================ */
function carouselHTML(photos, productId) {
  if (!photos || photos.length === 0) return "";
  if (photos.length === 1) {
    return `<img src="${photos[0]}" alt="foto" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`;
  }
  const imgs  = photos.map(src => `<img src="${src}" alt="foto" loading="lazy" />`).join("");
  const dots  = photos.map((_, i) =>
    `<button class="pc-carousel-dot${i===0?" active":""}" onclick="carouselGo('${productId}',${i})"></button>`
  ).join("");
  return `
    <div class="pc-carousel" id="car-${productId}">
      <div class="pc-carousel-track" id="car-track-${productId}">${imgs}</div>
      <button class="pc-carousel-btn prev" onclick="carouselPrev('${productId}')">‹</button>
      <button class="pc-carousel-btn next" onclick="carouselNext('${productId}')">›</button>
      <div class="pc-carousel-dots">${dots}</div>
    </div>`;
}

function carouselMove(id, index) {
  const track = document.getElementById(`car-track-${id}`);
  const dots  = document.querySelectorAll(`#car-${id} .pc-carousel-dot`);
  if (!track) return;
  const total = track.children.length;
  index = (index + total) % total;
  track.style.transform = `translateX(-${index * 100}%)`;
  track.dataset.index = index;
  dots.forEach((d, i) => d.classList.toggle("active", i === index));
}

window.carouselNext = (id) => {
  const track = document.getElementById(`car-track-${id}`);
  carouselMove(id, parseInt(track?.dataset.index || 0) + 1);
};
window.carouselPrev = (id) => {
  const track = document.getElementById(`car-track-${id}`);
  carouselMove(id, parseInt(track?.dataset.index || 0) - 1);
};
window.carouselGo = (id, i) => carouselMove(id, i);

/* ============================================
   RENDER TARJETA CLIENTE
============================================================ */
function renderCard(product) {
  const photos  = product.photos && product.photos.length ? product.photos
                : product.image ? [product.image] : [];
  const carId   = product.fbKey || String(product.createdAt);
  const imgArea = photos.length
    ? carouselHTML(photos, carId)
    : `<div class="pc-placeholder">${product.emoji || "📦"}</div>`;

  const star     = product.featured ? `<span class="pc-featured-star">⭐</span>` : "";
  const original = product.originalPrice > 0
    ? `<span class="pc-original">${formatPrice(product.originalPrice)}</span>` : "";

  const e = product.extras || {};
  const tags = [
    e.marca    ? `<span class="pc-tag">${e.marca}</span>`       : "",
    e.talla    ? `<span class="pc-tag">Talla ${e.talla}</span>` : "",
    e.color    ? `<span class="pc-tag">${e.color}</span>`       : "",
    e.peso     ? `<span class="pc-tag">${e.peso}</span>`        : "",
    e.genero   ? `<span class="pc-tag">${e.genero}</span>`      : "",
    e.material ? `<span class="pc-tag">${e.material}</span>`    : "",
    e.mascota  ? `<span class="pc-tag">🐾 ${e.mascota}</span>`  : "",
  ].filter(Boolean).join("");

  // Precio: si hay salePrice se muestra tachado el normal y destacado el de oferta
  const now = Date.now();
  const promoActive = product.salePrice > 0 &&
    (!product.promoEnd || product.promoEnd === 0 || product.promoEnd > now);
  const hasOffer = promoActive && product.salePrice < product.price;

  // Countdown HTML
  let countdownHTML = "";
  if (hasOffer && product.promoEnd > 0) {
    const carId2 = product.fbKey || String(product.createdAt);
    countdownHTML = `<div class="pc-countdown" id="cd-${carId2}">
      <span class="pc-countdown-label">⏳ Termina en:</span>
      <div class="pc-countdown-blocks">
        <div class="pc-cd-block"><span class="pc-cd-num cd-d">0</span><span class="pc-cd-unit">días</span></div>
        <div class="pc-cd-block"><span class="pc-cd-num cd-h">00</span><span class="pc-cd-unit">hrs</span></div>
        <div class="pc-cd-block"><span class="pc-cd-num cd-m">00</span><span class="pc-cd-unit">min</span></div>
        <div class="pc-cd-block"><span class="pc-cd-num cd-s">00</span><span class="pc-cd-unit">seg</span></div>
      </div>
    </div>`;
  }

  const priceHTML = hasOffer
    ? `<div class="pc-price">
         <span class="pc-sale-price">${formatPrice(product.salePrice)}</span>
         <span class="pc-original">${formatPrice(product.price)}</span>
         <span class="pc-offer-badge">OFERTA</span>
       </div>${countdownHTML}`
    : `<div class="pc-price">${formatPrice(product.price)}${
        product.originalPrice > 0 ? `<span class="pc-original">${formatPrice(product.originalPrice)}</span>` : ""
      }</div>`;

  return `
    <div class="product-card" id="card-${carId}">
      <div class="pc-img-wrap">
        ${imgArea}
        <span class="pc-badge ${badgeClass(product.condition)}">${product.condition}</span>
        ${star}
        ${hasOffer ? `<span class="pc-offer-ribbon">🔥 OFERTA</span>` : ""}
      </div>
      <div class="pc-info">
        <span class="pc-cat">${product.category}</span>
        <h3 class="pc-name">${product.name}</h3>
        ${tags ? `<div class="pc-tags">${tags}</div>` : ""}
        <p class="pc-desc">${product.desc || ""}</p>
        ${priceHTML}
      </div>
      <button class="pc-cart-btn" id="cartbtn-${carId}" onclick="toggleCart('${carId}')">
        🛒 Agregar al carrito
      </button>
      <a href="${waLink(product)}" target="_blank" class="pc-wa-btn-sm">💬 Preguntar solo este</a>
      <div class="pc-share-row">
        <button class="pc-share-btn" onclick="copyProductLink('${carId}')">🔗 Copiar link</button>
        <button class="pc-share-btn" onclick="shareProduct('${carId}')">📤 Compartir</button>
      </div>
    </div>`;
}

/* ============================================
   RENDER SECCIONES CLIENTE
============================================================ */
function getFiltered() {
  return allProducts.filter(p => {
    if (p.sold) return false;  // ocultar vendidos al público
    const matchCat = currentCategory === "todos" || p.category === currentCategory;
    const q = currentSearch.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || (p.desc||"").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function renderCatalog() {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("productCount");
  const filtered = getFiltered();
  count.textContent = `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`;
  if (filtered.length === 0) { grid.innerHTML = ""; empty.style.display = "block"; }
  else { grid.innerHTML = filtered.map(renderCard).join(""); empty.style.display = "none"; }
}

function renderFeatured() {
  const grid = document.getElementById("featuredGrid");
  const emptyEl = document.getElementById("emptyFeatured");
  const featured = allProducts.filter(p => p.featured);
  if (featured.length === 0) { grid.innerHTML = ""; emptyEl.style.display = "block"; }
  else { grid.innerHTML = featured.map(renderCard).join(""); emptyEl.style.display = "none"; }
}

function renderAll() { renderFeatured(); renderCatalog(); }

/* ============================================
   CATEGORÍAS + BÚSQUEDA + NAVBAR
============================================================ */
function initCategories() {
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      document.getElementById("catalogo").scrollIntoView({ behavior:"smooth" });
      renderCatalog();
    });
  });
}

function initSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    if (currentSearch) {
      currentCategory = "todos";
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      document.querySelector('[data-cat="todos"]').classList.add("active");
      document.getElementById("catalogo").scrollIntoView({ behavior:"smooth" });
    }
    renderCatalog();
  });
}

function initNavbar() {
  window.addEventListener("scroll", () => {
    document.getElementById("navbar").style.background =
      window.scrollY > 40 ? "rgba(10,10,10,.98)" : "rgba(13,13,13,.92)";
  });
  const btn = document.getElementById("hamburger");
  const menu = document.getElementById("mobileMenu");
  btn.addEventListener("click", () => menu.classList.toggle("open"));
  menu.querySelectorAll("a, button").forEach(l => l.addEventListener("click", () => menu.classList.remove("open")));
}

/* ============================================
   LOGIN
============================================================ */
function showLogin() {
  document.getElementById("loginModal").classList.add("open");
  ["loginUser","loginPass"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("loginError").textContent = "";
  setTimeout(() => document.getElementById("loginUser").focus(), 100);
}
function hideLogin() { document.getElementById("loginModal").classList.remove("open"); }

function doLogin() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    isLoggedIn = true; hideLogin(); showAdmin();
  } else {
    document.getElementById("loginError").textContent = "⚠️ Usuario o contraseña incorrectos";
    document.getElementById("loginPass").value = "";
    document.getElementById("loginPass").focus();
  }
}

function doLogout() {
  isLoggedIn = false;
  document.getElementById("adminView").style.display = "none";
  document.getElementById("clientView").style.display = "block";
  renderAll();
  showToast("✅ Sesión cerrada");
}

/* ============================================
   PANEL ADMIN
============================================================ */
function showAdmin() {
  document.getElementById("clientView").style.display = "none";
  document.getElementById("adminView").style.display = "block";
  renderAdminTable(); renderAdminStats();
}

function renderAdminStats() {
  document.getElementById("statTotal").textContent    = allProducts.length;
  document.getElementById("statFeatured").textContent = allProducts.filter(p => p.featured).length;
  document.getElementById("statNuevo").textContent    = allProducts.filter(p => p.condition === "Nuevo" && !p.sold).length;
  document.getElementById("statUsado").textContent    = allProducts.filter(p => p.sold).length;
  // Cambiar label de último stat
  document.querySelector("#statUsado + .stat-label").textContent = "Vendidos";
}

function renderAdminTable() {
  const tbody = document.getElementById("adminTableBody");
  const empty = document.getElementById("adminEmpty");
  const q = (document.getElementById("adminSearch")?.value || "").toLowerCase();
  const list = allProducts.filter(p => p.name.toLowerCase().includes(q) || (p.category||"").includes(q));

  if (list.length === 0) { tbody.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = list.map(p => {
    const photos = p.photos?.length ? p.photos : p.image ? [p.image] : [];
    const thumb  = photos.length
      ? `<img class="admin-thumb" src="${photos[0]}" alt="${p.name}" />`
      : `<div class="admin-thumb-placeholder">${p.emoji || "📦"}</div>`;
    const photoCount = photos.length > 1 ? `<span class="admin-photo-count">${photos.length}📷</span>` : "";
    const soldBadge  = p.sold ? `<span class="admin-sold-badge">VENDIDO</span>` : "";
    const offerBadge = p.salePrice > 0 ? `<span class="admin-offer-badge">🔥 $${p.salePrice}</span>` : "";
    return `
      <tr class="${p.sold ? "row-sold" : ""}">
        <td style="position:relative">${thumb}${photoCount}</td>
        <td><span class="admin-product-name">${p.name}</span> ${soldBadge} ${offerBadge}</td>
        <td><span class="admin-cat-badge">${p.category}</span></td>
        <td>${p.condition}</td>
        <td><span class="admin-price">${formatPrice(p.price)}</span></td>
        <td>${p.featured ? "⭐" : "—"}</td>
        <td>
          <div class="admin-actions">
            <button class="btn-edit" onclick="openEditModal('${p.fbKey}')">✏️ Editar</button>
            <button class="btn-delete" onclick="openDeleteModal('${p.fbKey}')">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

/* ============================================
   GALERÍA DE FOTOS — admin form
============================================================ */
function renderPhotosGallery() {
  const gallery = document.getElementById("photosGallery");
  const hint    = document.getElementById("photoCountHint");

  if (currentPhotos.length === 0) {
    gallery.innerHTML = "";
    hint.style.display = "none";
    return;
  }

  hint.style.display = "block";
  hint.textContent = `${currentPhotos.length}/${MAX_PHOTOS} fotos · La primera es la principal`;

  gallery.innerHTML = currentPhotos.map((src, i) => `
    <div class="photo-thumb-wrap">
      <img src="${src}" alt="foto ${i+1}" />
      ${i === 0 ? `<span class="photo-main-badge">Principal</span>` : ""}
      <span class="photo-thumb-remove" onclick="removePhotoAt(${i})">✕</span>
    </div>
  `).join("");
}

function addPhotoFromUrl() {
  const url = document.getElementById("pImageUrl").value.trim();
  if (!url) { showToast("⚠️ Pega una URL primero"); return; }
  if (currentPhotos.length >= MAX_PHOTOS) { showToast(`⚠️ Máximo ${MAX_PHOTOS} fotos`); return; }
  if (currentPhotos.includes(url)) { showToast("⚠️ Esa foto ya está agregada"); return; }
  currentPhotos.push(url);
  document.getElementById("pImageUrl").value = "";
  renderPhotosGallery();
  showToast("✅ Foto agregada");
}

window.removePhotoAt = function(i) {
  currentPhotos.splice(i, 1);
  renderPhotosGallery();
};

function compressAndAdd(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
}

async function processFiles(files) {
  const remaining = MAX_PHOTOS - currentPhotos.length;
  if (remaining <= 0) { showToast(`⚠️ Ya tienes ${MAX_PHOTOS} fotos`); return; }
  const toProcess = files.slice(0, remaining);
  showToast(`⏳ Procesando ${toProcess.length} imagen${toProcess.length > 1 ? "es" : ""}...`);
  for (const file of toProcess) {
    if (!file.type.startsWith("image/")) continue;
    const b64 = await compressAndAdd(file);
    currentPhotos.push(b64);
  }
  renderPhotosGallery();
  showToast(`✅ ${toProcess.length} foto${toProcess.length > 1 ? "s" : ""} agregada${toProcess.length > 1 ? "s" : ""}`);
  document.getElementById("fileDropText").textContent = "📁 Toca aquí o arrastra más imágenes";
}

/* ============================================
   FOTO — tabs
============================================================ */
function switchPhotoTab(tab) {
  currentPhotoTab = tab;
  document.getElementById("photoTabUrl").style.display  = tab === "url"  ? "block" : "none";
  document.getElementById("photoTabFile").style.display = tab === "file" ? "block" : "none";
  document.getElementById("tabBtnUrl").classList.toggle("active",  tab === "url");
  document.getElementById("tabBtnFile").classList.toggle("active", tab === "file");
}

function triggerFileInput() { document.getElementById("pImageFile").click(); }

/* ============================================
   CAMPOS EXTRA
============================================================ */
const EXTRA_BY_CAT = {
  tenis:     ["fieldTalla","fieldColor","fieldMarca","fieldGenero"],
  ropa:      ["fieldTalla","fieldColor","fieldMarca","fieldGenero"],
  deportes:  ["fieldMarca","fieldPeso","fieldColor","fieldMaterial"],
  mascotas:  ["fieldMascota","fieldColor","fieldMarca"],
  usados:    ["fieldMarca","fieldColor","fieldTalla"],
  ofertas:   ["fieldMarca","fieldColor","fieldTalla"],
  accesorios:["fieldMarca","fieldColor","fieldMaterial"],
};
const ALL_EXTRA = ["fieldTalla","fieldColor","fieldMarca","fieldPeso","fieldGenero","fieldMaterial","fieldMascota"];

function updateExtraFields(cat) {
  const show = EXTRA_BY_CAT[cat] || [];
  ALL_EXTRA.forEach(f => { const el = document.getElementById(f); if(el) el.style.display="none"; });
  const container = document.getElementById("extraFields");
  container.style.display = show.length ? "block" : "none";
  show.forEach(f => { const el = document.getElementById(f); if(el) el.style.display="flex"; });
}

/* ============================================
   MODAL PRODUCTO
============================================================ */
function openProductModal(fbKey = null) {
  editingId = fbKey;
  currentPhotos = [];

  // Reset form
  ["pName","pPrice","pOriginalPrice","pEmoji","pDesc","pImageUrl","pSalePrice","pPromoEnd"].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = "";
  });
  document.getElementById("pCategory").value  = "deportes";
  document.getElementById("pCondition").value = "Nuevo";
  document.getElementById("pFeatured").value  = "false";
  document.getElementById("pSold").value      = "false";
  switchPhotoTab("url");
  renderPhotosGallery();

  document.getElementById("pCategory").onchange = () =>
    updateExtraFields(document.getElementById("pCategory").value);

  const extraInputs = ["pTalla","pColor","pMarca","pPeso","pGenero","pMaterial","pMascota"];
  extraInputs.forEach(id => { const el = document.getElementById(id); if(el) el.value=""; });

  const title = document.getElementById("productModalTitle");

  if (fbKey) {
    title.textContent = "Editar producto";
    const p = allProducts.find(x => x.fbKey === fbKey);
    if (p) {
      document.getElementById("pName").value          = p.name;
      document.getElementById("pPrice").value         = p.price;
      document.getElementById("pOriginalPrice").value = p.originalPrice || "";
      document.getElementById("pSalePrice").value     = p.salePrice || "";
      document.getElementById("pSold").value          = p.sold ? "true" : "false";
      // Cargar fecha de promo (datetime-local necesita formato YYYY-MM-DDTHH:MM)
      if (p.promoEnd) {
        const d = new Date(p.promoEnd);
        const pad = n => String(n).padStart(2,"0");
        document.getElementById("pPromoEnd").value =
          `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      document.getElementById("pCategory").value      = p.category;
      document.getElementById("pCondition").value     = p.condition;
      document.getElementById("pEmoji").value         = p.emoji || "";
      document.getElementById("pFeatured").value      = p.featured ? "true" : "false";
      document.getElementById("pDesc").value          = p.desc || "";

      // Cargar fotos existentes
      currentPhotos = p.photos?.length ? [...p.photos] : p.image ? [p.image] : [];
      renderPhotosGallery();

      if (p.extras) {
        const map = {pTalla:"talla",pColor:"color",pMarca:"marca",pPeso:"peso",pGenero:"genero",pMaterial:"material",pMascota:"mascota"};
        Object.entries(map).forEach(([elId, key]) => {
          const el = document.getElementById(elId);
          if (el && p.extras[key]) el.value = p.extras[key];
        });
      }
      updateExtraFields(p.category);
    }
  } else {
    title.textContent = "Agregar producto";
    updateExtraFields("deportes");
  }

  document.getElementById("productModal").classList.add("open");
}

function openEditModal(fbKey) { openProductModal(fbKey); }
function closeProductModal() {
  document.getElementById("productModal").classList.remove("open");
  editingId = null; currentPhotos = [];
}

/* ============================================
   GUARDAR PRODUCTO
============================================================ */
async function saveProduct() {
  const name  = document.getElementById("pName").value.trim();
  const price = parseFloat(document.getElementById("pPrice").value);
  if (!name)                      { showToast("⚠️ Escribe el nombre"); return; }
  if (isNaN(price) || price < 0) { showToast("⚠️ Precio inválido"); return; }

  const productData = {
    name, price,
    originalPrice: parseFloat(document.getElementById("pOriginalPrice").value) || 0,
    salePrice:     parseFloat(document.getElementById("pSalePrice").value) || 0,
    promoEnd:      document.getElementById("pPromoEnd").value
                     ? new Date(document.getElementById("pPromoEnd").value).getTime()
                     : 0,
    sold:          document.getElementById("pSold").value === "true",
    category:  document.getElementById("pCategory").value,
    condition: document.getElementById("pCondition").value,
    emoji:     document.getElementById("pEmoji").value.trim() || "📦",
    featured:  document.getElementById("pFeatured").value === "true",
    desc:      document.getElementById("pDesc").value.trim(),
    photos:    currentPhotos,
    image:     currentPhotos[0] || "",   // compatibilidad
    extras: {
      talla:    document.getElementById("pTalla")?.value.trim()    || "",
      color:    document.getElementById("pColor")?.value.trim()    || "",
      marca:    document.getElementById("pMarca")?.value.trim()    || "",
      peso:     document.getElementById("pPeso")?.value.trim()     || "",
      genero:   document.getElementById("pGenero")?.value          || "",
      material: document.getElementById("pMaterial")?.value.trim() || "",
      mascota:  document.getElementById("pMascota")?.value.trim()  || "",
    },
    createdAt: editingId
      ? (allProducts.find(p => p.fbKey === editingId)?.createdAt || Date.now())
      : Date.now()
  };

  if (editingId) productData.fbKey = editingId;

  showToast("⏳ Guardando...");
  try {
    await fbSave(productData);
    showToast(editingId ? "✅ Producto actualizado" : "✅ Producto agregado");
    closeProductModal();
  } catch(err) {
    showToast("❌ Error al guardar"); console.error(err);
  }
}

/* ============================================
   CARRITO
============================================================ */
window.toggleCart = function(fbKey) {
  const inCart = cart.findIndex(i => i.fbKey === fbKey);
  const product = allProducts.find(p => p.fbKey === fbKey);
  if (!product) return;

  if (inCart >= 0) {
    cart.splice(inCart, 1);
    showToast("❌ Quitado del carrito");
  } else {
    const finalPrice = product.salePrice > 0 &&
      (!product.promoEnd || product.promoEnd > Date.now())
      ? product.salePrice : product.price;
    cart.push({ fbKey, name: product.name, price: finalPrice, qty: 1 });
    showToast("✅ Agregado al carrito");
  }

  updateCartBtn(fbKey);
  renderCartBadge();
  renderCartDrawer();
};

function updateCartBtn(fbKey) {
  const btn = document.getElementById(`cartbtn-${fbKey}`);
  if (!btn) return;
  const inCart = cart.some(i => i.fbKey === fbKey);
  btn.textContent = inCart ? "✅ En el carrito" : "🛒 Agregar al carrito";
  btn.classList.toggle("pc-cart-btn-active", inCart);
}

function renderCartBadge() {
  const badge = document.getElementById("cartBadge");
  const fab   = document.getElementById("cartFab");
  const fabCount = document.getElementById("cartFabCount");
  const total = cart.reduce((s, i) => s + i.qty, 0);
  if (badge) { badge.textContent = total; badge.style.display = total > 0 ? "flex" : "none"; }
  if (fab)   { fab.style.display = total > 0 ? "flex" : "none"; }
  if (fabCount) { fabCount.textContent = total; }
}

function renderCartDrawer() {
  const list  = document.getElementById("cartList");
  const total = document.getElementById("cartTotal");
  const empty = document.getElementById("cartEmpty");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    total.style.display = "none";
    return;
  }
  empty.style.display = "none";
  total.style.display = "block";

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty('${item.fbKey}',-1)">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty('${item.fbKey}',1)">+</button>
        <button class="cart-item-remove" onclick="removeFromCart('${item.fbKey}')">🗑</button>
      </div>
    </div>
  `).join("");

  const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
  total.innerHTML = `<span>Total estimado:</span><span class="cart-total-amount">${formatPrice(sum)}</span>`;
}

window.changeQty = function(fbKey, delta) {
  const item = cart.find(i => i.fbKey === fbKey);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCartDrawer();
  renderCartBadge();
};

window.removeFromCart = function(fbKey) {
  cart = cart.filter(i => i.fbKey !== fbKey);
  updateCartBtn(fbKey);
  renderCartDrawer();
  renderCartBadge();
};

window.openCart  = function() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  renderCartDrawer();
};
window.closeCart = function() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
};

window.sendCartWA = function() {
  if (cart.length === 0) return;
  const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const lines = cart.map(i =>
    `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`
  ).join("\n");
  const msg = `Hola! 👋 Me interesan estos productos de RAYAMI STORE:\n\n${lines}\n\n💰 *Total estimado: ${formatPrice(sum)}*\n\n¿Siguen disponibles? 🔥`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
};

window.clearCart = function() {
  cart = [];
  // Resetear botones
  allProducts.forEach(p => updateCartBtn(p.fbKey));
  renderCartBadge();
  renderCartDrawer();
  showToast("🗑 Carrito vaciado");
};


function getProductUrl(fbKey) {
  return `${location.origin}${location.pathname}#p-${fbKey}`;
}

window.copyProductLink = function(fbKey) {
  const url = getProductUrl(fbKey);
  navigator.clipboard.writeText(url).then(() => {
    showToast("✅ Link copiado al portapapeles");
  }).catch(() => {
    // Fallback para navegadores sin clipboard API
    const el = document.createElement("textarea");
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast("✅ Link copiado");
  });
};

window.shareProduct = function(fbKey) {
  const product = allProducts.find(p => p.fbKey === fbKey);
  if (!product) return;
  const url  = getProductUrl(fbKey);
  const text = `🔥 *${product.name}*\n💰 ${formatPrice(product.price)}\n📦 Estado: ${product.condition}\n\nVer producto → ${url}`;

  if (navigator.share) {
    navigator.share({ title: product.name, text, url })
      .catch(() => {});
  } else {
    // Fallback: abrir WhatsApp con el texto
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
};

/* Abrir producto directo si viene con #p-fbKey en la URL */
function checkDeepLink() {
  const hash = location.hash;
  if (!hash.startsWith("#p-")) return;
  const fbKey = hash.replace("#p-", "");

  // Esperar a que los productos carguen de Firebase
  const tryScroll = setInterval(() => {
    const product = allProducts.find(p => p.fbKey === fbKey);
    if (!product) return;
    clearInterval(tryScroll);

    // Scroll al catálogo y resaltar la tarjeta
    document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      // Buscar la tarjeta por el carrusel id o imagen
      const cards = document.querySelectorAll(".product-card");
      cards.forEach(card => {
        const carEl = card.querySelector(`#car-${fbKey}, [id*="${fbKey}"]`);
        if (carEl || card.querySelector(`img[src="${product.image || ""}"]`)) {
          card.classList.add("pc-highlight");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => card.classList.remove("pc-highlight"), 3000);
        }
      });
    }, 600);
  }, 300);

  // Timeout de seguridad
  setTimeout(() => clearInterval(tryScroll), 5000);
}


function openDeleteModal(fbKey) {
  deletingId = fbKey;
  const p = allProducts.find(x => x.fbKey === fbKey);
  document.getElementById("deleteProductName").textContent = p?.name || "";
  document.getElementById("deleteModal").classList.add("open");
}
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deletingId = null;
}
async function confirmDelete() {
  if (!deletingId) return;
  try { await fbDelete(deletingId); showToast("🗑 Producto eliminado"); }
  catch(err) { showToast("❌ Error al eliminar"); console.error(err); }
  closeDeleteModal();
}

/* ============================================
   CERRAR MODALS AL CLICK FUERA
============================================================ */
document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("modal-overlay")) return;
  e.target.classList.remove("open");
  if (e.target.id === "deleteModal")  deletingId = null;
  if (e.target.id === "productModal") { editingId = null; currentPhotos = []; }
});

/* ============================================
   DRAG & DROP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const drop = document.getElementById("fileDrop");
  if (!drop) return;
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.style.borderColor="var(--accent)"; });
  drop.addEventListener("dragleave", () => { drop.style.borderColor=""; });
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.style.borderColor="";
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length) processFiles(files);
    else showToast("⚠️ Solo imágenes");
  });
});

/* ============================================
   EXPONER GLOBALES
============================================================ */
window.showLogin         = showLogin;
window.hideLogin         = hideLogin;
window.doLogin           = doLogin;
window.doLogout          = doLogout;
window.openProductModal  = openProductModal;
window.openEditModal     = openEditModal;
window.closeProductModal = closeProductModal;
window.openDeleteModal   = openDeleteModal;
window.closeDeleteModal  = closeDeleteModal;
window.confirmDelete     = confirmDelete;
window.saveProduct       = saveProduct;
window.switchPhotoTab    = switchPhotoTab;
window.triggerFileInput  = triggerFileInput;
window.handleFileSelect  = handleFileSelect;
window.addPhotoFromUrl   = addPhotoFromUrl;
window.renderAdminTable  = renderAdminTable;

/* ============================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  startCountdownTicker();
  initCategories();
  initSearch();
  initNavbar();
  checkDeepLink();
});
