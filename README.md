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
- `server.js` - Servidor principal

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
