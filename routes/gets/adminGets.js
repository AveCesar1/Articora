const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloAdmin = checkRoles(['admin']);

//Alias de middlewares
module.exports = function (app) {
    // COMPARE DOCUMENTS - ADMIN VERSION
    app.get('/compare/admin', soloAdmin, (req, res) => {
        const db = req.db;
        try {
            // If an ids query param is provided, preselect those sources
            const idsParam = req.query.ids ? String(req.query.ids).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n)) : [];

            // Fetch available sources (recent, up to 200)
            const rows = db.prepare(`
                SELECT s.id, s.title, s.publication_year AS year, st.name AS type, s.primary_url AS url,
                       s.journal_publisher AS publisher, s.volume, s.issue_number AS number, s.pages, s.edition, s.doi, s.keywords,
                       cat.name AS category, sub.name AS subcategory,
                       s.created_at AS uploadDate, s.updated_at AS lastModified, s.is_active,
                       s.uploaded_by, u.username AS uploadedByName,
                       (SELECT COUNT(*) FROM reports WHERE source_id = s.id) AS reports,
                       (SELECT GROUP_CONCAT(a.full_name, ', ') FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = s.id ORDER BY sa.sort_order) AS authors
                FROM sources s
                LEFT JOIN source_types st ON s.source_type_id = st.id
                LEFT JOIN users u ON s.uploaded_by = u.id
                LEFT JOIN categories cat ON s.category_id = cat.id
                LEFT JOIN subcategories sub ON s.subcategory_id = sub.id
                ORDER BY s.created_at DESC
                LIMIT 200
            `).all();

            const availableSources = rows.map(r => ({
                id: r.id,
                title: r.title || '',
                authors: r.authors ? r.authors.split(',').map(a => a.trim()) : [],
                year: r.year || null,
                type: r.type || '',
                category: r.category || null,
                subcategory: r.subcategory || null,
                publisher: r.publisher || null,
                volume: r.volume || null,
                number: r.number || null,
                pages: r.pages || null,
                edition: r.edition || null,
                doi: r.doi || null,
                keywords: r.keywords ? r.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                url: r.url || r.primary_url || null,
                verificationStatus: r.is_active ? 'verificado' : 'inactivo',
                reports: r.reports || 0,
                uploadDate: r.uploadDate || null,
                uploadedBy: r.uploadedByName || r.uploaded_by || null,
                isDuplicate: false,
                lastModified: r.lastModified || null
            }));

            let selectedSources = [];
            if (idsParam.length > 0) {
                const placeholders = idsParam.map(() => '?').join(',');
                const selRows = db.prepare(`
                    SELECT s.id, s.title, s.publication_year AS year, st.name AS type, s.primary_url AS url,
                           s.created_at AS uploadDate, s.updated_at AS lastModified, s.is_active,
                           s.uploaded_by, u.username AS uploadedByName,
                           (SELECT COUNT(*) FROM reports WHERE source_id = s.id) AS reports,
                           (SELECT GROUP_CONCAT(a.full_name, ', ') FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = s.id ORDER BY sa.sort_order) AS authors
                    FROM sources s
                    LEFT JOIN source_types st ON s.source_type_id = st.id
                    LEFT JOIN users u ON s.uploaded_by = u.id
                    WHERE s.id IN (${placeholders})
                `).all(...idsParam);

                selectedSources = selRows.map(r => ({
                    id: r.id,
                    title: r.title || '',
                    authors: r.authors ? r.authors.split(',').map(a => a.trim()) : [],
                    year: r.year || null,
                    type: r.type || '',
                    verificationStatus: r.is_active ? 'verificado' : 'inactivo',
                    reports: r.reports || 0,
                    uploadDate: r.uploadDate || null,
                    uploadedBy: r.uploadedByName || r.uploaded_by || null,
                    isDuplicate: false,
                    lastModified: r.lastModified || null
                }));
            }

            const stats = { totalAvailable: availableSources.length };

            res.render('compare-admin', {
                title: 'Análisis y Comparación Masiva - Panel de Administración - Artícora',
                currentPage: 'compare-admin',
                cssFile: 'compare.css',
                jsFile: 'compare-admin.js',
                userType: 'admin',
                availableSources: availableSources,
                selectedSources: selectedSources,
                stats,
                totalSourcesCount: availableSources.length
            });
        } catch (e) {
            console.error('Error fetching compare-admin sources:', e && e.message);
            res.render('compare-admin', {
                title: 'Análisis y Comparación Masiva - Panel de Administración - Artícora',
                currentPage: 'compare-admin',
                cssFile: 'compare.css',
                jsFile: 'compare-admin.js',
                userType: 'admin',
                availableSources: [],
                selectedSources: [],
                stats: {},
                totalSourcesCount: 0
            });
        }
    });

    // API: GET sources by ids for comparison
    app.get('/api/admin/compare/sources', soloAdmin, (req, res) => {
        const db = req.db;
        try {
            const idsParam = req.query.ids ? String(req.query.ids).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n)) : [];

            if (!idsParam.length) return res.json({ success: true, sources: [] });

            const placeholders = idsParam.map(() => '?').join(',');
            const rows = db.prepare(`
                  SELECT s.id, s.title, s.publication_year AS year, st.name AS type, s.primary_url AS url,
                      s.journal_publisher AS publisher, s.volume, s.issue_number AS number, s.pages, s.edition, s.doi, s.keywords,
                      cat.name AS category, sub.name AS subcategory,
                      s.created_at AS uploadDate, s.updated_at AS lastModified, s.is_active,
                      s.uploaded_by, u.username AS uploadedByName,
                      (SELECT COUNT(*) FROM reports WHERE source_id = s.id) AS reports,
                      (SELECT GROUP_CONCAT(a.full_name, ', ') FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = s.id ORDER BY sa.sort_order) AS authors
                  FROM sources s
                  LEFT JOIN source_types st ON s.source_type_id = st.id
                  LEFT JOIN users u ON s.uploaded_by = u.id
                  LEFT JOIN categories cat ON s.category_id = cat.id
                  LEFT JOIN subcategories sub ON s.subcategory_id = sub.id
                  WHERE s.id IN (${placeholders})
                 `).all(...idsParam);

            const sources = rows.map(r => ({
                id: r.id,
                title: r.title || '',
                authors: r.authors ? r.authors.split(',').map(a => a.trim()) : [],
                year: r.year || null,
                type: r.type || '',
                category: r.category || null,
                subcategory: r.subcategory || null,
                publisher: r.publisher || null,
                volume: r.volume || null,
                number: r.number || null,
                pages: r.pages || null,
                edition: r.edition || null,
                doi: r.doi || null,
                keywords: r.keywords ? r.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
                url: r.url || r.primary_url || null,
                verificationStatus: r.is_active ? 'verificado' : 'inactivo',
                reports: r.reports || 0,
                uploadDate: r.uploadDate || null,
                uploadedBy: r.uploadedByName || r.uploaded_by || null,
                isDuplicate: false,
                lastModified: r.lastModified || null,
                history: []
            }));

            return res.json({ success: true, sources });
        } catch (err) {
            console.error('GET /api/admin/compare/sources error:', err && err.message);
            return res.status(500).json({ success: false, error: 'Error fetching sources' });
        }
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

        // Reportes automáticos del sistema (tomados de system_alerts)
        let systemReports = [];
        try {
            const alerts = db.prepare("SELECT id, alert_type, severity, description, details, created_at FROM system_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC").all();
            systemReports = alerts.map(a => {
                let details = {};
                try { details = a.details ? JSON.parse(a.details) : {}; } catch (e) { details = {}; }
                const t = (a.alert_type || '').toString().toLowerCase();
                if (t === 'broken-url' || t === 'broken_url' || t === 'url_failure') {
                    return {
                        id: a.id,
                        type: 'broken-url',
                        sourceId: details.source_id || details.sourceId || null,
                        sourceTitle: details.source_title || details.title || null,
                        url: details.url || null,
                        errorCode: details.status || details.last_status || null,
                        errorDays: details.consecutive_errors || null,
                        detectedDate: a.created_at,
                        status: 'pendiente',
                        autoGenerated: true
                    };
                } else if (t === 'offensive-language' || t === 'offensive_language' || t === 'offensive') {
                    return {
                        id: a.id,
                        type: 'offensive-language',
                        detectedText: details.detectedText || details.text || details.snippet || '',
                        context: { userId: details.user_id || details.userId || null, sourceId: details.source_id || null, date: a.created_at },
                        detectedDate: a.created_at,
                        status: 'pendiente',
                        autoGenerated: true
                    };
                } else if (t === 'duplicate-detection' || t === 'duplicate_detection' || t === 'duplicates') {
                    return {
                        id: a.id,
                        type: 'duplicate-detection',
                        sourceIds: details.sourceIds || details.source_ids || [],
                        sourcesTitles: details.titles || [],
                        similarity: details.similarity || null,
                        detectedDate: a.created_at,
                        status: 'pendiente',
                        autoGenerated: true
                    };
                }
                return null;
            }).filter(Boolean);
        } catch (e) {
            console.error('Error fetching system_alerts:', e && e.message);
            systemReports = [];
        }

        const stats = { totalPending: manualReports.length + systemReports.length, pendingManual: manualReports.length, pendingSystem: systemReports.length, highPriority: manualReports.filter(r => r.priority === 'alta').length, resolvedToday: 3, avgResolutionTime: "2.5 días" };

        res.render('admin', { 
            title: 'Panel de Administración - Artícora', 
            currentPage: 'admin', 
            cssFile: 'admin.css', 
            jsFile: 'admin/admin.js', 
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