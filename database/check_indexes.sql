-- check_indexes.sql
.headers on
.mode column

-- 1. INFORMACIÓN COMPLETA DE ÍNDICES
.width 30 20 10 50
SELECT 'INFORMACIÓN COMPLETA DE ÍNDICES' as '';
SELECT 
    tbl_name as 'Tabla',
    name as 'Índice',
    type as 'Tipo',
    CASE 
        WHEN sql LIKE '%WHERE%' THEN 'PARCIAL' 
        ELSE 'COMPLETO' 
    END as 'Tipo Índice'
FROM sqlite_master 
WHERE type = 'index'
ORDER BY tbl_name, name;

-- 2. VERIFICACIÓN DE CLAVES FORÁNEAS
SELECT '';
SELECT 'VERIFICACIÓN DE CLAVES FORÁNEAS' as '';
SELECT 
    'users' as tabla_principal,
    COUNT(DISTINCT uploaded_by) as fuentes_subidas,
    (SELECT COUNT(*) FROM users) as total_usuarios,
    ROUND(100.0 * COUNT(DISTINCT uploaded_by) / (SELECT COUNT(*) FROM users), 2) as '%_usuarios_activos'
FROM sources;

-- 3. CONSULTAS COMPLEJAS CON EXPLAIN
SELECT '';
SELECT 'ANÁLISIS DE CONSULTAS COMPLEJAS' as '';
SELECT 'Consulta 1: Dashboard usuario' as '';
EXPLAIN QUERY PLAN
SELECT u.username, s.title, s.overall_rating
FROM users u
JOIN sources s ON u.id = s.uploaded_by
-- LEFT JOIN ratings r ON s.id = r.source_id
WHERE u.is_validated = 1
ORDER BY s.created_at DESC
LIMIT 10;

SELECT '';
SELECT 'Consulta 2: Fuentes populares por categoría' as '';
EXPLAIN QUERY PLAN
SELECT c.name as categoria, s.title, s.overall_rating, s.total_reads
FROM sources s
JOIN categories c ON s.category_id = c.id
WHERE s.is_active = 1 AND s.total_ratings >= 3
ORDER BY c.name, s.overall_rating DESC
LIMIT 20;

-- 4. ESTADÍSTICAS DE RENDIMIENTO
SELECT '';
SELECT 'ESTADÍSTICAS DE RENDIMIENTO' as '';
.timer on

-- Medir tiempo de consulta con índice
SELECT 'Tiempo con índice (búsqueda por título):' as '';
SELECT COUNT(*) FROM sources WHERE title LIKE '%Cognitive%';

SELECT '';
SELECT 'Tiempo con índice (búsqueda por categoría):' as '';
SELECT COUNT(*) FROM sources WHERE category_id = 1;

SELECT '';
SELECT 'Tiempo con índice (ordenamiento por rating):' as '';
SELECT title, overall_rating FROM sources 
WHERE is_active = 1 
ORDER BY overall_rating DESC 
LIMIT 10;

.timer off

-- 5. INTEGRIDAD DE DATOS
SELECT '';
SELECT 'INTEGRIDAD DE DATOS' as '';
SELECT 
    'ratings' as tabla,
    COUNT(*) as total,
    COUNT(DISTINCT source_id) as fuentes_distintas,
    COUNT(DISTINCT user_id) as usuarios_distintas,
    AVG(readability) as avg_readability
FROM ratings;

SELECT '';
SELECT 'user_readings' as tabla,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as leidos,
    SUM(CASE WHEN status = 'to_read' THEN 1 ELSE 0 END) as por_leer
FROM user_readings;
