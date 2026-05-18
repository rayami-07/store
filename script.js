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
const ADMIN_USER  = "rayami";
const ADMIN_PASS  = "rayami2025";
const WA_NUMBER   = "5581074978";
const IMGBB_KEY   = "0a9c6567b28ac96fca0fa0d3a74f1741";

/* ── LOGO — pega aquí tu URL de ImgBB cuando la tengas ── */
const LOGO_URL = "https://i.ibb.co/LXPfzxZb/logo.jpg";

function applyLogo() {
  if (!LOGO_URL) return;
  ["navLogoImg","heroLogoImg","footerLogoImg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = LOGO_URL;
  });
}
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
let cart            = [];
let currentSeller   = null;  // vendedor logueado
let sellerProducts  = [];    // productos del vendedor actual
let allSellers      = [];    // todos los vendedores (solo admin)

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
  // Cargar vendedores para admin
  listenAllSellers(() => {
    if (isLoggedIn) renderAdminSellers();
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

/* ── Seller Firebase ops ── */
async function fbRegisterSeller(data) {
  return await push(ref(db, "sellers"), data);
}
async function fbUpdateSeller(fbKey, data) {
  await set(ref(db, `sellers/${fbKey}`), data);
}
async function fbSaveSellerProduct(data) {
  if (data.fbKey) {
    const { fbKey, ...d } = data;
    await set(ref(db, `sellerProducts/${fbKey}`), d);
  } else {
    await push(ref(db, "sellerProducts"), data);
  }
}
async function fbDeleteSellerProduct(fbKey) {
  await remove(ref(db, `sellerProducts/${fbKey}`));
}
function listenSellerProducts(sellerFbKey, callback) {
  onValue(ref(db, "sellerProducts"), snap => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([k,v]) => ({...v, fbKey: k}))
      .filter(p => p.sellerKey === sellerFbKey);
    callback(list);
  });
}
function listenAllSellerProducts(callback) {
  onValue(ref(db, "sellerProducts"), snap => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([k,v]) => ({...v, fbKey: k})));
  });
}
function listenAllSellers(callback) {
  onValue(ref(db, "sellers"), snap => {
    const data = snap.val() || {};
    allSellers = Object.entries(data).map(([k,v]) => ({...v, fbKey: k}));
    callback(allSellers);
  });
}


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
      <a href="${waLink(product)}" target="_blank" class="pc-wa-btn">💬 Preguntar por WhatsApp</a>
      <div class="pc-share-row">
        <button class="pc-cart-btn-sm ${cart.some(i=>i.fbKey===carId)?"pc-cart-btn-active":""}" id="cartbtn-${carId}" onclick="toggleCart('${carId}')">
          ${cart.some(i=>i.fbKey===carId) ? "✅ En carrito" : "🛒 Al carrito"}
        </button>
        <button class="pc-share-btn" onclick="copyProductLink('${carId}')">🔗</button>
        <button class="pc-share-btn" onclick="shareProduct('${carId}')">📤</button>
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

/* Subir imagen a ImgBB y devolver URL */
async function uploadToImgBB(file) {
  // Primero comprimir para que suba más rápido
  const compressed = await compressFile(file);

  const formData = new FormData();
  formData.append("image", compressed.split(",")[1]); // base64 sin el prefijo

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    return data.data.url; // URL directa de la imagen
  } else {
    throw new Error("ImgBB error: " + JSON.stringify(data));
  }
}

/* Comprimir imagen localmente antes de subir */
function compressFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressAndAdd(file) {
  return new Promise((resolve) => resolve()); // legacy, no usar
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
}

