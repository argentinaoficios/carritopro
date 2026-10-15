// =====================================================
// CATALOGO PRO - Google Apps Script Backend
// Desplegá esto como Web App en Google Apps Script
// =====================================================

const PRODUCTS_SHEET = 'Productos';
const CONFIG_SHEET = 'Config';

// Cambiá esto por una clave segura antes de deployar
const ADMIN_KEY = 'CAMBIA_ESTA_CLAVE_SECRETA';

// ── CORS helper ──────────────────────────────────────
function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

function json(data) {
  return cors(ContentService.createTextOutput(JSON.stringify(data)));
}

// ── Router ───────────────────────────────────────────
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'getProducts';
    if (action === 'getProducts')      return json(getProducts());
    if (action === 'getProductsAdmin') return json(getProducts(true));
    if (action === 'getConfig')        return json(getConfig());
    return json({ error: 'Acción no válida' });
  } catch(err) {
    return json({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Verificar clave de admin
    if (body.key !== ADMIN_KEY) {
      return json({ error: 'No autorizado' });
    }

    const action = body.action;
    if (action === 'addProduct')        return json(addProduct(body.product));
    if (action === 'updateProduct')     return json(updateProduct(body.product));
    if (action === 'deleteProduct')     return json(deleteProduct(body.id));
    if (action === 'reactivateProduct') return json(reactivateProduct(body.id));
    if (action === 'updateConfig')      return json(saveConfig(body.config));
    if (action === 'reorderProducts')   return json(reorderProducts(body.order));

    return json({ error: 'Acción no válida' });
  } catch(err) {
    return json({ error: err.message });
  }
}

// ── Inicializar hojas ─────────────────────────────────
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PRODUCTS_SHEET);
    const headers = ['id','nombre','descripcion','precio','imagenes','categoria','stock','min_unidades','pasos','variantes','variantes_label','activo','orden'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  let cfg = ss.getSheetByName(CONFIG_SHEET);
  if (!cfg) {
    cfg = ss.insertSheet(CONFIG_SHEET);
    cfg.appendRow(['clave', 'valor']);
    cfg.appendRow(['storeName', 'Mi Tienda']);
    cfg.appendRow(['whatsapp', '5491100000000']);
    cfg.appendRow(['currency', '$']);
    cfg.appendRow(['primaryColor', '#1e3a5f']);
    cfg.appendRow(['accentColor', '#f59e0b']);
    cfg.appendRow(['logoUrl', '']);
    cfg.appendRow(['bannerText', 'Bienvenido a nuestra tienda']);
  }
}

// ── GET Products ──────────────────────────────────────
function getProducts(includeInactive) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) return { products: [], categories: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { products: [], categories: [] };

  const headers = data[0];
  const products = [];
  const categoriesSet = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const p = {};
    headers.forEach((h, j) => { p[h] = row[j]; });

    p.imagenes = p.imagenes
      ? String(p.imagenes).split(',').map(s => s.trim()).filter(Boolean)
      : [];
    p.pasos = p.pasos
      ? String(p.pasos).split(',').map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0)
      : [1];
    p.activo = p.activo === true || p.activo === 'TRUE';
    p.precio = parseFloat(p.precio) || 0;
    p.stock = parseInt(p.stock) || 0;
    p.min_unidades = parseInt(p.min_unidades) || 1;
    p.orden = parseInt(p.orden) || 999;

    if (includeInactive || p.activo) {
      products.push(p);
      if (p.categoria && p.activo) categoriesSet.add(p.categoria);
    }
  }

  products.sort((a, b) => a.orden - b.orden);

  return {
    products,
    categories: Array.from(categoriesSet).sort()
  };
}

// ── Reactivate Product ────────────────────────────────
function reactivateProduct(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) return { error: 'Hoja no encontrada' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('id');
  const activoIdx = headers.indexOf('activo');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      sheet.getRange(i + 1, activoIdx + 1).setValue(true);
      return { success: true };
    }
  }
  return { error: 'Producto no encontrado' };
}

// ── Add Product ───────────────────────────────────────
function addProduct(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) initSheet(), sheet = ss.getSheetByName(PRODUCTS_SHEET);

  const id = Utilities.getUuid();
  const data = sheet.getDataRange().getValues();
  const maxOrden = data.slice(1).reduce((m, r) => Math.max(m, parseInt(r[10]) || 0), 0);

  sheet.appendRow([
    id,
    p.nombre || '',
    p.descripcion || '',
    parseFloat(p.precio) || 0,
    Array.isArray(p.imagenes) ? p.imagenes.join(',') : (p.imagenes || ''),
    p.categoria || '',
    parseInt(p.stock) || 0,
    parseInt(p.min_unidades) || 1,
    Array.isArray(p.pasos) ? p.pasos.join(',') : (p.pasos || '1'),
    p.variantes || '',
    p.variantes_label || '',
    true,
    maxOrden + 1
  ]);

  return { success: true, id };
}

// ── Update Product ────────────────────────────────────
function updateProduct(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) return { error: 'Hoja no encontrada' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === p.id) {
      headers.forEach((h, j) => {
        if (p[h] === undefined) return;
        let val = p[h];
        if (h === 'imagenes' && Array.isArray(val)) val = val.join(',');
        if (h === 'pasos' && Array.isArray(val)) val = val.join(',');
        sheet.getRange(i + 1, j + 1).setValue(val);
      });
      return { success: true };
    }
  }
  return { error: 'Producto no encontrado' };
}

// ── Delete (soft) Product ─────────────────────────────
function deleteProduct(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) return { error: 'Hoja no encontrada' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('id');
  const activoIdx = headers.indexOf('activo');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      sheet.getRange(i + 1, activoIdx + 1).setValue(false);
      return { success: true };
    }
  }
  return { error: 'Producto no encontrado' };
}

// ── Config ────────────────────────────────────────────
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  const defaults = {
    storeName: 'Mi Tienda',
    whatsapp: '',
    currency: '$',
    primaryColor: '#1e3a5f',
    accentColor: '#f59e0b',
    logoUrl: '',
    bannerText: 'Bienvenido a nuestra tienda'
  };

  if (!sheet) return { config: defaults };

  const data = sheet.getDataRange().getValues();
  const config = { ...defaults };

  data.slice(1).forEach(row => {
    if (row[0]) config[row[0]] = row[1];
  });

  return { config };
}

function saveConfig(newConfig) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET);
    sheet.appendRow(['clave', 'valor']);
  }

  const data = sheet.getDataRange().getValues();
  const existing = {};
  data.slice(1).forEach((row, i) => {
    if (row[0]) existing[row[0]] = i + 2; // row number (1-based + header)
  });

  Object.entries(newConfig).forEach(([key, value]) => {
    if (existing[key]) {
      sheet.getRange(existing[key], 2).setValue(value);
    } else {
      sheet.appendRow([key, value]);
    }
  });

  return { success: true };
}

// ── Reorder Products ──────────────────────────────────
function reorderProducts(orderArray) {
  // orderArray = [{ id, orden }]
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PRODUCTS_SHEET);
  if (!sheet) return { error: 'Hoja no encontrada' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('id');
  const ordenIdx = headers.indexOf('orden');

  const orderMap = {};
  orderArray.forEach(item => { orderMap[item.id] = item.orden; });

  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (orderMap[id] !== undefined) {
      sheet.getRange(i + 1, ordenIdx + 1).setValue(orderMap[id]);
    }
  }
  return { success: true };
}
