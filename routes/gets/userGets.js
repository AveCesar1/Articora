const IsRegistered = require('../../middlewares/auth');

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

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

    // Ruta temporal para comprobar disponibilidad de un usuario (JSON puro)
    /*
    app.get('/testing-disponibility/:id', checkDisponibilidad, (req, res) => {
        res.json({ id: req.checkedUserId, available: req.userAvailability });
    });
    */

    // Perfil propio
    app.get('/profile', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.session.userId;
            if (!userId) return res.redirect('/login');

            const userRow = db.prepare(`
                SELECT id, username, email, profile_picture, bio, institution, 
                    academic_level, available_for_messages, is_validated, 
                    created_at, first_name, last_name, full_name
                FROM users WHERE id = ?
            `).get(userId);

            if (!userRow) return res.redirect('/login');

            const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(userId);
            const interests = interestsRows.map(r => r.interest);

            const sourcesAdded = db.prepare('SELECT COUNT(*) as c FROM sources WHERE uploaded_by = ?').get(userId).c || 0;
            const reviewsWritten = db.prepare('SELECT COUNT(*) as c FROM ratings WHERE user_id = ?').get(userId).c || 0;
            const readingLists = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(userId).c || 0;
            const collaborations = db.prepare('SELECT COUNT(*) as c FROM list_collaborators WHERE user_id = ?').get(userId).c || 0;

            const readingStatsRow = db.prepare('SELECT * FROM reading_stats WHERE user_id = ?').get(userId) || {};
            let readingStats = {};
            try {
                if (readingStatsRow.category_distribution) {
                    readingStats = JSON.parse(readingStatsRow.category_distribution);
                }
            } catch (e) { }

            const userData = {
                id: userId,
                username: userRow.username,
                fullName: userRow.full_name || userRow.username,
                academicStatus: userRow.is_validated ? 'Validado' : 'No validado',
                academicDegree: userRow.academic_level || '',
                institution: userRow.institution || '',
                joinDate: userRow.created_at ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                bio: userRow.bio || '',
                availableForMessages: !!userRow.available_for_messages,
                profile_picture: userRow.profile_picture,
                stats: { sourcesAdded, reviewsWritten, readingLists, collaborations },
                readingStats: readingStats,
                recentActivity: [],
                interests: interests,
                lists: db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(userId)
            };

            res.render('profile', {
                title: 'Perfil - Artícora',
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData,
                isOwnProfile: true
            });
        } catch (err) {
            console.error('Error al obtener perfil de usuario:', err);
            return res.redirect('/login');
        }
    });

    // Configuración del perfil
    app.get('/profile/config', IsRegistered, (req, res) => {
        const userId = req.session.userId;
        const db = req.db;
        if (!userId) return res.redirect('/login');

        const userRow = db.prepare(`
        SELECT id, username, email, profile_picture, bio, institution, 
               academic_level, available_for_messages, first_name, last_name
        FROM users WHERE id = ?
    `).get(userId);

        const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(userId);
        const interests = interestsRows.map(r => r.interest);

        const userData = {
            username: userRow.username,
            email: userRow.email,
            bio: userRow.bio || '',
            first_name: userRow.first_name || '',
            last_name: userRow.last_name || '',
            institution: userRow.institution || '',
            academicDegree: userRow.academic_level || '',
            availableForMessages: !!userRow.available_for_messages,
            interests: interests
        };

        res.render('profile-config', {
            title: 'Configuración del Perfil - Artícora',
            currentPage: 'profile-config',
            cssFile: 'profile-config.css',
            jsFile: 'profile-config.js',
            user: userData
        });
    });

    // Perfil de otro usuario 
    // ⚠️⚠️ (Animal: esto va al final pq sino detecta 'profile' como un ID) ⚠️⚠️
    app.get('/profile/:id', IsRegistered, (req, res) => {
        const currentUserId = req.session.userId;
        const profileId = parseInt(req.params.id, 10);

        if (isNaN(profileId)) {
            return res.status(400).send('ID inválido');
        }

        if (profileId === currentUserId) {
            return res.redirect('/profile');
        }

        try {
            const db = req.db;

            const userRow = db.prepare(`
            SELECT id, username, email, profile_picture, bio, institution, 
                   academic_level, available_for_messages, is_validated, 
                   created_at, first_name, last_name, full_name
            FROM users WHERE id = ? AND account_active = 1
        `).get(profileId);

            if (!userRow) return res.status(404).send('Usuario no encontrado');

            const sourcesAdded = db.prepare('SELECT COUNT(*) as c FROM sources WHERE uploaded_by = ?').get(profileId).c || 0;
            const reviewsWritten = db.prepare('SELECT COUNT(*) as c FROM ratings WHERE user_id = ?').get(profileId).c || 0;
            const readingLists = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(profileId).c || 0;
            const collaborations = db.prepare('SELECT COUNT(*) as c FROM list_collaborators WHERE user_id = ?').get(profileId).c || 0;

            const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(profileId);
            const interests = interestsRows.map(r => r.interest);

            const contactExists = db.prepare(`
            SELECT 1 FROM confirmed_contacts
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        `).get(currentUserId, profileId, profileId, currentUserId);

            const pendingRequest = db.prepare(`
            SELECT id, sender_id FROM contact_requests
            WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
            AND status = 'pending'
        `).get(currentUserId, profileId, profileId, currentUserId);

            const userData = {
                id: userRow.id,
                username: userRow.username,
                fullName: userRow.full_name || userRow.username,
                academicStatus: userRow.is_validated ? 'Validado' : 'No validado',
                academicDegree: userRow.academic_level || '',
                institution: userRow.institution || '',
                joinDate: userRow.created_at ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                bio: userRow.bio || '',
                availableForMessages: !!userRow.available_for_messages,
                profilePicture: userRow.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userRow.full_name || userRow.username)}&background=2c1810&color=e0d6c2`,
                stats: { sourcesAdded, reviewsWritten, readingLists, collaborations },
                interests: interests,
                canSendRequest: userRow.available_for_messages && !contactExists && !pendingRequest,
                hasPendingRequest: !!pendingRequest,
                lists: db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(profileId),
                pendingRequestSentByMe: pendingRequest && pendingRequest.sender_id === currentUserId,
                recentActivity: []
            };

            res.render('profile', {
                title: `Perfil de ${userData.fullName} - Artícora`,
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData,
                isOwnProfile: false
            });
        } catch (err) {
            console.error('Error al cargar perfil ajeno:', err);
            res.status(500).send('Error interno');
        }
    });
};