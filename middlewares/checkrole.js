const jwt = require('jsonwebtoken');
const debugging = global.debugging;

const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                if (debugging) console.log("checkRole: No session or userId found. Redirecting to login.");
                return res.redirect('/login?error=auth_required');
            }

            let isValidated = req.session.is_validated;
            let isAdmin = req.session.is_admin;
            if (debugging) console.log(`checkRole: Session values is_validated=${isValidated} is_admin=${isAdmin}`);

            // If neither flag is present in session, attempt to read from DB as fallback
            try {
                if (typeof isValidated === 'undefined' && typeof isAdmin === 'undefined' && req.session && req.session.userId && req.db) {
                    const u = req.db.prepare('SELECT is_validated, is_admin FROM users WHERE id = ? LIMIT 1').get(req.session.userId) || {};
                    if (typeof isValidated === 'undefined') isValidated = typeof u.is_validated !== 'undefined' ? u.is_validated : undefined;
                    if (typeof isAdmin === 'undefined') isAdmin = typeof u.is_admin !== 'undefined' ? u.is_admin : undefined;
                    if (debugging) console.log('checkRole: Fetched from DB fallback:', { is_validated: isValidated, is_admin: isAdmin });
                }
            } catch (e) {
                if (debugging) console.warn('checkRole: DB fallback failed', e.message);
            }

            // Normalize to booleans (treat undefined as false for role resolution)
            const isValidatedFlag = !!isValidated;
            const isAdminFlag = !!isAdmin;

            const userRole = isAdminFlag ? 'admin' : (isValidatedFlag ? 'validado' : 'no_validado');
            if (debugging) console.log(`checkRole: Interpreted user role based on validation: ${userRole}`);

            if (rolesPermitidos.includes(userRole)) {
                if (debugging) console.log(`checkRole: User role '${userRole}' is permitted. Proceeding to next middleware.`);
                return next();
            } else {
                if (debugging) console.log(`checkRole: User role '${userRole}' is NOT permitted. Sending 403.`);
                return res.status(403).render('404', { 
                    title: 'Acceso Denegado', 
                    message: 'No tienes permisos para ver esta sección.' 
                });
            }
        } catch (error) {
            console.error("Error en middleware de autorización:", error);
            return res.status(500).send("Error interno del servidor");
        }
    };
};

module.exports = checkRole;