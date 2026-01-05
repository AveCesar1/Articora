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

Para mejorar el mantenimiento y aislar responsabilidades se reorganizó la aplicación en módulos claros:

- `lib/database.js`
  - Contiene la conexión a SQLite (`better-sqlite3`), pragmas y helpers (`dbHelpers`).
  - Expone la función `initialize()` para crear/optimizar la BD y el middleware `databaseMiddleware` que inyecta `req.db` en las rutas.
  - Implementa ejecución robusta de scripts SQL (intenta `db.exec`, y si falla ejecuta CREATEs primero y luego INSERTs), y maneja cierre ordenado de la BD.

- `routes/getRoutes.js`
  - Todas las rutas públicas GET (páginas y vistas) se movieron aquí.
  - Conserva los datos mock / valores por defecto tal como estaban en `server.js`.
  - Exporta una función `(app) => { /* registra rutas GET */ }` que `server.js` invoca.

- `routes/postRoutes.js`
  - Contenedor para las rutas POST. Está listo para recibir y mantener las rutas POST con sus datos por defecto.
  - Si necesitas que traslade bloques POST concretos desde el `server.js` original, puedo moverlos sin eliminar sus datos.

- `server.js`
  - Ahora actúa como orquestador: configura Express y EJS, carga middleware global, importa `lib/database.js` y registra las rutas desde `routes/*.js`.
  - Inicia `initialize()` y, una vez lista la BD, arranca el servidor.

### Ventajas de la separación
- Código más legible y más fácil de depurar.
- Permite reinicializar o testear la BD independientemente del servidor HTTP.
- Facilita añadir nuevas rutas o agruparlas por funcionalidad (p. ej. `routes/admin.js`).
- Evita que un fallo en una operación SQL deje la BD en un estado parcialmente creado sin trazabilidad (se mejoró el manejo de errores y logging).

### Recomendaciones operativas
- Si actualizas `database/init.sql` o `database/indexes.sql`, borra `database/articora.db` para forzar una re-inicialización limpia y luego ejecuta `npm run dev`.
- Para añadir rutas POST, edita `routes/postRoutes.js` y registra los endpoints ahí; `server.js` los cargará automáticamente.
- Para añadir nuevos helpers de BD, crea archivos en `lib/` y exporta lo necesario.