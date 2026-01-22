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
            console.log('Verificando usuario existente...');
            
            // Usa req.db en lugar de db
            const hashedEmailForCheck = crypto.createHash('sha256').update(email).digest('hex');
            const userExists = req.db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, hashedEmailForCheck);
            
            if (userExists) {
                console.log('Usuario ya existe:', userExists);
                return res.status(400).json({ success: false, message: 'El nombre de usuario o correo ya están registrados.' });
            }

            // Hashear contraseña
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Hashear email
            const hashedEmail = crypto.createHash('sha256').update(email).digest('hex');
            
            console.log('Insertando usuario en BD...');
            
            // Usa req.db aquí también
            const result = req.db.prepare('INSERT INTO users (username, email, password, is_verified) VALUES (?, ?, ?, ?)')
                .run(username, hashedEmail, hashedPassword, 0);
            
            console.log('Usuario insertado con ID:', result.lastInsertRowid);
            
            // Simular envío de código de verificación
            console.log(`Código de verificación enviado a ${email}`);

            res.status(201).json({ success: true, message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico.' });
        } catch (error) {
            console.error('Error en el endpoint /register:', error.message, error.stack);
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