// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
require('dotenv').config();
const session = require('express-session');
// Import database module
const dbModule = require('./lib/database');
const { Session } = require('inspector');
const { databaseMiddleware, initialize } = dbModule;

const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "articora.noreply@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Debugging flag
const debugging = true; // Set to true to enable debugging outputs
global.debugging = debugging;

// Create application
const app = express();
app.locals.transporter = transporter;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware to set loggedIn flag for templates based on JWT cookie
app.use((req, res, next) => {
    try {
        const token = req.cookies && req.cookies.token;
        if (token && process.env.JWT_SECRET) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // token valid
            res.locals.loggedIn = true;
            res.locals.user = { id: decoded.id, username: decoded.username };
        } else {
            res.locals.loggedIn = false;
        }
    } catch (err) {
        // invalid token
        res.locals.loggedIn = false;
    }
    next();
});

app.use(databaseMiddleware);
app.use(session({
    name: 'articora.sid', 
    secret: process.env.SESSION_SECRET || "clave_secreta_muy_segura", 
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',  // usar true en producción con HTTPS
        sameSite: 'lax', // mitigar CSRF en navegadores modernos
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Import routes
require('./routes/postRoutes')(app);
require('./routes/getRoutes')(app);

const PORT = process.env.PORT || 3000;

// Inicializar base de datos y arrancar servidor
if (require.main === module) {
    initialize().then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor Artícora corriendo en: http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error('Error al inicializar la base de datos:', err);
        process.exit(1);
    });
}

// Cerrar la base de datos correctamente al salir
process.on('SIGINT', () => {
    console.log('\nCerrando aplicación...');
    process.exit(0);
});