/* ============================================
   RAYAMI STORE + ADMIN — script.js
   ============================================

   ┌─────────────────────────────────────────┐
   │  CONFIGURACIÓN RÁPIDA                   │
   ├─────────────────────────────────────────┤
   │  1. ADMIN_USER  → tu usuario            │
   │  2. ADMIN_PASS  → tu contraseña         │
   │  3. WA_NUMBER   → tu WhatsApp           │
   │                                         │
   │  Los productos se guardan en el         │
   │  navegador (localStorage) y persisten   │
   │  aunque cierres la página.              │
   │                                         │
   │  Para agregar productos: haz login como │
   │  admin y usa el panel.                  │
   └─────────────────────────────────────────┘
*/

/* ============================================
   ⚙️ CONFIGURACIÓN — CAMBIA ESTO
============================================================ */
const ADMIN_USER  = "rayami";          // ← Tu usuario admin
const ADMIN_PASS  = "rayami2025";      // ← Tu contraseña admin
const WA_NUMBER   = "5581074978";      // ← Tu WhatsApp (sin espacios ni +)
const STORAGE_KEY = "rayami_products"; // clave en localStorage

/* ============================================
   ESTADO GLOBAL
============================================================ */
let currentCategory = "todos";
let currentSearch   = "";
let editingId       = null;   // id del producto que se está editando
let deletingId      = null;   // id del producto a eliminar
let currentPhotoTab = "url";  // 'url' o 'file'
let currentPhotoB64 = "";     // base64 de la imagen subida
let isLoggedIn      = false;

/* ============================================
   STORAGE — guardar y cargar productos
============================================================ */
function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch(e) {
    showToast("⚠️ Error al guardar. La imagen puede ser muy grande.");
  }
}

function getProducts() {
  return loadProducts();
}

