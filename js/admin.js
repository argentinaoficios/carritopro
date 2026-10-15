// =====================================================
//  ADMIN PANEL
// =====================================================

let adminProducts = [];
let adminFilter = { search: '', showInactive: false };
let editingId = null;
let imageUrls = [];

// ── Auth ──────────────────────────────────────────────
function checkAuth() {
  const saved = sessionStorage.getItem('admin_auth');
  if (saved === CONFIG.ADMIN_KEY) {
    showPanel();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
  }
}

function login() {
  const key = document.getElementById('admin-password').value.trim();
  if (key === CONFIG.ADMIN_KEY) {
    sessionStorage.setItem('admin_auth', key);
    showPanel();
  } else {
    document.getElementById('auth-error').textContent = 'Clave incorrecta';
    document.getElementById('admin-password').classList.add('shake');
    setTimeout(() => document.getElementById('admin-password').classList.remove('shake'), 400);
  }
}

function logout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

function showPanel() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'flex';
  loadAdmin();
}

// ── Load ──────────────────────────────────────────────
async function loadAdmin() {
  showAdminLoader();
  try {
    const [prodResp, cfgResp] = await Promise.all([
      API.getProductsAdmin(),
      API.getConfig(),
    ]);
    adminProducts = prodResp.products || [];
    renderAdminProducts();
    loadConfigForm(cfgResp.config || {});
  } catch(err) {
    showAdminError('Error conectando con la API: ' + err.message);
  }
}

// ── Products list ─────────────────────────────────────
function renderAdminProducts() {
  const list = document.getElementById('admin-product-list');
  if (!list) return;

  let filtered = adminProducts;

  if (!adminFilter.showInactive) {
    filtered = filtered.filter(p => p.activo);
  }

  if (adminFilter.search) {
    const q = adminFilter.search.toLowerCase();
    filtered = filtered.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    const allCount = adminProducts.filter(p => !p.activo).length;
    const hint = !adminFilter.showInactive && allCount
      ? `<button class="btn-show-inactive" onclick="toggleInactive()">Mostrar ${allCount} eliminado(s)</button>`
      : '';
    list.innerHTML = `<div class="admin-empty">No se encontraron productos. ${hint}</div>`;
    return;
  }

  list.innerHTML = filtered.map(p => `
    <div class="admin-product-row ${!p.activo ? 'inactive-row' : ''}" data-id="${p.id}">
      <div class="admin-product-thumb">
        ${p.imagenes?.[0]
          ? `<img src="${p.imagenes[0]}" alt="${p.nombre}" onerror="this.style.display='none'">`
          : `<div class="thumb-placeholder">📦</div>`}
      </div>
      <div class="admin-product-info">
        <strong>${p.nombre} ${!p.activo ? '<span class="deleted-tag">Eliminado</span>' : ''}</strong>
        <span>${p.categoria || '—'}</span>
        <span class="price-tag">$ ${fmt(p.precio)}</span>
      </div>
      <div class="admin-product-meta">
        <span class="stock-chip ${p.stock > 0 ? 'in' : 'out'}">Stock: ${p.stock}</span>
        <span class="min-chip">Min: ${p.min_unidades} | Pasos: ${(p.pasos||[1]).join('/')}</span>
      </div>
      <div class="admin-product-actions">
        ${p.activo
          ? `<button class="btn-icon edit" onclick="openEditModal('${p.id}')" title="Editar">✏️</button>
             <button class="btn-icon delete" onclick="confirmDelete('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">🗑️</button>`
          : `<button class="btn-icon reactivate" onclick="reactivate('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">♻️</button>`
        }
      </div>
    </div>`).join('');
}

function filterAdminSearch(e) {
  adminFilter.search = e.target.value;
  renderAdminProducts();
}

function toggleInactive() {
  adminFilter.showInactive = !adminFilter.showInactive;
  const btn = document.getElementById('toggle-inactive-btn');
  if (btn) btn.textContent = adminFilter.showInactive ? 'Ocultar eliminados' : 'Ver eliminados';
  renderAdminProducts();
}

