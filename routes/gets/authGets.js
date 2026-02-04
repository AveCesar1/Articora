const IsRegistered = require('../../middlewares/auth');

module.exports = function (app) {
    // Rutas públicas GET extraídas desde server.js

    app.get('/', (req, res) => {
        res.render('landing', { 
            title: 'Artícora - Plataforma de Investigación Colaborativa',
            currentPage: 'landing',
            cssFile: 'landing.css',
            jsFile: 'landing.js'
        });
    });

    app.get('/login', (req, res) => {
        res.render('login', { 
            title: 'Iniciar Sesión - Artícora',
            currentPage: 'login',
            cssFile: 'login.css',
            jsFile: 'login.js'
        });
    });

    app.get('/register', (req, res) => {
        res.render('register', { 
            title: 'Registrarse - Artícora',
            currentPage: 'register',
            cssFile: 'register.css',
            jsFile: 'register.js'
        });
    });

    app.get('/profile', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.session.userId;
            if (!userId) return res.redirect('/login');

            const userRow = db.prepare(
                `SELECT id, username, email, profile_picture, bio, institution, academic_level, available_for_messages, is_validated, created_at
                 FROM users WHERE id = ?`
            ).get(userId);

            if (!userRow) return res.redirect('/login');
            //Estas pueden cambiar a lo largo del tiempo... No lo se
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
            } catch (e) {
                readingStats = {};
            }

            const userData = {
                username: userRow.username,
                fullName: userRow.full_name || userRow.username,
                email: userRow.email,
                academicStatus: userRow.is_validated ? 'Validado' : 'No validado',
                academicDegree: userRow.academic_level || '',
                institution: userRow.institution || '',
                joinDate: userRow.created_at ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                bio: userRow.bio || '',
                availableForMessages: !!userRow.available_for_messages,
                stats: {
                    sourcesAdded,
                    reviewsWritten,
                    readingLists,
                    collaborations
                },
                readingStats: readingStats,
                recentActivity: [],
                interests: []
            };

            res.render('profile', {
                title: 'Perfil - Artícora',
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData
            });
        } catch (err) {
            console.error('Error al obtener perfil de usuario:', err);
            return res.redirect('/login');
        }
    });

    app.get('/profile/config', IsRegistered, (req, res) => {
        const userId = req.session.userId;
        const db = req.db;
        if(!userId) return res.redirect('/login');
        const userRow = db.prepare(
            `SELECT id, username, email, profile_picture, bio, institution, academic_level, available_for_messages
             FROM users WHERE id = ?`
        ).get(userId);
        const userData ={
            username: userRow.username,
            fullName: userRow.full_name || userRow.username,
            email: userRow.email,
            bio: userRow.bio || '',
            institution: userRow.institution || '',
            academicDegree: userRow.academic_level || '',
            availableForMessages: !!userRow.available_for_messages,
            interests: [],
        }
        
        
        res.render('profile-config', { 
            title: 'Configuración del Perfil - Artícora',
            currentPage: 'profile-config',
            cssFile: 'profile-config.css',
            jsFile: 'profile-config.js',
            user: userData
        });
    });

    app.get('/verify-email', (req, res) => {
        const email = req.query.email || '';
        
        // Verificar si hay registro pendiente para este email
        if (!req.session.pendingRegistration || req.session.pendingRegistration.email !== email) {
            // Redirigir al registro si no hay registro pendiente
            return res.redirect('/register?error=no_pending_registration');
        }
        
        res.render('verify-email', {
            title: 'Verificación de Correo - Artícora',
            currentPage: 'verify-email',
            cssFile: 'verify-email.css',
            jsFile: 'verify-email.js',
            email: email
        });
    });

    app.get('/forgot-password', IsRegistered, (req, res) => {
        res.render('forgot-password', {
            title: 'Recuperación de Contraseña - Artícora',
            currentPage: 'forgot-password',
            cssFile: 'forgot-password.css',
            jsFile: 'forgot-password.js'
        });
    });
};