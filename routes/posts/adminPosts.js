const checkRoles = require('../../middlewares/checkrole');
const soloAdmin = checkRoles(['admin']);
const { sanitizeText } = require('../../middlewares/sanitize');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = function(app) {
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
};