async function reactivate(id, name) {
  if (!confirm(`¿Reactivar "${name}"?`)) return;
  try {
    const resp = await API.reactivateProduct(id);
    if (resp.error) throw new Error(resp.error);
    showToast('Producto reactivado ✓');
    await loadAdmin();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ── Product Form Modal ────────────────────────────────
function openAddModal() {
  editingId = null;
  imageUrls = [];
  resetForm();
  document.getElementById('form-modal-title').textContent = 'Agregar producto';
  document.getElementById('product-form-modal').classList.add('open');
  document.getElementById('form-overlay').classList.add('visible');
}

function openEditModal(id) {
  const p = adminProducts.find(p => p.id === id);
  if (!p) return;
  editingId = id;
  imageUrls = [...(p.imagenes || [])];

  document.getElementById('form-modal-title').textContent = 'Editar producto';
  document.getElementById('f-nombre').value = p.nombre || '';
  document.getElementById('f-descripcion').value = p.descripcion || '';
  document.getElementById('f-precio').value = p.precio || '';
  document.getElementById('f-categoria').value = p.categoria || '';
  document.getElementById('f-stock').value = p.stock ?? '';
  document.getElementById('f-min').value = p.min_unidades || 1;
  document.getElementById('f-pasos').value = (p.pasos || [1]).join(',');

  renderImagePreview();
  document.getElementById('product-form-modal').classList.add('open');
  document.getElementById('form-overlay').classList.add('visible');
}

function closeFormModal() {
  document.getElementById('product-form-modal').classList.remove('open');
  document.getElementById('form-overlay').classList.remove('visible');
}

function resetForm() {
  document.getElementById('f-nombre').value = '';
  document.getElementById('f-descripcion').value = '';
  document.getElementById('f-precio').value = '';
  document.getElementById('f-categoria').value = '';
  document.getElementById('f-stock').value = '';
  document.getElementById('f-min').value = 1;
  document.getElementById('f-pasos').value = '1';
  renderImagePreview();
}

// ── Image management ──────────────────────────────────
function addImageUrl() {
  const input = document.getElementById('f-image-url');
  const url = input.value.trim();
  if (!url) return;
  imageUrls.push(url);
  input.value = '';
  renderImagePreview();
}

function removeImage(index) {
  imageUrls.splice(index, 1);
  renderImagePreview();
}

function moveImage(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= imageUrls.length) return;
  [imageUrls[index], imageUrls[target]] = [imageUrls[target], imageUrls[index]];
  renderImagePreview();
}

function renderImagePreview() {
  const container = document.getElementById('image-preview-list');
  if (!container) return;

  if (!imageUrls.length) {
    container.innerHTML = `<div class="no-images">Sin imágenes</div>`;
    return;
  }

  container.innerHTML = imageUrls.map((url, i) => `
    <div class="img-preview-item">
      <img src="${url}" alt="Imagen ${i+1}" onerror="this.style.opacity='0.3'">
      <div class="img-preview-controls">
        ${i > 0 ? `<button onclick="moveImage(${i}, -1)" title="Mover izquierda">◀</button>` : '<span></span>'}
        ${i < imageUrls.length - 1 ? `<button onclick="moveImage(${i}, 1)" title="Mover derecha">▶</button>` : '<span></span>'}
        <button class="remove-img" onclick="removeImage(${i})" title="Eliminar">✕</button>
      </div>
      ${i === 0 ? '<span class="primary-badge">Principal</span>' : ''}
    </div>`).join('');
}

// ── Save product ──────────────────────────────────────
async function saveProduct() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const precio = parseFloat(document.getElementById('f-precio').value);

  if (!nombre) { flashError('f-nombre', 'El nombre es obligatorio'); return; }
  if (isNaN(precio) || precio < 0) { flashError('f-precio', 'Precio inválido'); return; }

  const pasosRaw = document.getElementById('f-pasos').value || '1';
  const pasos = pasosRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);

  const product = {
    id: editingId || undefined,
    nombre,
    descripcion: document.getElementById('f-descripcion').value.trim(),
    precio,
    imagenes: imageUrls,
    categoria: document.getElementById('f-categoria').value.trim(),
    stock: parseInt(document.getElementById('f-stock').value) || 0,
    min_unidades: parseInt(document.getElementById('f-min').value) || 1,
    pasos: pasos.length ? pasos : [1],
    activo: true,
  };

  const saveBtn = document.getElementById('save-product-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando…';

  try {
    let resp;
    if (editingId) {
      resp = await API.updateProduct(product);
    } else {
      resp = await API.addProduct(product);
    }

    if (resp.error) throw new Error(resp.error);

    showToast('Producto guardado ✓');
    closeFormModal();
    await loadAdmin();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar producto';
  }
}

