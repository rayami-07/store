/* ============================================
   RAYAMI STORE + ADMIN — script.js
   Firebase Realtime Database
   ============================================ */

/* ============================================
   🔥 FIREBASE CONFIG
============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, onValue, push }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDDVxmRmKb9yIZSV0ZxkPKvQPOK-oAGMWU",
  authDomain:        "rayami-store.firebaseapp.com",
  databaseURL:       "https://rayami-store-default-rtdb.firebaseio.com",
  projectId:         "rayami-store",
  storageBucket:     "rayami-store.firebasestorage.app",
  messagingSenderId: "57542479161",
  appId:             "1:57542479161:web:425e75300b964e1f526ce8",
  measurementId:     "G-THQTMWFBWM"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* ============================================
   ⚙️ CONFIGURACIÓN
============================================================ */
const ADMIN_USER = "rayami";
const ADMIN_PASS = "rayami2025";
const WA_NUMBER  = "5581074978";

/* ============================================
   ESTADO GLOBAL
============================================================ */
let currentCategory = "todos";
let currentSearch   = "";
let editingId       = null;
let deletingId      = null;
let currentPhotoTab = "url";
let currentPhotoB64 = "";
let isLoggedIn      = false;
let allProducts     = [];   // caché local de Firebase

/* ============================================
   FIREBASE — escuchar cambios en tiempo real
============================================================ */
function initFirebase() {
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convertir objeto Firebase a array
      allProducts = Object.entries(data).map(([fbKey, p]) => ({ ...p, fbKey }));
      // Ordenar por createdAt descendente
      allProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      allProducts = [];
    }
    renderAll();
    if (isLoggedIn) {
      renderAdminTable();
      renderAdminStats();
    }
  });
}

async function fbSaveProduct(product) {
  if (product.fbKey) {
    // Editar existente
    const { fbKey, ...data } = product;
    await set(ref(db, `products/${fbKey}`), data);
  } else {
    // Nuevo producto
    await push(ref(db, "products"), product);
  }
}

async function fbDeleteProduct(fbKey) {
  await remove(ref(db, `products/${fbKey}`));
}

/* ============================================
   UTILIDADES
============================================================ */
function formatPrice(n) {
  return "$" + Number(n).toLocaleString("es-MX");
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

function showToast(msg, duration = 2800) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

/* ============================================
   RENDER TARJETA CLIENTE
============================================================ */
function renderCard(product) {
  const star = product.featured ? `<span class="pc-featured-star">⭐</span>` : "";
  const imgHTML = product.image
    ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />`
    : `<div class="pc-placeholder">${product.emoji || "📦"}</div>`;
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
  const tagsHTML = tags ? `<div class="pc-tags">${tags}</div>` : "";

  return `
    <div class="product-card">
      <div class="pc-img-wrap">
        ${imgHTML}
        <span class="pc-badge ${badgeClass(product.condition)}">${product.condition}</span>
        ${star}
      </div>
      <div class="pc-info">
        <span class="pc-cat">${product.category}</span>
        <h3 class="pc-name">${product.name}</h3>
        ${tagsHTML}
        <p class="pc-desc">${product.desc || ""}</p>
        <div class="pc-price">${formatPrice(product.price)}${original}</div>
      </div>
      <a href="${waLink(product)}" target="_blank" class="pc-wa-btn">💬 Preguntar por WhatsApp</a>
    </div>`;
}

/* ============================================
   RENDER SECCIONES CLIENTE
============================================================ */
function getFiltered() {
  return allProducts.filter(p => {
    const matchCat    = currentCategory === "todos" || p.category === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                        (p.desc || "").toLowerCase().includes(currentSearch.toLowerCase());
    return matchCat && matchSearch;
  });
}

function renderCatalog() {
  const grid    = document.getElementById("productGrid");
  const empty   = document.getElementById("emptyState");
  const count   = document.getElementById("productCount");
  const filtered = getFiltered();

  count.textContent = `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
  } else {
    grid.innerHTML = filtered.map(renderCard).join("");
    empty.style.display = "none";
  }
}

