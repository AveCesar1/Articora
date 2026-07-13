# Documentación técnica de Artícora

Este documento describe la arquitectura, los endpoints más relevantes, el modelo de datos y los procesos internos de Artícora. Está dirigido a quien necesite desplegar, mantener o ampliar la plataforma.

## Arquitectura general

El servidor arranca desde `server.js`. Configura Express con vistas EJS, sesiones (`express-session`), autenticación JWT, envío de correos con Nodemailer, subida de archivos con Multer y tareas programadas (cron). Las rutas se cargan desde dos puntos:

- `routes/postRoutes.js`
- `routes/getRoutes.js`

La lógica concreta de cada grupo de endpoints está repartida en archivos dentro de `routes/posts/` y `routes/gets/` (auth, fuentes, chat, listas, administración, etc.).

La base de datos es SQLite, gestionada con `better-sqlite3` desde `lib/database.js`. El esquema y los índices están definidos en `database/init.sql` e `database/indexes.sql`.

El sistema de búsqueda semántica utiliza TF‑IDF con un pipeline escrito en Python, dentro de la carpeta `tf-idf/`. Los scripts principales son:

- `index_source.py`: indexa una fuente individual.
- `recalc_idf.py`: recalcula los valores IDF globales y reindexa todo.
- `search.py`: busca desde línea de comandos.
- `preprocess.py`: preprocesamiento de texto (tokenización, limpieza, stopwords en español).

El cifrado se apoya en `lib/crypto_utils.js` y `lib/encryption_key.js`. Las copias de seguridad cifradas se almacenan en `database/backups/` y las claves persistentes de desarrollo en `secure_storage/`.

## Endpoints principales

La aplicación expone tanto vistas EJS como APIs JSON. La mayoría de las peticiones que modifican datos requieren sesión (`express-session`) y una cookie JWT (`token`).

### Autenticación y registro

- `POST /register` – crea un registro pendiente y envía un código OTP.
- `POST /verify-email` – verifica el código; el usuario pasa a estado "pendiente de completar".
- `POST /complete-registration` – finaliza el registro; si el cliente ha generado claves, guarda `user_keys`.
- `POST /login` – inicia sesión, devuelve la cookie JWT y, si existen, las claves cifradas del usuario.
- `POST /logout`, `GET /logout` – cierran sesión.
- `POST /forgot-password`, `/forgot-password/verify`, `/forgot-password/reset` – flujo completo de recuperación.

### Perfil y configuración

- `POST /profile/config-profile/update` – actualiza perfil (email cifrado, intereses, etc.).
- `POST /profile/config-profile/change-password` – cambia la contraseña.
- `POST /profile/config-profile/*` – endpoints para privacidad, dashboard, notificaciones y avatar.

### Fuentes, valoraciones y comentarios

- `POST /upload` – registra una nueva fuente bibliográfica. Almacena metadatos, autores y URLs. Dispara la indexación TF‑IDF en segundo plano.
- `POST /api/sources/:id/rate` – crea o actualiza una valoración (varios criterios).
- `POST /api/sources/:id/comment` – añade o edita el comentario ligado a una valoración.
- `POST /api/sources/:id/delete` – elimina la fuente (propietario o administrador).

### Listas curatoriales

- `POST /api/lists` – crea una lista.
- `POST /api/lists/:id/sources` – añade fuentes.
- `POST /api/lists/:id/invite` – invita colaboradores.
- `POST /api/lists/:id/collaborators/respond` – acepta o rechaza una invitación.
- Las estadísticas de vistas de una lista se calculan desde `list_views` para contar visitas únicas por usuario y obtener el desglose mensual de los últimos 12 meses.

### Lecturas y listas personales

- `GET /api/user/reading-list` – obtiene la lista de lectura.
- `POST /api/user/reading-list` – añade un elemento.
- `PUT /api/user/reading-list/reorder` – reordena.
- `DELETE /api/user/reading-list/:sourceId` – elimina un elemento.
- `POST /api/user/reads`, `PUT /api/user/reads/:sourceId`, `DELETE /api/user/reads/:sourceId` – gestión de "leídos".

### Chat y archivos (cifrados)

- `POST /api/contacts/request` – solicita un contacto.
- `POST /api/contacts/requests/:id/accept` o `reject` – acepta o rechaza solicitudes.
- `POST /api/chats/:chatId/messages` – envía un mensaje. El servidor espera `encrypted_content`, `iv` y `encrypted_key`; nunca ve el texto en claro.
- `POST /api/chats/:chatId/files` – sube un archivo cifrado para el chat (se guarda en `/public/uploads/chat_files`).

### Verificación de identidad

- `POST /verificacion/subir` – sube documentos (INE, certificados) cifrados con la clave central.
- `POST /verificacion/cedula` – consulta a la SEP (solo administrador).
- `GET /verificacion/my_requests`, `POST /verificacion/cancel/:id` – consulta y cancelación de solicitudes propias.

### Moderación y administración

- `POST /api/admin/compare/merge` – fusiona fuentes duplicadas.
- `POST /api/admin/reports/:id/resolve|reject|contact` – gestiona reportes.
- `GET /api/admin/system_alerts`, `POST /api/admin/run_system_checks` – ejecuta comprobaciones (validez de URLs, lenguaje ofensivo, duplicados).

El listado completo de rutas se encuentra en los archivos de `routes/posts/` y `routes/gets/`.

## Modelo de datos

Tablas principales:

