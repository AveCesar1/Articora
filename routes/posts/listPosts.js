const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);
const { sanitizeText } = require('../../middlewares/sanitize');

module.exports = function(app) {
	// Create a new curatorial list
	app.post('/api/lists', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const body = req.body || {};
			const title = sanitizeText(body.title || '').trim();
			const description = sanitizeText(body.description || '').trim();
			const isPublic = body.is_public === true || body.is_public === 1 || body.is_public === '1' ? 1 : 0;
			const isCollaborative = body.is_collaborative === true || body.is_collaborative === 1 || body.is_collaborative === '1' ? 1 : 0;

			if (!title) return res.status(400).json({ success: false, message: 'title_required' });
			if (title.length > 50) return res.status(400).json({ success: false, message: 'title_too_long' });
			if (description && description.length > 500) return res.status(400).json({ success: false, message: 'description_too_long' });

			const userRow = db.prepare('SELECT is_validated FROM users WHERE id = ?').get(userId);
			if (!userRow) return res.status(401).json({ success: false, message: 'user_not_found' });

			const maxLists = userRow.is_validated ? 10 : 3;
			const currentCount = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(userId).c || 0;
			if (currentCount >= maxLists) return res.status(400).json({ success: false, message: 'max_lists_reached' });

			const insert = db.prepare(`
				INSERT INTO curatorial_lists (user_id, title, description, is_public, is_collaborative, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`);

			const result = insert.run(userId, title, description || null, isPublic, isCollaborative);
			const listId = result.lastInsertRowid;

			const list = db.prepare('SELECT id, user_id as userId, title, description, cover_image as coverImage, is_public as isPublic, is_collaborative as isCollaborative, total_sources as totalSources, total_views as totalViews, created_at as createdAt, updated_at as updatedAt FROM curatorial_lists WHERE id = ?').get(listId);

			return res.json({ success: true, list });
		} catch (err) {
			console.error('Error in POST /api/lists', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});
};