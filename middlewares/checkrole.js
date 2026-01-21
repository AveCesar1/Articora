const checkRole = (rolesPermitidos) => {
    return async (req, res, next) => {
        try {
      
            if (!req.session || !req.session.userId) {
                return res.redirect('/login?error=auth_required');
            }

        
            const userRole = req.session.userRole; 

            if (!userRole) {
                return res.status(403).send("Error: Rol de usuario no encontrado en la sesión.");
            }

     
            if (rolesPermitidos.includes(userRole)) {
                return next();
            }
            return res.status(403).render('404', { 
                title: 'Acceso Denegado', 
                message: 'No tienes permisos para ver esta sección.' 
            });
        } catch (error) {
            console.error("Error en middleware de autorización:", error);
            return res.status(500).send("Error interno del servidor");
        }
    };
};

module.exports = checkRole;