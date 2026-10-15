// =====================================================
//  CATÁLOGO — lógica principal
// =====================================================

let allProducts = [];
let categories = [];
let activeCategory = 'all';
let storeConfig = {};

// ── Bootstrap ────────────────────────────────────────
async function init() {
  showSkeleton();
  try {
    const [prodResp, cfgResp] = await Promise.all([
      API.getProducts(),
      API.getConfig(),
    ]);

    storeConfig = cfgResp.config || {};
    allProducts = prodResp.products || [];
    categories = prodResp.categories || [];

    applyStoreConfig(storeConfig);
    Cart.init(storeConfig.whatsapp || CONFIG.WHATSAPP, storeConfig.currency || CONFIG.CURRENCY);

    renderCategories();
    renderProducts(allProducts);
  } catch (err) {
    showError('No se pudo conectar con el catálogo. Verificá la URL del API en config.js');
    console.error(err);
  }
}

function applyStoreConfig(cfg) {
  if (cfg.storeName) {
    document.getElementById('store-name').textContent = cfg.storeName;
    document.title = cfg.storeName;
  }
  if (cfg.bannerText) {
    const el = document.getElementById('banner-text');
    if (el) el.textContent = cfg.bannerText;
  }
  if (cfg.logoUrl) {
    const logo = document.getElementById('store-logo');
    if (logo) { logo.src = cfg.logoUrl; logo.style.display = 'block'; }
  }
  if (cfg.primaryColor) {
    document.documentElement.style.setProperty('--color-primary', cfg.primaryColor);
  }
  if (cfg.accentColor) {
    document.documentElement.style.setProperty('--color-accent', cfg.accentColor);
  }
}

// ── Categorías ────────────────────────────────────────
function renderCategories() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;

  const all = [{ id: 'all', label: 'Todos' }];
  categories.forEach(c => all.push({ id: c, label: c }));

  bar.innerHTML = all.map(c => `
    <button class="cat-pill ${c.id === activeCategory ? 'active' : ''}"
            onclick="filterCategory('${c.id}')">
      ${c.label}
    </button>`).join('');
}

function filterCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === (cat === 'all' ? 'Todos' : cat));
  });

  const filtered = cat === 'all'
    ? allProducts
    : allProducts.filter(p => p.categoria === cat);
  renderProducts(filtered);
}

// ── Búsqueda ──────────────────────────────────────────
function handleSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  const base = activeCategory === 'all' ? allProducts : allProducts.filter(p => p.categoria === activeCategory);
  const filtered = q
    ? base.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q))
    : base;
  renderProducts(filtered);
}

// ── Grid de productos ─────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('products-empty');

  hideSkeleton();

  if (!products || products.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  const cur = storeConfig.currency || CONFIG.CURRENCY;

  grid.innerHTML = products.map(p => {
    const img = p.imagenes?.[0] || '';
    const hasMultiImg = p.imagenes?.length > 1;
    const stock = p.stock;
    const outOfStock = stock === 0;

    return `
      <article class="product-card ${outOfStock ? 'out-of-stock' : ''}" onclick="openProductModal('${p.id}')">
        <div class="product-card-img">
          ${img
            ? `<img src="${img}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'img-placeholder\'>📦</div>'">`
            : `<div class="img-placeholder">📦</div>`}
          ${hasMultiImg ? `<span class="multi-img-badge">+${p.imagenes.length - 1} fotos</span>` : ''}
          ${outOfStock ? `<div class="out-of-stock-overlay">Sin stock</div>` : ''}
          ${p.categoria ? `<span class="product-category-tag">${p.categoria}</span>` : ''}
        </div>
        <div class="product-card-body">
          <h3 class="product-name">${p.nombre}</h3>
          ${p.descripcion ? `<p class="product-desc">${truncate(p.descripcion, 80)}</p>` : ''}
          <div class="product-footer">
            <span class="product-price">${cur} ${fmt(p.precio)}</span>
            ${!outOfStock
              ? `<button class="btn-add-quick" onclick="event.stopPropagation(); addToCartQuick('${p.id}')" title="Agregar al carrito">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                </button>`
              : `<span class="stock-badge out">Sin stock</span>`}
          </div>
        </div>
      </article>`;
  }).join('');
}

