# 📜 Artícora — Curación y descubrimiento académico en español

Artícora es una plataforma pensada para académicos que necesitan descubrir, organizar y evaluar fuentes bibliográficas. Permite crear colecciones revisadas por personas, buscar por similitud semántica en español y comunicarse sin comprometer la privacidad.

Todas las funcionalidades giran alrededor de tres ideas: colaboración real en la curación de referencias, búsquedas que entiendan el contenido (no solo palabras exactas) y protección de los datos desde el diseño.

## ⁉️ Qué puedes hacer con Artícora

- **Listas curatoriales colaborativas.** Cada lista reúne fuentes verificadas. Puedes invitar a colegas, añadir comentarios y decidir qué se incluye.
- **Búsqueda semántica local (TF‑IDF).** No depende de servicios externos; indexa títulos, autores y palabras clave. Los resultados aparecen ordenados por relevancia temática, no solo por coincidencia textual.
- **Registro con verificación.** Los nuevos usuarios pasan por un flujo de verificación de identidad (documentos oficiales o certificados institucionales). Las cuentas verificadas generan más confianza en las valoraciones.
- **Valoraciones detalladas.** Puedes puntuar fuentes con cinco criterios (extensión, nivel de detalle, dificultad técnica, completitud y veracidad) y añadir comentarios. Todo queda registrado y visible para la comunidad.
- **Mensajería y archivos cifrados.** El chat (individual o grupal) cifra el contenido de extremo a extremo; el servidor solo guarda datos ilegibles. Lo mismo ocurre con los archivos adjuntos.
- **Moderación automática y backups seguros.** Se comprueban URLs diariamente, se detecta lenguaje ofensivo y se marcan posibles duplicados. Las copias de seguridad se cifran y rotan automáticamente.

## 📌 Rutas de la aplicación

### 📍 Páginas principales
- `/` – landing page
- `/login` – inicio de sesión
- `/register` – registro de cuenta
- `/chat` – mensajería (individual y grupal)

### 👤 Perfil y configuración
- `/dashboard` – panel principal
- `/profile` – perfil público
- `/profile/config` – ajustes personales (seis pestañas)
- `/verify-email` – verificación del correo con código OTP
- `/forgot-password` – recuperación de contraseña

### 🔍 Búsqueda y contenido
- `/search` – búsqueda avanzada con filtros
- `/upload` – subida de nuevas fuentes bibliográficas
- `/post/:id` – vista de detalle de una fuente
- `/lists` – gestión y búsqueda de listas curatoriales
- `/lists/:id` – vista de una lista concreta
- `/compare` – comparador de fuentes

### 📚 Información y ayuda
- `/faq` – preguntas frecuentes (cinco categorías)
- `/terms` – términos y políticas

### ⚠️ Error
- Cualquier ruta no definida muestra una página 404 personalizada.

### 🚩 Administración
- `/admin` – panel de administración
- `/compare/admin` – comparador de metadatos para fusionar duplicados

## Puesta en marcha rápida

1. Clona el repositorio e instala las dependencias: `npm install`
2. Define las variables de entorno necesarias (consulta el [RESUMEN.MD](RESUMEN.MD) para ver la lista completa y qué hace cada una).
3. Ejecuta en desarrollo: `npm run dev` (o `npm start` en producción).

Para la documentación técnica detallada (endpoints, esquema de base de datos, TF‑IDF, cifrado y despliegue), abre **[RESUMEN.MD](RESUMEN.MD)**.

## Licencia y contacto

Proyecto para uso personal y demostración.