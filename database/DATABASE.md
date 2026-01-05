# Base de datos — Resumen operativo y guía práctica

Este documento explica cómo se crea y se usa la base de datos en el proyecto, qué índices existen (y cuáles conviene mantener o eliminar), y cómo preparar consultas optimizadas desde `server.js` o middleware en Node.js. Está pensado para ser leído rápido y proporcionar acciones concretas (comandos SQL y patrones de uso) sin convertirse en una guía muy larga.

Resumen del proceso en `server.js` (qué hace al iniciar): el servidor lee y ejecuta el SQL de inicialización (`database/init.sql`) para crear tablas y datos iniciales, y a continuación ejecuta `database/indexes.sql` para crear índices. También activa `PRAGMA journal_mode = WAL;` para mejorar concurrencia. Esto significa que al arrancar la app los esquemas y los índices se instalan automáticamente: por eso es importante que `init.sql` y `indexes.sql` sean idempotentes y válidos para el motor (SQLite) antes de ejecutarlos en producción.

Observaciones sobre `init.sql` (problemas detectados y recomendaciones): al revisar el archivo de esquema hay varias tablas con definiciones incompletas o constraints mal formadas (por ejemplo, tablas con claves foráneas declaradas sin la columna correspondiente, constraints CHECK con sintaxis rota, tablas con solo FOREIGN KEY sin columnas definidas, y otras inconsistencias). Estas irregularidades pueden hacer que `db.exec(initSql)` falle o deje la base inconsistente. Recomendaciones concretas: arreglar y validar el DDL antes de ejecutar (ejecutar el archivo en un entorno de test), asegurarse de que cada `FOREIGN KEY` tiene la columna correspondiente y que no hay checks con subqueries invocadas en CHECK (no soportado por SQLite). Añadir IF NOT EXISTS a los `CREATE TABLE` y usar `CREATE INDEX IF NOT EXISTS` para índices si arranca varias veces.

Índices: política y acciones recomendadas
Los índices aceleran lecturas pero aumentan uso de espacio y coste de escritura. La regla práctica aquí es mantener índices que se correspondan con consultas frecuentes (búsquedas, joins y ordenamientos de paginación). Evitar índices extremadamente específicos (p. ej. índices por mes con funciones que usan tiempo actual) porque suelen ser caros y poco útiles para consultas generales.

Índices recomendados (mantener):
- idx_users_username (users.username) — login / búsqueda por usuario. Mantener.
- idx_users_email (users.email) — búsquedas por email. Mantener.
- idx_users_validation_status (users.is_validated, users.is_verified) — consultas administrativas. Mantener si se usan ambos en filtros compuestos.
- idx_sources_title (sources.title) — búsqueda por título. Mantener; si se implementa FTS, pasar a tabla FTS y evaluar eliminación del índice normal.
- idx_sources_category (sources.category_id, subcategory_id) — filtros por categoría/subcategoría. Mantener.
- idx_sources_year (sources.publication_year) — filtros cronológicos. Mantener.
- idx_sources_doi (sources.doi WHERE doi IS NOT NULL) — búsqueda exacta DOI. Mantener.
- idx_sources_rating (sources.overall_rating DESC, total_ratings DESC) — ordenamiento principal por rating. Mantener si hay muchas consultas con ORDER BY por rating.
- idx_sources_uploader (sources.uploaded_by, created_at DESC) — búsquedas por usuario que subió. Mantener.
- idx_ratings_source (ratings.source_id, created_at DESC) — historial de calificaciones por fuente. Mantener.
- idx_ratings_user (ratings.user_id, created_at DESC) — historial por usuario. Mantener.
- idx_messages_chat_timestamp (messages.chat_id, sent_at DESC) — chat history. Mantener.
- idx_messages_unread (messages.chat_id, read_at) WHERE read_at IS NULL — muy útil para recuperar no leídos. Mantener.
- idx_readings_user_status (user_readings.user_id, status, priority DESC) — dashboard y listas por estado. Mantener.
- idx_tfidf_term (tfidf_vectors.term) y idx_tfidf_source_term (tfidf_vectors.source_id, term) — si se hace búsqueda semántica con una tabla de vectores, mantener (o migrar a motor especializado). Mantener con precaución.
- idx_reports_pending (reports.status, reported_at) WHERE status = 'pending' — moderación. Mantener.
- idx_validations_pending (user_validations.status, submitted_at) WHERE status = 'pending' — colas de validación. Mantener.
- idx_security_logs_timestamp (security_logs.created_at DESC) — auditoría. Mantener.
- Índices FK/auxiliares: idx_fk_ratings_source, idx_fk_ratings_user, idx_fk_sources_category, idx_fk_sources_subcategory, idx_fk_list_sources_list, idx_fk_list_sources_source, idx_fk_messages_chat, idx_fk_user_readings_source. Mantener porque optimizan JOINs y eliminaciones por FK.

Cómo usar los índices desde `server.js` / middleware (patrones seguros y rápidos)
- Siempre use consultas parametrizadas para que SQLite pueda reutilizar planes y evitar inyección. En Node (sqlite3) use `db.get`, `db.all` o `db.prepare` con placeholders `?` o `:named`.
- Evite SELECT * si solo necesita columnas concretas (mejor seleccionar id, título, rating). Esto reduce I/O y mejora uso de índices (SQLite puede hacer covering index optimizations si las columnas están incluidas en el índice).
- Para paginación por rating use: SELECT id, title, overall_rating FROM sources WHERE is_active = 1 ORDER BY overall_rating DESC, total_ratings DESC LIMIT ? OFFSET ?; (utiliza `idx_sources_rating`).
- Para búsqueda por título con LIKE prefija (title LIKE 'cognitive%') use idx_sources_title si el índice es sobre la columna en texto puro; para búsquedas más complejas, usar FTS5 y consultar la tabla virtual FTS.

