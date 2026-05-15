const IsRegistered = require('../../middlewares/auth');

module.exports = function (app) {
    app.get('/', (req, res) => {
        res.render('landing', { 
            title: 'Artícora - Plataforma de Investigación Colaborativa',
            currentPage: 'landing',
            cssFile: 'landing.css',
            jsFile: 'landing.js'
        });
    });

    // New /login route that checks for error query parameter and passes appropriate message to template
    // We have three types of errors that can be passed via the "error" query parameter:
    // - invalid_credentials
    // - missing_fields
    // - not_verified
    app.get('/login', (req, res) => {
        const error = req.query.error;
        let errorMessage = '';
        if (error === 'missing_fields') {
            errorMessage = 'Por favor, completa todos los campos.';
        } else if (error === 'invalid_credentials') {
            errorMessage = 'Usuario o contraseña incorrectos.';
        } else if (error === 'not_verified') {
            errorMessage = 'Por favor, verifica tu correo electrónico antes de iniciar sesión.';
        }

        res.render('login', {
            title: 'Iniciar Sesión - Artícora',
            currentPage: 'login',
            cssFile: 'login.css',
            jsFile: 'login.js',
            errorMessage
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

    // En authGets.js (o el archivo que corresponda)
    app.get('/verify-email', (req, res) => {
        const email = req.query.email;
        if (!email) {
            return res.redirect('/login');
        }
        res.render('verify-email', {
            title: 'Verificar correo - Artícora',
            currentPage: 'verify-email',
            cssFile: 'verify-email.css',
            jsFile: 'verify-email.js',
            email: email
        });
    });

    // Página para recuperar contraseña (formulario de varios pasos)
    app.get('/forgot-password', (req, res) => {
        res.render('forgot-password', {
            title: 'Recuperar contraseña - Artícora',
            currentPage: 'forgot-password',
            cssFile: 'forgot-password.css',
            jsFile: 'forgot-password.js'
        });
    });
};