function renderFeatured() {
  const grid    = document.getElementById("featuredGrid");
  const emptyEl = document.getElementById("emptyFeatured");
  const featured = allProducts.filter(p => p.featured);

  if (featured.length === 0) {
    grid.innerHTML = "";
    emptyEl.style.display = "block";
  } else {
    grid.innerHTML = featured.map(renderCard).join("");
    emptyEl.style.display = "none";
  }
}

function renderAll() {
  renderFeatured();
  renderCatalog();
}

/* ============================================
   CATEGORÍAS
============================================================ */
function initCategories() {
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-card").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
      renderCatalog();
    });
  });
}

/* ============================================
   BÚSQUEDA
============================================================ */
function initSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    currentSearch = input.value.trim();
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
   NAVBAR
============================================================ */
function initNavbar() {
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("navbar");
    nav.style.background = window.scrollY > 40
      ? "rgba(10,10,10,.98)"
      : "rgba(13,13,13,.92)";
  });

  const btn  = document.getElementById("hamburger");
  const menu = document.getElementById("mobileMenu");
  btn.addEventListener("click", () => menu.classList.toggle("open"));
  menu.querySelectorAll("a, button").forEach(link => {
    link.addEventListener("click", () => menu.classList.remove("open"));
  });
}

/* ============================================
   LOGIN ADMIN
============================================================ */
function showLogin() {
  document.getElementById("loginModal").classList.add("open");
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginError").textContent = "";
  setTimeout(() => document.getElementById("loginUser").focus(), 100);
}

function hideLogin() {
  document.getElementById("loginModal").classList.remove("open");
}

function doLogin() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    isLoggedIn = true;
    hideLogin();
    showAdmin();
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
  renderAdminTable();
  renderAdminStats();
}

function renderAdminStats() {
  document.getElementById("statTotal").textContent    = allProducts.length;
  document.getElementById("statFeatured").textContent = allProducts.filter(p => p.featured).length;
  document.getElementById("statNuevo").textContent    = allProducts.filter(p => p.condition === "Nuevo").length;
  document.getElementById("statUsado").textContent    = allProducts.filter(p => p.condition !== "Nuevo").length;
}

