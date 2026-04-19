const checkRoles = require('../../middlewares/checkrole');
const soloAdmin = checkRoles(['admin']);
const { sanitizeText } = require('../../middlewares/sanitize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const urlChecker = require('../../lib/url_checker');
const offensiveChecker = require('../../lib/offensive_checker');
const duplicateChecker = require('../../lib/duplicate_checker');

module.exports = function(app) {
    // Merge selected sources into a base source
    app.post('/api/admin/compare/merge', soloAdmin, (req, res) => {
        const db = req.db;
        try {
            const body = req.body || {};
            const baseId = Number(body.base_id);
            const ids = Array.isArray(body.ids_to_merge) ? body.ids_to_merge.map(n => Number(n)) : [];
            const reason = (body.reason || '').toString().slice(0,1000);
            const adminId = req.session && req.session.userId ? req.session.userId : null;

            if (!baseId || Number.isNaN(baseId)) return res.status(400).json({ success: false, message: 'invalid_base_id' });
            const numericIds = ids.map(n => Number(n)).filter(n => !Number.isNaN(n));
            if (numericIds.length < 2) return res.status(400).json({ success: false, message: 'need_at_least_two_ids' });
            if (!numericIds.includes(baseId)) return res.status(400).json({ success: false, message: 'base_must_be_in_ids' });

            const mergeIds = numericIds.filter(id => id !== baseId);
            if (!mergeIds.length) return res.status(400).json({ success: false, message: 'nothing_to_merge' });

            const tx = db.transaction(() => {
                // Preload base urls for dedup
                const baseUrlsRows = db.prepare('SELECT url FROM source_urls WHERE source_id = ?').all(baseId) || [];
                const baseUrlsSet = new Set(baseUrlsRows.map(r => r.url));

                const ownerMap = {}; // mergedId -> uploaded_by

                mergeIds.forEach(mergeId => {
                    // collect owner (store now because we'll delete sources later)
                    const s = db.prepare('SELECT uploaded_by FROM sources WHERE id = ?').get(mergeId) || {};
                    if (s && s.uploaded_by) ownerMap[mergeId] = s.uploaded_by;

                    // Move URLs: update source_id to base if not duplicate, otherwise delete
                    const urls = db.prepare('SELECT id, url FROM source_urls WHERE source_id = ?').all(mergeId) || [];
                    urls.forEach(u => {
                        if (baseUrlsSet.has(u.url)) {
                            db.prepare('DELETE FROM source_urls WHERE id = ?').run(u.id);
                        } else {
                            db.prepare('UPDATE source_urls SET source_id = ? WHERE id = ?').run(baseId, u.id);
                            baseUrlsSet.add(u.url);
                        }
                    });

                    // Move ratings (comments/calificaciones)
                    // If a user has ratings on both the base and the merged source we avoid
                    // concatenating public comments. Instead we store both states in
                    // `rating_history` and keep the base rating row as the canonical one.
                    const ratings = db.prepare('SELECT * FROM ratings WHERE source_id = ?').all(mergeId) || [];
                    ratings.forEach(r => {
                        const existing = db.prepare('SELECT * FROM ratings WHERE source_id = ? AND user_id = ?').get(baseId, r.user_id);
                        if (!existing) {
                            // Move rating row to base source
                            db.prepare('UPDATE ratings SET source_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(baseId, r.id);
                        } else {
                            // Save existing rating snapshot to history (best-effort)
                            try {
                                db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
                                    existing.id,
                                    existing.readability,
                                    existing.completeness,
                                    existing.detail_level,
                                    existing.veracity,
                                    existing.technical_difficulty,
                                    existing.academic_context || '',
                                    existing.comment || ''
                                );
                            } catch (e) { /* ignore history failures */ }

                            // Also save the merged rating's snapshot attached to the existing rating
                            // so we preserve the other user's scores/comment for auditing.
                            try {
                                db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
                                    existing.id,
                                    r.readability,
                                    r.completeness,
                                    r.detail_level,
                                    r.veracity,
                                    r.technical_difficulty,
                                    r.academic_context || '',
                                    r.comment || ''
                                );
                            } catch (e) { /* ignore history failures */ }

                            // If the base rating lacks a comment, adopt the merged one; otherwise keep base comment intact.
                            try {
                                if (!existing.comment || String(existing.comment).trim().length === 0) {
                                    db.prepare('UPDATE ratings SET comment = ?, academic_context = ?, updated_at = datetime(\'now\'), version = version + 1 WHERE id = ?').run(r.comment || null, r.academic_context || existing.academic_context || '', existing.id);
                                }
                            } catch (e) { /* ignore update errors */ }

                            // remove merged rating row
                            db.prepare('DELETE FROM ratings WHERE id = ?').run(r.id);
                        }
                    });

                    // Move reports referencing the source to base
                    db.prepare('UPDATE reports SET source_id = ? WHERE source_id = ?').run(baseId, mergeId);

                    // Move list_sources entries: avoid duplicates in lists
                    const lists = db.prepare('SELECT list_id FROM list_sources WHERE source_id = ?').all(mergeId) || [];
                    lists.forEach(ls => {
                        const exists = db.prepare('SELECT 1 FROM list_sources WHERE list_id = ? AND source_id = ?').get(ls.list_id, baseId);
                        if (exists) {
                            db.prepare('DELETE FROM list_sources WHERE list_id = ? AND source_id = ?').run(ls.list_id, mergeId);
                        } else {
                            db.prepare('UPDATE list_sources SET source_id = ? WHERE list_id = ? AND source_id = ?').run(baseId, ls.list_id, mergeId);
                        }
                    });

                    // Remove source_authors for merged source (do NOT copy authors into base; keep base metadata intact)
                    db.prepare('DELETE FROM source_authors WHERE source_id = ?').run(mergeId);
                });

                // Physically delete merged sources (hard delete)
                if (mergeIds.length) {
                    const placeholders = mergeIds.map(() => '?').join(',');
                    db.prepare(`DELETE FROM sources WHERE id IN (${placeholders})`).run(...mergeIds);
                }

                // Recompute aggregates for the base source (total_ratings and per-criteria averages)
                try {
                    const agg = db.prepare(`SELECT COUNT(1) as cnt, AVG(readability) AS avg_readability, AVG(completeness) AS avg_completeness, AVG(detail_level) AS avg_detail_level, AVG(veracity) AS avg_veracity, AVG(technical_difficulty) AS avg_technical_difficulty FROM ratings WHERE source_id = ?`).get(baseId);
                    const total = agg ? (agg.cnt || 0) : 0;
                    const avgRead = parseFloat(((agg && agg.avg_readability) || 0).toFixed(2));
                    const avgComp = parseFloat(((agg && agg.avg_completeness) || 0).toFixed(2));
                    const avgDetail = parseFloat(((agg && agg.avg_detail_level) || 0).toFixed(2));
                    const avgVer = parseFloat(((agg && agg.avg_veracity) || 0).toFixed(2));
                    const avgTech = parseFloat(((agg && agg.avg_technical_difficulty) || 0).toFixed(2));
                    const overall = total ? parseFloat(((avgRead + avgComp + avgDetail + avgVer + avgTech) / 5).toFixed(2)) : 0;
                    db.prepare(`UPDATE sources SET total_ratings = ?, avg_readability = ?, avg_completeness = ?, avg_detail_level = ?, avg_veracity = ?, avg_technical_difficulty = ?, overall_rating = ?, updated_at = datetime('now') WHERE id = ?`).run(total, avgRead, avgComp, avgDetail, avgVer, avgTech, overall, baseId);
                } catch (e) { /* ignore aggregate update failures */ }

                // Notify affected owners via system_alerts (use collected ownerMap)
                Object.keys(ownerMap).forEach(k => {
                    const mergedId = Number(k);
                    const owner = ownerMap[mergedId];
                    if (!owner) return;
                    const desc = `Su publicación #${mergedId} fue fusionada en la publicación #${baseId} por el equipo de Artícora. Razón: ${reason || 'Fusión administrativa'}`;
                    db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))')
                        .run('merge_notification', 'medium', desc, JSON.stringify({ mergedId, baseId, adminId, reason }));
                });
            });

            // execute transaction
            tx();

            return res.json({ success: true, merged: mergeIds.length, mergedIds: mergeIds });
        } catch (err) {
            console.error('POST /api/admin/compare/merge error:', err && err.message);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Helper: ensure or create an individual chat between two users
    function findOrCreateOneToOneChat(db, aId, bId, creatorId) {
        // Try to find an existing individual chat with both participants
        const existing = db.prepare(`
            SELECT c.id FROM chats c
            JOIN chat_participants cp1 ON c.id = cp1.chat_id
            JOIN chat_participants cp2 ON c.id = cp2.chat_id
            WHERE c.chat_type = 'individual' AND cp1.user_id = ? AND cp2.user_id = ?
            LIMIT 1
        `).get(aId, bId);

        if (existing && existing.id) return existing.id;

        // Create new chat
        const chatRes = db.prepare('INSERT INTO chats (chat_type, created_by, last_message_at) VALUES (\'individual\', ?, CURRENT_TIMESTAMP)').run(creatorId);
        const chatId = chatRes.lastInsertRowid;
        // Insert participants
        db.prepare('INSERT INTO chat_participants (chat_id, user_id, is_admin) VALUES (?, ?, 0)').run(chatId, aId);
        db.prepare('INSERT INTO chat_participants (chat_id, user_id, is_admin) VALUES (?, ?, 0)').run(chatId, bId);
        return chatId;
    }

    // Helper: create a system alert describing the admin response to a report
    // Use the report's own `report_type` and IDs to avoid extra DB lookups and mislabeling.
    function createAdminAlert(db, report, status, adminMessage, adminId) {
        try {
            const type = (report.report_type || '').toString().toLowerCase();
            if (typeof global !== 'undefined' && global.debugging) console.log(`Tipo de reporte para alerta: ${type}`); // Log para depuración
            let targetLabel = 'elemento';
            let targetInfo = '';

            if (type === 'source') {
                if (typeof global !== 'undefined' && global.debugging) console.log(`Identificando reporte como fuente`);
                description = `Mensaje del equipo de administración respecto al reporte contra la fuente #${report.source_id || report.id}. Su reporte fue ${status === 'resolved' ? 'aceptado' : 'rechazado'} por la siguiente razón: ${adminMessage || 'Sin comentario adicional.'}`;
            } else if (type === 'comment' || type === 'rating') {
                if (typeof global !== 'undefined' && global.debugging) console.log(`Identificando reporte como comentario/valoración`);
                description = `Mensaje del equipo de administración respecto al reporte contra el comentario/valoración #${report.comment_id || report.id} del usuario ${report.reported_username ? ('@' + report.reported_username) : (report.reported_user_id ? '#' + report.reported_user_id : 'desconocido')}. Su reporte fue ${status === 'resolved' ? 'aceptado' : 'rechazado'} por la siguiente razón: ${adminMessage || 'Sin comentario adicional.'}`;
            } else if (type === 'message') {
                if (typeof global !== 'undefined' && global.debugging) console.log(`Identificando reporte como mensaje`);
                description = `Mensaje del equipo de administración respecto al reporte contra el mensaje #${report.message_id || report.id} del usuario ${report.reported_username ? ('@' + report.reported_username) : (report.reported_user_id ? '#' + report.reported_user_id : 'desconocido')}. Su reporte fue ${status === 'resolved' ? 'aceptado' : 'rechazado'} por la siguiente razón: ${adminMessage || 'Sin comentario adicional.'}`;
            } else if (type === 'user') {
                if (typeof global !== 'undefined' && global.debugging) console.log(`Identificando reporte como usuario`);
                description = `Mensaje del equipo de administración respecto al reporte contra el usuario ${report.reported_username ? ('@' + report.reported_username) : (report.reported_user_id ? '#' + report.reported_user_id : report.id)}. Su reporte fue ${status === 'resolved' ? 'aceptado' : 'rechazado'} por la siguiente razón: ${adminMessage || 'Sin comentario adicional.'}`;
            } else {
                if (typeof global !== 'undefined' && global.debugging) console.log(`Tipo de reporte desconocido, usando fallback genérico`);
                description = `Mensaje del equipo de administración respecto al reporte contra el elemento #${report.id}. Su reporte fue ${status === 'resolved' ? 'aceptado' : 'rechazado'} por la siguiente razón: ${adminMessage || 'Sin comentario adicional.'}`;
            }

            const details = JSON.stringify({ type: 'admin_response', reportId: report.id, adminId, status, target: { type: targetLabel, info: targetInfo } });

            db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('admin_response', 'medium', description, details);
        } catch (e) {
            console.error('createAdminAlert error', e && e.message);
        }
    }

    // Send message to reporter (admin->reporter)
    app.post('/api/admin/reports/:id/contact', soloAdmin, async (req, res) => {
        try {
            const db = req.db;
            const adminId = req.session.userId;
            const reportId = Number(req.params.id);
            if (Number.isNaN(reportId)) return res.status(400).json({ success: false, message: 'invalid_id' });

            const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
            if (!report) return res.status(404).json({ success: false, message: 'not_found' });
            const reporterId = report.reporter_id;
            if (!reporterId) return res.status(400).json({ success: false, message: 'reporter_missing' });

            const body = req.body || {};
            const text = sanitizeText(body.text || '');
            if (!text) return res.status(400).json({ success: false, message: 'empty_message' });

            // Instead of sending a private encrypted message from the admin account,
            // create a system alert so the message appears in the Artícora channel.
            const description = `Mensaje del equipo de administración respecto al reporte #${reportId}: ${text}`;
            const details = JSON.stringify({ type: 'admin_contact', reportId, reporterId, adminId });
            const ins = db.prepare(`INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))`).run('admin_contact', 'medium', description, details);

            return res.json({ success: true, alertId: ins.lastInsertRowid });
        } catch (e) {
            console.error('POST /api/admin/reports/:id/contact error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Resolve with an action
    app.post('/api/admin/reports/:id/resolve', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const adminId = req.session.userId;
            const reportId = Number(req.params.id);
            if (Number.isNaN(reportId)) return res.status(400).json({ success: false, message: 'invalid_id' });

            const report = db.prepare(`
                SELECT r.*, ru.username AS reporter_username, ru2.username AS reported_username
                FROM reports r
                LEFT JOIN users ru ON r.reporter_id = ru.id
                LEFT JOIN users ru2 ON r.reported_user_id = ru2.id
                WHERE r.id = ?
            `).get(reportId);
            if (!report) return res.status(404).json({ success: false, message: 'not_found' });

            const body = req.body || {};
            const action = String(body.action || '').trim();
            const note = sanitizeText(body.note || '', { maxLength: 1000 });
            const adminMessage = sanitizeText(body.adminMessage || body.note || '', { maxLength: 1000 });

            // Execute action
            if (action === 'delete_source' && report.source_id) {
                db.prepare("UPDATE sources SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(report.source_id);
                // notify uploader
                const s = db.prepare('SELECT uploaded_by FROM sources WHERE id = ?').get(report.source_id) || {};
                const uploaderId = s.uploaded_by;
                // mark report resolved
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'source_deleted: ' + (note || ''), adminId, reportId);
                // Create admin alert for Artícora channel
                createAdminAlert(db, report, 'resolved', adminMessage || note, adminId);
                return res.json({ success: true });
            } else if (action === 'suspend_user' && report.reported_user_id) {
                // suspend 7 days
                db.prepare("UPDATE users SET account_active = 0, locked_until = datetime('now', '+7 days') WHERE id = ?").run(report.reported_user_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'user_suspended: ' + (note || ''), adminId, reportId);
                createAdminAlert(db, report, 'resolved', adminMessage || note, adminId);
                return res.json({ success: true });
            } else if (action === 'delete_comment' && report.comment_id) {
                db.prepare("UPDATE ratings SET comment = NULL, updated_at = datetime('now') WHERE id = ?").run(report.comment_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'comment_deleted: ' + (note || ''), adminId, reportId);
                createAdminAlert(db, report, 'resolved', adminMessage || note, adminId);
                return res.json({ success: true });
            } else if (action === 'delete_message' && report.message_id) {
                db.prepare("UPDATE messages SET content_type = 'deleted', encrypted_content = NULL, iv = NULL, encrypted_key = NULL WHERE id = ?").run(report.message_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'message_deleted: ' + (note || ''), adminId, reportId);
                createAdminAlert(db, report, 'resolved', adminMessage || note, adminId);
                return res.json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: 'invalid_action_or_missing_target' });
            }
        } catch (e) {
            console.error('POST /api/admin/reports/:id/resolve error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Reject report
    app.post('/api/admin/reports/:id/reject', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const adminId = req.session.userId;
            const reportId = Number(req.params.id);
            if (Number.isNaN(reportId)) return res.status(400).json({ success: false, message: 'invalid_id' });

            const body = req.body || {};
            const note = sanitizeText(body.note || '', { maxLength: 1000 });
            const adminMessage = sanitizeText(body.adminMessage || body.note || '', { maxLength: 1000 });

            const report = db.prepare(`
                SELECT r.*, ru.username AS reporter_username, ru2.username AS reported_username
                FROM reports r
                LEFT JOIN users ru ON r.reporter_id = ru.id
                LEFT JOIN users ru2 ON r.reported_user_id = ru2.id
                WHERE r.id = ?
            `).get(reportId);
            if (!report) return res.status(404).json({ success: false, message: 'not_found' });

            db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('rejected', note || 'rejected', adminId, reportId);

            // Create admin alert to notify via Artícora channel
            createAdminAlert(db, report, 'rejected', adminMessage || note, adminId);

            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/reports/:id/reject error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // List system alerts (for client refresh)
    app.get('/api/admin/system_alerts', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const rows = db.prepare('SELECT id, alert_type, severity, description, details, created_at, resolved_at FROM system_alerts ORDER BY created_at DESC').all();
            return res.json({ success: true, alerts: rows });
        } catch (e) {
            console.error('GET /api/admin/system_alerts error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Run system checks on demand (admin button)
    app.post('/api/admin/run_system_checks', soloAdmin, async (req, res) => {
        try {
            const db = req.db;
            // Run URL checks (the cron runs daily)
                // Run URL checks (the cron runs daily)
                const urlResult = await urlChecker.runDailyUrlChecks(db);
                // Run offensive-language checks for comments
                const langResult = await offensiveChecker.runCommentChecks(db);
                // Run duplicate detection pass
                const dupResult = await duplicateChecker.runDuplicateChecks(db);
                return res.json({ success: true, result: { urlResult, langResult, dupResult } });
        } catch (e) {
            console.error('POST /api/admin/run_system_checks error', e && e.message);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Ignore a system alert (mark resolved without action)
    app.post('/api/admin/system_alerts/:id/ignore', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const id = Number(req.params.id);
            const adminId = req.session.userId;
            if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'invalid_id' });
            db.prepare('UPDATE system_alerts SET resolved_at = datetime(\'now\'), resolved_by = ? WHERE id = ?').run(adminId, id);
            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/system_alerts/:id/ignore error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Repair a broken URL (admin marks URL as repaired)
    app.post('/api/admin/system_alerts/:id/repair', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const id = Number(req.params.id);
            const adminId = req.session.userId;
            if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'invalid_id' });
            const alert = db.prepare('SELECT * FROM system_alerts WHERE id = ?').get(id);
            if (!alert) return res.status(404).json({ success: false, message: 'not_found' });
            let details = {};
            try { details = alert.details ? JSON.parse(alert.details) : {}; } catch (e) { details = {}; }
            if (!details.url_id) return res.status(400).json({ success: false, message: 'no_url_in_alert' });

            db.transaction(() => {
                db.prepare('UPDATE source_urls SET is_active = 1, last_checked = datetime(\'now\') WHERE id = ?').run(details.url_id);
                // reset monitor if exists
                db.prepare('DELETE FROM url_monitors WHERE url_id = ?').run(details.url_id);
                db.prepare('UPDATE system_alerts SET resolved_at = datetime(\'now\'), resolved_by = ? WHERE id = ?').run(adminId, id);
            })();

            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/system_alerts/:id/repair error', e && e.message);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Resolve a system alert with admin action (e.g., offensive-language: delete or warn)
    app.post('/api/admin/system_alerts/:id/resolve', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const id = Number(req.params.id);
            const adminId = req.session.userId;
            if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'invalid_id' });
            const body = req.body || {};
            const action = String(body.action || '').trim();
            const adminMessage = String(body.adminMessage || '').trim();
            const alert = db.prepare('SELECT * FROM system_alerts WHERE id = ?').get(id);
            if (!alert) return res.status(404).json({ success: false, message: 'not_found' });

            let details = {};
            try { details = alert.details ? JSON.parse(alert.details) : {}; } catch (e) { details = {}; }

            const t = (alert.alert_type || '').toString().toLowerCase();
            if (t === 'offensive-language' || t === 'offensive_language' || t === 'offensive') {
                // Action can be 'delete' or 'warn'
                if (action === 'delete') {
                    // delete comment if comment_id present
                    if (details.comment_id) {
                        db.prepare('UPDATE ratings SET comment = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(details.comment_id);
                    }
                    // delete message if message_id present
                    if (details.message_id) {
                        db.prepare("UPDATE messages SET content_type = 'deleted', encrypted_content = NULL, iv = NULL, encrypted_key = NULL WHERE id = ?").run(details.message_id);
                    }
                    // create an admin_response alert to notify
                    const desc = `El equipo ha eliminado el contenido ofensivo y ha notificado al usuario. ${adminMessage || ''}`;
                    db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run('admin_response', 'medium', desc, JSON.stringify({ originAlert: id, action: 'deleted', adminMessage }));
                    db.prepare('UPDATE system_alerts SET resolved_at = datetime(\'now\'), resolved_by = ? WHERE id = ?').run(adminId, id);
                    return res.json({ success: true });
                } else if (action === 'warn') {
                    const desc = `El equipo ha emitido una advertencia al usuario relacionada con el contenido detectado. ${adminMessage || ''}`;
                    db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run('admin_response', 'medium', desc, JSON.stringify({ originAlert: id, action: 'warn', adminMessage }));
                    db.prepare('UPDATE system_alerts SET resolved_at = datetime(\'now\'), resolved_by = ? WHERE id = ?').run(adminId, id);
                    return res.json({ success: true });
                } else {
                    return res.status(400).json({ success: false, message: 'invalid_action' });
                }
            }

            // Generic resolution for other types: mark resolved and optionally add note
            db.prepare('UPDATE system_alerts SET resolved_at = datetime(\'now\'), resolved_by = ? WHERE id = ?').run(adminId, id);
            if (adminMessage) db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run('admin_response', 'low', `Resolución: ${adminMessage}`, JSON.stringify({ originAlert: id, adminMessage }));
            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/system_alerts/:id/resolve error', e && e.message);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Save system configuration (offensive dictionary + equivalent domains as JSON in system_config)
    app.post('/api/admin/system_config', soloAdmin, (req, res) => {
        try {
            const db = req.db;
            const body = req.body || {};
            const offensive = (body.offensive || '').trim();
            const equivalent = (body.equivalent || '').trim();

            if (typeof offensive === 'string') {
                db.prepare('INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES (?, ?, ?, datetime(\'now\')) ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime(\'now\')').run('offensive_dictionary', offensive, 'Lista de términos ofensivos (coma separado)');
            }
            if (typeof equivalent === 'string') {
                // store the raw string as JSON array (split by commas)
                const arr = equivalent.split(',').map(s => s.trim()).filter(Boolean);
                db.prepare('INSERT INTO system_config (config_key, config_value, description, updated_at) VALUES (?, ?, ?, datetime(\'now\')) ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime(\'now\')').run('equivalent_domains', JSON.stringify(arr), 'Lista de dominios equivalentes (JSON array)');
            }

            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/system_config error', e && e.message);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
};
