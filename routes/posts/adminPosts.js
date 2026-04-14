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

            // Get reporter public key
            const keyRow = db.prepare('SELECT public_key FROM user_keys WHERE user_id = ?').get(reporterId);
            if (!keyRow || !keyRow.public_key) return res.status(500).json({ success: false, message: 'reporter_missing_key' });

            // Create or find one-to-one chat
            const chatId = findOrCreateOneToOneChat(db, adminId, reporterId, adminId);

            // Encrypt message: AES-256-CBC then RSA-OAEP encrypt AES key with reporter public key (SPKI Base64)
            const aesKey = crypto.randomBytes(32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
            const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

            // Prepare reporter public key (SPKI DER base64 -> Buffer)
            const pubDer = Buffer.from(keyRow.public_key, 'base64');
            const pubKeyObj = crypto.createPublicKey({ key: pubDer, format: 'der', type: 'spki' });
            const encryptedKey = crypto.publicEncrypt({ key: pubKeyObj, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aesKey);

            // Store message
            const insert = db.prepare(`INSERT INTO messages (chat_id, user_id, encrypted_content, iv, encrypted_key, content_type, sent_at) VALUES (?, ?, ?, ?, ?, 'text', datetime('now'))`);
            const r = insert.run(chatId, adminId, encrypted.toString('base64'), iv.toString('base64'), encryptedKey.toString('base64'));

            // Update chat timestamp
            db.prepare('UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

            return res.json({ success: true, messageId: r.lastInsertRowid });
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

            const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
            if (!report) return res.status(404).json({ success: false, message: 'not_found' });

            const body = req.body || {};
            const action = String(body.action || '').trim();
            const note = sanitizeText(body.note || '', { maxLength: 1000 });

            // Execute action
            if (action === 'delete_source' && report.source_id) {
                db.prepare("UPDATE sources SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(report.source_id);
                // notify uploader
                const s = db.prepare('SELECT uploaded_by FROM sources WHERE id = ?').get(report.source_id) || {};
                const uploaderId = s.uploaded_by;
                // mark report resolved
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'source_deleted: ' + (note || ''), adminId, reportId);
                return res.json({ success: true });
            } else if (action === 'suspend_user' && report.reported_user_id) {
                // suspend 7 days
                db.prepare("UPDATE users SET account_active = 0, locked_until = datetime('now', '+7 days') WHERE id = ?").run(report.reported_user_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'user_suspended: ' + (note || ''), adminId, reportId);
                return res.json({ success: true });
            } else if (action === 'delete_comment' && report.comment_id) {
                db.prepare("UPDATE ratings SET comment = NULL, updated_at = datetime('now') WHERE id = ?").run(report.comment_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'comment_deleted: ' + (note || ''), adminId, reportId);
                return res.json({ success: true });
            } else if (action === 'delete_message' && report.message_id) {
                db.prepare("UPDATE messages SET content_type = 'deleted', encrypted_content = NULL, iv = NULL, encrypted_key = NULL WHERE id = ?").run(report.message_id);
                db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('resolved', 'message_deleted: ' + (note || ''), adminId, reportId);
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

            db.prepare("UPDATE reports SET status = ?, resolved_at = datetime('now'), action_taken = ?, admin_id = ? WHERE id = ?").run('rejected', 'rejected', adminId, reportId);
            return res.json({ success: true });
        } catch (e) {
            console.error('POST /api/admin/reports/:id/reject error', e);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
};
