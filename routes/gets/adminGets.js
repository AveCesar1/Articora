const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloAdmin = checkRoles(['admin']);

//Alias de middlewares
module.exports = function (app) {
    // COMPARE DOCUMENTS - ADMIN VERSION
    app.get('/compare/admin', soloAdmin, (req, res) => {
        const mockSources = [
            {
                id: 1,
                title: "Cognitive Science: An Introduction to the Study of Mind",
                authors: ["Jay Friedenberg", "Gordon Silverman"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Neurociencia Cognitiva",
                publisher: "SAGE Publications",
                volume: "4",
                number: "2",
                pages: "480-495",
                edition: "4",
                doi: "10.1000/182",
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"],
                url: "https://example.com/cognitive-science",
                uploadDate: "2023-10-15",
                uploadedBy: "usuario123",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-11-20",
                history: [
                    { date: "2023-10-15", action: "Creación", user: "usuario123" },
                    { date: "2023-10-20", action: "Verificación aprobada", user: "admin1" },
                    { date: "2023-11-20", action: "Actualización de metadatos", user: "usuario123" }
                ],
                isDuplicate: true
            },
            {
                id: 2,
                title: "Cognitive Science: An Introduction to the Study of Mind",
                authors: ["Jay Friedenberg", "Gordon Silverman"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Neurociencia Cognitiva",
                publisher: "SAEG Publications",
                volume: "4",
                number: "2",
                pages: "480-495",
                edition: "4",
                doi: "10.1000/182",
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"],
                url: "https://another-example.com/cognitive-science",
                uploadDate: "2023-11-01",
                uploadedBy: "usuario456",
                verificationStatus: "pendiente",
                reports: 1,
                lastModified: "2023-11-10",
                history: [
                    { date: "2023-11-01", action: "Creación", user: "usuario456" },
                    { date: "2023-11-05", action: "Reporte por posible duplicado", user: "usuario789" },
                    { date: "2023-11-10", action: "Actualización de URL", user: "usuario456" }
                ],
                isDuplicate: true
            },
            {
                id: 3,
                title: "Deep Learning with Python",
                authors: ["François Chollet"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Computacionales",
                subcategory: "Aprendizaje Automático",
                publisher: "Manning Publications",
                volume: "2",
                number: null,
                pages: "384",
                edition: "2",
                doi: "10.1000/183",
                keywords: ["deep learning", "python", "redes neuronales", "IA"],
                url: "https://example.com/deep-learning",
                uploadDate: "2023-11-05",
                uploadedBy: "programadorAI",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-11-18",
                history: [
                    { date: "2023-11-05", action: "Creación", user: "programadorAI" },
                    { date: "2023-11-10", action: "Verificación aprobada", user: "admin2" },
                    { date: "2023-11-18", action: "Corrección de autores", user: "programadorAI" }
                ],
                isDuplicate: false
            },
            {
                id: 4,
                title: "A Brief History of Time",
                authors: ["Stephen Hawking"],
                year: 1988,
                type: "Libro",
                category: "Ciencias Exactas",
                subcategory: "Cosmología",
                publisher: "Bantam Books",
                volume: "1",
                number: null,
                pages: "256",
                edition: "1",
                doi: "10.1000/184",
                keywords: ["cosmología", "big bang", "agujeros negros", "física teórica"],
                url: "https://example.com/brief-history-time",
                uploadDate: "2023-08-30",
                uploadedBy: "fisico99",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-10-12",
                history: [
                    { date: "2023-08-30", action: "Creación", user: "fisico99" },
                    { date: "2023-09-05", action: "Verificación aprobada", user: "admin1" },
                    { date: "2023-10-12", action: "Actualización de edición", user: "fisico99" }
                ],
                isDuplicate: false
            },
            {
                id: 5,
                title: "The Structure of Scientific Revolutions",
                authors: ["Thomas S. Kuhn"],
                year: 1962,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía de la Ciencia",
                publisher: "University of Chicago Press",
                volume: "1",
                number: null,
                pages: "264",
                edition: "1",
                doi: "10.1000/185",
                keywords: ["revoluciones científicas", "paradigma", "ciencia", "historia"],
                url: "https://example.com/structure-revolutions",
                uploadDate: "2023-10-08",
                uploadedBy: "filosofo77",
                verificationStatus: "rechazado",
                reports: 3,
                lastModified: "2023-11-22",
                history: [
                    { date: "2023-10-08", action: "Creación", user: "filosofo77" },
                    { date: "2023-10-15", action: "Reporte por información falsa", user: "usuario123" },
                    { date: "2023-10-20", action: "Rechazo de verificación", user: "admin1" },
                    { date: "2023-11-22", action: "Intento de corrección", user: "filosofo77" }
                ],
                isDuplicate: false
            }
        ];
        res.render('compare-admin', { 
            title: 'Análisis y Comparación Masiva - Panel de Administración - Artícora', 
            currentPage: 'compare-admin', 
            cssFile: 'compare.css', 
            jsFile: 'compare-admin.js', 
            userType: 'admin', 
            availableSources: mockSources, 
            selectedSources: [], 
            totalSourcesCount: mockSources.length 
        });
    });

    // ADMIN
    app.get('/admin', soloAdmin, (req, res) => {
        const db = req.db;
        // Fetch manual (user-submitted) reports from DB, most recent first
        let manualRows = [];
        try {
            manualRows = db.prepare(`
                SELECT r.id,
                       r.report_type,
                       r.reporter_id,
                       ru.username AS reporter_username,
                       r.source_id,
                       rt.source_id AS comment_source_id,
                       COALESCE(s.title, s2.title) AS source_title,
                       r.reported_user_id,
                       ru2.username AS reported_username,
                       r.comment_id,
                       r.reason,
                       r.description,
                       r.reported_at,
                       r.status
                FROM reports r
                LEFT JOIN users ru ON r.reporter_id = ru.id
                LEFT JOIN users ru2 ON r.reported_user_id = ru2.id
                LEFT JOIN ratings rt ON r.comment_id = rt.id
                LEFT JOIN sources s ON r.source_id = s.id
                LEFT JOIN sources s2 ON rt.source_id = s2.id
                WHERE r.status = 'pending'
                ORDER BY r.reported_at ASC
            `).all();
        } catch (e) {
            console.error('Error fetching manual reports from DB:', e.message);
            manualRows = [];
        }

        const manualReports = manualRows.map(r => {
            // compute a simple priority heuristic
            let priority = 'media';
            if (r.reason && /ofensivo|violento|sexual|ilegal|abuso|ataque/i.test(r.reason + ' ' + (r.description || ''))) priority = 'alta';
            return {
                id: r.id,
                type: r.report_type || (r.comment_id ? 'comment' : (r.reported_user_id ? 'user' : 'source')),
                sourceId: r.source_id || r.comment_source_id || null,
                title: r.source_title || null,
                reason: r.reason || 'otro',
                description: r.description || '',
                reportedBy: r.reporter_username || ('#' + (r.reporter_id || '')), 
                reportDate: r.reported_at || null,
                status: r.status || 'pending',
                priority
            };
        });

        // Reportes automáticos del sistema — construir desde system_alerts
        let systemReports = [];
        try {
            const alerts = db.prepare("SELECT id, alert_type, severity, description, details, created_at, resolved_at FROM system_alerts ORDER BY created_at DESC LIMIT 200").all();

            // Pre-fetch broken-url-check entries to compute consecutive failures per source_url
            const brokenChecks = db.prepare("SELECT id, details, created_at FROM system_alerts WHERE alert_type = 'broken-url-check'").all();
            const checksMap = {};
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            for (const c of brokenChecks) {
                try {
                    const d = JSON.parse(c.details || '{}');
                    const sid = d.source_url_id;
                    if (!sid) continue;
                    const created = c.created_at ? new Date(c.created_at.replace(' ', 'T')) : null;
                    if (!created || created < threeDaysAgo) continue;
                    checksMap[sid] = (checksMap[sid] || 0) + 1;
                } catch (e) {
                    // ignore parse errors
                }
            }

            systemReports = alerts.map(a => {
                let detail = {};
                try { detail = a.details ? JSON.parse(a.details) : {}; } catch (e) { detail = {}; }

                if (a.alert_type === 'offensive-language') {
                    return {
                        id: a.id,
                        type: 'offensive-language',
                        detectedText: detail.detectedText || a.description || '',
                        context: {
                            userId: detail.user_id || detail.userId || detail.user || 'desconocido',
                            sourceId: detail.source_id || detail.sourceId || null,
                            date: a.created_at
                        },
                        detectedDate: a.created_at,
                        status: a.resolved_at ? 'resuelto' : 'pendiente',
                        autoGenerated: true
                    };
                } else if (a.alert_type === 'broken-url' || a.alert_type === 'broken-url-check') {
                    const srcUrlId = detail.source_url_id || null;
                    return {
                        id: a.id,
                        type: 'broken-url',
                        sourceId: detail.source_id || null,
                        sourceTitle: detail.source_title || detail.title || null,
                        url: detail.url || null,
                        errorCode: detail.status_code || null,
                        errorDays: srcUrlId ? (checksMap[srcUrlId] || 0) : 0,
                        detectedDate: a.created_at,
                        status: a.resolved_at ? 'resuelto' : 'pendiente',
                        autoGenerated: true
                    };
                } else if (a.alert_type === 'duplicate-detection') {
                    return {
                        id: a.id,
                        type: 'duplicate-detection',
                        sourceIds: detail.source_ids || detail.sourceIds || (detail.source_id ? [detail.source_id] : []),
                        sourcesTitles: detail.titles || detail.sourcesTitles || [],
                        similarity: detail.similarity || null,
                        detectedDate: a.created_at,
                        status: a.resolved_at ? 'resuelto' : 'pendiente',
                        autoGenerated: true
                    };
                }

                return {
                    id: a.id,
                    type: a.alert_type || 'system',
                    detectedText: a.description || '',
                    detectedDate: a.created_at,
                    status: a.resolved_at ? 'resuelto' : 'pendiente',
                    autoGenerated: true
                };
            });
        } catch (e) {
            console.error('Error fetching system alerts:', e && e.message);
            systemReports = [];
        }
        const stats = { totalPending: manualReports.filter(r => r.status === 'pendiente').length + systemReports.filter(r => r.status === 'pendiente').length, pendingManual: manualReports.filter(r => r.status === 'pendiente').length, pendingSystem: systemReports.filter(r => r.status === 'pendiente').length, highPriority: manualReports.filter(r => r.priority === 'alta' && r.status === 'pendiente').length, resolvedToday: 3, avgResolutionTime: "2.5 días" };

        res.render('admin', { 
            title: 'Panel de Administración - Artícora', 
            currentPage: 'admin', 
            cssFile: 'admin.css', 
            jsFile: 'admin.js', 
            userType: 'admin', 
            manualReports: manualReports, 
            systemReports: systemReports, 
            stats: stats, 
            totalReportsCount: manualReports.length + systemReports.length 
        });
    });

    // PLATFORM
    app.get('/faq', (req, res) => {
        res.render('faq', { 
            title: 'Preguntas Frecuentes - Artícora', 
            currentPage: 'faq', 
            cssFile: 'faq.css' 
        });
    });

    // TERMS AND POLICIES
    app.get('/terms', (req, res) => {
        res.render('terms', { 
            title: 'Términos y Políticas - Artícora', 
            currentPage: 'terms', 
            cssFile: 'terms.css' 
        });
    });


    ///////////
    // API's //
    ///////////

    // Lists reports with reporter/reported info
    app.get('/api/admin/reports', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const rows = db.prepare(`
                SELECT r.*, ru.username AS reporter_username, u.username AS reported_username, s.title AS source_title
                FROM reports r
                LEFT JOIN users ru ON r.reporter_id = ru.id
                LEFT JOIN users u ON r.reported_user_id = u.id
                LEFT JOIN sources s ON r.source_id = s.id
                ORDER BY r.reported_at DESC
            `).all();

            return res.json({ success: true, reports: rows });
        } catch (e) {
            console.error('GET /api/admin/reports error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Get detailed report
    app.get('/api/admin/reports/:id', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const id = Number(req.params.id);
            if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'invalid_id' });

            const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
            if (!report) return res.status(404).json({ success: false, message: 'not_found' });

            const reporter = report.reporter_id ? db.prepare('SELECT id, username, full_name, profile_picture, email FROM users WHERE id = ?').get(report.reporter_id) : null;
            const reportedUser = report.reported_user_id ? db.prepare('SELECT id, username, full_name, profile_picture, bio FROM users WHERE id = ?').get(report.reported_user_id) : null;
            // sources table does not have an `authors` text column (authors are normalized); fetch core fields
            const comment = report.comment_id ? db.prepare('SELECT id, source_id, user_id, comment, created_at FROM ratings WHERE id = ?').get(report.comment_id) : null;
            const message = report.message_id ? db.prepare('SELECT id, chat_id, user_id, encrypted_content, iv, encrypted_key, content_type, sent_at FROM messages WHERE id = ?').get(report.message_id) : null;

            // Resolve source: prefer explicit report.source_id, then comment.source_id as fallback
            let resolvedSource = null;
            if (report.source_id) resolvedSource = report.source_id;
            else if (comment && comment.source_id) resolvedSource = comment.source_id;

            let source = null;
            if (resolvedSource) {
                source = db.prepare('SELECT id, title, primary_url, uploaded_by FROM sources WHERE id = ?').get(resolvedSource);
            }

            return res.json({ success: true, report, reporter, reportedUser, source, comment, message });
        } catch (e) {
            console.error('GET /api/admin/reports/:id error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
};