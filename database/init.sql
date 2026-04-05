-- ============================================
-- DATABASE: ARTICORA - CLEANED FOR SQLITE
-- ============================================

-- Note: This file creates tables only. Indexes are defined in database/indexes.sql

-- ============================================
-- MODULE 1: USERS AND AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(15) UNIQUE NOT NULL CHECK(LENGTH(username) BETWEEN 5 AND 15),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_picture TEXT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    full_name VARCHAR(100),
    bio TEXT,
    institution VARCHAR(255),
    department VARCHAR(255),
    available_for_messages BOOLEAN DEFAULT 0,
    academic_level VARCHAR(20),
    is_validated BOOLEAN DEFAULT 0,
    is_verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    account_active BOOLEAN DEFAULT 1,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    validation_type VARCHAR(20) NOT NULL,
    license_number VARCHAR(10),
    certificate_path TEXT,
    identity_document_path TEXT,
    api_validation_result TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    admin_id INTEGER,
    admin_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_dashboard_settings (
    user_id INTEGER PRIMARY KEY,
    radar_chart_public BOOLEAN DEFAULT 0,
    show_recent_study BOOLEAN DEFAULT 1,
    show_my_references BOOLEAN DEFAULT 1,
    show_most_read BOOLEAN DEFAULT 1,
    show_global_trends BOOLEAN DEFAULT 1,
    widget_order TEXT DEFAULT '["recent_study","my_references","most_read","global_trends"]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documentos_verificacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ruta_archivo TEXT NOT NULL,
  iv TEXT NOT NULL,
  tipo VARCHAR(50),
  original_name TEXT,
  mime VARCHAR(100),
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_en TIMESTAMP,
  verificacion_completada BOOLEAN DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_keys (
    user_id INTEGER PRIMARY KEY,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 2: CATEGORIES AND SUBCATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, name)
);

-- ============================================
-- MODULE 3: BIBLIOGRAPHIC SOURCES
-- ============================================

CREATE TABLE IF NOT EXISTS source_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- authors as separate entities (normalized)
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_name VARCHAR(150),
    first_name VARCHAR(150),
    full_name VARCHAR(300) NOT NULL,
    affiliation TEXT
);