function nextId() {
  const products = loadProducts();
  if (products.length === 0) return 1;
  return Math.max(...products.map(p => p.id)) + 1;
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
  const products = loadProducts();
  return products.filter(p => {
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
  const featured = loadProducts().filter(p => p.featured);

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
  const products = loadProducts();
  document.getElementById("statTotal").textContent    = products.length;
  document.getElementById("statFeatured").textContent = products.filter(p => p.featured).length;
  document.getElementById("statNuevo").textContent    = products.filter(p => p.condition === "Nuevo").length;
  document.getElementById("statUsado").textContent    = products.filter(p => p.condition !== "Nuevo").length;
}

function renderAdminTable() {
  const tbody   = document.getElementById("adminTableBody");
  const empty   = document.getElementById("adminEmpty");
  const search  = (document.getElementById("adminSearch")?.value || "").toLowerCase();
  const products = loadProducts().filter(p =>
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
            <button class="btn-edit" onclick="openEditModal(${p.id})">✏️ Editar</button>
            <button class="btn-delete" onclick="openDeleteModal(${p.id})">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

/* ============================================
   MODAL PRODUCTO — abrir/cerrar
============================================================ */
function openProductModal(id = null) {
  editingId = id;
  currentPhotoB64 = "";

  const modal = document.getElementById("productModal");
  const title = document.getElementById("productModalTitle");

  // Reset form
  document.getElementById("pName").value          = "";
  document.getElementById("pPrice").value         = "";
  document.getElementById("pOriginalPrice").value = "";
  document.getElementById("pCategory").value      = "deportes";
  document.getElementById("pCondition").value     = "Nuevo";
  document.getElementById("pEmoji").value         = "";
  document.getElementById("pFeatured").value      = "false";
  document.getElementById("pDesc").value          = "";
  document.getElementById("pImageUrl").value      = "";
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("photoPreviewImg").src  = "";
  switchPhotoTab("url");

  if (id !== null) {
    title.textContent = "Editar producto";
    const product = loadProducts().find(p => p.id === id);
    if (product) {
      document.getElementById("pName").value          = product.name;
      document.getElementById("pPrice").value         = product.price;
      document.getElementById("pOriginalPrice").value = product.originalPrice || "";
      document.getElementById("pCategory").value      = product.category;
      document.getElementById("pCondition").value     = product.condition;
      document.getElementById("pEmoji").value         = product.emoji || "";
      document.getElementById("pFeatured").value      = product.featured ? "true" : "false";
      document.getElementById("pDesc").value          = product.desc || "";

      if (product.image) {
        if (product.image.startsWith("data:")) {
          // base64
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
  }

  modal.classList.add("open");
}

function openEditModal(id) {
  openProductModal(id);
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("open");
  editingId = null;
  currentPhotoB64 = "";
}

/* ============================================
   FOTO — tabs, preview, file
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
  if (src) {
    img.src = src;
    preview.style.display = "flex";
  } else {
    preview.style.display = "none";
  }
}

function previewFromUrl() {
  const url = document.getElementById("pImageUrl").value.trim();
  showPhotoPreview(url);
  currentPhotoB64 = ""; // clear file if URL typed
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check size (warn if > 1MB)
  if (file.size > 1.5 * 1024 * 1024) {
    showToast("⚠️ Imagen grande. Puede fallar al guardar. Mejor usa URL de imgur.");
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentPhotoB64 = e.target.result;
    document.getElementById("pImageUrl").value = "";
    showPhotoPreview(currentPhotoB64);
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  currentPhotoB64 = "";
  document.getElementById("pImageUrl").value = "";
  document.getElementById("photoPreviewImg").src = "";
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("pImageFile").value = "";
}

/* ============================================
   GUARDAR PRODUCTO
============================================================ */
function saveProduct() {
  const name  = document.getElementById("pName").value.trim();
  const price = parseFloat(document.getElementById("pPrice").value);

  if (!name) { showToast("⚠️ Escribe el nombre del producto"); return; }
  if (isNaN(price) || price < 0) { showToast("⚠️ Escribe un precio válido"); return; }

  // Determinar imagen
  let image = "";
  if (currentPhotoTab === "file" && currentPhotoB64) {
    image = currentPhotoB64;
  } else {
    image = document.getElementById("pImageUrl").value.trim();
  }

  const product = {
    id:            editingId !== null ? editingId : nextId(),
    name,
    price,
    originalPrice: parseFloat(document.getElementById("pOriginalPrice").value) || 0,
    category:      document.getElementById("pCategory").value,
    condition:     document.getElementById("pCondition").value,
    emoji:         document.getElementById("pEmoji").value.trim() || "📦",
    featured:      document.getElementById("pFeatured").value === "true",
    desc:          document.getElementById("pDesc").value.trim(),
    image,
    createdAt:     editingId !== null
                     ? (loadProducts().find(p => p.id === editingId)?.createdAt || Date.now())
                     : Date.now()
  };

  let products = loadProducts();

  if (editingId !== null) {
    products = products.map(p => p.id === editingId ? product : p);
    showToast("✅ Producto actualizado");
  } else {
    products.push(product);
    showToast("✅ Producto agregado");
  }

  saveProducts(products);
  closeProductModal();
  renderAdminTable();
  renderAdminStats();
}

/* ============================================
   ELIMINAR PRODUCTO
============================================================ */
function openDeleteModal(id) {
  deletingId = id;
  const product = loadProducts().find(p => p.id === id);
  document.getElementById("deleteProductName").textContent = product?.name || "";
  document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("open");
  deletingId = null;
}

function confirmDelete() {
  if (deletingId === null) return;
  const products = loadProducts().filter(p => p.id !== deletingId);
  saveProducts(products);
  closeDeleteModal();
  renderAdminTable();
  renderAdminStats();
  showToast("🗑 Producto eliminado");
}

/* ============================================
   CERRAR MODALS AL CLICK FUERA
============================================================ */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
    if (e.target.id === "deleteModal") deletingId = null;
    if (e.target.id === "productModal") { editingId = null; currentPhotoB64 = ""; }
  }
});

/* ============================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initCategories();
  initSearch();
  initNavbar();
});
