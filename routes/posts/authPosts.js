const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { sanitizeText } = require('../../middlewares/sanitize');
const autenticacion = require('../../middlewares/auth');
const { db } = require('../../lib/database');

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

module.exports = function (app) {
    app.post('/register', async (req, res) => {
        console.log('POST /register recibido:', req.body);

        let { username, email, password, confirmPassword } = req.body;

        // Sanitize inputs (do not sanitize password)
        username = sanitizeText(username);
        email = sanitizeText(email).toLowerCase();

        // Validaciones...
        // Username: 5-15 chars, letters and numbers only
        const usernameRegex = /^[A-Za-z0-9]{5,15}$/;
        if (!username || !usernameRegex.test(username)) {
            return res.status(400).json({ success: false, message: 'Nombre de usuario inválido. Debe tener entre 5 y 15 caracteres alfanuméricos sin espacios.' });
        }

        // Email: basic RFC-5322-ish validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Email inválido.' });
        }

        // Password: 8-22 chars; allow letters, numbers and selected symbols, no spaces
        const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};:,.\/\?]{8,22}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: 'Contraseña inválida. Debe tener entre 8 y 22 caracteres y puede incluir letras, números y símbolos permitidos.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
        }

        try {
            // Verificar si el usuario o correo ya existen (en BD real)
            const hashedEmailForCheck = crypto.createHash('sha256').update(email).digest('hex');
            const userExists = req.db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, hashedEmailForCheck);

            if (userExists) {
                console.log('Usuario ya existe:', userExists);
                return res.status(400).json({ success: false, message: 'El nombre de usuario o correo ya están registrados.' });
            }

            // Hashear contraseña para almacenamiento temporal
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Generar código de verificación
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

            // Almacenar datos temporalmente en la sesión
            req.session.pendingRegistration = {
                username,
                email,
                password: hashedPassword, // Almacenamos el hash, no la contraseña en texto
                verificationCode,
                expiresAt,
                attempts: 0 // Intentos de verificación
            };

            console.log(`=========================================`);
            console.log(`CÓDIGO DE VERIFICACIÓN para ${email}:`);
            console.log(`Código: ${verificationCode}`);
            console.log(`Expira: ${new Date(expiresAt).toLocaleString()}`);
            console.log(`=========================================`);

            // Enviar código por correo usando el transporter disponible en app.locals
            const transporter = req.app && req.app.locals && req.app.locals.transporter;
            if (transporter) {
                try {
                    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?email=${encodeURIComponent(email)}`;
                    // Render email HTML from EJS template
                    const html = await ejs.renderFile(path.join(__dirname, '..', '..', 'views', 'emails', 'verification.ejs'), {
                        username,
                        verificationCode,
                        verifyUrl
                    });

                    await transporter.sendMail({
                        from: '"Artícora" <articora.noreply@gmail.com>',
                        to: email,
                        subject: 'Tu código de verificación – Artícora',
                        text: `Estimado/a ${username || ''},\n\nSu código de verificación es: ${verificationCode}.\nEste código expira en 10 minutos.\nVisite: ${verifyUrl} y escriba el código para completar el registro.\n\n— Equipo Artícora`,
                        html
                    });
                    console.log(`Código de verificación enviado por correo a ${email}`);
                } catch (mailErr) {
                    console.error('Error enviando correo de verificación:', mailErr);
                    // No fallamos la creación del registro pendiente si el correo no se pudo enviar,
                    // pero informamos en la respuesta que el envío pudo fallar.
                    return res.status(201).json({
                        success: true,
                        message: 'Usuario registrado. Sin embargo, no se pudo enviar el correo de verificación. Revisa la configuración de email.',
                        redirectTo: `/verify-email?email=${encodeURIComponent(email)}`
                    });
                }
            } else {
                console.warn('No se encontró transporter en app.locals; no se envió correo.');
            }

            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico.',
                redirectTo: `/verify-email?email=${encodeURIComponent(email)}`
            });

        } catch (error) {
            console.error('Error en el endpoint /register:', error.message, error.stack);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });

    // Endpoint para verificar código y crear usuario
    app.post('/verify-email', async (req, res) => {
        let { email, code } = req.body;
        email = sanitizeText(email).toLowerCase();
        code = sanitizeText(code);

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
        }

        try {
            console.log(`Verificando código para ${email}: ${code}`);

            // Verificar si hay registro pendiente
            if (!req.session.pendingRegistration) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay registro pendiente. Por favor, regístrate de nuevo.'
                });
            }

            const pending = req.session.pendingRegistration;

            // Verificar que el email coincida
            if (pending.email !== email) {
                return res.status(400).json({
                    success: false,
                    message: 'El email no coincide con el registro pendiente.'
                });
            }

            // Verificar expiración
            if (Date.now() > pending.expiresAt) {
                delete req.session.pendingRegistration;
                return res.status(400).json({
                    success: false,
                    message: 'El código ha expirado. Por favor, solicita uno nuevo.'
                });
            }

            // Verificar intentos (máximo 3 intentos)
            if (pending.attempts >= 3) {
                delete req.session.pendingRegistration;
                return res.status(400).json({
                    success: false,
                    message: 'Demasiados intentos fallidos. Por favor, regístrate de nuevo.'
                });
            }

            // Verificar código
            if (pending.verificationCode !== code) {
                // Incrementar intentos fallidos
                req.session.pendingRegistration.attempts += 1;

                const remainingAttempts = 3 - req.session.pendingRegistration.attempts;
                return res.status(400).json({
                    success: false,
                    message: `Código incorrecto. Te quedan ${remainingAttempts} intento(s).`
                });
            }

            // Insertar usuario en BD
            const hashedEmail = crypto.createHash('sha256').update(email).digest('hex');

            try {
                console.log('Verificando conexión a la base de datos:', req.db);

                const result = req.db.prepare(`
                    INSERT INTO users (
                        username, email, password, profile_picture, bio, available_for_messages, 
                        academic_level, is_validated, is_verified, created_at, last_login, 
                        account_active, login_attempts, locked_until
                    ) VALUES (?, ?, ?, NULL, NULL, 0, NULL, 0, 1, datetime('now'), NULL, 1, 0, NULL)
                `).run(
                    pending.username,
                    hashedEmail,
                    pending.password
                );

                console.log(`Usuario ${pending.username} insertado con ID: ${result.lastInsertRowid}`);

                // Limpiar registro pendiente de la sesión
                delete req.session.pendingRegistration;

                res.json({
                    success: true,
                    message: '¡Correo verificado exitosamente! Ahora puedes iniciar sesión.',
                    redirectTo: '/login'
                });
            } catch (error) {
                console.error('Error al insertar usuario en la base de datos:', error);
                res.status(500).json({ success: false, message: 'Error interno del servidor al crear el usuario.' });
            }
        } catch (error) {
            console.error('Error en verificación:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });

    // Endpoint para reenviar código
    app.post('/resend-verification', async (req, res) => {
        let { email } = req.body;
        email = sanitizeText(email).toLowerCase();

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email es requerido.' });
        }

        try {
            // Verificar si hay registro pendiente para este email
            if (!req.session.pendingRegistration || req.session.pendingRegistration.email !== email) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay registro pendiente para este email.'
                });
            }

            // Generar nuevo código
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

            // Actualizar registro pendiente
            req.session.pendingRegistration.verificationCode = verificationCode;
            req.session.pendingRegistration.expiresAt = expiresAt;
            req.session.pendingRegistration.attempts = 0; // Resetear intentos

            console.log(`=========================================`);
            console.log(`NUEVO CÓDIGO DE VERIFICACIÓN para ${email}:`);
            console.log(`Código: ${verificationCode}`);
            console.log(`Expira: ${new Date(expiresAt).toLocaleString()}`);
            console.log(`=========================================`);

            // Enviar correo con el nuevo código
            const transporter = req.app && req.app.locals && req.app.locals.transporter;
            if (transporter) {
                try {
                    const userName = (req.session.pendingRegistration && req.session.pendingRegistration.username) || '';
                    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?email=${encodeURIComponent(email)}`;
                    // Render email HTML from EJS template
                    const html = await ejs.renderFile(path.join(__dirname, '..', 'views', 'emails', 'verification.ejs'), {
                        username: userName,
                        verificationCode,
                        verifyUrl
                    });

                    await transporter.sendMail({
                        from: '"Artícora" <articora.noreply@gmail.com>',
                        to: email,
                        subject: 'Nuevo código de verificación – Artícora',
                        text: `Estimado/a ${userName || ''},\n\nSe ha generado un nuevo código de verificación: ${verificationCode}.\nEste código expira en 10 minutos. Visite: ${verifyUrl} y escriba el código para completar la verificación.\n\n— Equipo Artícora`,
                        html
                    });
                    console.log(`Nuevo código de verificación enviado por correo a ${email}`);
                } catch (mailErr) {
                    console.error('Error enviando correo de reenvío de verificación:', mailErr);
                    return res.status(500).json({ success: false, message: 'No se pudo enviar el correo de verificación.' });
                }
            } else {
                console.warn('No se encontró transporter en app.locals; no se envió correo.');
            }

            res.json({
                success: true,
                message: 'Se ha enviado un nuevo código de verificación.',
                expiresAt: expiresAt
            });

        } catch (error) {
            console.error('Error al reenviar código:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });

    // Inicio de sesión
    app.post('/login', async (req, res) => {
        let { username, password } = req.body;
        const rememberMe = req.body.rememberMe;

        // Sanitize username input (could be email or username)
        username = sanitizeText(username);

        if (!username || !password) {
            // If this is a normal browser form submit, redirect back to login
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/login?error=missing_fields');
            }
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        try {
            // Determinar si el input es un email o username
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

            let user;

            if (isEmail) {
                // Si es email, hashearlo para buscar en la BD
                const hashedEmail = crypto.createHash('sha256').update(username).digest('hex');
                user = req.db.prepare('SELECT * FROM users WHERE email = ?').get(hashedEmail);
            } else {
                // Si es username, buscar por username
                user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            }

            if (!user) {
                return res.status(400).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
            }

            // Verificar contraseña
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(400).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
            }

            // Verificar si el usuario está verificado
            if (!user.is_verified) {
                return res.status(403).json({ success: false, message: 'Por favor, verifica tu correo electrónico antes de iniciar sesión.' });
            }

            // Generar token JWT
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            // Debug ALL user data
            if (debugging) console.log('User data:', {
                id: user.id,
                username: user.username,
                is_validated: user.is_validated,
                is_verified: user.is_verified
            });

            // Set session variables for authentication and role
            req.session.userId = user.id;
            req.session.is_validated = user.is_validated;

            // Debugging for session variables
            if (debugging) console.log('Session after login:', {
                userId: req.session.userId,
                is_validated: req.session.is_validated
            });

            // Configurar cookie HTTP-only y Secure. Extiende duración si "rememberMe" está activo.
            const oneHour = 60 * 60 * 1000;
            const longRemember = 30 * 24 * 60 * 60 * 1000; // 30 días
            const maxAge = rememberMe ? longRemember : oneHour;

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge,
            });
            
            // If request expects HTML (normal form), redirect to dashboard; otherwise return JSON
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/dashboard');
            }

            return res.json({ success: true, message: 'Inicio de sesión exitoso.' });
        } catch (error) {
            console.error('Error en el endpoint /login:', error.message, error.stack);
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/login?error=server');
            }
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });

    // Logout
    app.post('/logout', (req, res) => {
        // Destroy session and clear JWT cookie
        try {
            if (req.session) req.session.destroy(() => { });
            res.clearCookie('token');
            // If the request expects HTML, redirect to landing
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/');
            }
            return res.json({ success: true, message: 'Sesión cerrada.' });
        } catch (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ success: false, message: 'Error cerrando sesión.' });
        }
    });

    // Logout GET route for header link
    app.get('/logout', (req, res) => {
        // Similar logic as POST /logout, but may not require JSON response
        try {
            if (req.session) req.session.destroy(() => { });
            res.clearCookie('token');
            res.redirect('/'); // Redirect to homepage or login page
        } catch (err) {
            console.error('Error during logout GET:', err);
            res.status(500).send('Error cerrando sesión.');
        }
    });

    // SISTEMA DE SUBIDA DE DOCUMENTOS DE VERIFICACIÓN
    // En tres partes:
    // 1. Configurar Multer para validación
    // 2. Ruta de subida con cifrado AES-256 y guardado seguro
    // 3. Job automático para eliminar documentos expirados

    // 1. Configurar Multer para validación
    const upload = multer({
        storage: multer.memoryStorage(), // Subir a memoria primero
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB máximo
        },
        fileFilter: (req, file, cb) => {
            const permitidos = {
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'application/pdf': ['.pdf']
            };

            if (!permitidos[file.mimetype]) {
                return cb(new Error('Formato no permitido'), false);
            }

            cb(null, true);
        }
    });

    // 2. Ruta de subida con cifrado AES-256 y guardado seguro
    app.post('/verificacion/subir',
        autenticacion, // debe poblar req.user.id
        upload.single('documento'),
        async (req, res) => {
            try {
                if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

                // Validar tipo de verificación
                const tipo = (req.body.tipo || '').toLowerCase();
                if (!['ine', 'certificado'].includes(tipo)) {
                    return res.status(400).json({ error: 'tipo inválido' });
                }

                // Mime permitidos
                const mime = req.file.mimetype;
                const imgTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                const certTypes = ['application/pdf', ...imgTypes];

                if (tipo === 'ine' && !imgTypes.includes(mime)) {
                    return res.status(400).json({ error: 'Formato no permitido para INE' });
                }
                if (tipo === 'certificado' && !certTypes.includes(mime)) {
                    return res.status(400).json({ error: 'Formato no permitido para certificado' });
                }

                // Límites por tipo
                const maxSize = tipo === 'ine' ? 3 * 1024 * 1024 : 5 * 1024 * 1024;
                if (req.file.size > maxSize) {
                    return res.status(413).json({ error: 'Archivo demasiado grande' });
                }

                // ENCRYPTION KEY: esperar HEX o BASE64; convertir a Buffer y comprobar 32 bytes
                let keyBuffer;
                if (!process.env.ENCRYPTION_KEY) return res.status(500).json({ error: 'ENCRYPTION_KEY no configurada' });
                try {
                    // intenta hex, si falla usa base64
                    keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
                    if (keyBuffer.length !== 32) keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
                } catch (e) {
                    keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
                }
                if (keyBuffer.length !== 32) return res.status(500).json({ error: 'ENCRYPTION_KEY inválida (debe tener 32 bytes)' });

                // Cifrar (AES-256-CBC)
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
                const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

                // Directorio seguro configurable
                const baseDir = process.env.VERIFY_DIR || path.join(__dirname, '..', '..', 'secure_storage', 'verificaciones');
                fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });

                // Nombre de archivo seguro y único
                const safeOriginal = path.basename(sanitizeText(req.file.originalname || 'upload'));
                const filename = `${Date.now()}_${req.user.id}_${crypto.randomBytes(6).toString('hex')}.enc`;
                const filepath = path.join(baseDir, filename);

                // Escribir archivo con permisos 600
                fs.writeFileSync(filepath, encrypted, { mode: 0o600 });

                // Guardar metadatos en BD (usar consultas preparadas)
                const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h
                const stmt = req.db.prepare(`
                    INSERT INTO documentos_verificacion
                    (usuario_id, ruta_archivo, iv, tipo, original_name, mime, fecha_subida, expira_en, verificacion_completada)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, 0)
                `);
                stmt.run(req.user.id, filepath, iv.toString('hex'), tipo, safeOriginal, mime, expiresAt);

                return res.json({ success: true, message: 'Subido y cifrado correctamente', expiresAt });
            } catch (err) {
                console.error('upload error', err);
                return res.status(500).json({ error: 'internal_error' });
            }
        }
    );

    // 3. Job automático para eliminar expirados
    setInterval(async () => {
    try {
        const now = new Date().toISOString();
        const rows = db.prepare(`
            SELECT * FROM documentos_verificacion
            WHERE expira_en < ?
            OR verificacion_completada = 1
        `).all(now);

        rows.forEach(r => {
        try { if (fs.existsSync(r.ruta_archivo)) fs.unlinkSync(r.ruta_archivo); } catch (e) { console.error('error deleting file', e); }
        });

        db.prepare(`
            DELETE FROM documentos_verificacion
            WHERE expira_en < ? 
            OR verificacion_completada = 1
        `).run(now);

    } catch (e) { console.error('cleanup error', e); }
    }, 60 * 60 * 1000);
};
