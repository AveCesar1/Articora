const jwt = require('jsonwebtoken');

function isRegistered(req, res, next) {
    try {
        // If session already has userId, allow
        if (req.session && req.session.userId) {
            // populate req.user and res.locals for handlers that expect them
            req.user = req.user || {};
            req.user.id = req.session.userId;
            if (req.session.username) req.user.username = req.session.username;
            // propagate admin flag (support both snake_case and camelCase session keys)
            const sessionIsAdmin = typeof req.session.is_admin !== 'undefined' ? req.session.is_admin : req.session.isAdmin;
            req.user.isAdmin = !!sessionIsAdmin;

            res.locals.loggedIn = true;
            res.locals.user = res.locals.user || { id: req.session.userId, username: req.session.username };
            res.locals.user.isAdmin = !!sessionIsAdmin;
            res.locals.isAdmin = !!sessionIsAdmin;
            return next();
        }

        // Otherwise, try to validate JWT token from cookie
        const token = req.cookies && req.cookies.token;
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                // populate session/user context for downstream handlers
                if (req.session) req.session.userId = decoded.id;
                req.user = req.user || { id: decoded.id, username: decoded.username };

                // If the session already contained an admin flag propagate it to locals
                const sessionIsAdmin = req.session && (typeof req.session.is_admin !== 'undefined' ? req.session.is_admin : req.session.isAdmin);
                req.user.isAdmin = !!sessionIsAdmin;

                res.locals.loggedIn = true;
                res.locals.user = { id: decoded.id, username: decoded.username, isAdmin: !!sessionIsAdmin };
                res.locals.isAdmin = !!sessionIsAdmin;
                return next();
            } catch (err) {
                // invalid token - fall through to redirect
                console.warn('JWT verification failed in isRegistered middleware:', err.message);
            }
        }
    } catch (err) {
        console.error('Error in isRegistered middleware:', err);
    }

    return res.redirect('/login');
}

module.exports = isRegistered;