// =====================================================
//  API — comunicación con Google Apps Script
// =====================================================

const API = {
  async get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    // Apps Script requiere redirect manual
    const res = await fetch(url.toString(), { redirect: 'follow' });
    return res.json();
  },

  async post(action, data = {}) {
    const body = JSON.stringify({ action, key: CONFIG.ADMIN_KEY, ...data });
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script necesita text/plain para POST
      body,
    });
    return res.json();
  },

  async getProducts() {
    return this.get('getProducts');
  },

  async getProductsAdmin() {
    return this.get('getProductsAdmin');
  },

  async getConfig() {
    return this.get('getConfig');
  },

  async addProduct(product) {
    return this.post('addProduct', { product });
  },

  async updateProduct(product) {
    return this.post('updateProduct', { product });
  },

  async deleteProduct(id) {
    return this.post('deleteProduct', { id });
  },

  async reactivateProduct(id) {
    return this.post('reactivateProduct', { id });
  },

  async updateConfig(config) {
    return this.post('updateConfig', { config });
  },
};
