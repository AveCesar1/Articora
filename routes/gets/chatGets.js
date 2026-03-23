const isRegistered = require('../../middlewares/auth');
const authenticate = require('../../middlewares/auth');

module.exports = function(app) {
    // Obtener lista de contactos confirmados
    app.get('/api/contacts', authenticate, (req, res) => {
        const userId = req.user.id;
        try {
            const contacts = req.db.prepare(`
                SELECT u.id, u.username, u.profile_picture, u.full_name,
                       c.confirmed_at
                FROM confirmed_contacts c
                JOIN users u ON (c.user_id_1 = ? AND c.user_id_2 = u.id)
                             OR (c.user_id_2 = ? AND c.user_id_1 = u.id)
                ORDER BY c.confirmed_at DESC
            `).all(userId, userId);
            res.json(contacts);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener contactos' });
        }
    });

    // Solicitudes recibidas pendientes
    app.get('/api/contacts/requests/received', authenticate, (req, res) => {
        const userId = req.user.id;
        try {
            const requests = req.db.prepare(`
                SELECT cr.id, cr.initial_message, cr.sent_at,
                       u.id as sender_id, u.username, u.profile_picture, u.full_name
                FROM contact_requests cr
                JOIN users u ON cr.sender_id = u.id
                WHERE cr.receiver_id = ? AND cr.status = 'pending'
                ORDER BY cr.sent_at DESC
            `).all(userId);
            res.json(requests);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
    });

    // Solicitudes enviadas
    app.get('/api/contacts/requests/sent', authenticate, (req, res) => {
        const userId = req.user.id;
        try {
            const requests = req.db.prepare(`
                SELECT cr.id, cr.initial_message, cr.status, cr.sent_at, cr.responded_at,
                       u.id as receiver_id, u.username, u.profile_picture, u.full_name
                FROM contact_requests cr
                JOIN users u ON cr.receiver_id = u.id
                WHERE cr.sender_id = ?
                ORDER BY cr.sent_at DESC
            `).all(userId);
            res.json(requests);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener solicitudes' });
        }
    });

    // Lista de chats del usuario
    app.get('/api/chats', authenticate, (req, res) => {
        const userId = req.user.id;
        try {
            const chats = req.db.prepare(`
                SELECT c.id, c.chat_type, c.group_name, c.created_at, c.last_message_at,
                       (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND read_at IS NULL AND user_id != ?) as unread_count,
                       (SELECT encrypted_content FROM messages WHERE chat_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message_preview
                FROM chats c
                JOIN chat_participants cp ON c.id = cp.chat_id
                WHERE cp.user_id = ?
                ORDER BY c.last_message_at DESC
            `).all(userId, userId);

            // Para chats individuales, obtener datos del otro participante
            for (let chat of chats) {
                if (chat.chat_type === 'individual') {
                    const other = req.db.prepare(`
                        SELECT u.id, u.username, u.full_name, u.profile_picture
                        FROM chat_participants cp
                        JOIN users u ON cp.user_id = u.id
                        WHERE cp.chat_id = ? AND cp.user_id != ?
                    `).get(chat.id, userId);
                    chat.other_user = other;
                }
            }
            res.json(chats);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener chats' });
        }
    });

    // Mensajes de un chat
    app.get('/api/chats/:chatId/messages', authenticate, (req, res) => {
        const userId = req.user.id;
        const chatId = req.params.chatId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        try {
            // Verificar pertenencia al chat
            const participant = req.db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
            if (!participant) {
                return res.status(403).json({ error: 'No perteneces a este chat' });
            }

            const messages = req.db.prepare(`
                SELECT m.id, m.user_id, m.encrypted_content, m.iv, m.encrypted_key,
                       m.content_type, m.file_name, m.file_path, m.file_type, m.file_size,
                       m.sent_at, m.read_at,
                       u.username, u.profile_picture
                FROM messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.chat_id = ?
                ORDER BY m.sent_at DESC
                LIMIT ? OFFSET ?
            `).all(chatId, limit, offset);

            // Marcar como leídos los mensajes de otros
            req.db.prepare(`
                UPDATE messages SET read_at = CURRENT_TIMESTAMP
                WHERE chat_id = ? AND user_id != ? AND read_at IS NULL
            `).run(chatId, userId);

            res.json(messages.reverse()); // orden ascendente
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener mensajes' });
        }
    });

    // Página principal del chat
    app.get('/chat', isRegistered, (req, res) => {
        const currentUserId = req.user.id;

        try {
            // 1. Datos del usuario actual
            const userRow = req.db.prepare(`
                SELECT id, username, full_name, profile_picture, is_validated, last_login
                FROM users WHERE id = ?
            `).get(currentUserId);

            if (!userRow) return res.redirect('/login');

            const user = {
                id: userRow.id,
                name: userRow.full_name || userRow.username,
                type: userRow.is_validated ? 'validated' : 'registered',
                isAdmin: false, // pendiente de tabla de roles
                avatar: userRow.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userRow.full_name || userRow.username)}&background=8d6e63&color=fff`,
                status: 'offline',
                fileUploadsThisWeek: 0,   // pendiente de módulo de uploads
                fileUploadLimit: userRow.is_validated ? 50 : 20,
                canCreateGroups: userRow.is_validated,
                maxGroups: 5,
                currentGroups: 0
            };

            // 2. Contactos confirmados (chats individuales)
            const chats = req.db.prepare(`
                SELECT c.id as chat_id
                FROM chat_participants cp
                JOIN chats c ON cp.chat_id = c.id
                WHERE c.chat_type = 'individual' AND cp.user_id = ?
            `).all(currentUserId);

            const contactsFromChats = [];
            for (let chat of chats) {
                const other = req.db.prepare(`
                    SELECT u.id, u.username, u.full_name, u.profile_picture, u.is_validated,
                        k.public_key
                    FROM chat_participants cp
                    JOIN users u ON cp.user_id = u.id
                    LEFT JOIN user_keys k ON u.id = k.user_id
                    WHERE cp.chat_id = ? AND cp.user_id != ?
                `).get(chat.chat_id, currentUserId);

                if (other) {
                    const unread = req.db.prepare(`
                        SELECT COUNT(*) as count FROM messages
                        WHERE chat_id = ? AND user_id != ? AND read_at IS NULL
                    `).get(chat.chat_id, currentUserId).count;

                    contactsFromChats.push({
                        id: other.id,
                        chatId: chat.chat_id,
                        name: other.full_name || other.username,
                        status: 'offline',
                        type: other.is_validated ? 'validated' : 'registered',
                        isContact: true,
                        lastSeen: 'Desconectado',
                        avatar: other.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.full_name || other.username)}&background=2E8B57&color=fff`,
                        unread: unread,
                        publicKey: other.public_key  // <-- agregado
                    });
                }
            }

            // 3. Solicitudes enviadas pendientes
            const outgoing = req.db.prepare(`
                SELECT cr.id as request_id, cr.initial_message, cr.sent_at,
                       u.id, u.username, u.full_name, u.profile_picture, u.is_validated
                FROM contact_requests cr
                JOIN users u ON cr.receiver_id = u.id
                WHERE cr.sender_id = ? AND cr.status = 'pending'
            `).all(currentUserId);

            const contactsFromRequests = outgoing.map(row => ({
                id: row.id,
                name: row.full_name || row.username,
                status: 'offline',
                type: row.is_validated ? 'validated' : 'registered',
                isContact: false,
                lastSeen: 'Solicitud enviada',
                avatar: row.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.full_name || row.username)}&background=32CD32&color=fff`,
                unread: 0,
                requestMessage: row.initial_message || 'Solicitud enviada'
            }));

            // Combinar contactos y añadir canal oficial
            let contacts = [...contactsFromChats, ...contactsFromRequests];
            contacts.push({
                id: 0,
                name: 'Artícora',
                status: 'online',
                type: 'channel',
                isContact: true,
                lastSeen: 'Canal oficial',
                avatar: 'https://ui-avatars.com/api/?name=Articora&background=DAA520&color=fff&bold=true',
                unread: 0,
                isOfficialChannel: true
            });

            // 4. Solicitudes recibidas
            const incomingRows = req.db.prepare(`
                SELECT cr.id, cr.initial_message, cr.sent_at,
                       u.id as sender_id, u.username, u.full_name, u.profile_picture, u.is_validated
                FROM contact_requests cr
                JOIN users u ON cr.sender_id = u.id
                WHERE cr.receiver_id = ? AND cr.status = 'pending'
                ORDER BY cr.sent_at DESC
            `).all(currentUserId);

            const incomingRequests = incomingRows.map(row => {
                const sentAt = new Date(row.sent_at);
                const diff = Date.now() - sentAt;
                const mins = Math.floor(diff / 60000);
                let timeStr = mins < 1 ? 'Ahora' :
                              mins < 60 ? `Hace ${mins} minutos` :
                              mins < 1440 ? `Hace ${Math.floor(mins/60)} horas` :
                              `Hace ${Math.floor(mins/1440)} días`;
                return {
                    id: row.id,
                    name: row.full_name || row.username,
                    type: row.is_validated ? 'validated' : 'registered',
                    message: row.initial_message || '',
                    time: timeStr,
                    avatar: row.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.full_name || row.username)}&background=DAA520&color=fff`
                };
            });

            // 5. Grupos (vacío por ahora)
            const groups = [];

            // 6. Mensajes del canal (con datos del usuario)
            const now = new Date();
            const todayStr = now.toLocaleDateString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

            const articoraMessages = [
                { 
                    id: 1001, 
                    sender: 'Administración', 
                    text: '⚠️ Mantenimiento programado: El sistema estará en mantenimiento el próximo domingo de 2:00 a 6:00 AM.', 
                    time: 'Hoy 09:00', 
                    isAnnouncement: true 
                },
                { 
                    id: 1002, 
                    sender: 'Administración', 
                    text: '🎉 Nueva función: Ya está disponible el comparador de fuentes. Pruébalo en /compare', 
                    time: 'Ayer 14:30', 
                    isAnnouncement: true 
                },
                { 
                    id: 1003, 
                    sender: 'Administración', 
                    text: `📢 Recordatorio: El límite semanal de archivos es de ${user.fileUploadLimit}. Actualmente llevas ${user.fileUploadsThisWeek} archivos subidos esta semana.`, 
                    time: '2 días 11:15', 
                    isAnnouncement: true 
                }
            ];

            // 7. Formatos de archivo y razones de reporte (estáticos)
            const fileFormats = [
                { ext: 'pdf', name: 'PDF', icon: 'file-pdf', color: '#e74c3c' },
                { ext: 'png', name: 'PNG', icon: 'file-image', color: '#3498db' },
                { ext: 'jpg', name: 'JPG', icon: 'file-image', color: '#3498db' },
                { ext: 'jpeg', name: 'JPEG', icon: 'file-image', color: '#3498db' },
                { ext: 'doc', name: 'Word', icon: 'file-word', color: '#2c3e50' },
                { ext: 'docx', name: 'Word', icon: 'file-word', color: '#2c3e50' },
                { ext: 'xls', name: 'Excel', icon: 'file-excel', color: '#27ae60' },
                { ext: 'xlsx', name: 'Excel', icon: 'file-excel', color: '#27ae60' },
                { ext: 'ppt', name: 'PowerPoint', icon: 'file-powerpoint', color: '#e67e22' },
                { ext: 'pptx', name: 'PowerPoint', icon: 'file-powerpoint', color: '#e67e22' },
                { ext: 'zip', name: 'ZIP', icon: 'file-archive', color: '#f39c12' }
            ] ;
            const reportReasons = [
                'Contenido inapropiado',
                'Spam o publicidad no solicitada',
                'Información falsa o engañosa',
                'Acoso o comportamiento ofensivo',
                'Violación de derechos de autor',
                'Contenido no académico',
                'Otro'
            ];

            // 8. Chat activo por defecto (canal Artícora)
            const activeChat = {
                type: 'channel',
                id: 0,
                name: 'Artícora',
                status: 'online',
                avatar: 'https://ui-avatars.com/api/?name=Articora&background=DAA520&color=fff&bold=true',
                encryption: false,
                isRequest: false,
                messages: articoraMessages.map(m => ({
                    id: m.id,
                    sender: m.sender,
                    text: m.text,
                    time: m.time,
                    isOwn: false,
                    status: 'read'
                }))
            };

            res.render('chat', {
                title: 'Chat - Artícora',
                currentPage: 'chat',
                cssFile: 'chat.css',
                data: { user, contacts, groups, incomingRequests, articoraMessages, fileFormats, reportReasons, activeChat }
            });

        } catch (err) {
            console.error('Error en /chat:', err);
            res.status(500).send('Error interno');
        }
    });
};