const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');

//Alias de middlewares
const soloAdmin = checkRoles(['admin']);
module.exports = function (app) {
    // COMPARE DOCUMENTS - ADMIN VERSION
    app.get('/compare/admin', soloAdmin, (req, res) => {
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
                volume: "4",
                number: "2",
                pages: "480-495",
                edition: "4",
                doi: "10.1000/182",
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"],
                url: "https://example.com/cognitive-science",
                uploadDate: "2023-10-15",
                uploadedBy: "usuario123",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-11-20",
                history: [
                    { date: "2023-10-15", action: "Creación", user: "usuario123" },
                    { date: "2023-10-20", action: "Verificación aprobada", user: "admin1" },
                    { date: "2023-11-20", action: "Actualización de metadatos", user: "usuario123" }
                ],
                isDuplicate: true
            },
            {
                id: 2,
                title: "Cognitive Science: An Introduction to the Study of Mind",
                authors: ["Jay Friedenberg", "Gordon Silverman"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Neurociencia Cognitiva",
                publisher: "SAEG Publications",
                volume: "4",
                number: "2",
                pages: "480-495",
                edition: "4",
                doi: "10.1000/182",
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"],
                url: "https://another-example.com/cognitive-science",
                uploadDate: "2023-11-01",
                uploadedBy: "usuario456",
                verificationStatus: "pendiente",
                reports: 1,
                lastModified: "2023-11-10",
                history: [
                    { date: "2023-11-01", action: "Creación", user: "usuario456" },
                    { date: "2023-11-05", action: "Reporte por posible duplicado", user: "usuario789" },
                    { date: "2023-11-10", action: "Actualización de URL", user: "usuario456" }
                ],
                isDuplicate: true
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
                volume: "2",
                number: null,
                pages: "384",
                edition: "2",
                doi: "10.1000/183",
                keywords: ["deep learning", "python", "redes neuronales", "IA"],
                url: "https://example.com/deep-learning",
                uploadDate: "2023-11-05",
                uploadedBy: "programadorAI",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-11-18",
                history: [
                    { date: "2023-11-05", action: "Creación", user: "programadorAI" },
                    { date: "2023-11-10", action: "Verificación aprobada", user: "admin2" },
                    { date: "2023-11-18", action: "Corrección de autores", user: "programadorAI" }
                ],
                isDuplicate: false
            },
            {
                id: 4,
                title: "A Brief History of Time",
                authors: ["Stephen Hawking"],
                year: 1988,
                type: "Libro",
                category: "Ciencias Exactas",
                subcategory: "Cosmología",
                publisher: "Bantam Books",
                volume: "1",
                number: null,
                pages: "256",
                edition: "1",
                doi: "10.1000/184",
                keywords: ["cosmología", "big bang", "agujeros negros", "física teórica"],
                url: "https://example.com/brief-history-time",
                uploadDate: "2023-08-30",
                uploadedBy: "fisico99",
                verificationStatus: "verificado",
                reports: 0,
                lastModified: "2023-10-12",
                history: [
                    { date: "2023-08-30", action: "Creación", user: "fisico99" },
                    { date: "2023-09-05", action: "Verificación aprobada", user: "admin1" },
                    { date: "2023-10-12", action: "Actualización de edición", user: "fisico99" }
                ],
                isDuplicate: false
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
                volume: "1",
                number: null,
                pages: "264",
                edition: "1",
                doi: "10.1000/185",
                keywords: ["revoluciones científicas", "paradigma", "ciencia", "historia"],
                url: "https://example.com/structure-revolutions",
                uploadDate: "2023-10-08",
                uploadedBy: "filosofo77",
                verificationStatus: "rechazado",
                reports: 3,
                lastModified: "2023-11-22",
                history: [
                    { date: "2023-10-08", action: "Creación", user: "filosofo77" },
                    { date: "2023-10-15", action: "Reporte por información falsa", user: "usuario123" },
                    { date: "2023-10-20", action: "Rechazo de verificación", user: "admin1" },
                    { date: "2023-11-22", action: "Intento de corrección", user: "filosofo77" }
                ],
                isDuplicate: false
            }
        ];
        res.render('compare-admin', { 
            title: 'Análisis y Comparación Masiva - Panel de Administración - Artícora', 
            currentPage: 'compare-admin', 
            cssFile: 'compare.css', 
            jsFile: 'compare-admin.js', 
            userType: 'admin', 
            availableSources: mockSources, 
            selectedSources: [], 
            totalSourcesCount: mockSources.length 
        });
    });

    // ADMIN
    app.get('/admin', soloAdmin, (req, res) => {
        const manualReports = [
            {
                id: 1,
                type: 'source',
                sourceId: 2,
                title: "The Social Construction of Reality: A Treatise in the Sociology of Knowledge",
                reason: "Posible duplicado",
                description: "Usuario reporta que esta fuente es duplicada de otra existente",
                reportedBy: "usuario789",
                reportDate: "2023-11-25 14:30",
                status: "pendiente",
                priority: "alta"
            },
            {
                id: 2,
                type: 'source',
                sourceId: 5,
                title: "The Structure of Scientific Revolutions",
                reason: "Información falsa",
                description: "El año de publicación parece incorrecto según otras fuentes",
                reportedBy: "investigador45",
                reportDate: "2023-11-24 10:15",
                status: "pendiente",
                priority: "media"
            },
            {
                id: 3,
                type: 'user',
                userId: "filosofo77",
                userName: "Juan Pérez",
                reason: "Perfil falso",
                description: "El usuario parece usar información académica falsa",
                reportedBy: "usuario123",
                reportDate: "2023-11-23 16:45",
                status: "pendiente",
                priority: "alta"
            },
            {
                id: 4,
                type: 'source',
                sourceId: 3,
                title: "Deep Learning with Python",
                reason: "Contenido inapropiado",
                description: "Enlace lleva a sitio con contenido no académico",
                reportedBy: "profesorAI",
                reportDate: "2023-11-22 09:20",
                status: "pendiente",
                priority: "alta"
            },
            {
                id: 5,
                type: 'comment',
                commentId: 42,
                sourceId: 1,
                sourceTitle: "Cognitive Science: An Introduction to the Study of Mind",
                reason: "Lenguaje ofensivo",
                description: "Comentario contiene insultos personales",
                reportedBy: "moderador22",
                reportDate: "2023-11-21 11:30",
                status: "pendiente",
                priority: "alta"
            }
        ];

        // Reportes automáticos del sistema
        const systemReports = [
            {
                id: 101,
                type: 'offensive-language',
                source: "Comentario #42 en fuente #1",
                detectedText: "Este autor es un completo idiota...",
                context: {
                    userId: "usuario456",
                    sourceId: 1,
                    date: "2023-11-21 11:25"
                },
                detectedDate: "2023-11-21 11:26",
                status: "pendiente",
                autoGenerated: true
            },
            {
                id: 102,
                type: 'broken-url',
                sourceId: 4,
                sourceTitle: "A Brief History of Time: From the Big Bang to Black Holes",
                url: "https://example.com/brief-history-time",
                errorCode: 404,
                errorDays: 3,
                detectedDate: "2023-11-25 02:15",
                status: "pendiente",
                autoGenerated: true
            },
            {
                id: 103,
                type: 'duplicate-detection',
                sourceIds: [1, 2],
                sourcesTitles: [
                    "Cognitive Science: An Introduction to the Study of Mind",
                    "Cognitive Science: An Introduction to the Study of Mind"
                ],
                similarity: 98.5,
                detectedDate: "2023-11-24 02:15",
                status: "pendiente",
                autoGenerated: true
            }
        ];
        const stats = { totalPending: manualReports.filter(r => r.status === 'pendiente').length + systemReports.filter(r => r.status === 'pendiente').length, pendingManual: manualReports.filter(r => r.status === 'pendiente').length, pendingSystem: systemReports.filter(r => r.status === 'pendiente').length, highPriority: manualReports.filter(r => r.priority === 'alta' && r.status === 'pendiente').length, resolvedToday: 3, avgResolutionTime: "2.5 días" };

        res.render('admin', { 
            title: 'Panel de Administración - Artícora', 
            currentPage: 'admin', 
            cssFile: 'admin.css', 
            jsFile: 'admin.js', 
            userType: 'admin', 
            manualReports: manualReports, 
            systemReports: systemReports, 
            stats: stats, 
            totalReportsCount: manualReports.length + systemReports.length 
        });
    });

    // PLATFORM
    app.get('/faq', (req, res) => {
        res.render('faq', { 
            title: 'Preguntas Frecuentes - Artícora', 
            currentPage: 'faq', 
            cssFile: 'faq.css' 
        });
    });

    // TERMS AND POLICIES
    app.get('/terms', (req, res) => {
        res.render('terms', { 
            title: 'Términos y Políticas - Artícora', 
            currentPage: 'terms', 
            cssFile: 'terms.css' 
        });
    });
};