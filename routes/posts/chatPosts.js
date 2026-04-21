const authenticate = require('../../middlewares/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { decryptEmail } = require('../../lib/crypto_utils');

// Configuración de multer (solo para almacenar temporalmente)
const upload = multer({ dest: 'uploads/temp/' });

module.exports = function(app) {
    // Enviar solicitud de contacto
    app.post('/api/contacts/request', authenticate, (req, res) => {
        const senderId = req.user.id;
        const { receiverId, initialMessage } = req.body;

        if (!receiverId) return res.status(400).json({ error: 'receiverId requerido' });
        if (senderId === receiverId) return res.status(400).json({ error: 'No puedes enviarte solicitud a ti mismo' });

        try {
            // Verificar existencia y disponibilidad del receptor
            const receiver = req.db.prepare('SELECT id, available_for_messages FROM users WHERE id = ? AND account_active = 1').get(receiverId);
            if (!receiver) return res.status(404).json({ error: 'Usuario no encontrado' });
            if (!receiver.available_for_messages) return res.status(400).json({ error: 'El usuario no está disponible para mensajes' });

            // Verificar si ya son contactos
            const existingContact = req.db.prepare(`
                SELECT 1 FROM confirmed_contacts
                WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
            `).get(senderId, receiverId, receiverId, senderId);
            if (existingContact) return res.status(400).json({ error: 'Ya son contactos' });

            // Verificar solicitud pendiente
            const existingRequest = req.db.prepare(`
                SELECT id FROM contact_requests
                WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                AND status = 'pending'
            `).get(senderId, receiverId, receiverId, senderId);
            if (existingRequest) return res.status(400).json({ error: 'Ya existe una solicitud pendiente' });

            // Validar longitud del mensaje (máx 2100 caracteres)
            if (initialMessage && initialMessage.length > 2100) {
                return res.status(400).json({ error: 'Mensaje demasiado largo (máx 2100 caracteres)' });
            }

            // Insertar solicitud
            const stmt = req.db.prepare(`
                INSERT INTO contact_requests (sender_id, receiver_id, initial_message)
                VALUES (?, ?, ?)
            `);
            const result = stmt.run(senderId, receiverId, initialMessage || null);

            // Try to send e-mail notification to receiver (best-effort)
            try {
                const receiverRow = req.db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(receiverId);
                const notif = req.db.prepare('SELECT email_messages FROM user_notification_settings WHERE user_id = ?').get(receiverId) || { email_messages: 1 };
                if (receiverRow && notif && notif.email_messages && req.app && req.app.locals && req.app.locals.transporter) {
                    let receiverEmail = null;
                    try { receiverEmail = decryptEmail(receiverRow.email, req.app); } catch (e) { receiverEmail = null; }
                    if (receiverEmail) {
                        const senderRow = req.db.prepare('SELECT id, username, full_name FROM users WHERE id = ?').get(senderId) || {};
                        req.app.render('emails/contact_request', { senderName: senderRow.full_name || senderRow.username || 'Usuario', message: initialMessage || '', requestId: result.lastInsertRowid, host: req.get('host') }, (err, html) => {
                            if (!err) {
                                req.app.locals.transporter.sendMail({
                                    from: 'articora.noreply@gmail.com',
                                    to: receiverEmail,
                                    subject: 'Nueva solicitud de contacto en Artícora',
                                    html
                                }, (err2) => { if (err2) console.error('Error sending contact_request email', err2); });
                            } else console.error('Error rendering contact_request email template', err);
                        });
                    }
                }
            } catch (e) { console.error('Failed to send contact request email (non-fatal)', e && e.message); }

            // TODO: Emitir evento por socket al receptor

            res.status(201).json({ 
                message: 'Solicitud enviada',
                requestId: result.lastInsertRowid 
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al enviar solicitud' });
        }
    });

    // Aceptar solicitud
    app.post('/api/contacts/requests/:requestId/accept', authenticate, (req, res) => {
        const userId = req.user.id;
        const requestId = req.params.requestId;

        try {
            // Obtener solicitud pendiente
            const request = req.db.prepare(`
                SELECT * FROM contact_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'
            `).get(requestId, userId);
            if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

            // Transacción
            const update = req.db.prepare(`
                UPDATE contact_requests SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = ?
            `);
            update.run(requestId);

            // Insertar en confirmed_contacts (ordenado)
            const user1 = Math.min(request.sender_id, request.receiver_id);
            const user2 = Math.max(request.sender_id, request.receiver_id);
            req.db.prepare(`
                INSERT OR IGNORE INTO confirmed_contacts (user_id_1, user_id_2)
                VALUES (?, ?)
            `).run(user1, user2);

            // Crear chat individual
            const chatResult = req.db.prepare(`
                INSERT INTO chats (chat_type, created_by, last_message_at)
                VALUES ('individual', ?, CURRENT_TIMESTAMP)
            `).run(userId);
            const chatId = chatResult.lastInsertRowid;

            // Agregar participantes
            req.db.prepare(`
                INSERT INTO chat_participants (chat_id, user_id, is_admin)
                VALUES (?, ?, 0), (?, ?, 0)
            `).run(chatId, request.sender_id, chatId, request.receiver_id);

            res.json({ 
                message: 'Solicitud aceptada',
                chatId
            });
            // Notify original sender by email (best-effort)
            try {
                const senderRow = req.db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(request.sender_id);
                const notif = req.db.prepare('SELECT email_messages FROM user_notification_settings WHERE user_id = ?').get(request.sender_id) || { email_messages: 1 };
                if (senderRow && notif && notif.email_messages && req.app && req.app.locals && req.app.locals.transporter) {
                    let senderEmail = null;
                    try { senderEmail = decryptEmail(senderRow.email, req.app); } catch (e) { senderEmail = null; }
                    if (senderEmail) {
                        const accepter = req.db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(userId) || {};
                        req.app.render('emails/contact_request_accepted', { accepterName: accepter.full_name || accepter.username || 'Usuario', chatId, host: req.get('host') }, (err, html) => {
                            if (!err) {
                                req.app.locals.transporter.sendMail({ from: 'articora.noreply@gmail.com', to: senderEmail, subject: 'Tu solicitud de contacto fue aceptada', html }, (err2) => { if (err2) console.error('Error sending contact accepted email', err2); });
                            } else console.error('Error rendering contact_request_accepted template', err);
                        });
                    }
                }
            } catch (e) { console.error('Failed to notify sender after accept (non-fatal)', e && e.message); }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al aceptar solicitud' });
        }
    });

    // Rechazar solicitud
    app.post('/api/contacts/requests/:requestId/reject', authenticate, (req, res) => {
        const userId = req.user.id;
        const requestId = req.params.requestId;

        try {
            const request = req.db.prepare(`
                SELECT * FROM contact_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'
            `).get(requestId, userId);
            if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });

            req.db.prepare(`
                UPDATE contact_requests SET status = 'rejected', responded_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(requestId);

            res.json({ message: 'Solicitud rechazada' });
            // Notify original sender by email (best-effort)
            try {
                const senderRow = req.db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(request.sender_id);
                const notif = req.db.prepare('SELECT email_messages FROM user_notification_settings WHERE user_id = ?').get(request.sender_id) || { email_messages: 1 };
                if (senderRow && notif && notif.email_messages && req.app && req.app.locals && req.app.locals.transporter) {
                    let senderEmail = null;
                    try { senderEmail = decryptEmail(senderRow.email, req.app); } catch (e) { senderEmail = null; }
                    if (senderEmail) {
                        const rejecter = req.db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(userId) || {};
                        req.app.render('emails/contact_request_rejected', { rejecterName: rejecter.full_name || rejecter.username || 'Usuario', host: req.get('host') }, (err, html) => {
                            if (!err) {
                                req.app.locals.transporter.sendMail({ from: 'articora.noreply@gmail.com', to: senderEmail, subject: 'Tu solicitud de contacto fue rechazada', html }, (err2) => { if (err2) console.error('Error sending contact rejected email', err2); });
                            } else console.error('Error rendering contact_request_rejected template', err);
                        });
                    }
                }
            } catch (e) { console.error('Failed to notify sender after reject (non-fatal)', e && e.message); }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al rechazar solicitud' });
        }
    });

    // Enviar mensaje a un chat
    app.post('/api/chats/:chatId/messages', authenticate, (req, res) => {
        const userId = req.user.id;
        const chatId = req.params.chatId;
        const { encryptedContent, iv, encryptedKey, contentType, fileName, filePath, fileType, fileSize } = req.body;

        if (!encryptedContent || !iv || !encryptedKey) {
            return res.status(400).json({ error: 'Faltan campos de cifrado' });
        }

        try {
            // Verificar pertenencia al chat
            const participant = req.db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
            if (!participant) return res.status(403).json({ error: 'No perteneces a este chat' });

            // Insertar mensaje
            const stmt = req.db.prepare(`
                INSERT INTO messages (chat_id, user_id, encrypted_content, iv, encrypted_key,
                                      content_type, file_name, file_path, file_type, file_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                chatId, userId, encryptedContent, iv, encryptedKey,
                contentType || 'text', fileName || null, filePath || null, fileType || null, fileSize || null
            );

            // Actualizar last_message_at
            req.db.prepare('UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

            // TODO: Emitir evento por socket a los otros participantes

            // Try sending email notifications to other participants (best-effort)
            try {
                const participants = req.db.prepare('SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?').all(chatId, userId) || [];
                const senderRow = req.db.prepare('SELECT id, username, full_name FROM users WHERE id = ?').get(userId) || {};
                for (const p of participants) {
                    try {
                        const notif = req.db.prepare('SELECT email_messages FROM user_notification_settings WHERE user_id = ?').get(p.user_id) || { email_messages: 1 };
                        if (!notif.email_messages) continue;
                        const uRow = req.db.prepare('SELECT email FROM users WHERE id = ?').get(p.user_id);
                        if (!uRow || !uRow.email) continue;
                        let targetEmail = null;
                        try { targetEmail = decryptEmail(uRow.email, req.app); } catch (e) { targetEmail = null; }
                        if (!targetEmail) continue;
                        // Render and send email (no message body; content is encrypted) with a link to the chat
                        req.app.render('emails/chat_message_notification', { senderName: senderRow.full_name || senderRow.username || 'Usuario', chatId, host: req.get('host') }, (err, html) => {
                            if (!err) {
                                req.app.locals.transporter.sendMail({ from: 'articora.noreply@gmail.com', to: targetEmail, subject: 'Nuevo mensaje en Artícora', html }, (err2) => { if (err2) console.error('Error sending chat notification', err2); });
                            } else console.error('Error rendering chat_message_notification template', err);
                        });
                    } catch (e) { console.error('Failed to notify participant', p && p.user_id, e && e.message); }
                }
            } catch (e) { console.error('Error sending chat notifications (non-fatal)', e && e.message); }

            res.status(201).json({ 
                message: 'Mensaje enviado',
                messageId: result.lastInsertRowid
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al enviar mensaje' });
        }
    });

    // Crear un nuevo grupo
    app.post('/api/groups', authenticate, async (req, res) => {
        const userId = req.user.id;
        const { groupName, memberIds } = req.body;

        if (!groupName || groupName.trim() === '') {
            return res.status(400).json({ error: 'Nombre del grupo requerido' });
        }
        if (groupName.length > 100) {
            return res.status(400).json({ error: 'Nombre muy largo (máx 100)' });
        }

        // Validar que el usuario puede crear grupos (solo validados)
        const user = req.db.prepare('SELECT is_validated FROM users WHERE id = ?').get(userId);
        if (!user.is_validated) {
            return res.status(403).json({ error: 'Solo usuarios validados pueden crear grupos' });
        }

        // Obtener límite de grupos (desde system_config o por defecto)
        let maxGroups = 5;
        const configGroups = req.db.prepare('SELECT config_value FROM system_config WHERE config_key = ?').get('max_groups_validated');
        if (configGroups) maxGroups = parseInt(configGroups.config_value, 10);

        const currentGroups = req.db.prepare(`
            SELECT COUNT(*) as count FROM chats
            WHERE chat_type = 'group' AND created_by = ?
        `).get(userId).count;
        if (currentGroups >= maxGroups) {
            return res.status(400).json({ error: `Has alcanzado el límite de ${maxGroups} grupos` });
        }

        // Lista de participantes (incluye al creador)
        let participants = [userId, ...(memberIds || [])];
        participants = [...new Set(participants)]; // eliminar duplicados

        // Obtener límite de miembros
        let maxMembers = 12;
        const configMembers = req.db.prepare('SELECT config_value FROM system_config WHERE config_key = ?').get('max_group_members');
        if (configMembers) maxMembers = parseInt(configMembers.config_value, 10);
        if (participants.length > maxMembers) {
            return res.status(400).json({ error: `El grupo no puede tener más de ${maxMembers} miembros` });
        }

        // Verificar que todos los participantes existan y estén activos
        const placeholders = participants.map(() => '?').join(',');
        const existing = req.db.prepare(`
            SELECT id FROM users WHERE id IN (${placeholders}) AND account_active = 1
        `).all(...participants);
        if (existing.length !== participants.length) {
            return res.status(400).json({ error: 'Alguno de los usuarios no existe o está inactivo' });
        }

        // Crear el chat
        const chatStmt = req.db.prepare(`
            INSERT INTO chats (chat_type, group_name, created_by, last_message_at)
            VALUES ('group', ?, ?, CURRENT_TIMESTAMP)
        `);
        const result = chatStmt.run(groupName, userId);
        const chatId = result.lastInsertRowid;

        // Insertar participantes
        const participantStmt = req.db.prepare(`
            INSERT INTO chat_participants (chat_id, user_id, is_admin)
            VALUES (?, ?, ?)
        `);
        for (const pid of participants) {
            const isAdmin = (pid === userId) ? 1 : 0;
            participantStmt.run(chatId, pid, isAdmin);
        }

        res.status(201).json({
            message: 'Grupo creado exitosamente',
            groupId: chatId
        });
    });

    app.post('/api/chats/:chatId/files', authenticate, upload.single('file'), async (req, res) => {
        const userId = req.user.id;
        const chatId = parseInt(req.params.chatId, 10);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No se envió archivo' });
        }

        // Recibir los campos adicionales (deben venir del cliente)
        const { iv, encryptedKey, originalName, mimeType } = req.body;
        if (!iv || !encryptedKey || !originalName) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'Faltan datos de cifrado' });
        }

        try {
            // 1. Verificar pertenencia al chat
            const participant = req.db.prepare(
                'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?'
            ).get(chatId, userId);
            if (!participant) {
                fs.unlinkSync(file.path);
                return res.status(403).json({ error: 'No perteneces a este chat' });
            }

            // 2. Verificar límite semanal (usamos contador en users.weekly_file_uploads)
            try {
                const urow = req.db.prepare('SELECT weekly_file_uploads, is_validated FROM users WHERE id = ?').get(userId);
                const fileLimit = urow && urow.is_validated ? 50 : 20;
                const currentCount = (urow && typeof urow.weekly_file_uploads === 'number') ? urow.weekly_file_uploads : 0;
                if (currentCount >= fileLimit) {
                    fs.unlinkSync(file.path);
                    return res.status(429).json({ error: 'Límite semanal de archivos alcanzado' });
                }
            } catch (e) {
                console.error('Error checking weekly_file_uploads:', e && e.message);
            }

            // 3. Validar extensión del archivo (según la lista permitida)
            const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip'];
            const ext = path.extname(originalName).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                fs.unlinkSync(file.path);
                return res.status(400).json({ error: 'Formato de archivo no permitido' });
            }

            // 4. Mover el archivo cifrado a la carpeta definitiva
            const finalDir = path.join(__dirname, '../../public/uploads/chat_files');
            if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
            const finalName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const finalPath = path.join(finalDir, finalName);
            fs.renameSync(file.path, finalPath);

            // 5. Insertar mensaje de tipo archivo en la BD
            const stmt = req.db.prepare(`
                INSERT INTO messages (chat_id, user_id, encrypted_content, iv, encrypted_key, content_type, file_name, file_path, file_type, file_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                chatId,
                userId,
                finalName,          // encrypted_content almacena el nombre del archivo (referencia)
                iv,
                encryptedKey,       // JSON string con claves cifradas para cada participante
                'file',
                originalName,       // nombre original
                `/uploads/chat_files/${finalName}`,
                mimeType || file.mimetype,
                file.size
            );

            // 6. Actualizar last_message_at del chat
            req.db.prepare('UPDATE chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);

            // 7. Incrementar contador semanal de archivos del usuario
            try {
                req.db.prepare('UPDATE users SET weekly_file_uploads = COALESCE(weekly_file_uploads, 0) + 1 WHERE id = ?').run(userId);
            } catch (e) {
                console.error('Error incrementing weekly_file_uploads for user', userId, e && e.message);
            }

            res.status(201).json({
                message: 'Archivo enviado correctamente',
                messageId: result.lastInsertRowid
            });
        } catch (err) {
            console.error('Error al subir archivo:', err);
            if (file && file.path) fs.unlinkSync(file.path);
            res.status(500).json({ error: 'Error interno al subir archivo' });
        }
    });
};