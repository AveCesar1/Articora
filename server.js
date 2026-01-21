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

// Create application
const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(databaseMiddleware);
app.use(session({
    name: 'articora.sid', 
    secret: process.env.SESSION_SECRET || "clave_secreta_muy_segura", 
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, 
        secure: false,  // true solo si usamos HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Import routes
require('./routes/getRoutes')(app);
require('./routes/postRoutes')(app);

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