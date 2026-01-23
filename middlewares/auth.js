const jwt = require('jsonwebtoken');

function isRegistered(req, res, next) {
    try {
        // If session already has userId, allow
        if (req.session && req.session.userId) {
            return next();
        }

        // Otherwise, try to validate JWT token from cookie
        const token = req.cookies && req.cookies.token;
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                // populate session/user context for downstream handlers
                if (req.session) req.session.userId = decoded.id;
                res.locals.loggedIn = true;
                res.locals.user = { id: decoded.id, username: decoded.username };
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