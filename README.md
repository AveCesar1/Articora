# Artícora - Plataforma de Investigación Colaborativa

Plataforma web para la curación colaborativa de fuentes bibliográficas académicas.

## 🚀 Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Crear archivo `.env` con las variables necesarias
4. Ejecutar en desarrollo: `npm run dev`

## 📁 Estructura del proyecto

- `public/` - Archivos estáticos (CSS, JS, imágenes)
- `views/` - Plantillas EJS
- `server.js` - Servidor principal (punto de entrada)
- `lib/` - Módulos reutilizables (p. ej. `database.js`)
- `routes/` - Rutas separadas por tipo (`getRoutes.js`, `postRoutes.js`)

## 🔧 Comandos

- `npm start` - Inicia en modo producción
- `npm run dev` - Inicia con nodemon (recarga automática)

## 🔗 Rutas

### 📍 Páginas Principales
- `/` - Landing page (página de inicio)
- `/login` - Página de inicio de sesión
- `/register` - Página de registro de cuenta
- `/chat` - Sistema de chat individual y grupal

### 👤 Perfil y Configuración
- `/dashboard` - Dashboard principal de usuario
- `/profile` - Perfil de usuario
- `/profile/config` - Configuración del perfil de usuario (6 pestañas)
- `/verify-email` - Página de verificación de correo electrónico (OTP)
- `/forgot-password` - Página de recuperación de contraseña

### 🔍 Búsqueda y Contenido
- `/search` - Página de búsqueda avanzada con filtros
- `/upload` - Página para subir nuevas fuentes bibliográficas
- `/post/:id` - Página de detalle de una publicación
- `/lists` - Gestión y búsqueda de listas curatoriales
- `/lists/:id` - Vista de listas curatoriales
- `/compare` - Comparador de fuentes

### 📚 Información y Ayuda
- `/faq` - Página de preguntas frecuentes (FAQ) con 5 categorías
- `/terms` - Página de términos y políticas

### ⚠️ Error
- Cualquier ruta no definida muestra la página 404 personalizada

### 🚩Administración
- `/admin` - Panel de administración
- `/compare/admin` - Comparador de metadatos para duplicados

## 🎨 Diseño

- Bootstrap 5.3
- CSS personalizado
- JavaScript modular
- Diseño responsivo

---

## 🧩 Estructura modular (Node.js)

La aplicación se organizó en módulos pequeños y conectados para facilitar el mantenimiento y para que el flujo back-end esté claro y localizado.

- `server.js` — Orquesta la aplicación: configura Express/EJS, carga middlewares globales, expone el `transporter` de nodemailer en `app.locals`, y registra rutas usando los loaders en `routes/`.

- `lib/database.js` — Núcleo de la base de datos: `initialize()` para crear/optimizar la BD y `databaseMiddleware` que inyecta `req.db`. Aquí están los helpers SQL reutilizables.

- `routes/getRoutes.js` y `routes/postRoutes.js` — Loaders: cada uno requiere automáticamente los ficheros en `routes/gets/` y `routes/posts/`. Cada fichero de rutas exporta una función `(app) => { /* registra endpoints */ }` para mantener las rutas agrupadas por responsabilidad.

- `middlewares/` — Middlewares compartidos (p. ej. `auth.js`, `checkrole.js`). `auth.js` contiene la lógica de autenticación: verificación de credenciales con `bcrypt` (salt=12), creación/verificación de JWT (`process.env.JWT_SECRET`) y population de `req.session`/`res.locals`.

- `views/emails/` — Plantillas de correo (por ejemplo `verification.ejs`) usadas por las rutas de registro/verificación junto al `transporter` de nodemailer.

Estado y dónde mirar
- El backend core y la autenticación ya están implementados: la inicialización de la BD, el flujo de registro/verification por correo, login con cookie JWT (`token`, httpOnly) y logout están en `server.js`, `routes/posts/userPosts.js` y `middlewares/auth.js`.
- Para entender o cambiar el comportamiento de autenticación/email revisa esos tres archivos.
