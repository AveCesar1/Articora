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
    // Datos de ejemplo para el perfil
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