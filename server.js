/*
 * ============================================================================
 *     Artícora v7.5.2 - A privacy-focused collaborative research platform.
 *
 *  Authors:
 *      - Joaquín Gutiérrez (AveCesar1 on GitHub)
 *      - Leonardo Sánchez (Leoelpre2 on GitHub)
 *  Only framework: Express.js (https://expressjs.com/)
 *
 *  This Spanish project exists primarily to teach a Node.js and Express.js
 *  implementation of a collaborative research platform in a simple, clear, 
 *  and maintainable way. The implementation prioritizes maintainability and
 *  code quality, allowing for a more robust and scalable application.
 *
 *  This software is provided "as is", without warranty of any kind.
 *  Use it at your own risk, and please respect the privacy of others.
 * 
 *  You can see technical documentation and guides in the Markdown files in the 
 *  root directory, plus diagrams under the docs/ folder.
 * 
 *  Make sure to create the enviroment variables in a .env file in the root directory, 
 *  as described in the README.md.
 * 
 *  This project is licensed under the PSVL license (read LICENSE for details).
 *  "Use it for personal, non-commercial, educational, or research purposes only."
 * 
 *  With love,
 *  The Artícora Team
 * ============================================================================
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();
const session = require('express-session');
const multer = require('multer');

// Import database module
const dbModule = require('./lib/database');
const { Session } = require('inspector');
const { databaseMiddleware, initialize } = dbModule;
const crypto = require('crypto');

const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const { startCronJobs } = require('./cron');

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
app.set('trust proxy', true);
app.locals.transporter = transporter;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const blockedCountryCodes = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB', 'UK']);
const geoLookupCache = new Map();

function normalizeRequestIp(req) {
    const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const raw = forwarded || req.ip || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || '';
    return String(raw).replace(/^::ffff:/, '').trim();
}

function isLocalOrPrivateIp(ip) {
    return /^(127\.0\.0\.1|::1|localhost)$/i.test(ip)
        || /^10\./.test(ip)
        || /^192\.168\./.test(ip)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
        || /^fc00:/i.test(ip)
        || /^fe80:/i.test(ip);
}

async function lookupCountryCode(ip) {
    if (geoLookupCache.has(ip)) return geoLookupCache.get(ip);
    try {
        const resp = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 1800 });
        const data = resp && resp.data ? resp.data : null;
        const code = data && data.success ? String(data.country_code || '').toUpperCase() : '';
        geoLookupCache.set(ip, code);
        return code;
    } catch (err) {
        console.warn('[geo-block] lookup failed for ip', ip, err && err.message);
        geoLookupCache.set(ip, null);
        return null;
    }
}

app.use(async (req, res, next) => {
    const ip = normalizeRequestIp(req);
    if (!ip || isLocalOrPrivateIp(ip)) return next();

    try {
        const countryCode = await lookupCountryCode(ip);
        if (countryCode && blockedCountryCodes.has(countryCode)) {
            console.warn('[geo-block] blocked request from', ip, 'country=', countryCode, 'path=', req.path);
            return res.status(403).send('Access denied');
        }

        if (countryCode === null) {
            console.warn('[geo-block] unable to verify IP country, denying access for', ip, 'path=', req.path);
            return res.status(403).send('Access denied');
        }
    } catch (err) {
        console.error('[geo-block] unexpected error for ip', ip, err && err.message);
        return res.status(403).send('Access denied');
    }

    return next();
});

// Shared category color map available to routes and templates
app.locals.categoryColorMap = {
    'Ciencias Cognitivas': '#3498db',
    'Ciencias Sociales': '#2ecc71',
    'Ciencias Humanistas': '#9b59b6',
    'Disciplinas Creativas': '#e74c3c',
    'Ciencias Computacionales': '#f39c12',
    'Ciencias Exactas': '#1abc9c',
    'Ciencias Naturales': '#34495e',
    'Ciencias Aplicadas': '#e67e22'
};

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

// Expose admin flag and session-derived user flags to templates on every request
app.use((req, res, next) => {
    try {
        const sessionIsAdmin = req.session && (typeof req.session.is_admin !== 'undefined' ? req.session.is_admin : req.session.isAdmin);
        const sessionIsValidated = req.session && (typeof req.session.is_validated !== 'undefined' ? req.session.is_validated : false);

        res.locals.isAdmin = !!sessionIsAdmin;
        res.locals.isValidated = !!sessionIsValidated;
        res.locals.loggedIn = res.locals.loggedIn || !!(req.session && req.session.userId);

        res.locals.user = res.locals.user || {};
        if (req.session && req.session.userId) res.locals.user.id = req.session.userId;
        if (typeof res.locals.user.isAdmin === 'undefined') res.locals.user.isAdmin = !!sessionIsAdmin;
    } catch (e) {
        if (global.debugging) console.warn('locals middleware error', e && e.message);
    }
    next();
});

// Temporary request logger for verification endpoints to assist debugging
app.use((req, res, next) => {
    if (req.path && req.path.startsWith('/verificacion')) {
        try {
            console.log('[req-logger] incoming request', req.method, req.path, 'headers:', {
                cookie: req.headers.cookie,
                'content-type': req.headers['content-type'] || null,
                referer: req.headers.referer || null
            });
        } catch (e) { console.error('req-logger error', e); }
    }
    next();
});

// Directorio donde se guardarán los archivos
const uploadDir = path.join(__dirname, '../public/uploads/chat_files');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/png', 'image/jpeg', 'image/jpg',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'application/x-zip-compressed'
  ];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Formato no permitido'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter
});

// Import routes
require('./routes/postRoutes')(app);
require('./routes/getRoutes')(app);
startCronJobs({
    db: dbModule.db,
    debugging: global.debugging,
    encryptionKey: process.env.ENCRYPTION_KEY,
    appRoot: __dirname
});

const PORT = process.env.PORT || 3000;

// Inicializar base de datos y arrancar servidor
if (require.main === module) {
    initialize().then(() => {
        const server = http.createServer(app);

        // Inicializar Socket.io y adjuntarlo a la app
        const io = new Server(server, {
            cors: {
                origin: process.env.SOCKET_IO_CORS || true,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Hacer io accesible desde rutas (req.app.get('io'))
        app.set('io', io);

        // Middleware de autenticación para sockets usando JWT (handshake.auth.token)
        io.use((socket, next) => {
            try {
                let token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;

                // If no token in auth, try to parse cookie header (secure httpOnly cookie fallback)
                if (!token && socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) {
                    try {
                        const cookieHeader = socket.handshake.headers.cookie;
                        const parts = cookieHeader.split(';').map(p => p.trim());
                        const cookies = {};
                        for (const p of parts) {
                            const idx = p.indexOf('=');
                            if (idx > -1) {
                                const k = decodeURIComponent(p.slice(0, idx).trim());
                                const v = decodeURIComponent(p.slice(idx + 1).trim());
                                cookies[k] = v;
                            }
                        }
                        token = cookies.token;
                    } catch (e) {
                        // ignore parse errors
                    }
                }

                if (!token) return next(new Error('auth_error'));

                jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                    if (err) return next(new Error('auth_error'));
                    socket.user = decoded;
                    return next();
                });
            } catch (e) {
                return next(new Error('auth_error'));
            }
        });

        // Simple in-memory presence store: userId -> Set(socketId)
        if (!global.onlineUsers) global.onlineUsers = new Map();
        if (!global.lastSeen) global.lastSeen = new Map();

        // Eventos básicos de socket
        io.on('connection', (socket) => {
            const uid = socket.user && socket.user.id;
            console.log('Socket conectado, userId=', uid);

            if (uid) {
                socket.join(`user_${uid}`);

                // track socket for this user
                let s = global.onlineUsers.get(uid);
                if (!s) {
                    s = new Set();
                    global.onlineUsers.set(uid, s);
                }
                s.add(socket.id);

                // Broadcast to peers that this user is online
                try { io.emit('user_online', { userId: uid, online: true }); } catch (e) { }

                // Send current presence state to this socket
                try {
                    const onlineList = Array.from(global.onlineUsers.keys());
                    socket.emit('presence_state', { online: onlineList });
                } catch (e) { }
            }

            socket.on('join_chat', (chatId) => {
                try { socket.join(`chat_${chatId}`); } catch (e) { }
            });

            socket.on('leave_chat', (chatId) => {
                try { socket.leave(`chat_${chatId}`); } catch (e) { }
            });

            socket.on('typing', (data) => {
                try {
                    const chatId = data && data.chatId;
                    if (chatId) socket.to(`chat_${chatId}`).emit('user_typing', { userId: uid, username: socket.user && socket.user.username });
                } catch (e) { }
            });

            socket.on('stop_typing', (data) => {
                try {
                    const chatId = data && data.chatId;
                    if (chatId) socket.to(`chat_${chatId}`).emit('stop_typing', { userId: uid });
                } catch (e) { }
            });

            // Optional heartbeat to update lastSeen while connected
            socket.on('presence_ping', () => {
                try {
                    if (uid) {
                        global.lastSeen.set(uid, new Date().toISOString());
                    }
                } catch (e) { }
            });

            socket.on('disconnect', (reason) => {
                try {
                    if (uid && global.onlineUsers) {
                        const set = global.onlineUsers.get(uid);
                        if (set) {
                            set.delete(socket.id);
                            if (set.size === 0) {
                                global.onlineUsers.delete(uid);
                                const lastSeen = new Date().toISOString();
                                global.lastSeen.set(uid, lastSeen);
                                try { io.emit('user_offline', { userId: uid, online: false, lastSeen }); } catch (e) { }
                            }
                        }
                    }
                } catch (e) { }
                console.log('Socket disconnected user=', uid, 'reason=', reason);
            });
        });

        server.listen(PORT, () => {
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