// ── Delete ────────────────────────────────────────────
function confirmDelete(id, name) {
  document.getElementById('confirm-modal-msg').textContent = `¿Eliminás "${name}"? Esta acción no se puede deshacer.`;
  document.getElementById('confirm-modal').classList.add('open');
  document.getElementById('confirm-delete-btn').onclick = async () => {
    document.getElementById('confirm-modal').classList.remove('open');
    try {
      const resp = await API.deleteProduct(id);
      if (resp.error) throw new Error(resp.error);
      showToast('Producto eliminado');
      await loadAdmin();
    } catch(err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
}

// ── Config form ───────────────────────────────────────
function loadConfigForm(cfg) {
  document.getElementById('cfg-store-name').value = cfg.storeName || '';
  document.getElementById('cfg-whatsapp').value = cfg.whatsapp || '';
  document.getElementById('cfg-currency').value = cfg.currency || '$';
  document.getElementById('cfg-logo-url').value = cfg.logoUrl || '';
  document.getElementById('cfg-banner-text').value = cfg.bannerText || '';

  const primary = cfg.primaryColor || '#1e3a5f';
  const accent  = cfg.accentColor  || '#f59e0b';
  document.getElementById('cfg-primary-color').value      = primary;
  document.getElementById('cfg-primary-color-text').value = primary;
  document.getElementById('cfg-accent-color').value       = accent;
  document.getElementById('cfg-accent-color-text').value  = accent;
}

async function saveConfig() {
  const config = {
    storeName: document.getElementById('cfg-store-name').value.trim(),
    whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
    currency: document.getElementById('cfg-currency').value.trim() || '$',
    primaryColor: document.getElementById('cfg-primary-color').value,
    accentColor: document.getElementById('cfg-accent-color').value,
    logoUrl: document.getElementById('cfg-logo-url').value.trim(),
    bannerText: document.getElementById('cfg-banner-text').value.trim(),
  };

  const btn = document.getElementById('save-config-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    const resp = await API.updateConfig(config);
    if (resp.error) throw new Error(resp.error);
    showToast('Configuración guardada ✓');
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar configuración';
  }
}

// ── Utils ─────────────────────────────────────────────
function showAdminLoader() {
  const list = document.getElementById('admin-product-list');
  list.innerHTML = Array(4).fill(0).map(() => `
    <div class="admin-product-row skeleton-row">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-lines"><div class="sk-line w60"></div><div class="sk-line w40"></div></div>
    </div>`).join('');
}

function showAdminError(msg) {
  document.getElementById('admin-product-list').innerHTML =
    `<div class="admin-error">⚠️ ${msg}</div>`;
}

function fmt(n) {
  return parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function flashError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  el.classList.add('field-error');
  el.placeholder = msg;
  el.focus();
  setTimeout(() => el.classList.remove('field-error'), 2000);
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  toast.textContent = msg;
  toast.className = `admin-toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('form-overlay')?.addEventListener('click', closeFormModal);

  document.getElementById('admin-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });

  // Color picker ↔ text sync
  document.getElementById('cfg-primary-color')?.addEventListener('input', e => {
    document.getElementById('cfg-primary-color-text').value = e.target.value;
  });
  document.getElementById('cfg-accent-color')?.addEventListener('input', e => {
    document.getElementById('cfg-accent-color-text').value = e.target.value;
  });
  document.getElementById('cfg-primary-color-text')?.addEventListener('input', e => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById('cfg-primary-color').value = v;
  });
  document.getElementById('cfg-accent-color-text')?.addEventListener('input', e => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById('cfg-accent-color').value = v;
  });

  document.getElementById('f-image-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addImageUrl();
  });

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
    });
  });
});
