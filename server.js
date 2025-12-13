// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Rutas principales
// Actualización de rutas en server.js
// En las rutas, asegúrate de pasar currentPage y otros datos necesarios
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

app.get('/profile', (req, res) => {
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

app.get('/profile/config', (req, res) => {
    // Mismos datos del perfil
    const userData = {
        username: 'leonardo.serna',
        fullName: 'Leonardo Serna Sánchez',
        email: 'leonardo.serna@example.com',
        // Si cambias esto por "No Validado", aparecen otras opciones
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
    res.render('verify-email', {
        title: 'Verificación de Correo - Artícora',
        currentPage: 'verify-email',
        cssFile: 'verify-email.css',
        jsFile: 'verify-email.js'
    });
});

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        title: 'Recuperación de Contraseña - Artícora',
        currentPage: 'forgot-password',
        cssFile: 'forgot-password.css',
        jsFile: 'forgot-password.js'
    });
});

///////////////////
// PUBLICACIONES //
///////////////////

// Agregar esta ruta a tu server.js
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
    
    // Categorías y subcategorías (8 categorías principales)
    const categories = [
        {
            id: 'cognitive',
            name: 'Ciencias Cognitivas',
            color: '#3498db',
            subcategories: [
                { id: 'cog_psych', name: 'Psicología Cognitiva' },
                { id: 'cog_neuro', name: 'Neurociencia Cognitiva' },
                { id: 'cog_lang', name: 'Procesamiento del Lenguaje' },
                { id: 'cog_applied', name: 'Cognición Aplicada' },
                { id: 'cog_ai', name: 'IA Cognitiva' },
                { id: 'cog_phil', name: 'Filosofía de la Mente' }
            ]
        },
        {
            id: 'social',
            name: 'Ciencias Sociales',
            color: '#2ecc71',
            subcategories: [
                { id: 'soc_sociology', name: 'Sociología' },
                { id: 'soc_politics', name: 'Ciencia Política' },
                { id: 'soc_anthropology', name: 'Antropología' },
                { id: 'soc_economics', name: 'Economía' },
                { id: 'soc_history', name: 'Historia' },
                { id: 'soc_geography', name: 'Geografía Humana' }
            ]
        },
        {
            id: 'humanities',
            name: 'Ciencias Humanistas',
            color: '#9b59b6',
            subcategories: [
                { id: 'hum_philosophy', name: 'Filosofía' },
                { id: 'hum_religion', name: 'Estudios Religiosos' },
                { id: 'hum_literature', name: 'Literatura' },
                { id: 'hum_linguistics', name: 'Lingüística' },
                { id: 'hum_digital', name: 'Humanidades Digitales' },
                { id: 'hum_cultural', name: 'Estudios Culturales' },
                { id: 'hum_history', name: 'Humanidades Históricas' }
            ]
        },
        {
            id: 'creative',
            name: 'Disciplinas Creativas',
            color: '#e74c3c',
            subcategories: [
                { id: 'cre_visual', name: 'Artes Visuales' },
                { id: 'cre_music', name: 'Música' },
                { id: 'cre_performing', name: 'Artes Escénicas' },
                { id: 'cre_writing', name: 'Escritura Creativa' },
                { id: 'cre_design', name: 'Diseño' },
                { id: 'cre_theory', name: 'Teoría del Arte' }
            ]
        },
        {
            id: 'computational',
            name: 'Ciencias Computacionales',
            color: '#f39c12',
            subcategories: [
                { id: 'comp_theory', name: 'Computación Teórica' },
                { id: 'comp_software', name: 'Ingeniería de Software' },
                { id: 'comp_ai', name: 'Inteligencia Artificial' },
                { id: 'comp_cyber', name: 'Ciberseguridad' },
                { id: 'comp_infra', name: 'Infraestructura Digital' },
                { id: 'comp_scientific', name: 'Computación Científica' },
                { id: 'comp_robotics', name: 'Robótica' }
            ]
        },
        {
            id: 'exact',
            name: 'Ciencias Exactas',
            color: '#1abc9c',
            subcategories: [
                { id: 'exact_pure_math', name: 'Matemáticas Puras' },
                { id: 'exact_applied_math', name: 'Matemáticas Aplicadas' },
                { id: 'exact_theoretical_physics', name: 'Física Teórica' },
                { id: 'exact_experimental_physics', name: 'Física Experimental' },
                { id: 'exact_logic', name: 'Lógica Formal' },
                { id: 'exact_statistics', name: 'Estadística' },
                { id: 'exact_theoretical_chemistry', name: 'Química Teórica' }
            ]
        },
        {
            id: 'natural',
            name: 'Ciencias Naturales',
            color: '#34495e',
            subcategories: [
                { id: 'nat_biology', name: 'Biología' },
                { id: 'nat_ecology', name: 'Ecología' },
                { id: 'nat_chemistry', name: 'Química' },
                { id: 'nat_earth', name: 'Ciencias de la Tierra' },
                { id: 'nat_astronomy', name: 'Astronomía' },
                { id: 'nat_biotech', name: 'Biotecnología' },
                { id: 'nat_life', name: 'Ciencias de la Vida' }
            ]
        },
        {
            id: 'applied',
            name: 'Ciencias Aplicadas',
            color: '#e67e22',
            subcategories: [
                { id: 'app_engineering', name: 'Ingenierías' },
                { id: 'app_health', name: 'Ciencias de la Salud' },
                { id: 'app_architecture', name: 'Arquitectura' },
                { id: 'app_materials', name: 'Materiales y Nano' },
                { id: 'app_agro', name: 'Agro y Veterinaria' },
                { id: 'app_biomedical', name: 'Ingeniería Biomédica' },
                { id: 'app_environmental', name: 'Ingeniería Ambiental' }
            ]
        }
    ];
    
    // Criterios de calificación
    const ratingCriteria = [
        { id: 'extension', name: 'Extensión de lectura' },
        { id: 'completeness', name: 'Completitud' },
        { id: 'detail', name: 'Nivel de detalle' },
        { id: 'veracity', name: 'Veracidad' },
        { id: 'difficulty', name: 'Dificultad técnica' }
    ];
    
    // Tipos de fuente
    const sourceTypes = [
        { value: 'article', label: 'Artículo de revista' },
        { value: 'book', label: 'Libro' },
        { value: 'chapter', label: 'Capítulo de libro' },
        { value: 'thesis', label: 'Tesis o disertación' },
        { value: 'preprint', label: 'Preprint' },
        { value: 'conference', label: 'Actas de congreso' },
        { value: 'technical', label: 'Informe técnico' },
        { value: 'encyclopedia', label: 'Enciclopedia' },
        { value: 'audiovisual', label: 'Material audiovisual' },
        { value: 'online', label: 'Artículo en línea' }
    ];
    
    // Resultados de ejemplo (20 fuentes)
    const results = Array.from({ length: 20 }, (_, i) => {
        const sourceId = `source_${i + 1}`;
        const category = categories[Math.floor(Math.random() * categories.length)];
        const subcategory = category.subcategories[Math.floor(Math.random() * category.subcategories.length)];
        
        return {
            id: sourceId,
            title: `${i + 1}: Un estudio sobre ${['IA', 'Machine Learning', 'Procesamiento de Lenguaje', 'Redes Neuronales', 'Ética en Tecnología'][i % 5]}`,
            authors: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => 
                `Autor ${String.fromCharCode(65 + j)}. ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][(i + j) % 5]}`
            ),
            year: 2020 + (i % 5),
            type: sourceTypes[Math.floor(Math.random() * sourceTypes.length)].label,
            pages: `${Math.floor(Math.random() * 50) + 5}-${Math.floor(Math.random() * 50) + 60}`,
            doi: i % 3 === 0 ? `10.1234/example.${sourceId}` : null,
            keywords: ['Inteligencia Artificial', 'Machine Learning', 'Procesamiento de Lenguaje Natural', 'Redes Neuronales', 'Ética'].slice(0, Math.floor(Math.random() * 3) + 2),
            excerpt: `Este documento presenta una investigación sobre ${
                ['métodos innovadores en IA', 'aplicaciones de machine learning', 'técnicas de procesamiento de lenguaje natural', 'modelos de redes neuronales profundas', 'consideraciones éticas en tecnología'][i % 5]
            }. El estudio incluye análisis detallados, experimentos controlados y conclusiones relevantes para la comunidad académica. Los resultados demuestran que...`,
            rating: {
                average: 3.5 + (Math.random() * 1.5),
                count: Math.floor(Math.random() * 100) + 10,
                criteria: ratingCriteria.map(criterion => ({
                    name: criterion.name,
                    value: 3 + (Math.random() * 2)
                }))
            },
            category: {
                id: category.id,
                name: category.name,
                color: category.color
            },
            subcategory: {
                id: subcategory.id,
                name: subcategory.name
            },
            stats: {
                views: Math.floor(Math.random() * 500) + 100,
                bookmarks: Math.floor(Math.random() * 50) + 5
            },
            uploadDate: `${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 12) + 1}/2023`,
            uploader: {
                id: `user_${Math.floor(Math.random() * 100)}`,
                name: ['Dr. Ana García', 'Prof. Carlos López', 'Dra. María Rodríguez', 'Lic. Juan Martínez'][Math.floor(Math.random() * 4)]
            }
        };
    });
    
    // Paginación
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
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(results.length / resultsPerPage),
            totalResults: results.length
        }
    });
});