function addToCartQuick(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;
  Cart.add(p, p.min_unidades || 1);
}

// ── Modal de producto ─────────────────────────────────
let modalCarouselIndex = 0;
let modalProduct = null;

function openProductModal(id) {
  const p = allProducts.find(p => p.id === id);
  if (!p) return;
  modalProduct = p;
  modalCarouselIndex = 0;

  const cur = storeConfig.currency || CONFIG.CURRENCY;
  const modal = document.getElementById('product-modal');
  const overlay = document.getElementById('modal-overlay');

  // Carrusel
  const imgs = p.imagenes?.length ? p.imagenes : [];
  document.getElementById('modal-carousel').innerHTML = imgs.map((src, i) => `
    <div class="carousel-slide ${i === 0 ? 'active' : ''}">
      <img src="${src}" alt="${p.nombre}" onerror="this.style.display='none'" loading="lazy">
    </div>`).join('') || `<div class="carousel-slide active"><div class="img-placeholder large">📦</div></div>`;

  // Dots
  document.getElementById('carousel-dots').innerHTML = imgs.length > 1
    ? imgs.map((_, i) => `<button class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`).join('')
    : '';

  // Nav arrows
  document.getElementById('carousel-prev').style.display = imgs.length > 1 ? 'flex' : 'none';
  document.getElementById('carousel-next').style.display = imgs.length > 1 ? 'flex' : 'none';

  // Info
  document.getElementById('modal-name').textContent = p.nombre;
  document.getElementById('modal-category').textContent = p.categoria || '';
  document.getElementById('modal-price').textContent = `${cur} ${fmt(p.precio)}`;
  document.getElementById('modal-desc').textContent = p.descripcion || '';
  document.getElementById('modal-stock').textContent = p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock';
  document.getElementById('modal-stock').className = `modal-stock ${p.stock > 0 ? 'in' : 'out'}`;

  // Cantidad
  const min = p.min_unidades || 1;
  const pasos = p.pasos?.length ? p.pasos : [1];
  const qtyInput = document.getElementById('modal-qty');
  qtyInput.value = min;
  qtyInput.min = min;

  // Botones de paso
  const stepsContainer = document.getElementById('modal-steps');
  stepsContainer.innerHTML = pasos.length > 1
    ? `<span class="steps-label">Agregar de a:</span>` + pasos.map(s =>
        `<button class="step-pill" onclick="changeModalQty(${s})">+${s}</button>`
      ).join('')
    : '';

  // Botón agregar
  const addBtn = document.getElementById('modal-add-btn');
  addBtn.disabled = p.stock === 0;
  addBtn.textContent = p.stock === 0 ? 'Sin stock' : 'Agregar al carrito';

  modal.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length) return;

  modalCarouselIndex = (index + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle('active', i === modalCarouselIndex));
  dots.forEach((d, i) => d.classList.toggle('active', i === modalCarouselIndex));
}

function changeModalQty(delta) {
  const input = document.getElementById('modal-qty');
  const min = modalProduct?.min_unidades || 1;
  const newVal = Math.max(min, parseInt(input.value || min) + delta);
  input.value = newVal;
}

function modalAddToCart() {
  if (!modalProduct) return;
  const qty = parseInt(document.getElementById('modal-qty').value) || modalProduct.min_unidades || 1;
  Cart.add(modalProduct, qty);
  closeProductModal();
}

// ── Skeleton / Error ──────────────────────────────────
function showSkeleton() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line w80"></div>
      <div class="skeleton-line w50"></div>
      <div class="skeleton-line w60"></div>
    </div>`).join('');
}

function hideSkeleton() {
  // handled by renderProducts
}

function showError(msg) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = `<div class="error-state"><span>⚠️</span><p>${msg}</p></div>`;
}

// ── Utils ─────────────────────────────────────────────
function fmt(n) {
  return parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ── Event listeners ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('cart-overlay').addEventListener('click', () => Cart.close());
  document.getElementById('modal-overlay').addEventListener('click', closeProductModal);

  document.getElementById('search-input')?.addEventListener('input', handleSearch);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProductModal();
      Cart.close();
    }
    if (e.key === 'ArrowLeft') goToSlide(modalCarouselIndex - 1);
    if (e.key === 'ArrowRight') goToSlide(modalCarouselIndex + 1);
  });
});