- **users**: cuentas de usuario. El email se guarda cifrado. Flags: `is_validated`, `is_verified`, `is_admin`.
- **user_keys**: almacena `public_key` y `encrypted_private_key` (la clave privada la cifra el cliente antes de subirla).
- **sources / source_authors / source_urls**: fuentes bibliográficas y sus URLs asociadas.
- **ratings / rating_history**: valoraciones con múltiples criterios e historial.
- **curatorial_lists / list_sources**: listas y su relación con fuentes.
- **chats / chat_participants / messages**: mensajería cifrada (los contenidos se almacenan cifrados).
- **tfidf_vectors, global_idf, source_norms**: estructuras para la búsqueda TF‑IDF.
- **system_alerts / reports**: alertas internas y reportes de moderación.

El esquema detallado y los inserts iniciales están en `database/init.sql`; los índices en `database/indexes.sql`.

## Búsqueda semántica (TF‑IDF)

El documento virtual de cada fuente se construye ponderando: título (×3), autores (×1) y palabras clave (×2). Sobre ese texto se calcula el vector TF‑IDF y se almacena en SQLite.

Para poner en marcha el motor de búsqueda:

1. Crear un entorno virtual Python:  
   `python3 -m venv venv && source venv/bin/activate`
2. Instalar dependencias:  
   `pip install -r tf-idf/requirements.txt`
3. Descargar stopwords de NLTK:  
   `python3 -c "import nltk; nltk.download('stopwords')"`
4. Calcular los valores IDF globales y reindexar todas las fuentes:  
   `python3 tf-idf/recalc_idf.py`

Para indexar una fuente concreta:  
`python3 tf-idf/index_source.py <sourceId> "Título" "Autor1,Autor2" "keyword1,keyword2"`

Para probar una búsqueda desde terminal:  
`python3 tf-idf/search.py "consulta"` (devuelve un JSON con `source_id` y `score`).

## Cifrado y claves

- **Emails:** se cifran con AES‑256‑CBC usando una clave derivada de `EMAIL_ENC_KEY`. Las funciones `encryptEmail()` y `decryptEmail()` están en `lib/crypto_utils.js`. Para búsquedas exactas se genera un índice HMAC (`email_index`) con `EMAIL_INDEX_KEY`.
- **Documentos de verificación y backups:** utilizan `ENCRYPTION_KEY` (32 bytes en hex o base64). El backup cifrado escribe primero el IV (16 bytes) y luego el contenido. El script `database/backups/decrypt-backup.js` permite descifrarlo:  
  `ENCRYPTION_KEY=<clave> node database/backups/decrypt-backup.js entrada.db.enc salida.db`
- **Clave de desarrollo:** si no se define `ENCRYPTION_KEY` en desarrollo, la aplicación genera y persiste una clave en `secure_storage/encryption_key.bin`. En producción, establece siempre `ENCRYPTION_KEY` manualmente.
- **Mensajería:** cada mensaje almacena `encrypted_content`, `iv` y `encrypted_key`. La clave de sesión se cifra para cada participante; el servidor nunca accede al contenido en claro. La gestión de claves es responsabilidad del cliente.

## Tareas programadas

- `0 2 * * *` – recalcula IDF y reindexa (intenta ejecutar el script Python).
- `0 3 * * *` – comprueba diariamente el estado de las URLs (`lib/url_checker.js`).
- `0 4 * * *` – análisis diario de lenguaje ofensivo en comentarios (`lib/offensive_checker.js`).
- `0 0 * * 0` – reinicio semanal del contador de subidas (`weekly_file_uploads`).
- `0 0 1 * *` – backup mensual cifrado y limpieza de copias antiguas (conserva las 3 últimas).

## Variables de entorno

Imprescindibles en producción:

- `JWT_SECRET`
- `SESSION_SECRET`
- `EMAIL_PASSWORD`
- `ENCRYPTION_KEY` (32 bytes hex o base64)
- `EMAIL_ENC_KEY` – clave para cifrar emails.
- `EMAIL_INDEX_KEY` – clave para generar el índice HMAC de los emails.
- `BEARER_TOKEN` – token para el servicio de la SEP.
- `PORT`, `NODE_ENV`, `VERIFY_DIR` – directorio donde se guardan los documentos de verificación.

## Instalación local

1. Clonar el repositorio y entrar en el directorio.
2. `npm install`
3. Crear un archivo `.env` con las variables obligatorias.
4. (Si se va a usar búsqueda semántica) preparar el entorno Python:  
   `python3 -m venv venv && source venv/bin/activate`  
   `pip install -r tf-idf/requirements.txt`  
   `python3 -c "import nltk; nltk.download('stopwords')"`
5. La base de datos se crea automáticamente al arrancar (`initialize()` en `lib/database.js`).
6. `npm run dev` (desarrollo) o `npm start` (producción).

## Comandos rápidos

- `npm run dev` – servidor con recarga automática.
- `npm start` – producción.
- `python3 tf-idf/recalc_idf.py` – reindexa todo el corpus.
- `python3 tf-idf/search.py "términos"` – búsqueda de prueba.
- `ENCRYPTION_KEY=<hex> node database/backups/decrypt-backup.js backup.db.enc salida.db` – descifrar un backup.

## Puntos clave para extender o depurar

- Punto de entrada: `server.js`
- Base de datos: `lib/database.js`, `database/init.sql`, `database/indexes.sql`
- Cifrado: `lib/crypto_utils.js`, `lib/encryption_key.js`
- TF‑IDF: carpeta `tf-idf/`
- Rutas: `routes/posts/` y `routes/gets/`

En la carpeta /diagrams se puede observar documentación gráfica del proyecto, tanto en su archivo .mermaid como en un archivo pre-compilado PNG.