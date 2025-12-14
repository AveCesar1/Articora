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
- `/verify-email` - Página de verificación de correo electrónico (OTP)
- `/forgot-password` - Página de recuperación de contraseña

### 👤 Perfil y Configuración
- `/profile` - Perfil de usuario
- `/profile/config` - Configuración del perfil de usuario (6 pestañas)

### 🔍 Búsqueda y Contenido
- `/search` - Página de búsqueda avanzada con filtros
- `/upload` - Página para subir nuevas fuentes bibliográficas
- `/post/:id` - Página de detalle de una publicación

### 📚 Información y Ayuda
- `/faq` - Página de preguntas frecuentes (FAQ) con 5 categorías
- `/terms` - Página de términos y políticas

### ⚠️ Error
- Cualquier ruta no definida muestra la página 404 personalizada

### 🚧 En Desarrollo
- `/dashboard` - Dashboard principal de usuario
- `/post/:id` - Detalle completo de fuente
- `/chat` - Sistema de chat individual y grupal
- `/lists` - Gestión de listas curatoriales
- `/compare` - Comparador de fuentes
- `/admin` - Panel de administración

## 🎨 Diseño

- Bootstrap 5.3
- CSS personalizado
- JavaScript modular
- Diseño responsivo
