-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ============================================

-- ============================================
-- ÍNDICES PARA MÓDULO DE USUARIOS
-- ============================================

-- Búsqueda rápida por nombre de usuario (login, búsqueda)
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Consultas por estado de validación y actividad
CREATE INDEX idx_users_validation_status ON users(is_validated, is_verified);
CREATE INDEX idx_users_active ON users(account_active);

-- Búsqueda por nivel académico para recomendaciones
CREATE INDEX idx_users_academic_level ON users(academic_level);

-- Login y seguridad
CREATE INDEX idx_users_login_security ON users(login_attempts, locked_until);

-- ============================================
-- ÍNDICES PARA MÓDULO DE FUENTES
-- ============================================

-- Búsqueda por título (uso frecuente en búsquedas)
CREATE INDEX idx_sources_title ON sources(title);

-- Filtros por categoría y subcategoría
CREATE INDEX idx_sources_category ON sources(category_id, subcategory_id);
CREATE INDEX idx_sources_subcategory ON sources(subcategory_id);

-- Filtros por año de publicación
CREATE INDEX idx_sources_year ON sources(publication_year);

-- Búsqueda por DOI (identificador único)
CREATE INDEX idx_sources_doi ON sources(doi) WHERE doi IS NOT NULL;

-- Ordenamiento por valoración
CREATE INDEX idx_sources_rating ON sources(overall_rating DESC, total_ratings DESC);

-- Consultas por usuario que subió
CREATE INDEX idx_sources_uploader ON sources(uploaded_by, created_at DESC);

-- Fuentes activas y recientes
CREATE INDEX idx_sources_active_recent ON sources(is_active, created_at DESC);

-- ============================================
-- ÍNDICES PARA CALIFICACIONES
-- ============================================

-- Consultas de calificaciones por fuente
CREATE INDEX idx_ratings_source ON ratings(source_id, created_at DESC);
CREATE INDEX idx_ratings_user ON ratings(user_id, created_at DESC);

-- Calificaciones por contexto académico
CREATE INDEX idx_ratings_academic_context ON ratings(academic_context, source_id);

-- Agregaciones para promedios
CREATE INDEX idx_ratings_aggregation ON ratings(
    source_id, 
    readability, 
    completeness, 
    detail_level, 
    veracity, 
    technical_difficulty
);

-- ============================================
-- ÍNDICES PARA LISTAS CURATORIALES
-- ============================================

-- Listas por usuario
CREATE INDEX idx_lists_user ON curatorial_lists(user_id, created_at DESC);

-- Listas públicas ordenadas por popularidad
CREATE INDEX idx_lists_public_popular ON curatorial_lists(
    is_public, 
    total_views DESC, 
    created_at DESC
) WHERE is_public = 1;

-- Búsqueda por título de lista
CREATE INDEX idx_lists_title ON curatorial_lists(title);

-- ============================================
-- ÍNDICES PARA COMUNICACIÓN
-- ============================================

-- Mensajes por chat y fecha (historial)
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, sent_at DESC);

-- Mensajes por usuario (para notificaciones)
CREATE INDEX idx_messages_user ON messages(user_id, sent_at DESC);

-- Mensajes no leídos
CREATE INDEX idx_messages_unread ON messages(chat_id, read_at) WHERE read_at IS NULL;

-- Solicitudes de contacto
CREATE INDEX idx_contact_requests_receiver ON contact_requests(receiver_id, status, sent_at DESC);
CREATE INDEX idx_contact_requests_status ON contact_requests(status, sent_at DESC);

-- Contactos confirmados
CREATE INDEX idx_confirmed_contacts_user ON confirmed_contacts(user_id_1, user_id_2);

-- ============================================
-- ÍNDICES PARA LECTURAS
-- ============================================

-- Lecturas por usuario y estado
CREATE INDEX idx_readings_user_status ON user_readings(user_id, status, priority DESC);

-- Fuentes leídas por fecha
CREATE INDEX idx_readings_date ON user_readings(read_date DESC, user_id);

-- Fuentes populares (para tendencias)
CREATE INDEX idx_readings_source_popularity ON user_readings(source_id, status) WHERE status = 'read';

-- Orden en lista "para leer"
CREATE INDEX idx_readings_to_read_order ON user_readings(user_id, priority DESC) WHERE status = 'to_read';

-- ============================================
-- ÍNDICES PARA BÚSQUEDA SEMÁNTICA (TF-IDF)
-- ============================================

-- Búsqueda por término
CREATE INDEX idx_tfidf_term ON tfidf_vectors(term);

-- Términos específicos por fuente
CREATE INDEX idx_tfidf_source_term ON tfidf_vectors(source_id, term);

-- ============================================
-- ÍNDICES PARA URLS
-- ============================================

-- URLs por fuente
CREATE INDEX idx_source_urls_source ON source_urls(source_id);

-- URLs activas para verificación periódica
CREATE INDEX idx_source_urls_active_check ON source_urls(is_active, last_checked) WHERE is_active = 1;

-- ============================================
-- ÍNDICES PARA FUENTES RELACIONADAS
-- ============================================

-- Relaciones por fuente base
CREATE INDEX idx_related_sources_base ON related_sources(source_id, similarity_score DESC);

-- Relaciones inversas (para simetría)
CREATE INDEX idx_related_sources_inverse ON related_sources(related_source_id, similarity_score DESC);