async function processFiles(files) {
  const remaining = MAX_PHOTOS - currentPhotos.length;
  if (remaining <= 0) { showToast(`⚠️ Ya tienes ${MAX_PHOTOS} fotos`); return; }
  const toProcess = files.slice(0, remaining).filter(f => f.type.startsWith("image/"));
  if (!toProcess.length) { showToast("⚠️ Solo se aceptan imágenes"); return; }

  document.getElementById("fileDropText").textContent = `⏳ Subiendo ${toProcess.length} foto${toProcess.length > 1 ? "s" : ""} a ImgBB...`;
  showToast(`⏳ Subiendo ${toProcess.length} foto${toProcess.length > 1 ? "s" : ""}...`);

  let subidas = 0;
  for (const file of toProcess) {
    try {
      const url = await uploadToImgBB(file);
      currentPhotos.push(url);
      subidas++;
      showToast(`✅ ${subidas}/${toProcess.length} subida${subidas > 1 ? "s" : ""}...`);
    } catch(err) {
      console.error("Error subiendo foto:", err);
      showToast("❌ Error al subir una foto. Intenta de nuevo.");
    }
  }

  renderPhotosGallery();
  document.getElementById("fileDropText").textContent = "📁 Toca aquí o arrastra más imágenes";
  showToast(`✅ ${subidas} foto${subidas > 1 ? "s" : ""} subida${subidas > 1 ? "s" : ""} correctamente 🔥`);
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
  btn.textContent = inCart ? "✅ En carrito" : "🛒 Al carrito";
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
  const list      = document.getElementById("cartList");
  const totalRow  = document.getElementById("cartTotalRow");
  const totalAmt  = document.getElementById("cartTotalAmount");
  const orderBtn  = document.getElementById("cartOrderBtn");
  const clearBtn  = document.getElementById("cartClearBtn");
  const empty     = document.getElementById("cartEmpty");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML      = "";
    empty.style.display = "block";
    totalRow.style.display = "none";
    orderBtn.style.display = "none";
    clearBtn.style.display = "none";
    return;
  }

  empty.style.display    = "none";
  totalRow.style.display = "flex";
  orderBtn.style.display = "block";
  clearBtn.style.display = "block";

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
  totalAmt.textContent = formatPrice(sum);
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

/* ============================================
   MIGRAR FOTOS BASE64 → IMGBB
============================================================ */
window.migrateAllPhotos = async function() {
  const base64Products = allProducts.filter(p => {
    const photos = p.photos?.length ? p.photos : p.image ? [p.image] : [];
    return photos.some(ph => ph.startsWith("data:"));
  });

  if (base64Products.length === 0) {
    showToast("✅ Todas las fotos ya están en ImgBB");
    return;
  }

  const btn = document.getElementById("btnMigrate");
  btn.disabled = true;
  btn.textContent = `⏳ Migrando 0/${base64Products.length}...`;

  let migrated = 0;
  let errors   = 0;

  for (const product of base64Products) {
    try {
      const oldPhotos = product.photos?.length ? product.photos
                      : product.image ? [product.image] : [];

      const newPhotos = [];
      for (const photo of oldPhotos) {
        if (!photo.startsWith("data:")) {
          newPhotos.push(photo); // ya es URL, dejar igual
          continue;
        }
        // Convertir base64 a File y subir a ImgBB
        const base64Data = photo.split(",")[1];
        const formData   = new FormData();
        formData.append("image", base64Data);
        const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
          method: "POST", body: formData
        });
        const data = await res.json();
        if (data.success) {
          newPhotos.push(data.data.url);
        } else {
          newPhotos.push(photo); // si falla, conservar base64
          errors++;
        }
      }

      // Guardar en Firebase con las nuevas URLs
      const { fbKey, ...productData } = product;
      productData.photos = newPhotos;
      productData.image  = newPhotos[0] || "";
      await set(ref(db, `products/${fbKey}`), productData);

      migrated++;
      btn.textContent = `⏳ Migrando ${migrated}/${base64Products.length}...`;

    } catch(err) {
      console.error("Error migrando producto:", product.name, err);
      errors++;
    }
  }

  btn.disabled    = false;
  btn.textContent = "⚡ Migrar fotos a ImgBB";

  if (errors === 0) {
    showToast(`✅ ${migrated} productos migrados. ¡Página lista! 🔥`, 4000);
  } else {
    showToast(`⚠️ ${migrated} migrados, ${errors} con error. Intenta de nuevo.`, 4000);
  }
};


