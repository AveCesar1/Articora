// Load all POST route modules from routes/posts
module.exports = function (app) {
    const fs = require('fs');
    const path = require('path');
    const postsDir = path.join(__dirname, 'posts');

    fs.readdirSync(postsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const routePath = path.join(postsDir, file);
            try {
                require(routePath)(app);
                console.log('Loaded POST routes from', routePath);
            } catch (err) {
                console.error('Failed to load POST route', routePath, err);
            }
        }
    });
};