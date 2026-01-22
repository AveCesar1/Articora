
const IsRegistered = require('../middlewares/auth');
const checkRoles = require('../middlewares/checkrole');

//Alias de middlewares
const soloAdmin = checkRoles(['admin']);
const soloValidado = checkRoles(['validado', 'admin']);
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

    // SEARCH
    app.get('/search', (req, res) => {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const filters = {
            categories: req.query.categories ? req.query.categories.split(',') : [],
            subcategories: req.query.subcategories ? req.query.subcategories.split(',') : [],
            sourceType: req.query.sourceType || '',
            yearFrom: req.query.yearFrom || '',
            yearTo: req.query.yearTo || '',
            sortBy: req.query.sortBy || 'relevance',
            academicAdjustment: req.query.academicAdjustment === 'true'
        };
        
        const categories = [
            { id: 'cognitive', name: 'Ciencias Cognitivas', color: '#3498db', subcategories: [ { id: 'cog_psych', name: 'Psicología Cognitiva' }, { id: 'cog_neuro', name: 'Neurociencia Cognitiva' }, { id: 'cog_lang', name: 'Procesamiento del Lenguaje' }, { id: 'cog_applied', name: 'Cognición Aplicada' }, { id: 'cog_ai', name: 'IA Cognitiva' }, { id: 'cog_phil', name: 'Filosofía de la Mente' } ] },
            { id: 'social', name: 'Ciencias Sociales', color: '#2ecc71', subcategories: [ { id: 'soc_sociology', name: 'Sociología' }, { id: 'soc_politics', name: 'Ciencia Política' }, { id: 'soc_anthropology', name: 'Antropología' }, { id: 'soc_economics', name: 'Economía' }, { id: 'soc_history', name: 'Historia' }, { id: 'soc_geography', name: 'Geografía Humana' } ] },
            { id: 'humanities', name: 'Ciencias Humanistas', color: '#9b59b6', subcategories: [ { id: 'hum_philosophy', name: 'Filosofía' }, { id: 'hum_religion', name: 'Estudios Religiosos' }, { id: 'hum_literature', name: 'Literatura' }, { id: 'hum_linguistics', name: 'Lingüística' }, { id: 'hum_digital', name: 'Humanidades Digitales' }, { id: 'hum_cultural', name: 'Estudios Culturales' }, { id: 'hum_history', name: 'Humanidades Históricas' } ] },
            { id: 'creative', name: 'Disciplinas Creativas', color: '#e74c3c', subcategories: [ { id: 'cre_visual', name: 'Artes Visuales' }, { id: 'cre_music', name: 'Música' }, { id: 'cre_performing', name: 'Artes Escénicas' }, { id: 'cre_writing', name: 'Escritura Creativa' }, { id: 'cre_design', name: 'Diseño' }, { id: 'cre_theory', name: 'Teoría del Arte' } ] },
            { id: 'computational', name: 'Ciencias Computacionales', color: '#f39c12', subcategories: [ { id: 'comp_theory', name: 'Computación Teórica' }, { id: 'comp_software', name: 'Ingeniería de Software' }, { id: 'comp_ai', name: 'Inteligencia Artificial' }, { id: 'comp_cyber', name: 'Ciberseguridad' }, { id: 'comp_infra', name: 'Infraestructura Digital' }, { id: 'comp_scientific', name: 'Computación Científica' }, { id: 'comp_robotics', name: 'Robótica' } ] },
            { id: 'exact', name: 'Ciencias Exactas', color: '#1abc9c', subcategories: [ { id: 'exact_pure_math', name: 'Matemáticas Puras' }, { id: 'exact_applied_math', name: 'Matemáticas Aplicadas' }, { id: 'exact_theoretical_physics', name: 'Física Teórica' }, { id: 'exact_experimental_physics', name: 'Física Experimental' }, { id: 'exact_logic', name: 'Lógica Formal' }, { id: 'exact_statistics', name: 'Estadística' }, { id: 'exact_theoretical_chemistry', name: 'Química Teórica' } ] },
            { id: 'natural', name: 'Ciencias Naturales', color: '#34495e', subcategories: [ { id: 'nat_biology', name: 'Biología' }, { id: 'nat_ecology', name: 'Ecología' }, { id: 'nat_chemistry', name: 'Química' }, { id: 'nat_earth', name: 'Ciencias de la Tierra' }, { id: 'nat_astronomy', name: 'Astronomía' }, { id: 'nat_biotech', name: 'Biotecnología' }, { id: 'nat_life', name: 'Ciencias de la Vida' } ] },
            { id: 'applied', name: 'Ciencias Aplicadas', color: '#e67e22', subcategories: [ { id: 'app_engineering', name: 'Ingenierías' }, { id: 'app_health', name: 'Ciencias de la Salud' }, { id: 'app_architecture', name: 'Arquitectura' }, { id: 'app_materials', name: 'Materiales y Nano' }, { id: 'app_agro', name: 'Agro y Veterinaria' }, { id: 'app_biomedical', name: 'Ingeniería Biomédica' }, { id: 'app_environmental', name: 'Ingeniería Ambiental' } ] }
        ];

        const ratingCriteria = [ { id: 'extension', name: 'Extensión de lectura' }, { id: 'completeness', name: 'Completitud' }, { id: 'detail', name: 'Nivel de detalle' }, { id: 'veracity', name: 'Veracidad' }, { id: 'difficulty', name: 'Dificultad técnica' } ];

        const sourceTypes = [ { value: 'article', label: 'Artículo de revista' }, { value: 'book', label: 'Libro' }, { value: 'chapter', label: 'Capítulo de libro' }, { value: 'thesis', label: 'Tesis o disertación' }, { value: 'preprint', label: 'Preprint' }, { value: 'conference', label: 'Actas de congreso' }, { value: 'technical', label: 'Informe técnico' }, { value: 'encyclopedia', label: 'Enciclopedia' }, { value: 'audiovisual', label: 'Material audiovisual' }, { value: 'online', label: 'Artículo en línea' } ];

        const results = Array.from({ length: 20 }, (_, i) => {
            const sourceId = `source_${i + 1}`;
            const category = categories[Math.floor(Math.random() * categories.length)];
            const subcategory = category.subcategories[Math.floor(Math.random() * category.subcategories.length)];
            return {
                id: sourceId,
                title: `${i + 1}: Un estudio sobre ${['IA', 'Machine Learning', 'Procesamiento de Lenguaje', 'Redes Neuronales', 'Ética en Tecnología'][i % 5]}`,
                authors: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => `Autor ${String.fromCharCode(65 + j)}. ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][(i + j) % 5]}`),
                year: 2020 + (i % 5),
                type: sourceTypes[Math.floor(Math.random() * sourceTypes.length)].label,
                pages: `${Math.floor(Math.random() * 50) + 5}-${Math.floor(Math.random() * 50) + 60}`,
                doi: i % 3 === 0 ? `10.1234/example.${sourceId}` : null,
                keywords: ['Inteligencia Artificial', 'Machine Learning', 'Procesamiento de Lenguaje Natural', 'Redes Neuronales', 'Ética'].slice(0, Math.floor(Math.random() * 3) + 2),
                excerpt: `Este documento presenta una investigación sobre ${['métodos innovadores en IA', 'aplicaciones de machine learning', 'técnicas de procesamiento de lenguaje natural', 'modelos de redes neuronales profundas', 'consideraciones éticas en tecnología'][i % 5]}. El estudio incluye análisis detallados, experimentos controlados y conclusiones relevantes para la comunidad académica. Los resultados demuestran que...`,
                rating: { average: 3.5 + (Math.random() * 1.5), count: Math.floor(Math.random() * 100) + 10, criteria: ratingCriteria.map(criterion => ({ name: criterion.name, value: 3 + (Math.random() * 2) })) },
                category: { id: category.id, name: category.name, color: category.color },
                subcategory: { id: subcategory.id, name: subcategory.name },
                stats: { views: Math.floor(Math.random() * 500) + 100, bookmarks: Math.floor(Math.random() * 50) + 5 },
                uploadDate: `${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 12) + 1}/2023`,
                uploader: { id: `user_${Math.floor(Math.random() * 100)}`, name: ['Dr. Ana García', 'Prof. Carlos López', 'Dra. María Rodríguez', 'Lic. Juan Martínez'][Math.floor(Math.random() * 4)] }
            };
        });

        const resultsPerPage = 10;
        const startIndex = (page - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        const paginatedResults = results.slice(startIndex, endIndex);

        res.render('search', {
            title: query ? `"${query}" - Búsqueda - Artícora` : 'Búsqueda - Artícora',
            currentPage: 'search',
            cssFile: 'search.css',
            jsFile: 'search.js',
            query: query,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
            categories: categories,
            ratingCriteria: ratingCriteria,
            sourceTypes: sourceTypes,
            results: paginatedResults,
            pagination: { currentPage: page, totalPages: Math.ceil(results.length / resultsPerPage), totalResults: results.length }
        });
    });

    // POST
    app.get('/post/:id', (req, res) => {
        const postId = req.params.id;
        const post = {
            id: postId,
            title: 'Inteligencia Artificial: Un Enfoque Moderno',
            authors: ['Stuart Russell', 'Peter Norvig'],
            year: 2020,
            type: 'Libro',
            journal: null,
            publisher: 'Pearson',
            volume: '4ta Edición',
            issue: null,
            pages: '1136',
            doi: '10.1000/xyz123',
            isbn: '978-0134610993',
            abstract: 'Este libro ofrece el más completo y actualizado panorama de la inteligencia artificial. Desde los fundamentos teóricos hasta las aplicaciones más recientes, los autores presentan un recorrido exhaustivo por el campo.',
            keywords: ['Inteligencia Artificial', 'Machine Learning', 'Algoritmos', 'Robótica', 'Procesamiento del Lenguaje Natural'],
            category: { id: 'computational', name: 'Ciencias Computacionales', icon: 'fas fa-laptop-code', color: 'danger' },
            subcategory: 'Inteligencia Artificial',
            rating: { average: 4.7, count: 128, criteria: [ { name: 'Extensión', score: 4.5, count: 128 }, { name: 'Completitud', score: 4.8, count: 128 }, { name: 'Nivel de detalle', score: 4.6, count: 128 }, { name: 'Veracidad', score: 4.9, count: 128 }, { name: 'Dificultad técnica', score: 4.5, count: 128 } ] },
            stats: { reads: 1500, reviews: 128, citations: 300, downloads: 750 },
            uploadedBy: 'Dr. Jane Smith',
            uploadDate: '2023-05-15',
            language: 'Español',
            license: 'CC BY-NC-SA 4.0',
            url: 'https://example.com/document.pdf',
            coverImage: 'https://placehold.co/600x800/'
        };

        const comments = [
            { id: 1, user: 'Juan Pérez', avatar: 'https://i.pravatar.cc/150?img=1', date: '2023-10-15', text: 'Excelente recurso para entender los fundamentos de la IA. Muy completo y bien estructurado.', rating: 5 },
            { id: 2, user: 'María González', avatar: 'https://i.pravatar.cc/150?img=2', date: '2023-09-22', text: 'Buen contenido, aunque algunos capítulos son demasiado técnicos para principiantes.', rating: 4 },
            { id: 3, user: 'Carlos López', avatar: 'https://i.pravatar.cc/150?img=3', date: '2023-08-30', text: 'La sección sobre aprendizaje profundo está desactualizada. Necesita incluir transformers.', rating: 3 }
        ];

        const relatedSources = [
            { id: 'rel_1', title: 'Deep Learning: A Comprehensive Overview', authors: ['Ian Goodfellow', 'Yoshua Bengio'], year: 2016, rating: 4.5, category: 'Computacional' },
            { id: 'rel_2', title: 'Pattern Recognition and Machine Learning', authors: ['Christopher Bishop'], year: 2006, rating: 4.7, category: 'Computacional' },
            { id: 'rel_3', title: 'The Elements of Statistical Learning', authors: ['Trevor Hastie', 'Robert Tibshirani', 'Jerome Friedman'], year: 2009, rating: 4.8, category: 'Computacional' },
            { id: 'rel_4', title: 'Reinforcement Learning: An Introduction', authors: ['Richard Sutton', 'Andrew Barto'], year: 2018, rating: 4.6, category: 'Computacional' },
            { id: 'rel_5', title: 'Natural Language Processing with Python', authors: ['Steven Bird', 'Ewan Klein', 'Edward Loper'], year: 2009, rating: 4.3, category: 'Computacional' }
        ];

        const citationFormats = {
            apa: 'Russell, S., & Norvig, P. (2020). Inteligencia Artificial: Un Enfoque Moderno (4ta ed.). Pearson.',
            chicago: 'Russell, Stuart, and Peter Norvig. 2020. Inteligencia Artificial: Un Enfoque Moderno. 4th ed. Pearson.',
            harvard: 'Russell, S. & Norvig, P., 2020. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson.',
            mla: 'Russell, Stuart, and Peter Norvig. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed., Pearson, 2020.',
            ieee: 'S. Russell and P. Norvig, Inteligencia Artificial: Un Enfoque Moderno, 4ta ed. Pearson, 2020.',
            vancouver: 'Russell S, Norvig P. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson; 2020.',
            bibtex: `@book{russell2020inteligencia,\n            title={Inteligencia Artificial: Un Enfoque Moderno},\n            author={Russell, Stuart and Norvig, Peter},\n            year={2020},\n            edition={4ta},\n            publisher={Pearson}\n        }`
        };

        res.render('post', {
            title: `${post.title} - Artícora`,
            currentPage: 'post',
            cssFile: 'post.css',
            jsFile: 'post.js',
            post,
            comments,
            relatedSources,
            citationFormats
        });
    });

    app.get('/upload', soloValidado, (req, res) => {
        const categories = [
            { id: 1, name: 'Ciencias Cognitivas', color: '#8B4513', subcategories: [ { id: 101, name: 'Psicología Cognitiva' }, { id: 102, name: 'Neurociencia Cognitiva' }, { id: 103, name: 'Procesamiento del Lenguaje' }, { id: 104, name: 'Cognición Aplicada' }, { id: 105, name: 'IA Cognitiva' }, { id: 106, name: 'Filosofía de la Mente' } ] },
            { id: 2, name: 'Ciencias Sociales', color: '#2E8B57', subcategories: [ { id: 201, name: 'Sociología' }, { id: 202, name: 'Ciencia Política' }, { id: 203, name: 'Antropología' }, { id: 204, name: 'Economía' }, { id: 205, name: 'Historia' }, { id: 206, name: 'Geografía Humana' } ] },
            { id: 3, name: 'Ciencias Humanistas', color: '#6A5ACD', subcategories: [ { id: 301, name: 'Filosofía' }, { id: 302, name: 'Estudios Religiosos' }, { id: 303, name:'Literatura'}, { id :304 ,name:'Lingüística'}, {id :305 ,name:'Humanidades Digitales'}, {id :306 ,name:'Estudios Culturales'}, {id :307 ,name:'Humanidades Históricas'} ] },
            { id :4 ,name :'Disciplinas Creativas',color :'#FF6347',subcategories :[ 
                {
                    "id": "401", 
                    "name": "Artes Visuales"
                },
                {
                    "id": "402",
                    "name": "Música"
                },
                {
                    "id": "403",
                    "name": "Artes Escénicas"
                },
                {
                    "id": "404",
                    "name": "Escritura Creativa"
                },
                {
                    "id": "405",
                    "name": "Diseño"
                },
                {
                    "id": "406",
                    "name": "Teoría del Arte"
                }
            ]},
            { id: 5, name: 'Ciencias Computacionales', color: '#4682B4', subcategories: [ { id: 501, name: 'Computación Teórica' }, { id: 502, name: 'Ingeniería de Software' }, { id: 503, name: 'Inteligencia Artificial' }, { id: 504, name: 'Ciberseguridad' }, { id: 505, name: 'Infraestructura Digital' }, { id: 506, name: 'Computación Científica' }, { id: 507, name: 'Robótica' } ] },
            { id: 6, name: 'Ciencias Exactas', color: '#20B2AA', subcategories: [ { id: 601, name: 'Matemáticas Puras' }, { id: 602, name: 'Matemáticas Aplicadas' }, { id: 603, name: 'Física Teórica' }, { id: 604, name: 'Física Experimental' }, { id: 605, name: 'Lógica Formal' }, { id: 606, name: 'Estadística' }, { id: 607, name: 'Química Teórica' } ] },
            { id: 7, name: 'Ciencias Naturales', color: '#32CD32', subcategories: [ { id: 701, name: 'Biología' }, { id: 702, name: 'Ecología' }, { id: 703, name: 'Química' }, { id: 704, name: 'Ciencias de la Tierra' }, { id: 705, name: 'Astronomía' }, { id: 706, name: 'Biotecnología' }, { id: 707, name: 'Ciencias de la Vida' } ] },
            { id: 8, name: 'Ciencias Aplicadas', color: '#DAA520', subcategories: [ { id: 801, name: 'Ingenierías' }, { id: 802, name: 'Ciencias de la Salud' }, { id: 803, name: 'Arquitectura' }, { id: 804, name: 'Materiales y Nano' }, { id: 805, name: 'Agro y Veterinaria' }, { id: 806, name: 'Ingeniería Biomédica' }, { id: 807, name: 'Ingeniería Ambiental' } ] }
        ];

        const sourceTypes = [ { value: 'book', label: 'Libro' }, { value: 'chapter', label: 'Capítulo de libro' }, { value: 'paper', label: 'Artículo de revista' }, { value: 'preprint', label: 'Preprint' }, { value: 'thesis', label: 'Tesis o disertación' }, { value: 'online', label: 'Artículo en línea' }, { value: 'proceedings', label: 'Actas de congreso' }, { value: 'report', label: 'Informe técnico o institucional' }, { value: 'encyclopedia', label: 'Enciclopedia o diccionario' }, { value: 'audiovisual', label: 'Material audiovisual' } ];

        res.render('upload', { title: 'Subir fuente - Artícora', currentPage: 'upload', cssFile: 'upload.css', categories: categories, sourceTypes: sourceTypes });
    });

    // LISTS
    app.get('/lists', IsRegistered, (req, res) => {
        const userType = Math.random() > 0.5 ? 'validated' : 'registered';
        const listsData = {
            user: { id: 1, name: 'Usuario Demo', type: userType, isAdmin: false, avatar: 'https://ui-avatars.com/api/?name=Usuario+Demo&background=8d6e63&color=fff', maxLists: userType === 'validated' ? 10 : 3, maxSourcesPerList: userType === 'validated' ? 50 : 15, currentLists: 3, canCreateCollaborative: userType === 'validated' },
            myLists: [ /* ...see original for full data... */ ],
            publicLists: [ /* ...see original for full data... */ ],
            knowledgeCategories: [ /* ... */ ],
            availableSources: [ /* ... */ ],
            deletedSources: [ /* ... */ ],
            validContacts: [ /* ... */ ]
        };

        // For brevity some nested arrays are shortened above but original server.js contained full mock objects.
        res.render('lists', { title: 'Listas Curatoriales - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: listsData });
    });

    app.get('/lists/:id', IsRegistered, (req, res) => {
        const listId = parseInt(req.params.id);
        const userType = Math.random() > 0.5 ? 'validated' : 'registered';
        const userId = 1;
        let listData = { user: { id: userId, type: userType, isOwner: false, isCollaborator: false, canEdit: false, maxSourcesPerList: userType === 'validated' ? 50 : 15 }, knowledgeCategories: [ /* ... */ ] };

        if (listId === 1) { /* ...original mock assignment... */ }
        else if (listId === 2) { /* ... */ }
        else if (listId === 3) { /* ... */ }
        else if (listId === 101) { /* ... */ }
        else if (listId === 102) { /* ... */ }
        else if (listId === 103) { /* ... */ }
        else { listData.list = null; }

        res.render('list-detail', { title: listData.list ? `${listData.list.title} - Artícora` : 'Lista no encontrada - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: listData });
    });

    // COMPARE
    app.get('/compare', soloValidado,(req, res) => {
        const mockSources = [ /* ... */ ];
        const searchOptions = mockSources.map(source => ({ id: source.id, title: source.title, authors: source.authors.join(', '), year: source.year, type: source.type, category: source.category, keywords: source.keywords.join(', ') }));
        const searchExamples = ["Cognitive Science", "Stephen Hawking", "Deep Learning", "neurociencia", "filosofía", "sociología", "Kuhn", "Foucault", "ciencias sociales", "aprendizaje automático"];

        res.render('compare-user', { title: 'Comparador de Fuentes - Artícora', currentPage: 'compare', cssFile: 'compare.css', jsFile: 'compare.js', userType: 'user', availableSources: searchOptions, selectedSources: mockSources.slice(0, 3), searchExamples: searchExamples, totalSourcesCount: mockSources.length });
    });

    app.get('/compare/admin', soloAdmin, (req, res) => {
        const mockSources = [ /* ... */ ];
        res.render('compare-admin', { title: 'Análisis y Comparación Masiva - Panel de Administración - Artícora', currentPage: 'compare-admin', cssFile: 'compare.css', jsFile: 'compare-admin.js', userType: 'admin', availableSources: mockSources, selectedSources: [], totalSourcesCount: mockSources.length });
    });

    // ADMIN
    app.get('/admin', soloAdmin, (req, res) => {
        const manualReports = [ /* ...full mock objects as in original... */ ];
        const systemReports = [ /* ... */ ];
        const stats = { totalPending: manualReports.filter(r => r.status === 'pendiente').length + systemReports.filter(r => r.status === 'pendiente').length, pendingManual: manualReports.filter(r => r.status === 'pendiente').length, pendingSystem: systemReports.filter(r => r.status === 'pendiente').length, highPriority: manualReports.filter(r => r.priority === 'alta' && r.status === 'pendiente').length, resolvedToday: 3, avgResolutionTime: "2.5 días" };

        res.render('admin', { title: 'Panel de Administración - Artícora', currentPage: 'admin', cssFile: 'admin.css', jsFile: 'admin.js', userType: 'admin', manualReports: manualReports, systemReports: systemReports, stats: stats, totalReportsCount: manualReports.length + systemReports.length });
    });

    // PLATFORM
    app.get('/faq', (req, res) => {
        res.render('faq', { title: 'Preguntas Frecuentes - Artícora', currentPage: 'faq', cssFile: 'faq.css' });
    });

    app.get('/terms', (req, res) => {
        res.render('terms', { title: 'Términos y Políticas - Artícora', currentPage: 'terms', cssFile: 'terms.css' });
    });

    // 404
    app.use((req, res) => {
        res.status(404).render('404', { title: 'Página no encontrada - Artícora', currentPage: '404', cssFile: '404.css' });
    });
};