-- SOURCES table (authors moved to separate tables)
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    publication_year INTEGER,
    journal_publisher VARCHAR(300),
    volume VARCHAR(20),
    issue_number INTEGER,
    pages VARCHAR(20),
    edition INTEGER,
    source_type_id INTEGER,
    doi VARCHAR(100) UNIQUE,
    keywords TEXT,
    primary_url TEXT,
    category_id INTEGER,
    subcategory_id INTEGER,
    uploaded_by INTEGER,
    cover_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    total_reads INTEGER DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    avg_readability REAL DEFAULT 0,
    avg_completeness REAL DEFAULT 0,
    avg_detail_level REAL DEFAULT 0,
    avg_veracity REAL DEFAULT 0,
    avg_technical_difficulty REAL DEFAULT 0,
    overall_rating REAL DEFAULT 0,
    FOREIGN KEY (source_type_id) REFERENCES source_types(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Linking table between sources and authors to preserve order
CREATE TABLE IF NOT EXISTS source_authors (
    source_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (source_id, author_id),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS source_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    url_type VARCHAR(20) DEFAULT 'secondary',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    UNIQUE(source_id, url)
);

CREATE TABLE IF NOT EXISTS related_sources (
    source_id INTEGER NOT NULL,
    related_source_id INTEGER NOT NULL,
    similarity_score REAL NOT NULL,
    relationship_factors TEXT,
    PRIMARY KEY (source_id, related_source_id),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    FOREIGN KEY (related_source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 4: RATINGS AND COMMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    readability REAL NOT NULL,
    completeness REAL NOT NULL,
    detail_level REAL NOT NULL,
    veracity REAL NOT NULL,
    technical_difficulty REAL NOT NULL,
    comment TEXT,
    academic_context VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(source_id, user_id),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rating_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating_id INTEGER NOT NULL,
    readability REAL NOT NULL,
    completeness REAL NOT NULL,
    detail_level REAL NOT NULL,
    veracity REAL NOT NULL,
    technical_difficulty REAL NOT NULL,
    academic_context VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 5: CURATORIAL LISTS
-- ============================================

CREATE TABLE IF NOT EXISTS curatorial_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(50) NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_public BOOLEAN DEFAULT 1,
    is_collaborative BOOLEAN DEFAULT 0,
    total_sources INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS list_sources (
    list_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (list_id, source_id),
    FOREIGN KEY (list_id) REFERENCES curatorial_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS list_collaborators (
    list_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    PRIMARY KEY (list_id, user_id),
    FOREIGN KEY (list_id) REFERENCES curatorial_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 6: COMMUNICATION
-- ============================================

CREATE TABLE IF NOT EXISTS contact_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    initial_message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    UNIQUE(sender_id, receiver_id),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS confirmed_contacts (
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id_1, user_id_2),
    FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_type VARCHAR(10) NOT NULL,
    group_name VARCHAR(100),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT 0,
    PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL,
    encrypted_key TEXT,
    content_type VARCHAR(20) DEFAULT 'text',
    file_name VARCHAR(255),
    file_path TEXT,
    file_type VARCHAR(50),
    file_size INTEGER,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 7: READING MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS user_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    read_date DATE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 0,
    UNIQUE(user_id, source_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_stats (
    user_id INTEGER PRIMARY KEY,
    total_read INTEGER DEFAULT 0,
    total_to_read INTEGER DEFAULT 0,
    category_distribution TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 8: REPORTS AND MODERATION
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type VARCHAR(10) NOT NULL,
    reporter_id INTEGER NOT NULL,
    source_id INTEGER,
    reported_user_id INTEGER,
    comment_id INTEGER,
    message_id INTEGER,
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_id INTEGER,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    resolved_at TIMESTAMP,
    action_taken TEXT,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- ============================================
-- MODULE 9: TF-IDF AND SEARCH
-- ============================================

CREATE TABLE IF NOT EXISTS tfidf_vectors (
    source_id INTEGER NOT NULL,
    term VARCHAR(100) NOT NULL,
    tf REAL NOT NULL,
    idf REAL NOT NULL,
    weight REAL NOT NULL,
    PRIMARY KEY (source_id, term),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS equivalent_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    base_domain VARCHAR(100) NOT NULL,
    equivalent_domain VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE global_idf (
    term VARCHAR(100) PRIMARY KEY,
    idf REAL NOT NULL,
    doc_freq INTEGER NOT NULL,        -- número de fuentes que contienen el término
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE source_norms (
    source_id INTEGER PRIMARY KEY,
    norm REAL NOT NULL,                -- √(∑ weight²) para similitud de coseno rápida
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 10: SECURITY AND LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip_address VARCHAR(45),
    action VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email VARCHAR(255) NOT NULL,
    code CHAR(6) NOT NULL,
    code_type VARCHAR(20),
    is_used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- MODULE 11: SYSTEM MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    interval_seconds INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    description TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- MODULE 12: CONFIGURATION TABLES FOR USER PROFILES
-- ============================================

-- Tabla para almacenar intereses de usuario
CREATE TABLE IF NOT EXISTS user_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    interest VARCHAR(100) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, interest)
);
 
-- Tabla para configuración de privacidad del usuario
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id INTEGER PRIMARY KEY,
    profile_visibility VARCHAR(50) DEFAULT 'public',
    available_for_messages BOOLEAN DEFAULT 1,
    allow_group_invites BOOLEAN DEFAULT 1,
    filter_messages BOOLEAN DEFAULT 0,
    show_reading_stats BOOLEAN DEFAULT 1,
    show_recent_activity BOOLEAN DEFAULT 1,
    show_lists_public BOOLEAN DEFAULT 1,
    show_email BOOLEAN DEFAULT 0,
    show_institution BOOLEAN DEFAULT 1,
    show_join_date BOOLEAN DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla para configuración de notificaciones del usuario
CREATE TABLE IF NOT EXISTS user_notification_settings (
    user_id INTEGER PRIMARY KEY,
    email_messages BOOLEAN DEFAULT 1,
    email_comments BOOLEAN DEFAULT 1,
    email_verification BOOLEAN DEFAULT 1,
    email_newsletter BOOLEAN DEFAULT 0,
    platform_messages BOOLEAN DEFAULT 1,
    platform_comments BOOLEAN DEFAULT 1,
    platform_ratings BOOLEAN DEFAULT 1,
    platform_system BOOLEAN DEFAULT 1,
    notification_frequency VARCHAR(20) DEFAULT 'daily',
    urgent_notifications BOOLEAN DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ============================================
-- INITIAL DATA
-- ============================================

INSERT INTO source_types (name) VALUES 
('Book'),
('Book Chapter'),
('Journal Article'),
('Preprint'),
('Thesis or Dissertation'),
('Online Article'),
('Conference Proceedings'),
('Technical Report'),
('Encyclopedia or Dictionary'),
('Audiovisual Material');

INSERT INTO categories (name, description, icon_name) VALUES 
('Ciencias Cognitivas', 'Psicología, Neurociencia, Ciencias del Aprendizaje, Educación, Lingüística', 'brain'),
('Ciencias Sociales', 'Sociología, Ciencia Política, Antropología, Economía, Historia', 'users'),
('Ciencias Humanistas', 'Filosofía, Teología, Estudios Literarios, Lingüística Teórica, Ética', 'book-open'),
('Disciplinas Creativas', 'Artes Visuales, Música, Teatro, Danza, Escritura Creativa, Diseño', 'palette'),
('Ciencias Computacionales', 'Ciencias de la Computación, Ingeniería de Software, Sistemas de Información, Ciberseguridad', 'cpu'),
('Ciencias Exactas', 'Matemáticas Puras y Aplicadas, Física Teórica y Experimental, Lógica Formal', 'calculator'),
('Ciencias Naturales', 'Biología, Química, Geología, Astronomía, Ciencias Ambientales', 'leaf'),
('Ciencias Aplicadas', 'Ingeniería, Medicina, Arquitectura, Tecnología Médica, Ciencia de Materiales', 'flask');

-- Subcategorías de Ciencias Cognitivas (category_id = 1)
INSERT INTO subcategories (id, category_id, name) VALUES
(101, 1, 'Psicología Cognitiva'),
(102, 1, 'Neurociencia Cognitiva'),
(103, 1, 'Procesamiento del Lenguaje'),
(104, 1, 'Cognición Aplicada'),
(105, 1, 'IA Cognitiva'),
(106, 1, 'Filosofía de la Mente');

-- Subcategorías de Ciencias Sociales (category_id = 2)
INSERT INTO subcategories (id, category_id, name) VALUES
(201, 2, 'Sociología'),
(202, 2, 'Ciencia Política'),
(203, 2, 'Antropología'),
(204, 2, 'Economía'),
(205, 2, 'Historia'),
(206, 2, 'Geografía Humana');

-- Subcategorías de Ciencias Humanistas (category_id = 3)
INSERT INTO subcategories (id, category_id, name) VALUES
(301, 3, 'Filosofía'),
(302, 3, 'Estudios Religiosos'),
(303, 3, 'Literatura'),
(304, 3, 'Lingüística'),
(305, 3, 'Humanidades Digitales'),
(306, 3, 'Estudios Culturales'),
(307, 3, 'Humanidades Históricas');

-- Subcategorías de Disciplinas Creativas (category_id = 4)
INSERT INTO subcategories (id, category_id, name) VALUES
(401, 4, 'Artes Visuales'),
(402, 4, 'Música'),
(403, 4, 'Artes Escénicas'),
(404, 4, 'Escritura Creativa'),
(405, 4, 'Diseño'),
(406, 4, 'Teoría del Arte');

-- Subcategorías de Ciencias Computacionales (category_id = 5)
INSERT INTO subcategories (id, category_id, name) VALUES
(501, 5, 'Computación Teórica'),
(502, 5, 'Ingeniería de Software'),
(503, 5, 'Inteligencia Artificial'),
(504, 5, 'Ciberseguridad'),
(505, 5, 'Infraestructura Digital'),
(506, 5, 'Computación Científica'),
(507, 5, 'Robótica');

-- Subcategorías de Ciencias Exactas (category_id = 6)
INSERT INTO subcategories (id, category_id, name) VALUES
(601, 6, 'Matemáticas Puras'),
(602, 6, 'Matemáticas Aplicadas'),
(603, 6, 'Física Teórica'),
(604, 6, 'Física Experimental'),
(605, 6, 'Lógica Formal'),
(606, 6, 'Estadística'),
(607, 6, 'Química Teórica');

-- Subcategorías de Ciencias Naturales (category_id = 7)
INSERT INTO subcategories (id, category_id, name) VALUES
(701, 7, 'Biología'),
(702, 7, 'Ecología'),
(703, 7, 'Química'),
(704, 7, 'Ciencias de la Tierra'),
(705, 7, 'Astronomía'),
(706, 7, 'Biotecnología'),
(707, 7, 'Ciencias de la Vida');

-- Subcategorías de Ciencias Aplicadas (category_id = 8)
INSERT INTO subcategories (id, category_id, name) VALUES
(801, 8, 'Ingenierías'),
(802, 8, 'Ciencias de la Salud'),
(803, 8, 'Arquitectura'),
(804, 8, 'Materiales y Nano'),
(805, 8, 'Agro y Veterinaria'),
(806, 8, 'Ingeniería Biomédica'),
(807, 8, 'Ingeniería Ambiental');

INSERT INTO equivalent_domains (base_domain, equivalent_domain) VALUES 
('amazon.com', 'amazon.co.uk'),
('amazon.com', 'amazon.de'),
('amazon.com', 'a.com'),
('arxiv.org', 'arxiv.org/abs'),
('arxiv.org', 'arxiv.org/pdf'),
('arxiv.org', 'arxiv.org/format'),
('researchgate.net', 'researchgate.net/publication');

INSERT INTO scheduled_tasks (task_name, description, interval_seconds) VALUES 
('verify_urls', 'Check URL status for sources', 86400),
('recalculate_ratings', 'Update cached rating averages', 3600),
('clean_old_logs', 'Remove old security logs', 604800),
('update_tfidf', 'Recalculate TF-IDF values', 86400),
('check_system_health', 'Monitor system resources', 300);

INSERT INTO system_config (config_key, config_value, description) VALUES 
('max_file_size_mb', '5', 'Maximum file upload size in MB'),
('max_weekly_files', '50', 'Maximum files per user per week'),
('validation_days_certificate', '7', 'Days to resolve certificate validation'),
('validation_hours_license', '72', 'Hours to resolve license validation'),
('max_group_members', '12', 'Maximum members in a chat group'),
('max_lists_validated', '10', 'Maximum lists for validated users'),
('max_lists_unvalidated', '3', 'Maximum lists for unvalidated users'),
('max_sources_per_list', '50', 'Maximum sources in a list'),
('search_results_per_page', '20', 'Number of results per search page');

INSERT INTO chats (chat_type, group_name, created_by) VALUES 
('group', 'Artícora Notifications', NULL);

-- End of init.sql