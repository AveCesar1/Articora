// This code isn't working. When I try to access a route that uses this middleware, I get sent to "http://localhost:3000/login?error=auth_required"
// Solution?

const jwt = require('jsonwebtoken');
const debugging = global.debugging;

const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                if (debugging) console.log("checkRole: No session or userId found. Redirecting to login.");
                return res.redirect('/login?error=auth_required');
            }

            const isValidated = req.session.is_validated;
            if (debugging) console.log(`checkRole: User validation status from session: ${isValidated}`);

            if (isValidated === undefined) {
                if (debugging) console.log("checkRole: No validation status found in session. Sending 403.");
                return res.status(403).send("Error: Estado de validación del usuario no encontrado en la sesión.");
            }

            const userRole = isValidated ? 'validado' : 'no_validado';
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