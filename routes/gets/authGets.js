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

    app.get('/profile', IsRegistered,(req, res) => {
        const userData = {
            username: 'leonardo.serna',
            fullName: 'Leonardo Serna Sánchez',
            email: 'leonardo.serna@example.com',
            academicStatus: 'Validado',
            academicDegree: 'Maestría en Ciencias de la Computación',
            institution: 'Centro de Enseñanza Técnica Industrial',
            joinDate: '15 de agosto de 2023',
            bio: 'Investigador en el área de Ciencias Computacionales con enfoque en IA y procesamiento de lenguaje natural. Especial interés en modelos de recomendación académica y análisis de redes de colaboración científica.',
            availableForMessages: true,
            stats: {
                sourcesAdded: 42,
                reviewsWritten: 28,
                readingLists: 5,
                collaborations: 12
            },
            readingStats: {
                cognitiveSciences: 12,
                socialSciences: 8,
                humanities: 5,
                creativeDisciplines: 3,
                computationalSciences: 25,
                exactSciences: 10,
                naturalSciences: 7,
                appliedSciences: 15
            },
            recentActivity: [
                { 
                    icon: 'fas fa-star',
                    title: 'Calificó "Advances in Neural Information Processing Systems"',
                    description: '4.5 estrellas en veracidad y 4.0 en nivel de detalle',
                    time: 'Hace 2 días'
                },
                { 
                    icon: 'fas fa-bookmark',
                    title: 'Añadió "Journal of Machine Learning Research" a su lista',
                    description: 'Lista: "Lecturas pendientes de IA avanzada"',
                    time: 'Hace 4 días'
                },
                { 
                    icon: 'fas fa-comment',
                    title: 'Comentó en la discusión de "Nature Communications"',
                    description: 'Participó en el debate sobre metodologías de investigación',
                    time: 'Hace 1 semana'
                },
                { 
                    icon: 'fas fa-upload',
                    title: 'Subió una nueva fuente bibliográfica',
                    description: '"Ethical Considerations in AI Research" (2023)',
                    time: 'Hace 2 semanas'
                }
            ],
            interests: ['Inteligencia Artificial', 'Procesamiento de Lenguaje Natural', 'Ciencia de Datos', 'Ética en IA', 'Sistemas de Recomendación']
        };
        
        res.render('profile', { 
            title: 'Perfil - Artícora',
            currentPage: 'profile',
            cssFile: 'profile.css',
            jsFile: 'profile.js',
            user: userData
        });
    });

    app.get('/profile/config', IsRegistered, (req, res) => {
        // Mismos datos del perfil
        const userData = {
            username: 'leonardo.serna',
            fullName: 'Leonardo Serna Sánchez',
            email: 'leonardo.serna@example.com',
            academicStatus: 'Validado',
            academicDegree: 'Maestría en Ciencias de la Computación',
            institution: 'Centro de Enseñanza Técnica Industrial',
            joinDate: '15 de agosto de 2023',
            bio: 'Investigador en el área de Ciencias Computacionales con enfoque en IA y procesamiento de lenguaje natural. Especial interés en modelos de recomendación académica y análisis de redes de colaboración científica.',
            availableForMessages: true,
            stats: {
                sourcesAdded: 42,
                reviewsWritten: 28,
                readingLists: 5,
                collaborations: 12
            },
            readingStats: {
                cognitiveSciences: 12,
                socialSciences: 8,
                humanities: 5,
                creativeDisciplines: 3,
                computationalSciences: 25,
                exactSciences: 10,
                naturalSciences: 7,
                appliedSciences: 15
            },
            recentActivity: [
                { 
                    icon: 'fas fa-star',
                    title: 'Calificó "Advances in Neural Information Processing Systems"',
                    description: '4.5 estrellas en veracidad y 4.0 en nivel de detalle',
                    time: 'Hace 2 días'
                },
                { 
                    icon: 'fas fa-bookmark',
                    title: 'Añadió "Journal of Machine Learning Research" a su lista',
                    description: 'Lista: "Lecturas pendientes de IA avanzada"',
                    time: 'Hace 4 días'
                },
                { 
                    icon: 'fas fa-comment',
                    title: 'Comentó en la discusión de "Nature Communications"',
                    description: 'Participó en el debate sobre metodologías de investigación',
                    time: 'Hace 1 semana'
                }
            ],
            interests: ['Inteligencia Artificial', 'Procesamiento de Lenguaje Natural', 'Ciencia de Datos', 'Ética en IA', 'Sistemas de Recomendación']
        };
        
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