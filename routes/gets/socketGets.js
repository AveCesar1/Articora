const authenticate = require('../../middlewares/auth');
const jwt = require('jsonwebtoken');

module.exports = function(app) {
    // Devuelve un token JWT temporal para uso en Handshake de Socket.io
    app.get('/api/socket/token', authenticate, (req, res) => {
        try {
            const user = req.user || {};
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        } catch (e) {
            console.error('Error generando socket token:', e && e.message);
            res.status(500).json({ error: 'token_error' });
        }
    });
};
