const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
// ELIMINA esta línea: const db = require('../lib/database');
// const express = require('express');

module.exports = function (app) {
    // app.use(express.json());

    // Registro de usuario
    app.post('/register', async (req, res) => {
        console.log('POST /register recibido:', req.body);
        
        const { username, email, password, confirmPassword } = req.body;

        // Validaciones...
        
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
        const { email, code } = req.body;
        
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
        const { email } = req.body;
        
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
        const { username, password } = req.body;

        if (!username || !password) {
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

            // Configurar cookie HTTP-only y Secure
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 3600000, // 1 hora
            });

            res.json({ success: true, message: 'Inicio de sesión exitoso.' });
        } catch (error) {
            console.error('Error en el endpoint /login:', error.message, error.stack);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });

    // Inicio de sesión
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }

        try {
            // Determinar si el input es un email o username
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
            
            let user;
            
            if (isEmail) {
                // Si es email, hashearlo para buscar en la BD
                const hashedEmail = crypto.createHash('sha256').update(username).digest('hex');
                user = db.prepare('SELECT * FROM users WHERE email = ?').get(hashedEmail);
            } else {
                // Si es username, buscar por username
                user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            }

            if (!user) {
                return res.status(400).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
            }

            // Resto del código...
        } catch (error) {
            console.error('Error en el endpoint /login:', error.message, error.stack);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    });
};