-- ============================================
-- ÍNDICES PARA REPORTES
-- ============================================

-- Reportes pendientes (para moderación)
CREATE INDEX idx_reports_pending ON reports(status, reported_at) WHERE status = 'pending';

-- Reportes por tipo y fecha
CREATE INDEX idx_reports_type_date ON reports(report_type, reported_at DESC);

-- Reportes por usuario reportado
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id, status);

-- ============================================
-- ÍNDICES PARA VALIDACIONES
-- ============================================

-- Validaciones pendientes
CREATE INDEX idx_validations_pending ON user_validations(status, submitted_at) WHERE status = 'pending';

-- Validaciones por usuario
CREATE INDEX idx_validations_user ON user_validations(user_id, submitted_at DESC);

-- ============================================
-- ÍNDICES PARA ESTADÍSTICAS Y LOGS
-- ============================================

-- Logs por fecha (para limpieza y análisis)
CREATE INDEX idx_security_logs_timestamp ON security_logs(created_at DESC);

-- Logs por usuario y acción
CREATE INDEX idx_security_logs_user_action ON security_logs(user_id, action, created_at DESC);

-- ============================================
-- ÍNDICES PARA AUTOMATIZACIÓN DEL SISTEMA
-- ============================================

-- Tareas programadas próximas
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run, is_active) WHERE is_active = 1;

-- Alertas del sistema no resueltas
CREATE INDEX idx_system_alerts_unresolved ON system_alerts(resolved_at, severity) WHERE resolved_at IS NULL;

-- ============================================
-- ÍNDICES PARA CONSULTAS COMPUESTAS FRECUENTES
-- ============================================

-- Dashboard del usuario (fuentes recientes del usuario)
CREATE INDEX idx_user_recent_uploads ON sources(uploaded_by, created_at DESC);

-- Fuentes mejor calificadas por categoría
CREATE INDEX idx_top_sources_by_category ON sources(
    category_id, 
    overall_rating DESC, 
    total_ratings DESC
) WHERE is_active = 1 AND total_ratings >= 5;

-- Lecturas recientes de la comunidad (para tendencias)
CREATE INDEX idx_community_recent_reads ON user_readings(
    status, 
    read_date DESC
) WHERE status = 'read' AND read_date IS NOT NULL;

-- Listas colaborativas activas
CREATE INDEX idx_active_collaborative_lists ON curatorial_lists(
    is_collaborative, 
    updated_at DESC
) WHERE is_collaborative = 1;

-- ============================================
-- ÍNDICES PARA INTEGRIDAD REFERENCIAL
-- ============================================

-- Índices para claves foráneas comunes
CREATE INDEX idx_fk_ratings_source ON ratings(source_id);
CREATE INDEX idx_fk_ratings_user ON ratings(user_id);
CREATE INDEX idx_fk_sources_category ON sources(category_id);
CREATE INDEX idx_fk_sources_subcategory ON sources(subcategory_id);
CREATE INDEX idx_fk_list_sources_list ON list_sources(list_id);
CREATE INDEX idx_fk_list_sources_source ON list_sources(source_id);
CREATE INDEX idx_fk_messages_chat ON messages(chat_id);
CREATE INDEX idx_fk_user_readings_source ON user_readings(source_id);

-- ============================================
-- ÍNDICES ESPECIALIZADOS PARA BÚSQUEDA AVANZADA
-- ============================================

-- Búsqueda por palabras clave (si se implementa búsqueda full-text)
-- Nota: SQLite requiere la extensión FTS5 para búsqueda full-text
-- CREATE VIRTUAL TABLE sources_fts USING fts5(title, authors, keywords);

-- Para búsqueda por rango de fechas en calificaciones
CREATE INDEX idx_ratings_date_range ON ratings(source_id, created_at);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN DE JOIN
-- ============================================

-- Optimización para JOIN usuarios-calificaciones-fuentes
CREATE INDEX idx_user_ratings_composite ON ratings(user_id, source_id, created_at);

-- Optimización para JOIN listas-fuentes-categorías
CREATE INDEX idx_list_sources_composite ON list_sources(list_id, source_id);

-- ============================================
-- ÍNDICES PARA CONSULTAS DE ADMINISTRACIÓN
-- ============================================

-- Usuarios con actividad reciente
CREATE INDEX idx_users_recent_activity ON users(last_login DESC, created_at DESC);

-- Fuentes reportadas frecuentemente
CREATE INDEX idx_reports_frequent ON reports(
    source_id, 
    report_type, 
    reported_at DESC
) WHERE source_id IS NOT NULL;

-- Validaciones por administrador
CREATE INDEX idx_validations_admin ON user_validations(admin_id, resolved_at DESC);

-- ============================================
-- ÍNDICES PARCIALES PARA FILTROS COMUNES
-- ============================================

-- Solo fuentes activas con calificaciones
CREATE INDEX idx_active_rated_sources ON sources(is_active, overall_rating) 
WHERE is_active = 1 AND overall_rating > 0;

-- Solo listas públicas no vacías
CREATE INDEX idx_public_nonempty_lists ON curatorial_lists(is_public, total_sources) 
WHERE is_public = 1 AND total_sources > 0;

-- Solo contactos disponibles para mensajes
CREATE INDEX idx_available_contacts ON users(available_for_messages, is_validated) 
WHERE available_for_messages = 1 AND is_validated = 1;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON user_notification_settings(user_id);