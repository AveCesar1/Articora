const IsRegistered = require('../../middlewares/auth');
const { sanitizeText } = require('../../middlewares/sanitize');

module.exports = function (app) {
    // POST /api/reports
    app.post('/api/reports', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.session && req.session.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

            const body = req.body || {};
            const allowedTypes = ['source', 'user', 'comment', 'post'];
            const reportType = String(body.type || body.report_type || '').toLowerCase();
            if (!allowedTypes.includes(reportType)) return res.status(400).json({ success: false, message: 'invalid_report_type' });

            const reason = sanitizeText(body.reason || '', { maxLength: 100 });
            const description = sanitizeText(body.description || '', { maxLength: 2000 });

            const sourceId = body.source_id ? Number(body.source_id) : null;
            const reportedUserId = body.reported_user_id ? Number(body.reported_user_id) : null;
            const commentId = body.comment_id ? Number(body.comment_id) : null;

            // Insert into reports table
            const insert = db.prepare(`INSERT INTO reports (report_type, reporter_id, source_id, reported_user_id, comment_id, reason, description, status, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`);
            const r = insert.run(reportType, userId, sourceId, reportedUserId, commentId, reason || null, description || null);

            return res.json({ success: true, reportId: r.lastInsertRowid });
        } catch (err) {
            console.error('Error in POST /api/reports', err);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
};
