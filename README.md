# Mis 15 Delfi 🎉

PWA para que los invitados de la fiesta saquen fotos con la cámara del
celular (o elijan de la galería) y las suban a un servidor, con una galería
en vivo estilo mosaico. Diseño en plateado y rosa.

## Estructura

```
mis15-delfi/
├── backend/      Servidor Express que recibe y guarda las fotos
│   ├── server.js
│   └── uploads/  Carpeta donde se guardan las fotos subidas
└── frontend/     PWA en React + Vite + React-Bootstrap
    └── src/
        ├── components/
        │   ├── Header.jsx        Título "Mis 15 Delfi" (compacto)
        │   ├── Gallery.jsx       Galería mosaico + scroll infinito + lightbox
        │   └── UploadWidget.jsx  Botón fijo + popup (elegir → preview → subir)
        ├── hooks/
        │   └── usePhotos.js      Paginación por cursor + sondeo de fotos nuevas
        ├── api.js
        ├── App.jsx               Pantalla única
        └── theme.css             Paleta plateado + rosa
```

## 1. Instalación

Necesitás Node.js 18+ instalado.

```bash
# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd frontend
npm install
```

## 2. Correrlo en desarrollo

```bash
# Terminal 1
cd backend
npm run dev        # http://localhost:4000

# Terminal 2
cd frontend
npm run dev         # http://localhost:5173
```

Abrí `http://localhost:5173` desde tu celular (conectado a la misma red
Wi-Fi) usando la IP de tu computadora, por ejemplo `http://192.168.0.10:5173`,
para poder probar la cámara. El navegador va a pedir acceso a la cámara la
primera vez.

> Nota: los navegadores solo permiten acceder a la cámara en `https://` o en
> `localhost`. En una red local sin HTTPS vas a poder elegir fotos de la
> galería del celular sin problema, pero para el botón "Sacar foto" en un
> dispositivo remoto vas a necesitar HTTPS (ver sección de deploy).

## 3. Cómo funciona la app

Es una sola pantalla: la galería es lo primero que se ve, con las fotos más
recientes arriba. Al hacer scroll hacia abajo se van cargando las más
antiguas automáticamente (scroll infinito, de a 20 fotos por vez).

Abajo de todo hay un botón fijo **"Subir foto"** que abre un popup con estos
pasos:

1. **Elegir origen**: "Sacar foto" (abre la cámara trasera del celular via
   `<input type="file" accept="image/*" capture="environment">`, el estándar
   para PWAs) o "Elegir de la galería" del dispositivo.
2. **Preview**: muestra la foto elegida con dos botones — **"Subir esta
   foto"** o **"Volver a sacar"** (por si salió mal, vuelve al paso 1 sin
   haber tocado el servidor todavía).
3. **Progreso**: al confirmar, se sube por `POST /api/upload`
   (multipart/form-data) mostrando una barra de progreso dentro del mismo
   popup. El backend la guarda en `backend/uploads/` con un nombre único.
4. **Listo**: el popup se cierra solo y la foto aparece al instante arriba
   de todo en la galería.

Mientras tanto, cada ~12 segundos la app consulta si otros invitados subieron
fotos nuevas y las va sumando arriba, sin interrumpir el scroll de quien está
mirando fotos viejas más abajo (la paginación usa un cursor por fecha, así
que cargar fotos nuevas o viejas no se pisa).

## 4. Personalizar

- **Frase y colores**: en `frontend/src/components/Header.jsx` y
  `frontend/src/theme.css` (variables `--rosa-fuerte`, `--rosa`,
  `--plateado`, etc. al principio del archivo).
- **Ícono de la app / splash**: reemplazá los archivos en
  `frontend/public/icons/` (192x192, 512x512 y apple-touch-icon), manteniendo
  los mismos nombres, o cambiá las rutas en `vite.config.js`.
- **Carpeta de fotos en el server**: es `backend/uploads/`. Si querés otra
  ruta (por ejemplo un disco montado aparte), cambiá `UPLOAD_DIR` en
  `backend/server.js`.

## 5. Build de producción

```bash
cd frontend
npm run build       # genera frontend/dist
```

## 6. Deploy recomendado

La forma más simple es servir todo desde el mismo dominio con HTTPS
(necesario para que la cámara funcione en celulares que no sean localhost):

1. Subí la carpeta `backend/` a tu servidor (VPS, Render, Railway, etc.) y
   corré `npm install && npm start`. Anotá dónde queda accesible
   (por ejemplo `https://fotos.tudominio.com`).
2. Hacé `npm run build` en `frontend/` y serví el contenido de
   `frontend/dist` desde el mismo servidor (por ejemplo con Nginx, o
   agregando `express.static` en `server.js` apuntando a `frontend/dist`).
3. Si preferís desplegar frontend y backend en dominios distintos, definí
   `VITE_API_URL=https://tu-backend.com` en un archivo `.env` dentro de
   `frontend/` antes de buildear, y asegurate de que el backend permita CORS
   desde el dominio del frontend (ya está habilitado `cors()` para todos los
   orígenes; podés restringirlo en `server.js` si querés).
4. Con HTTPS activo, compartí el link a los invitados: el navegador les va
   a ofrecer "Agregar a pantalla de inicio" para instalar la PWA.

## 7. Ideas opcionales para sumar después

- Moderación: mostrar las fotos en la galería solo después de aprobarlas
  desde un panel simple.
- Descargar todas las fotos en un .zip al final de la fiesta.
- Límite de fotos por invitado o marca de agua con el nombre "Mis 15 Delfi".