window.openOrderModal = function() {
  if (cart.length === 0) { showToast("⚠️ Tu carrito está vacío"); return; }
  closeCart();

  const sum  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const now  = new Date();
  const fecha = now.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });
  const hora  = now.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });

  // Fecha en tarjeta
  document.getElementById("orderDate").textContent = `${fecha} ${hora}`;

  // Items en tarjeta visual
  document.getElementById("orderCardItems").innerHTML = cart.map(i => `
    <div class="order-card-item">
      <span class="oci-name">${i.name}</span>
      <span class="oci-qty">x${i.qty}</span>
      <span class="oci-price">${formatPrice(i.price * i.qty)}</span>
    </div>
  `).join("");

  document.getElementById("orderCardTotal").textContent = formatPrice(sum);

  // Texto copiable
  const lines = cart.map(i => `• ${i.name} x${i.qty}  →  ${formatPrice(i.price * i.qty)}`).join("\n");
  const texto =
`Hola! 👋 Quiero hacer un pedido en RAYAMI STORE:

${lines}

💰 Total estimado: ${formatPrice(sum)}

¿Siguen disponibles? 🔥`;
  document.getElementById("orderTextarea").value = texto;

  document.getElementById("orderModal").classList.add("open");
};

window.closeOrderModal = function() {
  document.getElementById("orderModal").classList.remove("open");
};

window.copyOrderText = function() {
  const ta = document.getElementById("orderTextarea");
  ta.select();
  ta.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById("btnCopy");
    btn.textContent = "✅ ¡Copiado!";
    btn.style.background = "#25D366";
    btn.style.color = "#fff";
    setTimeout(() => {
      btn.textContent = "📋 Copiar texto";
      btn.style.background = "";
      btn.style.color = "";
    }, 2500);
  }).catch(() => {
    document.execCommand("copy");
    showToast("✅ Texto copiado");
  });
};

