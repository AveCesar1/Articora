const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);

module.exports = function(app) {
    // Listar fuentes (simulado con datos mock)
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
                        'Ciencias Humanistas': 25
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
                        'Ciencias de la Computación': 60,
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

    // Detalle de lista (simulado con datos dinámicos según ID)
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
                    'Ciencias de la Educación': 20
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

    // Comparar fuentes (simulado con datos mock)
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