app.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    
    // Datos de ejemplo para un post (hardcoded)
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
        category: {
            id: 'computational',
            name: 'Ciencias Computacionales',
            icon: 'fas fa-laptop-code',
            color: 'danger'
        },
        subcategory: 'Inteligencia Artificial',
        rating: {
            average: 4.7,
            count: 128,
            criteria: [
                { name: 'Extensión', score: 4.5, count: 128 },
                { name: 'Completitud', score: 4.8, count: 128 },
                { name: 'Nivel de detalle', score: 4.6, count: 128 },
                { name: 'Veracidad', score: 4.9, count: 128 },
                { name: 'Dificultad técnica', score: 4.5, count: 128 }
            ]
        },
        stats: {
            reads: 1500,
            reviews: 128,
            citations: 300,
            downloads: 750
        },
        uploadedBy: 'Dr. Jane Smith',
        uploadDate: '2023-05-15',
        language: 'Español',
        license: 'CC BY-NC-SA 4.0',
        url: 'https://example.com/document.pdf',
        coverImage: 'https://placehold.co/600x800/',
    };

    // Comentarios de ejemplo
    const comments = [
        {
            id: 1,
            user: 'Juan Pérez',
            avatar: 'https://i.pravatar.cc/150?img=1',
            date: '2023-10-15',
            text: 'Excelente recurso para entender los fundamentos de la IA. Muy completo y bien estructurado.',
            rating: 5
        },
        {
            id: 2,
            user: 'María González',
            avatar: 'https://i.pravatar.cc/150?img=2',
            date: '2023-09-22',
            text: 'Buen contenido, aunque algunos capítulos son demasiado técnicos para principiantes.',
            rating: 4
        },
        {
            id: 3,
            user: 'Carlos López',
            avatar: 'https://i.pravatar.cc/150?img=3',
            date: '2023-08-30',
            text: 'La sección sobre aprendizaje profundo está desactualizada. Necesita incluir transformers.',
            rating: 3
        }
    ];

    // Fuentes relacionadas (para el slider)
    const relatedSources = [
        { id: 'rel_1', title: 'Deep Learning: A Comprehensive Overview', authors: ['Ian Goodfellow', 'Yoshua Bengio'], year: 2016, rating: 4.5, category: 'Computacional' },
        { id: 'rel_2', title: 'Pattern Recognition and Machine Learning', authors: ['Christopher Bishop'], year: 2006, rating: 4.7, category: 'Computacional' },
        { id: 'rel_3', title: 'The Elements of Statistical Learning', authors: ['Trevor Hastie', 'Robert Tibshirani', 'Jerome Friedman'], year: 2009, rating: 4.8, category: 'Computacional' },
        { id: 'rel_4', title: 'Reinforcement Learning: An Introduction', authors: ['Richard Sutton', 'Andrew Barto'], year: 2018, rating: 4.6, category: 'Computacional' },
        { id: 'rel_5', title: 'Natural Language Processing with Python', authors: ['Steven Bird', 'Ewan Klein', 'Edward Loper'], year: 2009, rating: 4.3, category: 'Computacional' }
    ];

    // Formatos de citas
    const citationFormats = {
        apa: 'Russell, S., & Norvig, P. (2020). Inteligencia Artificial: Un Enfoque Moderno (4ta ed.). Pearson.',
        chicago: 'Russell, Stuart, and Peter Norvig. 2020. Inteligencia Artificial: Un Enfoque Moderno. 4th ed. Pearson.',
        harvard: 'Russell, S. & Norvig, P., 2020. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson.',
        mla: 'Russell, Stuart, and Peter Norvig. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed., Pearson, 2020.',
        ieee: 'S. Russell and P. Norvig, Inteligencia Artificial: Un Enfoque Moderno, 4ta ed. Pearson, 2020.',
        vancouver: 'Russell S, Norvig P. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson; 2020.',
        bibtex: `@book{russell2020inteligencia,
            title={Inteligencia Artificial: Un Enfoque Moderno},
            author={Russell, Stuart and Norvig, Peter},
            year={2020},
            edition={4ta},
            publisher={Pearson}
        }`
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

// Ruta para manejar errores 404
app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor Artícora corriendo en: http://localhost:${PORT}`);
    console.log(`📁 Vista pública: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Registro: http://localhost:${PORT}/register`);
    console.log(`👤 Perfil: http://localhost:${PORT}/profile`);
});