window.saveOrderImage = function() {
  const card = document.getElementById("orderCard");
  showToast("⏳ Generando imagen...");
  html2canvas(card, {
    backgroundColor: "#1a1a1a",
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = `pedido-rayami-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("✅ Imagen guardada · Mándala por WhatsApp");
  }).catch(() => {
    showToast("❌ Error al generar imagen. Usa 'Copiar texto'.");
  });
};

window.sendCartWA = window.openOrderModal;

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
   VENDEDORES — AUTH
============================================================ */
window.showSellerLogin = function() {
  document.getElementById("sellerAuthModal").classList.add("open");
  switchSellerTab("login");
};
window.hideSellerAuth = function() {
  document.getElementById("sellerAuthModal").classList.remove("open");
};
window.switchSellerTab = function(tab) {
  document.getElementById("sellerLoginForm").style.display    = tab === "login"    ? "block" : "none";
  document.getElementById("sellerRegisterForm").style.display = tab === "register" ? "block" : "none";
  document.getElementById("tabLogin").classList.toggle("active",    tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
};

window.doSellerLogin = async function() {
  const email = document.getElementById("slEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("slPass").value;
  const errEl = document.getElementById("sellerLoginError");
  errEl.textContent = "";

  if (!email || !pass) { errEl.textContent = "⚠️ Completa todos los campos"; return; }

  // Buscar vendedor en Firebase
  const snap = await new Promise(r => {
    const unsub = onValue(ref(db,"sellers"), s => { r(s); });
  });
  const data = snap.val() || {};
  const entry = Object.entries(data).find(([,v]) => v.email === email && v.password === pass);

  if (!entry) { errEl.textContent = "⚠️ Correo o contraseña incorrectos"; return; }

  currentSeller = { ...entry[1], fbKey: entry[0] };
  window.hideSellerAuth();
  showSellerPanel();
};

window.doSellerRegister = async function() {
  const name  = document.getElementById("srName").value.trim();
  const phone = document.getElementById("srPhone").value.trim();
  const email = document.getElementById("srEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("srPass").value;
  const desc  = document.getElementById("srDesc").value.trim();
  const errEl = document.getElementById("sellerRegisterError");
  errEl.textContent = "";

  if (!name||!phone||!email||!pass) { errEl.textContent = "⚠️ Completa todos los campos"; return; }
  if (pass.length < 6) { errEl.textContent = "⚠️ La contraseña debe tener al menos 6 caracteres"; return; }

  // Verificar que no exista ya ese correo
  const snap = await new Promise(r => onValue(ref(db,"sellers"), s => r(s)));
  const data = snap.val() || {};
  const exists = Object.values(data).find(v => v.email === email);
  if (exists) { errEl.textContent = "⚠️ Ese correo ya está registrado"; return; }

  await fbRegisterSeller({
    name, phone, email, password: pass, desc,
    status: "pending",  // pending | active | rejected
    createdAt: Date.now()
  });

  // Notificar al admin por WhatsApp
  const msg = `🏪 *Nuevo vendedor registrado en RAYAMI STORE*\n\nNombre: ${name}\nWhatsApp: ${phone}\nCorreo: ${email}\nProductos: ${desc || "No especificado"}\n\nEntra al panel admin para aprobarlo.`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");

  window.hideSellerAuth();
  showToast("✅ Solicitud enviada. Te avisaremos cuando sea aprobada.", 4000);
};

window.doSellerLogout = function() {
  currentSeller = null;
  document.getElementById("sellerView").style.display  = "none";
  document.getElementById("clientView").style.display  = "block";
  showToast("✅ Sesión cerrada");
};

/* ============================================
   PANEL VENDEDOR
============================================================ */
function showSellerPanel() {
  document.getElementById("clientView").style.display = "none";
  document.getElementById("sellerView").style.display = "block";

  const welcome = document.getElementById("sellerWelcome");
  welcome.innerHTML = `<p style="font-size:18px;font-weight:600;margin-bottom:20px;">Hola, <span style="color:var(--accent)">${currentSeller.name}</span> 👋</p>`;

  if (currentSeller.status === "pending") {
    document.getElementById("sellerPendingMsg").style.display  = "block";
    document.getElementById("sellerActivePanel").style.display = "none";
    return;
  }
  if (currentSeller.status === "rejected") {
    document.getElementById("sellerPendingMsg").style.display  = "block";
    document.getElementById("sellerPendingMsg").querySelector("h3").textContent = "❌ Solicitud rechazada";
    document.getElementById("sellerPendingMsg").querySelector("p").textContent  = "Tu solicitud no fue aprobada. Contáctanos para más información.";
    document.getElementById("sellerActivePanel").style.display = "none";
    return;
  }

  document.getElementById("sellerPendingMsg").style.display  = "none";
  document.getElementById("sellerActivePanel").style.display = "block";

  listenSellerProducts(currentSeller.fbKey, (products) => {
    sellerProducts = products;
    renderSellerTable();
    renderSellerStats();
  });
}

function renderSellerStats() {
  document.getElementById("sStatTotal").textContent    = sellerProducts.length;
  document.getElementById("sStatApproved").textContent = sellerProducts.filter(p => p.approved).length;
  document.getElementById("sStatPending").textContent  = sellerProducts.filter(p => !p.approved && !p.rejected).length;
  document.getElementById("sStatSold").textContent     = sellerProducts.filter(p => p.sold).length;
}

function renderSellerTable() {
  const tbody = document.getElementById("sellerTableBody");
  const empty = document.getElementById("sellerEmpty");
  if (!sellerProducts.length) { tbody.innerHTML=""; empty.style.display="block"; return; }
  empty.style.display = "none";

  tbody.innerHTML = sellerProducts.map(p => {
    const thumb = p.image
      ? `<img class="admin-thumb" src="${p.image}" alt="${p.name}" />`
      : `<div class="admin-thumb-placeholder">📦</div>`;
    const pubStatus = p.approved
      ? `<span class="pub-badge pub-ok">✅ Publicado</span>`
      : p.rejected
      ? `<span class="pub-badge pub-no">❌ Rechazado</span>`
      : `<span class="pub-badge pub-wait">⏳ En revisión</span>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td><strong>${p.name}</strong></td>
        <td><span class="admin-price">${formatPrice(p.price)}</span></td>
        <td>${p.condition}</td>
        <td>${pubStatus}</td>
        <td>
          <div class="admin-actions">
            <button class="btn-delete" onclick="deleteSellerProduct('${p.fbKey}')">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

window.deleteSellerProduct = async function(fbKey) {
  if (!confirm("¿Eliminar este producto?")) return;
  await fbDeleteSellerProduct(fbKey);
  showToast("🗑 Producto eliminado");
};

/* ============================================
   MODAL PRODUCTO VENDEDOR
============================================================ */
let sellerEditingId = null;

window.openSellerProductModal = function() {
  sellerEditingId = null;
  ["spName","spPrice","spDesc","spImageUrl"].forEach(id => { document.getElementById(id).value=""; });
  document.getElementById("spCategory").value  = "deportes";
  document.getElementById("spCondition").value = "Nuevo";
  document.getElementById("sellerPhotoPreview").style.display = "none";
  document.getElementById("sellerProductModal").classList.add("open");
};

window.closeSellerProductModal = function() {
  document.getElementById("sellerProductModal").classList.remove("open");
};

window.previewSellerPhoto = function() {
  const url = document.getElementById("spImageUrl").value.trim();
  const preview = document.getElementById("sellerPhotoPreview");
  const img     = document.getElementById("sellerPhotoPreviewImg");
  if (url) { img.src=url; preview.style.display="flex"; }
  else      { preview.style.display="none"; }
};

window.removeSellerPhoto = function() {
  document.getElementById("spImageUrl").value = "";
  document.getElementById("sellerPhotoPreview").style.display = "none";
};

window.saveSellerProduct = async function() {
  const name  = document.getElementById("spName").value.trim();
  const price = parseFloat(document.getElementById("spPrice").value);
  if (!name)                     { showToast("⚠️ Escribe el nombre"); return; }
  if (isNaN(price)||price <= 0) { showToast("⚠️ Precio inválido"); return; }

  const data = {
    name, price,
    category:   document.getElementById("spCategory").value,
    condition:  document.getElementById("spCondition").value,
    desc:       document.getElementById("spDesc").value.trim(),
    image:      document.getElementById("spImageUrl").value.trim(),
    sellerKey:  currentSeller.fbKey,
    sellerName: currentSeller.name,
    approved:   false,
    rejected:   false,
    createdAt:  Date.now()
  };

  showToast("⏳ Enviando...");
  await fbSaveSellerProduct(data);
  closeSellerProductModal();
  showToast("✅ Producto enviado para revisión 🔥");
};

/* ============================================
   ADMIN — TABS
============================================================ */
window.switchAdminTab = function(tab) {
  ["products","sellers","sellerProducts"].forEach(t => {
    document.getElementById(`adminPanel${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display = t===tab?"block":"none";
    document.getElementById(`adminTab${t.charAt(0).toUpperCase()+t.slice(1)}`).classList.toggle("active", t===tab);
  });
  if (tab==="sellers")        renderAdminSellers();
  if (tab==="sellerProducts") renderAdminSellerProducts();
};

/* ============================================
   ADMIN — VENDEDORES
============================================================ */
function renderAdminSellers() {
  const tbody = document.getElementById("adminSellersBody");
  const empty = document.getElementById("adminSellersEmpty");
  if (!allSellers.length) { tbody.innerHTML=""; empty.style.display="block"; return; }
  empty.style.display="none";

  tbody.innerHTML = allSellers.map(s => {
    const statusBadge = s.status==="active"
      ? `<span class="pub-badge pub-ok">✅ Activo</span>`
      : s.status==="rejected"
      ? `<span class="pub-badge pub-no">❌ Rechazado</span>`
      : `<span class="pub-badge pub-wait">⏳ Pendiente</span>`;
    const actions = s.status!=="active"
      ? `<button class="btn-edit" onclick="approveSeller('${s.fbKey}')">✅ Aprobar</button>
         <button class="btn-delete" onclick="rejectSeller('${s.fbKey}')">❌ Rechazar</button>`
      : `<button class="btn-delete" onclick="rejectSeller('${s.fbKey}')">🚫 Desactivar</button>`;
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><a href="https://wa.me/52${s.phone.replace(/\D/g,'')}" target="_blank" style="color:var(--wa)">📱 ${s.phone}</a></td>
        <td style="font-size:12px;color:var(--text-muted)">${s.email}</td>
        <td>${allProducts.filter(p=>p.sellerKey===s.fbKey).length || 0}</td>
        <td>${statusBadge}</td>
        <td><div class="admin-actions">${actions}</div></td>
      </tr>`;
  }).join("");
}

window.approveSeller = async function(fbKey) {
  const seller = allSellers.find(s => s.fbKey===fbKey);
  if (!seller) return;
  await fbUpdateSeller(fbKey, {...seller, fbKey:undefined, status:"active"});
  showToast("✅ Vendedor aprobado");
  // Notificar al vendedor
  if (seller.phone) {
    const msg = `🎉 ¡Hola ${seller.name}! Tu cuenta de vendedor en RAYAMI STORE fue aprobada. Ya puedes subir tus productos. Entra en: rayami-07.github.io/store`;
    window.open(`https://wa.me/52${seller.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  renderAdminSellers();
};

window.rejectSeller = async function(fbKey) {
  const seller = allSellers.find(s => s.fbKey===fbKey);
  if (!seller) return;
  await fbUpdateSeller(fbKey, {...seller, fbKey:undefined, status:"rejected"});
  showToast("❌ Vendedor rechazado/desactivado");
  renderAdminSellers();
};

/* ============================================
   ADMIN — PRODUCTOS DE VENDEDORES
============================================================ */
let allSellerProductsList = [];

function renderAdminSellerProducts() {
  listenAllSellerProducts(products => {
    allSellerProductsList = products;
    const tbody = document.getElementById("adminSellerProductsBody");
    const empty = document.getElementById("adminSellerProductsEmpty");
    const pending = products.filter(p => !p.approved && !p.rejected);

    // Actualizar badge en tab
    document.getElementById("adminTabSellerProducts").textContent =
      `📋 Por aprobar${pending.length>0?" ("+pending.length+")":""}`;

    if (!products.length) { tbody.innerHTML=""; empty.style.display="block"; return; }
    empty.style.display="none";

    tbody.innerHTML = products.map(p => {
      const thumb = p.image
        ? `<img class="admin-thumb" src="${p.image}" alt="${p.name}" />`
        : `<div class="admin-thumb-placeholder">📦</div>`;
      const status = p.approved
        ? `<span class="pub-badge pub-ok">✅ Aprobado</span>`
        : p.rejected
        ? `<span class="pub-badge pub-no">❌ Rechazado</span>`
        : `<span class="pub-badge pub-wait">⏳ Pendiente</span>`;
      const actions = !p.approved && !p.rejected
        ? `<button class="btn-edit" onclick="approveSellerProduct('${p.fbKey}')">✅ Aprobar</button>
           <button class="btn-delete" onclick="rejectSellerProduct('${p.fbKey}')">❌ Rechazar</button>`
        : `<button class="btn-delete" onclick="rejectSellerProduct('${p.fbKey}')">🗑 Quitar</button>`;
      return `
        <tr>
          <td>${thumb}</td>
          <td><strong>${p.name}</strong><br/><span style="font-size:12px;color:var(--text-muted)">${p.desc||""}</span></td>
          <td><span style="font-size:12px;color:var(--accent)">${p.sellerName||"?"}</span></td>
          <td><span class="admin-price">${formatPrice(p.price)}</span></td>
          <td>${status}</td>
          <td><div class="admin-actions">${actions}</div></td>
        </tr>`;
    }).join("");
  });
}

window.approveSellerProduct = async function(fbKey) {
  const p = allSellerProductsList.find(x => x.fbKey===fbKey);
  if (!p) return;
  // Marcar como aprobado en sellerProducts
  const {fbKey:k, ...data} = p;
  await set(ref(db, `sellerProducts/${fbKey}`), {...data, approved:true, rejected:false});
  // Publicar en products principal
  await push(ref(db,"products"), {
    name: p.name, price: p.price, category: p.category,
    condition: p.condition, desc: p.desc, image: p.image,
    photos: p.image ? [p.image] : [],
    emoji: "📦", featured: false, sold: false,
    sellerKey: p.sellerKey, sellerName: p.sellerName,
    originalPrice: 0, salePrice: 0, promoEnd: 0,
    extras: {}, createdAt: Date.now()
  });
  showToast("✅ Producto aprobado y publicado");
};

window.rejectSellerProduct = async function(fbKey) {
  const p = allSellerProductsList.find(x => x.fbKey===fbKey);
  if (!p) return;
  const {fbKey:k, ...data} = p;
  await set(ref(db, `sellerProducts/${fbKey}`), {...data, approved:false, rejected:true});
  showToast("❌ Producto rechazado");
};


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
window.switchAdminTab    = switchAdminTab;

/* ============================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  applyLogo();
  initFirebase();
  startCountdownTicker();
  initCategories();
  initSearch();
  initNavbar();
  checkDeepLink();
});
