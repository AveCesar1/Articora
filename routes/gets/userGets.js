const IsRegistered = require('../../middlewares/auth');

// Middleware local: comprueba si un usuario está disponible para recibir mensajes
function checkDisponibilidad(req, res, next) {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid_user_id' });

    try {
        const row = req.db.prepare('SELECT id, available_for_messages FROM users WHERE id = ?').get(id);
        if (!row) return res.status(404).json({ error: 'user_not_found' });

        // Normalizamos a booleano
        req.userAvailability = !!row.available_for_messages;
        req.checkedUserId = row.id;
        return next();
    } catch (err) {
        console.error('checkDisponibilidad error:', err);
        return res.status(500).json({ error: 'internal_error' });
    }
}

module.exports = function (app) {
    app.get('/dashboard', (req, res) => {
        const dashboardData = {
            userStats: {
                totalReadings: 143,
                uploadedSources: 8,
                completedReadings: 89,
                activeDays: 45
            },
            recentStudyTopic: {
                category: 'Ciencias Cognitivas',
                percentage: 32,
                subcategory: 'Psicología Cognitiva',
                recentReadings: 12,
                color: '#8B4513'
            },
            myReferences: [
                {
                    id: 101,
                    title: 'The Cognitive Science of Decision Making',
                    authors: ['Kahneman, Daniel'],
                    year: 2022,
                    type: 'Artículo de revista',
                    uploadDate: '2024-01-15',
                    views: 245,
                    bookmarks: 18
                },
                {
                    id: 102,
                    title: 'Machine Learning Approaches in Neuroscience',
                    authors: ['Hassabis, Demis', 'Kumaran, Dharshan'],
                    year: 2021,
                    type: 'Preprint',
                    uploadDate: '2023-11-28',
                    views: 189,
                    bookmarks: 12
                },
                {
                    id: 103,
                    title: 'Philosophy of Mind in the 21st Century',
                    authors: ['Chalmers, David'],
                    year: 2020,
                    type: 'Libro',
                    uploadDate: '2023-09-10',
                    views: 312,
                    bookmarks: 24
                },
                {
                    id: 104,
                    title: 'Cognitive Linguistics and Language Acquisition',
                    authors: ['Tomasello, Michael'],
                    year: 2023,
                    type: 'Artículo de revista',
                    uploadDate: '2023-08-05',
                    views: 167,
                    bookmarks: 9
                }
            ],
            mostReadTopic: {
                category: 'Ciencias Humanistas',
                totalReadings: 47,
                percentage: 33,
                subcategories: [
                    { name: 'Filosofía', count: 21 },
                    { name: 'Estudios Culturales', count: 15 },
                    { name: 'Literatura', count: 11 }
                ],
                color: '#6A5ACD'
            },
            globalTrends: [
                { id: 201, title: 'The Future of AI in Academic Research', authors: ['Bengio, Yoshua'], category: 'Ciencias Computacionales', reads: 1247, trend: 'up' },
                { id: 202, title: 'Neuroplasticity and Learning', authors: ['Draganski, Bogdan'], category: 'Ciencias Cognitivas', reads: 987, trend: 'up' },
                { id: 203, title: 'Ethics in Machine Learning', authors: ['Bostrom, Nick'], category: 'Ciencias Humanistas', reads: 856, trend: 'stable' },
                { id: 204, title: 'Quantum Computing Foundations', authors: ['Nielsen, Michael', 'Chuang, Isaac'], category: 'Ciencias Exactas', reads: 732, trend: 'up' },
                { id: 205, title: 'Climate Change Modeling', authors: ['Hansen, James'], category: 'Ciencias Naturales', reads: 654, trend: 'stable' },
                { id: 206, title: 'Social Media and Mental Health', authors: ['Twenge, Jean'], category: 'Ciencias Sociales', reads: 543, trend: 'down' },
                { id: 207, title: 'Digital Humanities: New Methods', authors: ['Schreibman, Susan'], category: 'Ciencias Humanistas', reads: 432, trend: 'up' },
                { id: 208, title: 'Biomedical Engineering Advances', authors: ['Langer, Robert'], category: 'Ciencias Aplicadas', reads: 389, trend: 'stable' },
                { id: 209, title: 'Creative AI in Art', authors: ['Mazzone, Marian'], category: 'Disciplinas Creativas', reads: 321, trend: 'up' },
                { id: 210, title: 'The Mathematics of Networks', authors: ['Barabási, Albert-László'], category: 'Ciencias Exactas', reads: 287, trend: 'stable' }
            ],
            recentReadings: [
                { category: 'Ciencias Cognitivas', count: 5, date: 'Hoy' },
                { category: 'Ciencias Humanistas', count: 3, date: 'Ayer' },
                { category: 'Ciencias Sociales', count: 2, date: '2 días' },
                { category: 'Ciencias Computacionales', count: 4, date: '3 días' }
            ],
            readingHistory: {
                last30Days: [12, 15, 8, 10, 14, 16, 9, 11, 13, 15, 17, 10, 12, 14, 11, 9, 13, 15, 12, 14, 16, 13, 11, 9, 12, 14, 10, 13, 15, 12],
                categories: ['Ciencias Cognitivas', 'Ciencias Humanistas', 'Ciencias Sociales', 'Ciencias Computacionales', 'Ciencias Exactas', 'Ciencias Naturales', 'Ciencias Aplicadas', 'Disciplinas Creativas'],
                categoryDistribution: [32, 25, 15, 12, 6, 5, 3, 2]
            }
        };

        res.render('dashboard', {
            title: 'Dashboard - Artícora',
            currentPage: 'dashboard',
            cssFile: 'dashboard.css',
            data: dashboardData
        });
    });

    // CHAT
    app.get('/chat', IsRegistered, (req, res) => {
        const userType = Math.random() > 0.5 ? 'validated' : 'registered';
        const isAdmin = Math.random() > 0.8;
        const chatData = {
            user: {
                id: 1,
                name: 'Usuario Demo',
                type: userType,
                isAdmin: isAdmin,
                avatar: 'https://ui-avatars.com/api/?name=Usuario+Demo&background=8d6e63&color=fff',
                status: 'online',
                fileUploadsThisWeek: 23,
                fileUploadLimit: 50,
                canCreateGroups: userType === 'validated',
                maxGroups: 5,
                currentGroups: 2
            },
            contacts: [
                { id: 2, name: 'Ana García', status: 'online', type: 'validated', isContact: true, lastSeen: 'Hace 5 minutos', avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=2E8B57&color=fff', unread: 3 },
                { id: 3, name: 'Carlos López', status: 'away', type: 'registered', isContact: true, lastSeen: 'Hace 30 minutos', avatar: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=4682B4&color=fff', unread: 0 },
                { id: 4, name: 'María Rodríguez', status: 'offline', type: 'validated', isContact: false, lastSeen: 'Hace 2 horas', avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=FF6347&color=fff', unread: 0, requestMessage: 'Hola, me gustaría colaborar en tu investigación sobre cognición.' },
                { id: 5, name: 'Pedro Sánchez', status: 'online', type: 'validated', isContact: true, lastSeen: 'En línea', avatar: 'https://ui-avatars.com/api/?name=Pedro+Sanchez&background=20B2AA&color=fff', unread: 1 },
                { id: 0, name: 'Artícora', status: 'online', type: 'channel', isContact: true, lastSeen: 'Canal oficial', avatar: 'https://ui-avatars.com/api/?name=Articora&background=DAA520&color=fff&bold=true', unread: 3, isOfficialChannel: true }
            ],
            groups: [
                { id: 101, name: 'Grupo de Neurociencia', description: 'Discusión sobre avances en neurociencia cognitiva', creatorId: 1, members: 8, maxMembers: 12, isMember: true, lastMessage: { sender: 'Ana García', text: '¿Alguien ha leído el último paper de...', time: '10:45' }, avatar: 'https://ui-avatars.com/api/?name=Neurociencia&background=8B4513&color=fff&bold=true' },
                { id: 102, name: 'Estudios Filosóficos', description: 'Análisis de filosofía contemporánea', creatorId: 2, members: 5, maxMembers: 12, isMember: true, lastMessage: { sender: 'Carlos López', text: 'La discusión sobre Heidegger fue...', time: 'Ayer' }, avatar: 'https://ui-avatars.com/api/?name=Filosofia&background=6A5ACD&color=fff&bold=true' }
            ],
            incomingRequests: [
                { id: 6, name: 'Laura Martínez', type: 'validated', message: 'Hola, me interesa tu investigación sobre cognición. ¿Podríamos colaborar?', time: 'Hace 2 horas', avatar: 'https://ui-avatars.com/api/?name=Laura+Martinez&background=DAA520&color=fff' },
                { id: 7, name: 'Juan Pérez', type: 'registered', message: 'Buen día, vi tu perfil y me gustaría discutir sobre tu área de estudio.', time: 'Hace 1 día', avatar: 'https://ui-avatars.com/api/?name=Juan+Perez&background=32CD32&color=fff' }
            ],
            articoraMessages: [
                { id: 1001, sender: 'Administración', text: '⚠️ Mantenimiento programado: El sistema estará en mantenimiento el próximo domingo de 2:00 a 6:00 AM.', time: 'Hoy 09:00', isAnnouncement: true },
                { id: 1002, sender: 'Administración', text: '🎉 Nueva función: Ya está disponible el comparador de fuentes. Pruébalo en /compare', time: 'Ayer 14:30', isAnnouncement: true },
                { id: 1003, sender: 'Administración', text: '📢 Recordatorio: El límite semanal de archivos es de 50. Actualmente llevas 23 archivos subidos esta semana.', time: '2 días 11:15', isAnnouncement: true }
            ],
            fileFormats: [
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
            ],
            reportReasons: [
                'Contenido inapropiado',
                'Spam o publicidad no solicitada',
                'Información falsa o engañosa',
                'Acoso o comportamiento ofensivo',
                'Violación de derechos de autor',
                'Contenido no académico',
                'Otro'
            ],
            activeChat: {
                type: 'individual',
                id: 2,
                name: 'Ana García',
                status: 'online',
                avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=2E8B57&color=fff',
                encryption: true,
                isRequest: false,
                messages: [
                    { id: 1, sender: 'Ana García', text: 'Hola, ¿has revisado el artículo que te envié?', time: '10:30', isOwn: false, status: 'read' },
                    { id: 2, sender: 'Tú', text: 'Sí, justo lo estaba leyendo. Muy interesante la metodología que usaron.', time: '10:32', isOwn: true, status: 'read' },
                    { id: 3, sender: 'Ana García', text: '¿Podrías enviarme tu análisis cuando lo termines? Me gustaría contrastar opiniones.', time: '10:33', isOwn: false, status: 'read' },
                    { id: 4, sender: 'Tú', text: 'Claro, tengo algunas notas aquí. Te las envío mañana.', time: '10:35', isOwn: true, status: 'delivered' }
                ]
            }
        };

        res.render('chat', {
            title: 'Chat - Artícora',
            currentPage: 'chat',
            cssFile: 'chat.css',
            data: chatData
        });
    });

    // Ruta temporal para comprobar disponibilidad de un usuario (JSON puro)
    /*
    app.get('/testing-disponibility/:id', checkDisponibilidad, (req, res) => {
        res.json({ id: req.checkedUserId, available: req.userAvailability });
    });
    */
};