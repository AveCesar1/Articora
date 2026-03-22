const authenticate = require('../../middlewares/auth');

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

            res.status(201).json({ 
                message: 'Mensaje enviado',
                messageId: result.lastInsertRowid
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al enviar mensaje' });
        }
    });
};