function renderAdminTable() {
  const tbody  = document.getElementById("adminTableBody");
  const empty  = document.getElementById("adminEmpty");
  const search = (document.getElementById("adminSearch")?.value || "").toLowerCase();
  const products = allProducts.filter(p =>
    p.name.toLowerCase().includes(search) || (p.category || "").includes(search)
  );

  if (products.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = products.map(p => {
    const thumb = p.image
      ? `<img class="admin-thumb" src="${p.image}" alt="${p.name}" />`
      : `<div class="admin-thumb-placeholder">${p.emoji || "📦"}</div>`;
    const featuredIcon = p.featured
      ? `<span class="admin-featured-yes">⭐</span>`
      : `<span class="admin-featured-no">—</span>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td><span class="admin-product-name">${p.name}</span></td>
        <td><span class="admin-cat-badge">${p.category}</span></td>
        <td><span class="admin-condition">${p.condition}</span></td>
        <td><span class="admin-price">${formatPrice(p.price)}</span></td>
        <td>${featuredIcon}</td>
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
   MODAL PRODUCTO
============================================================ */
function openProductModal(fbKey = null) {
  editingId       = fbKey;
  currentPhotoB64 = "";

  const title = document.getElementById("productModalTitle");

  // Reset form
  ["pName","pPrice","pOriginalPrice","pEmoji","pDesc","pImageUrl"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("pCategory").value  = "deportes";
  document.getElementById("pCondition").value = "Nuevo";
  document.getElementById("pFeatured").value  = "false";
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("photoPreviewImg").src = "";
  switchPhotoTab("url");

  document.getElementById("pCategory").onchange = () => {
    updateExtraFields(document.getElementById("pCategory").value);
  };

  const extraInputs = ["pTalla","pColor","pMarca","pPeso","pGenero","pMaterial","pMascota"];
  extraInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  if (fbKey !== null) {
    title.textContent = "Editar producto";
    const product = allProducts.find(p => p.fbKey === fbKey);
    if (product) {
      document.getElementById("pName").value          = product.name;
      document.getElementById("pPrice").value         = product.price;
      document.getElementById("pOriginalPrice").value = product.originalPrice || "";
      document.getElementById("pCategory").value      = product.category;
      document.getElementById("pCondition").value     = product.condition;
      document.getElementById("pEmoji").value         = product.emoji || "";
      document.getElementById("pFeatured").value      = product.featured ? "true" : "false";
      document.getElementById("pDesc").value          = product.desc || "";

      if (product.extras) {
        const map = {pTalla:"talla",pColor:"color",pMarca:"marca",pPeso:"peso",pGenero:"genero",pMaterial:"material",pMascota:"mascota"};
        Object.entries(map).forEach(([elId, key]) => {
          const el = document.getElementById(elId);
          if (el && product.extras[key]) el.value = product.extras[key];
        });
      }

      updateExtraFields(product.category);

      if (product.image) {
        if (product.image.startsWith("data:")) {
          currentPhotoB64 = product.image;
          switchPhotoTab("file");
          showPhotoPreview(product.image);
        } else {
          document.getElementById("pImageUrl").value = product.image;
          showPhotoPreview(product.image);
        }
      }
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
  editingId = null;
  currentPhotoB64 = "";
}

/* ============================================
   CAMPOS EXTRA
============================================================ */
const EXTRA_FIELDS_BY_CAT = {
  tenis:     ["fieldTalla","fieldColor","fieldMarca","fieldGenero"],
  ropa:      ["fieldTalla","fieldColor","fieldMarca","fieldGenero"],
  deportes:  ["fieldMarca","fieldPeso","fieldColor","fieldMaterial"],
  mascotas:  ["fieldMascota","fieldColor","fieldMarca"],
  usados:    ["fieldMarca","fieldColor","fieldTalla"],
  ofertas:   ["fieldMarca","fieldColor","fieldTalla"],
  accesorios:["fieldMarca","fieldColor","fieldMaterial"],
};

function updateExtraFields(category) {
  const allFields = ["fieldTalla","fieldColor","fieldMarca","fieldPeso","fieldGenero","fieldMaterial","fieldMascota"];
  const show = EXTRA_FIELDS_BY_CAT[category] || [];
  allFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.style.display = "none";
  });
  const container = document.getElementById("extraFields");
  if (show.length > 0) {
    container.style.display = "block";
    show.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.style.display = "flex";
    });
  } else {
    container.style.display = "none";
  }
}

/* ============================================
   FOTO
============================================================ */
function switchPhotoTab(tab) {
  currentPhotoTab = tab;
  document.getElementById("photoTabUrl").style.display  = tab === "url"  ? "block" : "none";
  document.getElementById("photoTabFile").style.display = tab === "file" ? "block" : "none";
  document.getElementById("tabBtnUrl").classList.toggle("active",  tab === "url");
  document.getElementById("tabBtnFile").classList.toggle("active", tab === "file");
}

function showPhotoPreview(src) {
  const preview = document.getElementById("photoPreview");
  const img     = document.getElementById("photoPreviewImg");
  if (src) { img.src = src; preview.style.display = "flex"; }
  else      { preview.style.display = "none"; }
}

function previewFromUrl() {
  const url = document.getElementById("pImageUrl").value.trim();
  showPhotoPreview(url);
  currentPhotoB64 = "";
}

function triggerFileInput() {
  document.getElementById("pImageFile").click();
}

function handleFileFromObject(file) {
  document.getElementById("fileDropText").textContent = "⏳ Procesando imagen...";
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
      const compressed = canvas.toDataURL("image/jpeg", 0.72);
      currentPhotoB64 = compressed;
      document.getElementById("pImageUrl").value = "";
      document.getElementById("fileDropText").textContent = "✅ " + file.name;
      showPhotoPreview(compressed);
      showToast("✅ Imagen lista (" + Math.round(compressed.length / 1024) + " KB)");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) handleFileFromObject(file);
}

function removePhoto() {
  currentPhotoB64 = "";
  document.getElementById("pImageUrl").value = "";
  document.getElementById("photoPreviewImg").src = "";
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("pImageFile").value = "";
}

/* ============================================
   GUARDAR PRODUCTO → Firebase
============================================================ */
async function saveProduct() {
  const name  = document.getElementById("pName").value.trim();
  const price = parseFloat(document.getElementById("pPrice").value);

  if (!name)                      { showToast("⚠️ Escribe el nombre del producto"); return; }
  if (isNaN(price) || price < 0) { showToast("⚠️ Escribe un precio válido"); return; }

  let image = currentPhotoTab === "file" && currentPhotoB64
    ? currentPhotoB64
    : document.getElementById("pImageUrl").value.trim();

  const productData = {
    name,
    price,
    originalPrice: parseFloat(document.getElementById("pOriginalPrice").value) || 0,
    category:      document.getElementById("pCategory").value,
    condition:     document.getElementById("pCondition").value,
    emoji:         document.getElementById("pEmoji").value.trim() || "📦",
    featured:      document.getElementById("pFeatured").value === "true",
    desc:          document.getElementById("pDesc").value.trim(),
    image,
    extras: {
      talla:    document.getElementById("pTalla")?.value.trim()    || "",
      color:    document.getElementById("pColor")?.value.trim()    || "",
      marca:    document.getElementById("pMarca")?.value.trim()    || "",
      peso:     document.getElementById("pPeso")?.value.trim()     || "",
      genero:   document.getElementById("pGenero")?.value          || "",
      material: document.getElementById("pMaterial")?.value.trim() || "",
      mascota:  document.getElementById("pMascota")?.value.trim()  || "",
    },
    createdAt: editingId !== null
      ? (allProducts.find(p => p.fbKey === editingId)?.createdAt || Date.now())
      : Date.now()
  };

  // Si editando, incluir fbKey
  if (editingId !== null) productData.fbKey = editingId;

  showToast("⏳ Guardando...");

  try {
    await fbSaveProduct(productData);
    showToast(editingId !== null ? "✅ Producto actualizado" : "✅ Producto agregado");
    closeProductModal();
  } catch(err) {
    showToast("❌ Error al guardar. Intenta de nuevo.");
    console.error(err);
  }
}

/* ============================================
   ELIMINAR PRODUCTO → Firebase
============================================================ */
function openDeleteModal(fbKey) {
  deletingId = fbKey;
  const product = allProducts.find(p => p.fbKey === fbKey);
  document.getElementById("deleteProductName").textContent = product?.name || "";
  document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deletingId = null;
}

async function confirmDelete() {
  if (!deletingId) return;
  try {
    await fbDeleteProduct(deletingId);
    showToast("🗑 Producto eliminado");
  } catch(err) {
    showToast("❌ Error al eliminar");
    console.error(err);
  }
  closeDeleteModal();
}

/* ============================================
   CERRAR MODALS AL CLICK FUERA
============================================================ */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
    if (e.target.id === "deleteModal")  deletingId = null;
    if (e.target.id === "productModal") { editingId = null; currentPhotoB64 = ""; }
  }
});

/* ============================================
   DRAG & DROP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const drop = document.getElementById("fileDrop");
  if (!drop) return;
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.style.borderColor = "var(--accent)";
    drop.style.color = "var(--accent)";
  });
  drop.addEventListener("dragleave", () => {
    drop.style.borderColor = "";
    drop.style.color = "";
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.style.borderColor = "";
    drop.style.color = "";
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileFromObject(file);
    else showToast("⚠️ Solo se aceptan imágenes");
  });
});

/* ============================================
   EXPONER FUNCIONES GLOBALES
============================================================ */
window.showLogin        = showLogin;
window.hideLogin        = hideLogin;
window.doLogin          = doLogin;
window.doLogout         = doLogout;
window.openProductModal = openProductModal;
window.openEditModal    = openEditModal;
window.closeProductModal= closeProductModal;
window.openDeleteModal  = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete    = confirmDelete;
window.saveProduct      = saveProduct;
window.switchPhotoTab   = switchPhotoTab;
window.previewFromUrl   = previewFromUrl;
window.triggerFileInput = triggerFileInput;
window.handleFileSelect = handleFileSelect;
window.removePhoto      = removePhoto;
window.renderAdminTable = renderAdminTable;

/* ============================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  initCategories();
  initSearch();
  initNavbar();
});