Ejemplos de llamadas desde Node (sqlite3):

// Ejemplo: búsqueda por categoría y orden por rating (usa idx_sources_category y idx_sources_rating)
const sql = `SELECT id, title, overall_rating, total_ratings FROM sources WHERE category_id = ? AND is_active = 1 AND overall_rating > ? ORDER BY overall_rating DESC, total_ratings DESC LIMIT ?`;
db.all(sql, [categoryId, 3.5, limit], (err, rows) => { /* manejar resultado */ });

// Ejemplo: historial de chat (usa idx_messages_chat_timestamp)
const sqlChat = `SELECT id, user_id, text, sent_at FROM messages WHERE chat_id = ? ORDER BY sent_at DESC LIMIT ?`;
db.all(sqlChat, [chatId, 50], (err, rows) => { /* manejar resultado */ });

Buenas prácticas para consultas y medición
- Antes de optimizar una consulta, medir su plan: `EXPLAIN QUERY PLAN <your query>`; en Node puede ejecutarlo vía `db.get('EXPLAIN QUERY PLAN ' + sql, params, callback)` y revisar `detail` o `selectid` que indica si un índice fue usado.
- Use `ANALYZE;` y `PRAGMA statistics` ocasionalmente para mantener estadísticas y buenos planes.
- Para índices parciales (WHERE ...) pruebe en staging y mida tamaño e impacto en escritura; a menudo un índice parcial que cubre `status = 'pending'` para `reports` es correcto, pero índices que usan tiempo dinámico (CURRENT_TIMESTAMP) no son recomendables.
- Para queries frecuentes que requieren varias columnas, considere índices compuestos que cubran exactamente las columnas usadas en WHERE y ORDER BY. Pero no cree índices "por si acaso".

Cómo integrar EXPLAIN QUERY PLAN en el flujo de trabajo de `server.js` (ejemplo rápido):

function explainQuery(db, sql, params = []) {
  db.get('EXPLAIN QUERY PLAN ' + sql, params, (err, row) => {
    if (err) return console.error('EXPLAIN error', err);
    console.log('EXPLAIN:', row);
  });
}

// Uso
explainQuery(db, 'SELECT id FROM sources WHERE category_id = ? ORDER BY overall_rating DESC LIMIT ?', [5, 20]);

Mantenimiento y operaciones
- Reconstruir índices periódicamente: `REINDEX nombre_indice;` o `REINDEX;` para todo (programar cada 3–6 meses según carga). Esto ayuda si el B-tree se fragmenta.
- Vaciar y compactar la base: `VACUUM;` tras grandes borrados para recuperar espacio (cuidado: bloquea la DB mientras corre). Preferible ejecutarlo en ventana de mantenimiento.
- Monitoreo: registre latencias de consultas críticas y genere alertas cuando las lecturas sobrepasen umbrales (p. ej. >200ms para queries de interacción directa).

Resumen rápido de índices (lista recomendada y práctica)
- users: idx_users_username, idx_users_email, idx_users_validation_status, idx_users_active
- sources: idx_sources_title, idx_sources_category, idx_sources_year, idx_sources_doi, idx_sources_rating, idx_sources_uploader, idx_sources_active_recent
- ratings: idx_ratings_source, idx_ratings_user
- messages: idx_messages_chat_timestamp, idx_messages_user, idx_messages_unread
- user_readings: idx_readings_user_status, idx_readings_date, idx_readings_source_popularity, idx_readings_to_read_order
- tfidf/search: idx_tfidf_term, idx_tfidf_source_term (usar con cautela o migrar a FTS/servicio de search)
- reports/validation/logs: idx_reports_pending, idx_reports_type_date, idx_reports_reported_user, idx_validations_pending, idx_validations_user, idx_security_logs_timestamp, idx_security_logs_user_action
- scheduled/tasks/alerts: idx_scheduled_tasks_next_run, idx_system_alerts_unresolved
- FK/joins: idx_fk_ratings_source, idx_fk_ratings_user, idx_fk_sources_category, idx_fk_sources_subcategory, idx_fk_list_sources_list, idx_fk_list_sources_source, idx_fk_messages_chat, idx_fk_user_readings_source

Índices sugeridos para eliminar (forma histórica)
- Nota: los índices problemáticos identificados anteriormente ya fueron retirados del archivo `indexes.sql`. No es necesario ejecutarlos localmente. Si desea revisar índices adicionales para eliminar, inspeccione `EXPLAIN QUERY PLAN` en staging y liste índices poco usados con `PRAGMA index_list(table_name)`.

Conclusión rápida
La aplicación ya crea esquema e índices desde `init.sql`/`indexes.sql` al iniciar. Antes de ponerlo en producción conviene validar y arreglar `init.sql` (hay varias tablas incompletas o mal definidas), simplificar índices redundantes y crear una pequeña batería de pruebas con `EXPLAIN QUERY PLAN` para las consultas críticas (búsqueda, listado por ranking y chat). Use índices compuestos para las consultas que realmente se ejecutan y evite índices que dependan de funciones temporales o expresiones cambiantes. Si quieres, puedo: 1) generar un archivo `indexes_pruned.sql` con sólo los índices recomendados, 2) proponer correcciones concretas para las declaraciones problemáticas en `init.sql`, o 3) añadir ejemplos concretos de `EXPLAIN QUERY PLAN` para las consultas más críticas del proyecto. ¿Cuál prefieres?