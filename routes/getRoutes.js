// Load all GET route modules from routes/gets
module.exports = function (app) {
    const fs = require('fs');
    const path = require('path');
    const getsDir = path.join(__dirname, 'gets');

    fs.readdirSync(getsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const routePath = path.join(getsDir, file);
            try {
                require(routePath)(app);
                console.log('Loaded GET routes from', routePath);
            } catch (err) {
                console.error('Failed to load GET route', routePath, err);
            }
        }
    });

    // 404
    app.use((req, res) => {
        res.status(404).render('404', { 
            title: 'Página no encontrada - Artícora', 
            currentPage: '404', 
            cssFile: '404.css' 
        });
    });
};