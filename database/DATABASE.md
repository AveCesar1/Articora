# Resumen rápido de la base de datos (para desarrolladores)

Este documento explica en pocas líneas cómo está estructurada la base de datos del proyecto, qué tablas son las más importantes y qué índices se mantuvieron para optimizar las consultas críticas. Está escrito en tercera persona y breve — para entender la BD en unos minutos.

Visión general
- Diseñamos la BD para almacenar fuentes académicas, autores, usuarios, listas curatoriales, métricas y la infraestructura necesaria para búsqueda semántica (TF‑IDF).
- La inicialización se hace con `database/init.sql`. Los índices se crean mediante `database/indexes.sql`.

Tablas principales (qué guardan)
- `sources`: metadatos de cada fuente (title, publication_year, category_id, subcategory_id, source_type_id, primary_url, cover_image_url, uploader, métricas básicas).
- `authors`, `source_authors`: autores normalizados y su relación N‑M con `sources` (orden garantizado por `sort_order`).
- `source_types`, `categories`, `subcategories`: taxonomía de tipos y categorías usada por la UI y filtros.
- `users`: cuentas y datos de perfil; sirve para ownership y auditoría.
- `ratings`: valoraciones por fuente (guardan desgloses por criterio y permiten agregación por fuente/usuario).
- `source_urls`: URLs asociados a una fuente (múltiples mirrors / orígenes) y flags de verificación.
- `tfidf_vectors`, `global_idf`, `source_norms`: estructura sencilla para almacenar vectores TF‑IDF por término por fuente y la idf global (usado por los scripts en `tf-idf/`).
- `curatorial_lists`, `list_sources`: colecciones de fuentes creadas por usuarios.

Índices mantenidos (por qué)
Se decidió mantener un conjunto mínimo que cubre autenticación, filtros por categoría, lookups por DOI/uploader, consultas TF‑IDF y consultas de ratings/URLs:
- `idx_users_username`, `idx_users_email` — login y búsquedas de cuenta.
- `idx_sources_title` — autocomplete y búsquedas por título (prefijo).
- `idx_sources_category` (`category_id`, `subcategory_id`) — filtros /search.
- `idx_sources_uploader` (`uploaded_by`, `created_at` DESC) — fuentes por usuario y paginación.
- `idx_sources_doi` WHERE `doi` IS NOT NULL — lookup/duplicados por DOI.
- `idx_ratings_source` — agregaciones y listados de calificaciones por fuente.
- `idx_tfidf_term`, `idx_tfidf_source_term` — acceso por término y por fuente para la búsqueda semántica.
- `idx_source_urls_source` — operaciones y mantenimiento sobre URLs.

Cómo aplicar / verificar
- Aplicar índices: `sqlite3 database/articora.db ".read database/indexes.sql"`
- Ver índices de una tabla: `PRAGMA index_list('sources');` (ej.: `sqlite3 database/articora.db "PRAGMA index_list('sources');"`)
- Medir uso: ejecutar `ANALYZE;` y `EXPLAIN QUERY PLAN <consulta>` para confirmar que un índice se está usando.

Notas finales
- Los índices reducen latencia de lectura a costa de escritura; se priorizaron los patrones de consulta reales.
- La tabla TF‑IDF es ligera por diseño; la lógica de indexado/búsqueda reside en los scripts Python bajo `tf-idf/`.
- Si se implementa búsqueda full‑text (FTS5) conviene migrar `sources.title` y `keywords` a una tabla FTS y revisar/eliminar el índice tradicional.

Fin del resumen.