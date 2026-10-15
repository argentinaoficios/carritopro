# Catálogo Pro

Catálogo de productos con carrito, carrusel de fotos y checkout por WhatsApp.
Stack: Google Sheets + Apps Script (backend) + GitHub + Vercel (frontend).

---

## Estructura de archivos

```
/
├── index.html                 ← Catálogo principal
├── admin.html                 ← Panel de administración
├── css/
│   ├── styles.css
│   └── admin.css
├── js/
│   ├── config.js              ← ⚠ EDITÁ ESTE ARCHIVO con tus datos
│   ├── api.js
│   ├── cart.js
│   ├── main.js
│   └── admin.js
└── google-apps-script/
    └── Code.gs                ← Código del backend (Apps Script)
```

---

## Paso 1 — Configurar Google Apps Script

1. Abrí [script.google.com](https://script.google.com) y creá un nuevo proyecto.
2. Copiá todo el contenido de `google-apps-script/Code.gs` en el editor.
3. Cambiá la línea:
   ```js
   const ADMIN_KEY = 'CAMBIA_ESTA_CLAVE_SECRETA';
   ```
   por una clave segura que sólo vos sepas.
4. Guardá el proyecto (Ctrl+S).
5. Hacé clic en **Implementar → Nueva implementación**.
6. Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
7. Copiá la **URL de la implementación** (algo como `https://script.google.com/macros/s/ABC123.../exec`).

> ⚠ **Importante:** cada vez que modifiques el código de Apps Script, tenés que crear una **nueva implementación** (no editar la existente) para que los cambios se apliquen.

---

## Paso 2 — Editar `js/config.js`

```js
const CONFIG = {
  API_URL:   'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec',
  ADMIN_KEY: 'LA_MISMA_CLAVE_QUE_PUSISTE_EN_CODE_GS',
  WHATSAPP:  '5491144445555',  // Tu número sin + ni espacios
  CURRENCY:  '$',
};
```

---

## Paso 3 — Subir a GitHub

1. Creá un repositorio nuevo en [github.com](https://github.com).
2. Subí todos los archivos del frontend (todo **excepto** la carpeta `google-apps-script/`).
3. Hacé push a la rama `main`.

```bash
git init
git add .
git commit -m "Primer commit catálogo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

---

## Paso 4 — Deploy en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta (gratis).
2. **New Project → Import Git Repository** → seleccioná tu repo de GitHub.
3. En la configuración:
   - Framework Preset: **Other**
   - Root Directory: `/` (raíz)
   - No build command, no output directory
4. Hacé clic en **Deploy**.
5. Vercel te da una URL pública. ¡Listo!

> Cada vez que hagas push a `main`, Vercel re-deploya automáticamente.

---

## Uso del panel admin

- Accedé a `tu-url.vercel.app/admin.html`
- Ingresá la clave que configuraste en `ADMIN_KEY`
- Desde ahí podés **agregar, editar y eliminar productos**
- También configurar nombre de tienda, colores, WhatsApp, banner, etc.

---

## Agregar imágenes a los productos

Podés usar cualquier URL pública de imagen:

- **Google Drive:** subí la imagen → clic derecho → Compartir → "Cualquier persona con el enlace" → tomá el ID del archivo y usá: `https://drive.google.com/uc?id=TU_ID`
- **Imgur:** subí en [imgur.com](https://imgur.com) y copiá el link directo (termina en `.jpg`, `.png`)
- **Cualquier otro hosting:** siempre que sea una URL que termina en imagen

---

## Configuración de unidades por producto

En el panel admin, campo **"Pasos de cantidad"**:

| Valor | Comportamiento |
|-------|---------------|
| `1` | De a 1 unidad (default) |
| `1,5,10` | Botones: +1 / +5 / +10 |
| `5,10,50` | Mínimo 5, botones de +5 / +10 / +50 |

El campo **"Unidades mínimas"** define cuántas unidades como mínimo puede pedir el cliente.

---

## Personalizar colores

Desde el panel admin → **Configuración** podés cambiar:
- Color principal (header, botones, precios)
- Color de acento (badges, botones de paso)
- Logo
- Banner de bienvenida

Los cambios se guardan en Google Sheets y se aplican al cargar el catálogo.
