const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');

//Alias de middlewares
const soloValidado = checkRoles(['validado', 'admin']);
module.exports = function (app) {
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
            { id: 'cognitive', name: 'Ciencias Cognitivas', color: '#3498db', subcategories: [{ id: 'cog_psych', name: 'Psicología Cognitiva' }, { id: 'cog_neuro', name: 'Neurociencia Cognitiva' }, { id: 'cog_lang', name: 'Procesamiento del Lenguaje' }, { id: 'cog_applied', name: 'Cognición Aplicada' }, { id: 'cog_ai', name: 'IA Cognitiva' }, { id: 'cog_phil', name: 'Filosofía de la Mente' }] },
            { id: 'social', name: 'Ciencias Sociales', color: '#2ecc71', subcategories: [{ id: 'soc_sociology', name: 'Sociología' }, { id: 'soc_politics', name: 'Ciencia Política' }, { id: 'soc_anthropology', name: 'Antropología' }, { id: 'soc_economics', name: 'Economía' }, { id: 'soc_history', name: 'Historia' }, { id: 'soc_geography', name: 'Geografía Humana' }] },
            { id: 'humanities', name: 'Ciencias Humanistas', color: '#9b59b6', subcategories: [{ id: 'hum_philosophy', name: 'Filosofía' }, { id: 'hum_religion', name: 'Estudios Religiosos' }, { id: 'hum_literature', name: 'Literatura' }, { id: 'hum_linguistics', name: 'Lingüística' }, { id: 'hum_digital', name: 'Humanidades Digitales' }, { id: 'hum_cultural', name: 'Estudios Culturales' }, { id: 'hum_history', name: 'Humanidades Históricas' }] },
            { id: 'creative', name: 'Disciplinas Creativas', color: '#e74c3c', subcategories: [{ id: 'cre_visual', name: 'Artes Visuales' }, { id: 'cre_music', name: 'Música' }, { id: 'cre_performing', name: 'Artes Escénicas' }, { id: 'cre_writing', name: 'Escritura Creativa' }, { id: 'cre_design', name: 'Diseño' }, { id: 'cre_theory', name: 'Teoría del Arte' }] },
            { id: 'computational', name: 'Ciencias Computacionales', color: '#f39c12', subcategories: [{ id: 'comp_theory', name: 'Computación Teórica' }, { id: 'comp_software', name: 'Ingeniería de Software' }, { id: 'comp_ai', name: 'Inteligencia Artificial' }, { id: 'comp_cyber', name: 'Ciberseguridad' }, { id: 'comp_infra', name: 'Infraestructura Digital' }, { id: 'comp_scientific', name: 'Computación Científica' }, { id: 'comp_robotics', name: 'Robótica' }] },
            { id: 'exact', name: 'Ciencias Exactas', color: '#1abc9c', subcategories: [{ id: 'exact_pure_math', name: 'Matemáticas Puras' }, { id: 'exact_applied_math', name: 'Matemáticas Aplicadas' }, { id: 'exact_theoretical_physics', name: 'Física Teórica' }, { id: 'exact_experimental_physics', name: 'Física Experimental' }, { id: 'exact_logic', name: 'Lógica Formal' }, { id: 'exact_statistics', name: 'Estadística' }, { id: 'exact_theoretical_chemistry', name: 'Química Teórica' }] },
            { id: 'natural', name: 'Ciencias Naturales', color: '#34495e', subcategories: [{ id: 'nat_biology', name: 'Biología' }, { id: 'nat_ecology', name: 'Ecología' }, { id: 'nat_chemistry', name: 'Química' }, { id: 'nat_earth', name: 'Ciencias de la Tierra' }, { id: 'nat_astronomy', name: 'Astronomía' }, { id: 'nat_biotech', name: 'Biotecnología' }, { id: 'nat_life', name: 'Ciencias de la Vida' }] },
            { id: 'applied', name: 'Ciencias Aplicadas', color: '#e67e22', subcategories: [{ id: 'app_engineering', name: 'Ingenierías' }, { id: 'app_health', name: 'Ciencias de la Salud' }, { id: 'app_architecture', name: 'Arquitectura' }, { id: 'app_materials', name: 'Materiales y Nano' }, { id: 'app_agro', name: 'Agro y Veterinaria' }, { id: 'app_biomedical', name: 'Ingeniería Biomédica' }, { id: 'app_environmental', name: 'Ingeniería Ambiental' }] }
        ];

        const ratingCriteria = [
            { 
                id: 'extension', 
                name: 'Extensión de lectura' 
            }, 
            { 
                id: 'completeness', 
                name: 'Completitud' 
            }, 
            { 
                id: 'detail', 
                name: 'Nivel de detalle' 
            }, 
            { 
                id: 'veracity', 
                name: 'Veracidad' 
            }, 
            { 
                id: 'difficulty', 
                name: 'Dificultad técnica' 
            }
        ];

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
            rating: { average: 4.7, count: 128, criteria: [{ name: 'Extensión', score: 4.5, count: 128 }, { name: 'Completitud', score: 4.8, count: 128 }, { name: 'Nivel de detalle', score: 4.6, count: 128 }, { name: 'Veracidad', score: 4.9, count: 128 }, { name: 'Dificultad técnica', score: 4.5, count: 128 }] },
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
            { id: 1, name: 'Ciencias Cognitivas', color: '#8B4513', subcategories: [{ id: 101, name: 'Psicología Cognitiva' }, { id: 102, name: 'Neurociencia Cognitiva' }, { id: 103, name: 'Procesamiento del Lenguaje' }, { id: 104, name: 'Cognición Aplicada' }, { id: 105, name: 'IA Cognitiva' }, { id: 106, name: 'Filosofía de la Mente' }] },
            { id: 2, name: 'Ciencias Sociales', color: '#2E8B57', subcategories: [{ id: 201, name: 'Sociología' }, { id: 202, name: 'Ciencia Política' }, { id: 203, name: 'Antropología' }, { id: 204, name: 'Economía' }, { id: 205, name: 'Historia' }, { id: 206, name: 'Geografía Humana' }] },
            { id: 3, name: 'Ciencias Humanistas', color: '#6A5ACD', subcategories: [{ id: 301, name: 'Filosofía' }, { id: 302, name: 'Estudios Religiosos' }, { id: 303, name: 'Literatura' }, { id: 304, name: 'Lingüística' }, { id: 305, name: 'Humanidades Digitales' }, { id: 306, name: 'Estudios Culturales' }, { id: 307, name: 'Humanidades Históricas' }] },
            {
                id: 4, name: 'Disciplinas Creativas', color: '#FF6347', subcategories: [
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
                ]
            },
            { id: 5, name: 'Ciencias Computacionales', color: '#4682B4', subcategories: [{ id: 501, name: 'Computación Teórica' }, { id: 502, name: 'Ingeniería de Software' }, { id: 503, name: 'Inteligencia Artificial' }, { id: 504, name: 'Ciberseguridad' }, { id: 505, name: 'Infraestructura Digital' }, { id: 506, name: 'Computación Científica' }, { id: 507, name: 'Robótica' }] },
            { id: 6, name: 'Ciencias Exactas', color: '#20B2AA', subcategories: [{ id: 601, name: 'Matemáticas Puras' }, { id: 602, name: 'Matemáticas Aplicadas' }, { id: 603, name: 'Física Teórica' }, { id: 604, name: 'Física Experimental' }, { id: 605, name: 'Lógica Formal' }, { id: 606, name: 'Estadística' }, { id: 607, name: 'Química Teórica' }] },
            { id: 7, name: 'Ciencias Naturales', color: '#32CD32', subcategories: [{ id: 701, name: 'Biología' }, { id: 702, name: 'Ecología' }, { id: 703, name: 'Química' }, { id: 704, name: 'Ciencias de la Tierra' }, { id: 705, name: 'Astronomía' }, { id: 706, name: 'Biotecnología' }, { id: 707, name: 'Ciencias de la Vida' }] },
            { id: 8, name: 'Ciencias Aplicadas', color: '#DAA520', subcategories: [{ id: 801, name: 'Ingenierías' }, { id: 802, name: 'Ciencias de la Salud' }, { id: 803, name: 'Arquitectura' }, { id: 804, name: 'Materiales y Nano' }, { id: 805, name: 'Agro y Veterinaria' }, { id: 806, name: 'Ingeniería Biomédica' }, { id: 807, name: 'Ingeniería Ambiental' }] }
        ];

        const sourceTypes = [
            {
                value: 'book', 
                label: 'Libro' }, 
            { 
                value: 'chapter', 
                label: 'Capítulo de libro' 
            }, { 
                value: 'paper', 
                label: 'Artículo de revista' 
            }, { 
                value: 'preprint', 
                label: 'Preprint' 
            }, { 
                value: 'thesis', 
                label: 'Tesis o disertación' 
            }, { 
                value: 'online', 
                label: 'Artículo en línea' 
            }, { 
                value: 'proceedings', 
                label: 'Actas de congreso' 
            }, { 
                value: 'report', 
                label: 'Informe técnico o institucional' 
            }, { 
                value: 'encyclopedia', 
                label: 'Enciclopedia o diccionario' 
            }, { 
                value: 'audiovisual', 
                label: 'Material audiovisual' 
            }];

        res.render('upload', { title: 'Subir fuente - Artícora', currentPage: 'upload', cssFile: 'upload.css', categories: categories, sourceTypes: sourceTypes });
    });

    // LISTS
    app.get('/lists', IsRegistered, (req, res) => {
        // Determinar tipo de usuario (simulado)
        const userType = Math.random() > 0.5 ? 'validated' : 'registered';

        // Datos mock para listas
        const listsData = {
            user: {
                id: 1,
                name: 'Usuario Demo',
                type: userType,
                isAdmin: false,
                avatar: 'https://ui-avatars.com/api/?name=Usuario+Demo&background=8d6e63&color=fff',
                maxLists: userType === 'validated' ? 10 : 3,
                maxSourcesPerList: userType === 'validated' ? 50 : 15,
                currentLists: 3,
                canCreateCollaborative: userType === 'validated'
            },

            // Listas del usuario actual
            myLists: [
                {
                    id: 1,
                    title: 'Teorías de la Cognición',
                    description: 'Una recopilación de las principales teorías sobre procesos cognitivos y aprendizaje.',
                    creatorId: 1,
                    creatorName: 'Usuario Demo',
                    isPublic: true,
                    isCollaborative: false,
                    createdAt: '2024-01-15',
                    lastModified: '2024-03-10',
                    totalSources: 8,
                    totalVisits: 1247,
                    monthlyVisits: [45, 67, 89, 102, 78, 91, 110, 145, 123, 98, 87, 76],
                    categoriesDistribution: {
                        'Ciencias Sociales': 40,
                        'Ciencias Cognitivas': 35,
                        'Ciencias Naturales': 25
                    },
                    coverType: 'auto',
                    coverImage: 'https://placehold.co/300x200/5d4037/f5f1e6?text=Primera+Fuente',
                    collaborators: []
                },
                {
                    id: 2,
                    title: 'Metodologías de Investigación Cualitativa',
                    description: 'Diferentes enfoques metodológicos para investigación en ciencias sociales.',
                    creatorId: 1,
                    creatorName: 'Usuario Demo',
                    isPublic: true,
                    isCollaborative: true,
                    createdAt: '2024-02-20',
                    lastModified: '2024-03-15',
                    totalSources: 12,
                    totalVisits: 892,
                    monthlyVisits: [23, 34, 45, 56, 67, 78, 89, 90, 101, 112, 98, 87],
                    categoriesDistribution: {
                        'Ciencias Sociales': 50,
                        'Ciencias Cognitivas': 30,
                        'Ciencias de la Educación': 20
                    },
                    coverType: 'category',
                    coverImage: 'https://placehold.co/300x200/2c1810/f5f1e6?text=Metodología',
                    collaborators: [
                        { id: 2, name: 'Ana García', avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=2E8B57&color=fff' },
                        { id: 3, name: 'Carlos López', avatar: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=4682B4&color=fff' }
                    ]
                },
                {
                    id: 3,
                    title: 'Historia de la Filosofía Occidental',
                    description: 'Fuentes fundamentales desde los presocráticos hasta la filosofía contemporánea.',
                    creatorId: 1,
                    creatorName: 'Usuario Demo',
                    isPublic: false,
                    isCollaborative: false,
                    createdAt: '2024-01-05',
                    lastModified: '2024-03-12',
                    totalSources: 25,
                    totalVisits: 567,
                    monthlyVisits: [12, 23, 34, 45, 56, 67, 78, 89, 90, 101, 87, 76],
                    categoriesDistribution: {
                        'Ciencias Sociales': 100
                    },
                    coverType: 'auto',
                    coverImage: 'https://placehold.co/300x200/8d6e63/f5f1e6?text=Filosofía',
                    collaborators: []
                }
            ],

            // Listas públicas de otros usuarios
            publicLists: [
                {
                    id: 101,
                    title: 'Introducción a la Inteligencia Artificial',
                    description: 'Recursos básicos para comprender los fundamentos de la IA.',
                    creatorId: 2,
                    creatorName: 'Ana García',
                    isPublic: true,
                    isCollaborative: false,
                    createdAt: '2024-02-10',
                    lastModified: '2024-03-08',
                    totalSources: 15,
                    totalVisits: 2345,
                    monthlyVisits: [89, 101, 145, 167, 189, 201, 223, 245, 267, 289, 301, 323],
                    categoriesDistribution: {
                        'Ciencias Naturales': 60,
                        'Ciencias Exactas': 25,
                        'Ciencias Sociales': 15
                    },
                    coverType: 'auto',
                    coverImage: 'https://placehold.co/300x200/2c1810/f5f1e6?text=Primera+Fuente',
                    collaborators: []
                },
                {
                    id: 102,
                    title: 'Neurociencia Cognitiva Avanzada',
                    description: 'Artículos y estudios recientes sobre procesos cognitivos a nivel neuronal.',
                    creatorId: 3,
                    creatorName: 'Carlos López',
                    isPublic: true,
                    isCollaborative: true,
                    createdAt: '2024-01-25',
                    lastModified: '2024-03-14',
                    totalSources: 32,
                    totalVisits: 1890,
                    monthlyVisits: [67, 78, 89, 101, 112, 123, 134, 145, 156, 167, 178, 189],
                    categoriesDistribution: {
                        'Ciencias Cognitivas': 70,
                        'Ciencias Sociales': 20,
                        'Ciencias Naturales': 10
                    },
                    coverType: 'category',
                    coverImage: 'https://placehold.co/300x200/5d4037/f5f1e6?text=Neurociencia',
                    collaborators: [
                        { id: 4, name: 'María Rodríguez', avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=FF6347&color=fff' }
                    ]
                },
                {
                    id: 103,
                    title: 'Metodologías de Investigación en Educación',
                    description: 'Enfoques y técnicas para investigación educativa.',
                    creatorId: 4,
                    creatorName: 'María Rodríguez',
                    isPublic: true,
                    isCollaborative: false,
                    createdAt: '2024-03-01',
                    lastModified: '2024-03-10',
                    totalSources: 18,
                    totalVisits: 456,
                    monthlyVisits: [12, 23, 34, 45, 56, 67, 78, 89, 90, 101, 112, 123],
                    categoriesDistribution: {
                        'Ciencias Cognitivas': 60,
                        'Ciencias Sociales': 25,
                        'Ciencias Naturales': 15
                    },
                    coverType: 'auto',
                    coverImage: 'https://placehold.co/300x200/8d6e63/f5f1e6?text=Primera+Fuente',
                    collaborators: []
                }
            ],

            // Categorías del conocimiento (las 8 principales)
            knowledgeCategories: [
                { id: 'cognitive', name: 'Ciencias Cognitivas', icon: 'brain', color: '#3498db' },
                { id: 'social', name: 'Ciencias Sociales', icon: 'users', color: '#2ecc71' },
                { id: 'humanities', name: 'Ciencias Humanistas', icon: 'book', color: '#9b59b6' },
                { id: 'creative', name: 'Disciplinas Creativas', icon: 'paint-brush', color: '#e74c3c' },
                { id: 'computational', name: 'Ciencias Computacionales', icon: 'laptop-code', color: '#f39c12' },
                { id: 'exact', name: 'Ciencias Exactas', icon: 'calculator', color: '#1abc9c' },
                { id: 'natural', name: 'Ciencias Naturales', icon: 'leaf', color: '#34495e' },
                { id: 'applied', name: 'Ciencias Aplicadas', icon: 'cogs', color: '#e67e22' }
            ],

            // Fuentes disponibles para añadir (simuladas)
            availableSources: [
                {
                    id: 1001,
                    title: 'La Estructura de las Revoluciones Científicas',
                    author: 'Thomas S. Kuhn',
                    year: 1962,
                    category: 'Ciencias Sociales',
                    rating: 4.5,
                    cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Kuhn'
                },
                {
                    id: 1002,
                    title: 'Pensar Rápido, Pensar Despacio',
                    author: 'Daniel Kahneman',
                    year: 2011,
                    category: 'Ciencias Cognitivas',
                    rating: 4.7,
                    cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Kahneman'
                },
                {
                    id: 1003,
                    title: 'El Origen de las Especies',
                    author: 'Charles Darwin',
                    year: 1859,
                    category: 'Ciencias Naturales',
                    rating: 4.8,
                    cover: 'https://placehold.co/150x200/2c1810/f5f1e6?text=Darwin'
                },
                {
                    id: 1004,
                    title: 'Vigilar y Castigar',
                    author: 'Michel Foucault',
                    year: 1975,
                    category: 'Ciencias Sociales',
                    rating: 4.6,
                    cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Foucault'
                },
                {
                    id: 1005,
                    title: 'Pedagogía del Oprimido',
                    author: 'Paulo Freire',
                    year: 1968,
                    category: 'Ciencias Cognitivas',
                    rating: 4.9,
                    cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Freire'
                }
            ],

            // Fuentes eliminadas (para demostración)
            deletedSources: [
                {
                    id: 9999,
                    title: 'Este título se ha eliminado de la plataforma',
                    author: 'N/A',
                    year: null,
                    category: 'Desconocida',
                    rating: 0,
                    isDeleted: true,
                    cover: 'https://placehold.co/150x200/cccccc/999999?text=Eliminado'
                }
            ],

            // Contactos para invitar como colaboradores (solo usuarios validados)
            validContacts: [
                { id: 2, name: 'Ana García', type: 'validated', avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=2E8B57&color=fff' },
                { id: 3, name: 'Carlos López', type: 'validated', avatar: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=4682B4&color=fff' },
                { id: 4, name: 'María Rodríguez', type: 'validated', avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=FF6347&color=fff' },
                { id: 5, name: 'Pedro Sánchez', type: 'validated', avatar: 'https://ui-avatars.com/api/?name=Pedro+Sanchez&background=20B2AA&color=fff' }
            ]
        };

        // For brevity some nested arrays are shortened above but original server.js contained full mock objects.
        res.render('lists', {
            title: 'Listas Curatoriales - Artícora',
            currentPage: 'lists',
            cssFile: 'lists.css',
            data: listsData
        });
    });

    app.get('/lists/:id', IsRegistered, (req, res) => {
        const listId = parseInt(req.params.id);
        const userType = Math.random() > 0.5 ? 'validated' : 'registered';
        const userId = 1; // ID del usuario simulado

        // Datos base para todas las listas
        let listData = {
            user: {
                id: userId,
                type: userType,
                isOwner: false,
                isCollaborator: false,
                canEdit: false,
                maxSourcesPerList: userType === 'validated' ? 50 : 15
            },
            knowledgeCategories: [
                { id: 'cognitive', name: 'Ciencias Cognitivas', icon: 'brain', color: '#3498db' },
                { id: 'social', name: 'Ciencias Sociales', icon: 'users', color: '#2ecc71' },
                { id: 'humanities', name: 'Ciencias Humanistas', icon: 'book', color: '#9b59b6' },
                { id: 'creative', name: 'Disciplinas Creativas', icon: 'paint-brush', color: '#e74c3c' },
                { id: 'computational', name: 'Ciencias Computacionales', icon: 'laptop-code', color: '#f39c12' },
                { id: 'exact', name: 'Ciencias Exactas', icon: 'calculator', color: '#1abc9c' },
                { id: 'natural', name: 'Ciencias Naturales', icon: 'leaf', color: '#34495e' },
                { id: 'applied', name: 'Ciencias Aplicadas', icon: 'cogs', color: '#e67e22' }
            ]
        };

        // Simular diferentes casos según el ID
        if (listId === 1) {
            listData.list = {
                id: 1,
                title: 'Teorías de la Cognición',
                description: 'Una recopilación de las principales teorías sobre procesos cognitivos y aprendizaje.',
                creatorId: 1,
                creatorName: 'Usuario Demo',
                isPublic: true,
                isCollaborative: false,
                createdAt: '2024-01-15',
                lastModified: '2024-03-10',
                totalSources: 8,
                totalVisits: 1247,
                monthlyVisits: [45, 67, 89, 102, 78, 91, 110, 145, 123, 98, 87, 76],
                categoriesDistribution: {
                    'Ciencias Sociales': 40,
                    'Ciencias Cognitivas': 35,
                    'Ciencias Humanistas': 25
                },
                coverType: 'auto',
                coverImage: 'https://placehold.co/400x250/5d4037/f5f1e6?text=Primera+Fuente',
                collaborators: [],
                sources: [
                    {
                        id: 1001,
                        title: 'La Estructura de las Revoluciones Científicas',
                        author: 'Thomas S. Kuhn',
                        year: 1962,
                        category: 'Ciencias Cognitivas',
                        rating: 4.5,
                        addedDate: '2024-01-20',
                        cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Kuhn',
                        order: 1
                    },
                    {
                        id: 1002,
                        title: 'Pensar Rápido, Pensar Despacio',
                        author: 'Daniel Kahneman',
                        year: 2011,
                        category: 'Ciencias Cognitivas',
                        rating: 4.7,
                        addedDate: '2024-01-22',
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Kahneman',
                        order: 2
                    },
                    {
                        id: 9999,
                        title: 'Este título se ha eliminado de la plataforma',
                        author: 'N/A',
                        year: null,
                        category: 'Desconocida',
                        rating: 0,
                        addedDate: '2024-02-01',
                        cover: 'https://placehold.co/150x200/cccccc/999999?text=Eliminado',
                        isDeleted: true,
                        order: 3
                    }
                ],
                availableSources: [
                    {
                        id: 1003,
                        title: 'El Origen de las Especies',
                        author: 'Charles Darwin',
                        year: 1859,
                        category: 'Ciencias Naturales',
                        rating: 4.8,
                        cover: 'https://placehold.co/150x200/2c1810/f5f1e6?text=Darwin'
                    },
                    {
                        id: 1004,
                        title: 'Vigilar y Castigar',
                        author: 'Michel Foucault',
                        year: 1975,
                        category: 'Ciencias Cognitivas',
                        rating: 4.6,
                        cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Foucault'
                    }
                ]
            };
            listData.user.isOwner = true;
            listData.user.canEdit = true;

        } else if (listId === 2) {
            listData.list = {
                id: 2,
                title: 'Metodologías de Investigación Cualitativa',
                description: 'Diferentes enfoques metodológicos para investigación en ciencias sociales.',
                creatorId: 1,
                creatorName: 'Usuario Demo',
                isPublic: true,
                isCollaborative: true,
                createdAt: '2024-02-20',
                lastModified: '2024-03-15',
                totalSources: 12,
                totalVisits: 892,
                monthlyVisits: [23, 34, 45, 56, 67, 78, 89, 90, 101, 112, 98, 87],
                categoriesDistribution: {
                    'Ciencias Sociales': 50,
                    'Ciencias Cognitivas': 30,
                    'Ciencias Humanistas': 20
                },
                coverType: 'category',
                coverImage: 'https://placehold.co/400x250/2c1810/f5f1e6?text=Metodología',
                collaborators: [
                    { id: 2, name: 'Ana García', avatar: 'https://ui-avatars.com/api/?name=Ana+Garcia&background=2E8B57&color=fff' },
                    { id: 3, name: 'Carlos López', avatar: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=4682B4&color=fff' }
                ],
                sources: [
                    {
                        id: 1001,
                        title: 'La Estructura de las Revoluciones Científicas',
                        author: 'Thomas S. Kuhn',
                        year: 1962,
                        category: 'Ciencias Sociales',
                        rating: 4.5,
                        addedDate: '2024-02-25',
                        cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Kuhn',
                        order: 1
                    },
                    {
                        id: 1002,
                        title: 'Pensar Rápido, Pensar Despacio',
                        author: 'Daniel Kahneman',
                        year: 2011,
                        category: 'Ciencias Cognitivas',
                        rating: 4.7,
                        addedDate: '2024-02-26',
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Kahneman',
                        order: 2
                    }
                ],
                availableSources: [
                    {
                        id: 1003,
                        title: 'El Origen de las Especies',
                        author: 'Charles Darwin',
                        year: 1859,
                        category: 'Ciencias Naturales',
                        rating: 4.8,
                        cover: 'https://placehold.co/150x200/2c1810/f5f1e6?text=Darwin'
                    }
                ]
            };
            listData.user.isOwner = true;
            listData.user.canEdit = true;

        } else if (listId === 3) {
            listData.list = {
                id: 3,
                title: 'Historia de la Filosofía Occidental',
                description: 'Fuentes fundamentales desde los presocráticos hasta la filosofía contemporánea.',
                creatorId: 1,
                creatorName: 'Usuario Demo',
                isPublic: false,
                isCollaborative: false,
                createdAt: '2024-01-05',
                lastModified: '2024-03-12',
                totalSources: 25,
                totalVisits: 567,
                monthlyVisits: [12, 23, 34, 45, 56, 67, 78, 89, 90, 101, 87, 76],
                categoriesDistribution: {
                    'Ciencias Sociales': 100
                },
                coverType: 'auto',
                coverImage: 'https://placehold.co/400x250/8d6e63/f5f1e6?text=Primera+Fuente',
                collaborators: [],
                sources: [
                    {
                        id: 1001,
                        title: 'La Estructura de las Revoluciones Científicas',
                        author: 'Thomas S. Kuhn',
                        year: 1962,
                        category: 'Ciencias Sociales',
                        rating: 4.5,
                        addedDate: '2024-01-10',
                        cover: 'https://placehold.co/150x200/5d4037/f5f1e6?text=Kuhn',
                        order: 1
                    }
                ],
                availableSources: [
                    {
                        id: 1002,
                        title: 'Pensar Rápido, Pensar Despacio',
                        author: 'Daniel Kahneman',
                        year: 2011,
                        category: 'Ciencias Cognitivas',
                        rating: 4.7,
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Kahneman'
                    }
                ]
            };
            listData.user.isOwner = true;
            listData.user.canEdit = true;

        } else if (listId === 101) {
            listData.list = {
                id: 101,
                title: 'Introducción a la Inteligencia Artificial',
                description: 'Recursos básicos para comprender los fundamentos de la IA.',
                creatorId: 2,
                creatorName: 'Ana García',
                isPublic: true,
                isCollaborative: false,
                createdAt: '2024-02-10',
                lastModified: '2024-03-08',
                totalSources: 15,
                totalVisits: 2345,
                monthlyVisits: [89, 101, 145, 167, 189, 201, 223, 245, 267, 289, 301, 323],
                categoriesDistribution: {
                    'Ciencias de la Computación': 60,
                    'Ciencias Exactas': 25,
                    'Ciencias Sociales': 15
                },
                coverType: 'auto',
                coverImage: 'https://placehold.co/400x250/2c1810/f5f1e6?text=Primera+Fuente',
                sources: [
                    {
                        id: 1005,
                        title: 'Pedagogía del Oprimido',
                        author: 'Paulo Freire',
                        year: 1968,
                        category: 'Ciencias Sociales',
                        rating: 4.9,
                        addedDate: '2024-02-12',
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Freire',
                        order: 1
                    }
                ],
                availableSources: []
            };
            listData.user.isOwner = false;
            listData.user.canEdit = false;

        } else if (listId === 102) {
            listData.list = {
                id: 102,
                title: 'Neurociencia Cognitiva Avanzada',
                description: 'Artículos y estudios recientes sobre procesos cognitivos a nivel neuronal.',
                creatorId: 3,
                creatorName: 'Carlos López',
                isPublic: true,
                isCollaborative: true,
                createdAt: '2024-01-25',
                lastModified: '2024-03-14',
                totalSources: 32,
                totalVisits: 1890,
                monthlyVisits: [67, 78, 89, 101, 112, 123, 134, 145, 156, 167, 178, 189],
                categoriesDistribution: {
                    'Ciencias Cognitivas': 70,
                    'Ciencias Sociales': 20,
                    'Ciencias Naturales': 10
                },
                coverType: 'category',
                coverImage: 'https://placehold.co/400x250/5d4037/f5f1e6?text=Neurociencia',
                collaborators: [
                    { id: 4, name: 'María Rodríguez', avatar: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=FF6347&color=fff' }
                ],
                sources: [
                    {
                        id: 1002,
                        title: 'Pensar Rápido, Pensar Despacio',
                        author: 'Daniel Kahneman',
                        year: 2011,
                        category: 'Ciencias Cognitivas',
                        rating: 4.7,
                        addedDate: '2024-02-01',
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Kahneman',
                        order: 1
                    }
                ],
                availableSources: []
            };
            listData.user.isOwner = false;
            listData.user.canEdit = false;

        } else if (listId === 103) {
            listData.list = {
                id: 103,
                title: 'Metodologías de Investigación en Educación',
                description: 'Enfoques y técnicas para investigación educativa.',
                creatorId: 4,
                creatorName: 'María Rodríguez',
                isPublic: true,
                isCollaborative: false,
                createdAt: '2024-03-01',
                lastModified: '2024-03-10',
                totalSources: 18,
                totalVisits: 456,
                monthlyVisits: [12, 23, 34, 45, 56, 67, 78, 89, 90, 101, 112, 123],
                categoriesDistribution: {
                    'Ciencias Sociales': 60,
                    'Ciencias Exactas': 25,
                    'Ciencias Cognitivas': 15
                },
                coverType: 'auto',
                coverImage: 'https://placehold.co/400x250/8d6e63/f5f1e6?text=Primera+Fuente',
                sources: [
                    {
                        id: 1005,
                        title: 'Pedagogía del Oprimido',
                        author: 'Paulo Freire',
                        year: 1968,
                        category: 'Ciencias Sociales',
                        rating: 4.9,
                        addedDate: '2024-03-05',
                        cover: 'https://placehold.co/150x200/8d6e63/f5f1e6?text=Freire',
                        order: 1
                    }
                ],
                availableSources: []
            };
            listData.user.isOwner = false;
            listData.user.canEdit = false;

        } else {
            // Lista no encontrada
            listData.list = null;
        }

        res.render('list-detail', {
            title: listData.list ? `${listData.list.title} - Artícora` : 'Lista no encontrada - Artícora',
            currentPage: 'lists',
            cssFile: 'lists.css',
            data: listData
        });
    });

    // COMPARE
    app.get('/compare', soloValidado, (req, res) => {
        const mockSources = [
            {
                id: 1,
                title: "Cognitive Science: An Introduction to the Study of Mind",
                authors: ["Jay Friedenberg", "Gordon Silverman"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Neurociencia Cognitiva",
                publisher: "SAGE Publications",
                pages: "480",
                edition: 4,
                rating: 4.7,
                readCount: 342,
                trend: "increasing",
                criteria: {
                    extension: 4.5,
                    completeness: 4.8,
                    detail: 4.6,
                    veracity: 4.9,
                    difficulty: 4.2
                },
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"]
            },
            {
                id: 2,
                title: "The Social Construction of Reality: A Treatise in the Sociology of Knowledge",
                authors: ["Peter L. Berger", "Thomas Luckmann"],
                year: 1966,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Sociología del Conocimiento",
                publisher: "Anchor Books",
                pages: "240",
                edition: 1,
                rating: 4.8,
                readCount: 512,
                trend: "stable",
                criteria: {
                    extension: 4.7,
                    completeness: 4.9,
                    detail: 4.5,
                    veracity: 4.8,
                    difficulty: 4.0
                },
                keywords: ["construcción social", "realidad", "sociología", "conocimiento"]
            },
            {
                id: 3,
                title: "Deep Learning with Python",
                authors: ["François Chollet"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Computacionales",
                subcategory: "Aprendizaje Automático",
                publisher: "Manning Publications",
                pages: "384",
                edition: 2,
                rating: 4.6,
                readCount: 789,
                trend: "increasing",
                criteria: {
                    extension: 4.4,
                    completeness: 4.7,
                    detail: 4.8,
                    veracity: 4.5,
                    difficulty: 4.3
                },
                keywords: ["deep learning", "python", "redes neuronales", "IA"]
            },
            {
                id: 4,
                title: "A Brief History of Time: From the Big Bang to Black Holes",
                authors: ["Stephen Hawking"],
                year: 1988,
                type: "Libro",
                category: "Ciencias Exactas",
                subcategory: "Cosmología",
                publisher: "Bantam Books",
                pages: "256",
                edition: 1,
                rating: 4.9,
                readCount: 921,
                trend: "stable",
                criteria: {
                    extension: 4.2,
                    completeness: 4.8,
                    detail: 4.4,
                    veracity: 4.9,
                    difficulty: 3.8
                },
                keywords: ["cosmología", "big bang", "agujeros negros", "física teórica"]
            },
            {
                id: 5,
                title: "The Structure of Scientific Revolutions",
                authors: ["Thomas S. Kuhn"],
                year: 1962,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía de la Ciencia",
                publisher: "University of Chicago Press",
                pages: "264",
                edition: 1,
                rating: 4.8,
                readCount: 654,
                trend: "stable",
                criteria: {
                    extension: 4.3,
                    completeness: 4.7,
                    detail: 4.6,
                    veracity: 4.8,
                    difficulty: 4.1
                },
                keywords: ["revoluciones científicas", "paradigma", "ciencia", "historia"]
            },
            {
                id: 6,
                title: "Thinking, Fast and Slow",
                authors: ["Daniel Kahneman"],
                year: 2011,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Psicología Cognitiva",
                publisher: "Farrar, Straus and Giroux",
                pages: "499",
                edition: 1,
                rating: 4.7,
                readCount: 1200,
                trend: "increasing",
                criteria: {
                    extension: 4.6,
                    completeness: 4.8,
                    detail: 4.5,
                    veracity: 4.9,
                    difficulty: 3.9
                },
                keywords: ["psicología", "decisiones", "cognición", "sesgos"]
            },
            {
                id: 7,
                title: "The Order of Things: An Archaeology of the Human Sciences",
                authors: ["Michel Foucault"],
                year: 1966,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía",
                publisher: "Gallimard",
                pages: "387",
                edition: 1,
                rating: 4.8,
                readCount: 850,
                trend: "stable",
                criteria: {
                    extension: 4.7,
                    completeness: 4.5,
                    detail: 4.8,
                    veracity: 4.9,
                    difficulty: 4.5
                },
                keywords: ["arqueología del saber", "ciencias humanas", "episteme", "Foucault"]
            },
            {
                id: 8,
                title: "The Theory of Communicative Action",
                authors: ["Jürgen Habermas"],
                year: 1981,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Sociología",
                publisher: "Beacon Press",
                pages: "465",
                edition: 1,
                rating: 4.6,
                readCount: 720,
                trend: "stable",
                criteria: {
                    extension: 4.8,
                    completeness: 4.7,
                    detail: 4.6,
                    veracity: 4.8,
                    difficulty: 4.4
                },
                keywords: ["acción comunicativa", "teoría social", "Habermas", "racionalidad"]
            },
            {
                id: 9,
                title: "The Logic of Scientific Discovery",
                authors: ["Karl Popper"],
                year: 1934,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía de la Ciencia",
                publisher: "Routledge",
                pages: "513",
                edition: 1,
                rating: 4.9,
                readCount: 950,
                trend: "stable",
                criteria: {
                    extension: 4.5,
                    completeness: 4.8,
                    detail: 4.7,
                    veracity: 4.9,
                    difficulty: 4.3
                },
                keywords: ["filosofía de la ciencia", "falsabilidad", "Popper", "epistemología"]
            },
            {
                id: 10,
                title: "The Interpretation of Cultures",
                authors: ["Clifford Geertz"],
                year: 1973,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Antropología",
                publisher: "Basic Books",
                pages: "470",
                edition: 1,
                rating: 4.7,
                readCount: 880,
                trend: "increasing",
                criteria: {
                    extension: 4.6,
                    completeness: 4.7,
                    detail: 4.8,
                    veracity: 4.8,
                    difficulty: 4.2
                },
                keywords: ["antropología", "cultura", "interpretación", "símbolos"]
            }
        ];

        const searchOptions = mockSources.map(
            source => ({ 
                id: source.id, 
                title: source.title, 
                authors: source.authors.join(', '), 
                year: source.year, 
                type: source.type, 
                category: source.category, 
                keywords: source.keywords.join(', ') 
            }));
        
        const searchExamples = [
            "Cognitive Science", 
            "Stephen Hawking", 
            "Deep Learning", 
            "neurociencia", 
            "filosofía", 
            "sociología", 
            "Kuhn", 
            "Foucault", 
            "ciencias sociales", 
            "aprendizaje automático"
        ];

        res.render('compare-user', { 
            title: 'Comparador de Fuentes - Artícora', 
            currentPage: 'compare', 
            cssFile: 'compare.css', 
            jsFile: 'compare.js', 
            userType: 'user', 
            availableSources: searchOptions, 
            selectedSources: mockSources.slice(0, 3), 
            searchExamples: searchExamples, 
            totalSourcesCount: mockSources.length 
        });
    });
};