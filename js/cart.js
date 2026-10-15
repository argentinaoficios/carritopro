// =====================================================
//  CARRITO DE COMPRAS
// =====================================================

const Cart = {
  items: [],
  whatsapp: '',
  currency: '$',

  init(whatsapp, currency) {
    this.whatsapp = whatsapp;
    this.currency = currency;
    this.load();
    this.render();
  },

  load() {
    try {
      const saved = localStorage.getItem('cart_items');
      this.items = saved ? JSON.parse(saved) : [];
    } catch {
      this.items = [];
    }
  },

  save() {
    localStorage.setItem('cart_items', JSON.stringify(this.items));
  },

  add(product, quantity) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagenes?.[0] || '',
        quantity,
        min_unidades: product.min_unidades || 1,
        pasos: product.pasos || [1],
      });
    }
    this.save();
    this.render();
    this.showNotification(`${product.nombre} agregado al carrito`);
    this.open();
  },

  updateQuantity(id, newQty) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    const min = item.min_unidades || 1;
    if (newQty < min) {
      this.remove(id);
      return;
    }
    item.quantity = newQty;
    this.save();
    this.render();
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
  },

  clear() {
    this.items = [];
    this.save();
    this.render();
  },

  total() {
    return this.items.reduce((sum, i) => sum + i.precio * i.quantity, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },

  open() {
    document.getElementById('cart-sidebar').classList.add('open');
    document.getElementById('cart-overlay').classList.add('visible');
  },

  close() {
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('visible');
  },

  toggle() {
    document.getElementById('cart-sidebar').classList.toggle('open');
    document.getElementById('cart-overlay').classList.toggle('visible');
  },

  render() {
    const badge = document.getElementById('cart-badge');
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    const emptyMsg = document.getElementById('cart-empty');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const count = this.count();

    // Badge
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    if (!list) return;

    if (this.items.length === 0) {
      list.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (totalEl) totalEl.textContent = `${this.currency} 0,00`;
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;

    list.innerHTML = this.items.map(item => {
      const pasos = item.pasos && item.pasos.length > 0 ? item.pasos : [1];
      const min = item.min_unidades || 1;

      const stepsHtml = pasos.length > 1
        ? `<div class="cart-item-steps">${pasos.map(s =>
            `<button class="step-btn" onclick="Cart.changeStep('${item.id}', ${s})">+${s}</button>`
          ).join('')}</div>`
        : '';

      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-img">
            ${item.imagen
              ? `<img src="${item.imagen}" alt="${item.nombre}" onerror="this.style.display='none'">`
              : `<div class="cart-img-placeholder">📦</div>`}
          </div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.nombre}</div>
            <div class="cart-item-price">${this.currency} ${this.fmt(item.precio)}</div>
            <div class="cart-item-qty-row">
              <button class="qty-btn minus" onclick="Cart.adjustQty('${item.id}', -${pasos[0]})">−</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn plus" onclick="Cart.adjustQty('${item.id}', ${pasos[0]})">+</button>
            </div>
            ${stepsHtml}
            <div class="cart-item-subtotal">${this.currency} ${this.fmt(item.precio * item.quantity)}</div>
          </div>
          <button class="cart-item-remove" onclick="Cart.remove('${item.id}')" title="Eliminar">✕</button>
        </div>`;
    }).join('');

    if (totalEl) totalEl.textContent = `${this.currency} ${this.fmt(this.total())}`;
  },

  adjustQty(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    this.updateQuantity(id, item.quantity + delta);
  },

  changeStep(id, step) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    this.updateQuantity(id, item.quantity + step);
  },

  checkout() {
    if (this.items.length === 0) return;
    this.close();
    openCheckout();
  },

  submitCheckout() {
    // Validar campos obligatorios
    const nombre = document.getElementById('co-nombre').value.trim();
    const dni    = document.getElementById('co-dni').value.trim();
    const entrega = document.querySelector('input[name="entrega"]:checked')?.value;
    const pago   = document.querySelector('input[name="pago"]:checked')?.value;
    const direccion = document.getElementById('co-direccion').value.trim();

    let valid = true;
    const req = (id, condition) => {
      const el = document.getElementById(id);
      if (!condition) { el?.classList.add('error'); valid = false; }
      else el?.classList.remove('error');
    };

    req('co-nombre', nombre);
    req('co-dni', dni);
    if (!entrega) { document.getElementById('entrega-group').style.outline = '2px solid var(--color-danger)'; valid = false; }
    else document.getElementById('entrega-group').style.outline = '';
    if (!pago) { document.querySelector('.radio-group:last-of-type').style.outline = '2px solid var(--color-danger)'; valid = false; }
    else document.querySelector('.radio-group:last-of-type').style.outline = '';
    if (entrega === 'domicilio') req('co-direccion', direccion);

    if (!valid) {
      document.querySelector('.checkout-body').scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const telefono = document.getElementById('co-telefono').value.trim();
    const nota     = document.getElementById('co-nota').value.trim();

    const entregaLabel = {
      domicilio: '🏠 Envío a domicilio',
      sucursal:  '🏪 Retiro por sucursal',
      punto:     '📍 Retiro en punto de entrega',
    }[entrega];

    const lines = this.items.map(i =>
      `  • ${i.nombre} x${i.quantity} → ${this.currency} ${this.fmt(i.precio * i.quantity)}`
    );

    const msg = [
      '🛒 *PEDIDO NUEVO*',
      '',
      '📦 *Productos:*',
      ...lines,
      `  *Total: ${this.currency} ${this.fmt(this.total())}*`,
      '',
      '👤 *Datos del comprador:*',
      `  Nombre: ${nombre}`,
      `  DNI: ${dni}`,
      telefono ? `  Teléfono: ${telefono}` : '',
      '',
      `🚚 *Entrega:* ${entregaLabel}`,
      (entrega === 'domicilio') ? `  Dirección: ${direccion}` : '',
      '',
      `💳 *Forma de pago:* ${pago}`,
      nota ? `\n📝 *Nota:* ${nota}` : '',
      '',
      '_Enviado desde el catálogo online_',
    ].filter(l => l !== '').join('\n');

    const number = String(this.whatsapp || CONFIG.WHATSAPP).replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  showNotification(msg) {
    const el = document.getElementById('cart-notification');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
  },

  fmt(n) {
    return parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};
