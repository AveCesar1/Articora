const isRegistered = require('../../middlewares/auth');
const { db } = require('../../lib/database');
const bcrypt = require('bcrypt');
const { encryptEmail } = require('../../lib/crypto_utils');
const { sanitizeText } = require('../../middlewares/sanitize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

module.exports = function (app) {
    // Actualizar perfil del usuario
    app.post('/profile/config-profile/update', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const {     
                email,
                bio,
                interests,
                academicDegree,
                institution,
                first_name,
                last_name,
            } = req.body;

            // Validaciones básicas
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                return res.status(400).json({ success: false, message: 'Email inválido' });
            }
            let encryptedEmail;
            try {
                encryptedEmail = encryptEmail(email, req.app);
            } catch (e) {
                console.error('Error encrypting email:', e);
                return res.status(500).json({ success: false, message: 'Error interno: no se pudo encriptar el email' });
            }

            // Verificar si el email ya existe para otro usuario
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(encryptedEmail, userId);
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'El email ya está registrado' });
            }

            // Sanitize inputs
            const safeBio = sanitizeText(bio || '', { maxLength: 500 });
            const safeInstitution = sanitizeText(institution || '', { maxLength: 255 });
            const safeFirst = sanitizeText(first_name || '', { maxLength: 50 });
            const safeLast = sanitizeText(last_name || '', { maxLength: 50 });

            // Actualizar usuario
            const actualizar = db.prepare(`
                UPDATE users 
                SET email = ?, 
                    bio = ?, 
                    academic_level = ?,
                    institution = ?,
                    first_name = ?,
                    last_name = ?
                WHERE id = ?
            `);

            actualizar.run(encryptedEmail, safeBio || null, academicDegree || null, safeInstitution || null, safeFirst, safeLast, userId);

            if (Array.isArray(interests)) {

                const incoming = Array.from(new Set(interests.map(i => sanitizeText(String(i || '').trim(), { maxLength: 100 })).filter(Boolean)));
                const incomingLower = incoming.map(i => i.toLowerCase());

                // Obtener intereses actuales desde la base de datos
                const existingRows = db.prepare('SELECT id, interest FROM user_interests WHERE user_id = ?').all(userId);
                const existingMapLower = new Map();
                for (const r of existingRows) existingMapLower.set(String(r.interest).toLowerCase(), r.id);

                // Determinar eliminaciones (ids) — aquellos existentes que no aparecen en incoming
                const toDeleteIds = existingRows
                    .filter(r => !incomingLower.includes(String(r.interest).toLowerCase()))
                    .map(r => r.id);

                // Determinar inserciones — aquellos incoming que no existen todavía (case-insensitive)
                const toInsert = incoming.filter((val, idx) => !existingMapLower.has(incomingLower[idx]));

                // Ejecutar eliminaciones
                if (toDeleteIds.length > 0) {
                    const deleteStmt = db.prepare('DELETE FROM user_interests WHERE id = ? AND user_id = ?');
                    for (const id of toDeleteIds) deleteStmt.run(id, userId);
                    console.log(`user_interests: eliminados ${toDeleteIds.length} registros para user=${userId}`);
                }

                // Ejecutar inserciones
                if (toInsert.length > 0) {
                    const insertStmt = db.prepare('INSERT INTO user_interests (user_id, interest) VALUES (?, ?)');
                    for (const interestVal of toInsert) insertStmt.run(userId, interestVal);
                    console.log(`user_interests: insertados ${toInsert.length} registros para user=${userId}`);
                }

            } else if (req.body.deleteInterests && Array.isArray(req.body.deleteInterests)) {
                // Compatibilidad: si el cliente envía explicitamente IDs a eliminar
                const deleteInterest = db.prepare('DELETE FROM user_interests WHERE user_id = ? AND id = ?');
                for (const interestId of req.body.deleteInterests) {
                    deleteInterest.run(userId, interestId);
                }
            }
            return res.json({ 
                success: true, 
                message: 'Perfil actualizado correctamente' 
            });

        } catch (err) {
            console.error('Error al actualizar configuración de perfil:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar el perfil' 
            });
        }
    });

    // Cambiar contraseña
    app.post('/profile/config-profile/change-password', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const { currentPassword, newPassword } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ success: false, message: 'Falta información requerida' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ success: false, message: 'La contraseña debe tener mínimo 8 caracteres' });
            }

            // Obtener usuario actual
            const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Verificar contraseña actual (suponiendo que uses bcrypt)
            const bcrypt = require('bcrypt');
            const passwordMatch = bcrypt.compareSync(currentPassword, user.password);
            if (!passwordMatch) {
                return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
            }

            // Encriptar nueva contraseña
            const hashedPassword = bcrypt.hashSync(newPassword, 10);

            // Actualizar contraseña
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

            return res.json({ 
                success: true, 
                message: 'Contraseña actualizada correctamente' 
            });

        } catch (err) {
            console.error('Error al cambiar contraseña:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al cambiar la contraseña' 
            });
        }
    });

    // Actualizar configuración de privacidad
    app.post('/profile/config-profile/privacy-settings', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const {
                profileVisibility,
                availableForMessages,
                allowGroupInvites,
                showInstitution,
                showJoinDate
            } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            // Actualizar configuración de privacidad básica en users
            db.prepare(`
                UPDATE users 
                SET available_for_messages = ?
                WHERE id = ?
            `).run(availableForMessages ? 1 : 0, userId);

            // Si existe tabla de configuración de privacidad, actualizar solo los campos relevantes
            try {
                db.prepare(`
                    INSERT OR REPLACE INTO user_privacy_settings (
                        user_id, profile_visibility, available_for_messages,
                        allow_group_invites, show_institution, show_join_date
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    userId, profileVisibility || 'public', availableForMessages ? 1 : 0,
                    allowGroupInvites ? 1 : 0, showInstitution ? 1 : 0, showJoinDate ? 1 : 0
                );
            } catch (e) {
                // La tabla de privacidad podría no existir; no crítico
            }

            return res.json({ 
                success: true, 
                message: 'Configuración de privacidad actualizada' 
            });

        } catch (err) {
            console.error('Error al actualizar privacidad:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar la configuración' 
            });
        }
    });

    // Actualizar configuración del dashboard
    app.post('/profile/config-profile/dashboard-settings', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const {
                radarChartPublic,
                showRecentStudy,
                showMyReferences,
                showMostRead,
                showGlobalTrends,
                widgetOrder
            } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            db.prepare(`
                INSERT OR REPLACE INTO user_dashboard_settings (
                    user_id, radar_chart_public, show_recent_study,
                    show_my_references, show_most_read, show_global_trends,
                    widget_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                radarChartPublic ? 1 : 0,
                showRecentStudy ? 1 : 0,
                showMyReferences ? 1 : 0,
                showMostRead ? 1 : 0,
                showGlobalTrends ? 1 : 0,
                JSON.stringify(widgetOrder || ['recent_study', 'my_references', 'most_read', 'global_trends'])
            );

            return res.json({ 
                success: true, 
                message: 'Configuración del dashboard actualizada' 
            });

        } catch (err) {
            console.error('Error al actualizar dashboard:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar el dashboard' 
            });
        }
    });

    // Actualizar configuración de notificaciones
    app.post('/profile/config-profile/notification-settings', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const {
                emailMessages,
                emailComments,
                emailVerification,
                platformMessages,
                platformComments,
                platformRatings,
                platformSystem,
                notificationFrequency,
                urgentNotifications
            } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
            }

            db.prepare(`
                INSERT OR REPLACE INTO user_notification_settings (
                    user_id, email_messages, email_comments, email_verification,
                    platform_messages, platform_comments,
                    platform_ratings, platform_system, notification_frequency,
                    urgent_notifications
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                emailMessages ? 1 : 0,
                emailComments ? 1 : 0,
                emailVerification ? 1 : 0,
                platformMessages ? 1 : 0,
                platformComments ? 1 : 0,
                platformRatings ? 1 : 0,
                platformSystem ? 1 : 0,
                notificationFrequency || 'daily',
                urgentNotifications ? 1 : 0
            );

            return res.json({ 
                success: true, 
                message: 'Configuración de notificaciones actualizada' 
            });

        } catch (err) {
            console.error('Error al actualizar notificaciones:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar las notificaciones' 
            });
        }
    });

    // Upload profile avatar
    const pfpDir = path.join(__dirname, '../../public/uploads/pfp');
    if (!fs.existsSync(pfpDir)) fs.mkdirSync(pfpDir, { recursive: true });

    const avatarStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, pfpDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `pfp_${req.session.userId}_${Date.now()}${ext}`;
            cb(null, filename);
        }
    });

    const uploadAvatar = multer({
        storage: avatarStorage,
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) return cb(new Error('Formato no permitido'), false);
            cb(null, true);
        }
    });

    app.post('/profile/config-profile/upload-avatar', isRegistered, uploadAvatar.single('avatar'), (req, res) => {
        try {
            const userId = req.session.userId;
            if (!req.file) return res.status(400).json({ success: false, message: 'No se subió archivo' });

            const filePath = `/uploads/pfp/${req.file.filename}`;

            // delete previous local avatar if present
            const prev = db.prepare('SELECT profile_picture FROM users WHERE id = ?').get(userId);
            if (prev && prev.profile_picture && String(prev.profile_picture).startsWith('/uploads/pfp/')) {
                try {
                    const prevPath = path.join(__dirname, '../../public', prev.profile_picture);
                    if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
                } catch (e) { /* non-fatal */ }
            }

            db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?').run(filePath, userId);
            return res.json({ success: true, profile_picture: filePath });
        } catch (err) {
            console.error('Error uploading avatar:', err);
            return res.status(500).json({ success: false, message: 'Error al subir avatar' });
        }
    });

    // Remove avatar
    app.post('/profile/config-profile/remove-avatar', isRegistered, (req, res) => {
        try {
            const userId = req.session.userId;
            const prev = db.prepare('SELECT profile_picture FROM users WHERE id = ?').get(userId);
            if (prev && prev.profile_picture && String(prev.profile_picture).startsWith('/uploads/pfp/')) {
                try {
                    const prevPath = path.join(__dirname, '../../public', prev.profile_picture);
                    if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
                } catch (e) { /* non-fatal */ }
            }
            db.prepare('UPDATE users SET profile_picture = NULL WHERE id = ?').run(userId);
            return res.json({ success: true });
        } catch (err) {
            console.error('Error removing avatar:', err);
            return res.status(500).json({ success: false, message: 'Error al eliminar avatar' });
        }
    });
}