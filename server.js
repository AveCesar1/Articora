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

// Agregar esta ruta al server.js
app.get('/search', (req, res) => {
    const searchQuery = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const sortBy = req.query.sort || 'relevance';
    const itemsPerPage = 10;
    
    // Datos de ejemplo para categorías (las 8 del conocimiento)
    const categories = [
        { id: 'cognitive', name: 'Ciencias Cognitivas', icon: 'fas fa-brain', color: 'primary', count: 42 },
        { id: 'social', name: 'Ciencias Sociales', icon: 'fas fa-users', color: 'success', count: 38 },
        { id: 'humanities', name: 'Ciencias Humanistas', icon: 'fas fa-book-open', color: 'info', count: 27 },
        { id: 'creative', name: 'Disciplinas Creativas', icon: 'fas fa-palette', color: 'warning', count: 15 },
        { id: 'computational', name: 'Ciencias Computacionales', icon: 'fas fa-laptop-code', color: 'danger', count: 56 },
        { id: 'exact', name: 'Ciencias Exactas', icon: 'fa-duotone fa-solid fa-calculator', color: 'dark', count: 33 },
        { id: 'natural', name: 'Ciencias Naturales', icon: 'fas fa-leaf', color: 'secondary', count: 41 },
        { id: 'applied', name: 'Ciencias Aplicadas', icon: 'fa-solid fa-flask-vial', color: 'white', count: 47 }
    ];
    
    // Subcategorías por categoría
    const subcategoriesByCategory = {
        cognitive: [
            { id: 'cog_psych', name: 'Psicología Cognitiva' },
            { id: 'neuro_cog', name: 'Neurociencia Cognitiva' },
            { id: 'lang_process', name: 'Procesamiento del Lenguaje' },
            { id: 'applied_cog', name: 'Cognición Aplicada' },
            { id: 'ai_cog', name: 'IA Cognitiva' },
            { id: 'philo_mind', name: 'Filosofía de la Mente' }
        ],
        computational: [
            { id: 'comp_theory', name: 'Computación Teórica' },
            { id: 'software_eng', name: 'Ingeniería de Software' },
            { id: 'ai_ml', name: 'Inteligencia Artificial' },
            { id: 'cybersecurity', name: 'Ciberseguridad' },
            { id: 'digital_infra', name: 'Infraestructura Digital' },
            { id: 'scientific_comp', name: 'Computación Científica' },
            { id: 'robotics', name: 'Robótica' }
        ],
        social: [
            { id: 'sociology', name: 'Sociología' },
            { id: 'political_science', name: 'Ciencia Política' },
            { id: 'anthropology', name: 'Antropología' },
            { id: 'economics', name: 'Economía' },
            { id: 'history', name: 'Historia' },
            { id: 'human_geography', name: 'Geografía Humana' }
        ],
        humanities: [
            { id: 'philosophy', name: 'Filosofía' },
            { id: 'religious_studies', name: 'Estudios Religiosos' },
            { id: 'literature', name: 'Literatura' },
            { id: 'linguistics', name: 'Lingüística' },
            { id: 'digital_humanities', name: 'Humanidades Digitales' },
            { id: 'cultural_studies', name: 'Estudios Culturales' },
            { id: 'historical_humanities', name: 'Humanidades Históricas' }
        ],
        creative: [
            { id: 'visual_arts', name: 'Artes Visuales' },
            { id: 'music', name: 'Música' },
            { id: 'performing_arts', name: 'Artes Escénicas' },
            { id: 'creative_writing', name: 'Escritura Creativa' },
            { id: 'design', name: 'Diseño' },
            { id: 'art_theory', name: 'Teoría del Arte' }
        ],
        exact: [
            { id: 'pure_math', name: 'Matemáticas Puras' },
            { id: 'applied_math', name: 'Matemáticas Aplicadas' },
            { id: 'theoretical_physics', name: 'Física Teórica' },
            { id: 'experimental_physics', name: 'Física Experimental' },
            { id: 'formal_logic', name: 'Lógica Formal' },
            { id: 'statistics', name: 'Estadística' },
            { id: 'theoretical_chem', name: 'Química Teórica' }
        ],
        natural: [
            { id: 'biology', name: 'Biología' },
            { id: 'ecology', name: 'Ecología' },
            { id: 'chemistry', name: 'Química' },
            { id: 'earth_sciences', name: 'Ciencias de la Tierra' },
            { id: 'astronomy', name: 'Astronomía' },
            { id: 'biotechnology', name: 'Biotecnología' },
            { id: 'life_sciences', name: 'Ciencias de la Vida' }
        ],
        applied: [
            { id: 'engineering', name: 'Ingenierías' },
            { id: 'health_sciences', name: 'Ciencias de la Salud' },
            { id: 'architecture', name: 'Arquitectura' },
            { id: 'materials_nano', name: 'Materiales y Nano' },
            { id: 'agro_vet', name: 'Agro y Veterinaria' },
            { id: 'biomed_eng', name: 'Ingeniería Biomédica' },
            { id: 'env_eng', name: 'Ingeniería Ambiental' }
        ]
    };
    
    // Filtros activos (simulados)
    const filters = {
        minRating: parseFloat(req.query.minRating) || 0,
        minYear: parseInt(req.query.minYear) || null,
        maxYear: parseInt(req.query.maxYear) || null,
        extension: parseFloat(req.query.extension) || 0,
        completitud: parseFloat(req.query.completitud) || 0,
        detalle: parseFloat(req.query.detalle) || 0,
        veracidad: parseFloat(req.query.veracidad) || 0,
        dificultad: parseFloat(req.query.dificultad) || 0
    };
    
    // Categorías seleccionadas
    const selectedCategories = req.query.categories ? 
        Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories] : 
        [];
    
    // Subcategorías seleccionadas
    const selectedSubcategories = req.query.subcategories ? 
        Array.isArray(req.query.subcategories) ? req.query.subcategories : [req.query.subcategories] : 
        [];
    
    // Tipos de fuente seleccionados
    const selectedSourceTypes = req.query.types ? 
        Array.isArray(req.query.types) ? req.query.types : [req.query.types] : 
        [];
    
    // Resultados de búsqueda (datos de ejemplo)
    const allResults = Array.from({ length: 145 }, (_, i) => ({
        id: `source_${i + 1}`,
        title: `Avances en ${['IA', 'Machine Learning', 'NLP', 'Redes Neuronales', 'Visión por Computadora'][i % 5]} - Estudio ${i + 1}`,
        authors: [
            `Investigador ${i + 1}`,
            `Coautor ${i + 1}`,
            `Dr. Académico ${i + 1}`
        ].slice(0, (i % 3) + 1),
        year: 2020 + (i % 4),
        type: ['libro', 'articulo', 'preprint', 'tesis', 'capitulo'][i % 5], // IDs en minúsculas
        journal: i % 3 === 0 ? `Journal of ${['AI Research', 'ML Studies', 'Computational Science'][i % 3]}` : null,
        doi: i % 4 === 0 ? `10.1000/xyzabc.${i}` : null,
        description: `Este estudio investiga aspectos clave de ${['inteligencia artificial', 'aprendizaje automático', 'procesamiento de lenguaje natural'][i % 3]}. 
                     Presenta metodologías innovadoras y resultados significativos en el campo. 
                     La investigación incluye análisis exhaustivos y conclusiones relevantes para la comunidad científica.`,
        keywords: ['IA', 'Machine Learning', 'Investigación', 'Ciencia de Datos', 'Algoritmos'].slice(0, (i % 4) + 1),
        category: categories[i % categories.length],
        subcategory: subcategoriesByCategory[categories[i % categories.length].id]?.[i % 3]?.name || null,
        rating: {
            average: 3.5 + (Math.random() * 1.5),
            count: 10 + (i * 3) % 50,
            criteria: [
                { name: 'Extensión', score: 3.0 + (Math.random() * 2) },
                { name: 'Completitud', score: 3.5 + (Math.random() * 1.5) },
                { name: 'Detalle', score: 4.0 + (Math.random() * 1) },
                { name: 'Veracidad', score: 4.5 + (Math.random() * 0.5) },
                { name: 'Dificultad', score: 2.5 + (Math.random() * 2.5) }
            ]
        },
        stats: {
            reads: 100 + (i * 7) % 500,
            reviews: 5 + (i * 2) % 30,
            citations: 10 + (i * 5) % 100
        }
    }));
    
    // Filtrar resultados basados en búsqueda
    let filteredResults = allResults;
    
    if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(source => 
            source.title.toLowerCase().includes(queryLower) ||
            source.authors.some(author => author.toLowerCase().includes(queryLower)) ||
            source.keywords.some(keyword => keyword.toLowerCase().includes(queryLower)) ||
            source.description.toLowerCase().includes(queryLower)
        );
    }
    
    // Aplicar filtros
    if (filters.minRating > 0) {
        filteredResults = filteredResults.filter(source => source.rating.average >= filters.minRating);
    }
    
    if (selectedCategories.length > 0) {
        filteredResults = filteredResults.filter(source => 
            selectedCategories.includes(source.category.id)
        );
    }
    
    if (selectedSourceTypes.length > 0) {
        filteredResults = filteredResults.filter(source => 
            selectedSourceTypes.includes(source.type)
        );
    }
    
    // Filtrar por año
    if (filters.minYear) {
        filteredResults = filteredResults.filter(source => source.year >= filters.minYear);
    }
    
    if (filters.maxYear) {
        filteredResults = filteredResults.filter(source => source.year <= filters.maxYear);
    }
    
    // Ordenar resultados
    switch (sortBy) {
        case 'newest':
            filteredResults.sort((a, b) => b.year - a.year);
            break;
        case 'rating':
            filteredResults.sort((a, b) => b.rating.average - a.rating.average);
            break;
        case 'popular':
            filteredResults.sort((a, b) => b.stats.reads - a.stats.reads);
            break;
        case 'title_asc':
            filteredResults.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title_desc':
            filteredResults.sort((a, b) => b.title.localeCompare(a.title));
            break;
        default: // relevancia
            // Mantener orden por similitud con búsqueda
            break;
    }
    
    // Paginación
    const totalResults = filteredResults.length;
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const results = filteredResults.slice(startIndex, endIndex);
    
    // Filtros activos para mostrar
    const activeFilters = [];
    if (filters.minRating > 0) {
        activeFilters.push({ key: 'minRating', label: 'Calificación mínima', value: `${filters.minRating} estrellas` });
    }
    if (selectedCategories.length > 0) {
        activeFilters.push({ 
            key: 'categories', 
            label: 'Categorías', 
            value: selectedCategories.map(catId => 
                categories.find(c => c.id === catId)?.name || catId
            ).join(', ')
        });
    }
    if (selectedSourceTypes.length > 0) {
        activeFilters.push({ 
            key: 'types', 
            label: 'Tipos', 
            value: selectedSourceTypes.map(type => {
                const typeLabels = {
                    'libro': 'Libro',
                    'articulo': 'Artículo',
                    'preprint': 'Preprint',
                    'tesis': 'Tesis',
                    'capitulo': 'Capítulo',
                    'congreso': 'Congreso',
                    'informe': 'Informe',
                    'enciclopedia': 'Enciclopedia',
                    'audiovisual': 'Audiovisual'
                };
                return typeLabels[type] || type;
            }).join(', ')
        });
    }
    
    res.render('search', {
        title: 'Búsqueda Avanzada - Artícora',
        currentPage: 'search',
        cssFile: 'search.css',
        jsFile: 'search.js',
        searchQuery,
        categories,
        subcategoriesByCategory,
        filters,
        selectedCategories,
        selectedSubcategories,
        selectedSourceTypes,
        sortBy,
        currentPage: page,
        totalPages,
        totalResults,
        results,
        activeFilters
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