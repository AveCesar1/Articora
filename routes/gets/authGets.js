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

    // New /login route that checks for error query parameter and passes appropriate message to template
    // We have three types of errors that can be passed via the "error" query parameter:
    // - invalid_credentials
    // - missing_fields
    // - not_verified
    app.get('/login', (req, res) => {
        res.render('login', {
            title: 'Iniciar Sesión - Artícora',
            currentPage: 'login',
            cssFile: 'login.css',
            jsFile: 'login.js',
            errorMessage: (() => {
                const error = req.query.error;
                if (error === 'missing_fields') {
                    return 'Por favor, completa todos los campos.';
                } else if (error === 'invalid_credentials') {
                    return 'Usuario o contraseña incorrectos.';
                } else if (error === 'not_verified') {
                    return 'Por favor, verifica tu correo electrónico antes de iniciar sesión.';
                }
                return '';
             })()
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