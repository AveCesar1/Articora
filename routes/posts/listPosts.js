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

			// Determine cover_image value to persist. We store either the category name or the token 'Primera Portada'
			const coverType = (body.cover_type || 'auto').toString();
			let coverImageValue = null;
			if (coverType === 'category') {
				const catId = body.cover_category ? Number(body.cover_category) : null;
				if (catId && !Number.isNaN(catId)) {
					const catRow = db.prepare('SELECT name FROM categories WHERE id = ?').get(catId);
					if (catRow && catRow.name) coverImageValue = sanitizeText(catRow.name);
				}
				if (!coverImageValue) coverImageValue = 'Primera Portada';
			} else {
				coverImageValue = 'Primera Portada';
			}

			if (!title) return res.status(400).json({ success: false, message: 'title_required' });
			if (title.length > 50) return res.status(400).json({ success: false, message: 'title_too_long' });
			if (description && description.length > 500) return res.status(400).json({ success: false, message: 'description_too_long' });

			const userRow = db.prepare('SELECT is_validated FROM users WHERE id = ?').get(userId);
			if (!userRow) return res.status(401).json({ success: false, message: 'user_not_found' });

			const maxLists = userRow.is_validated ? 10 : 3;
			const currentCount = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(userId).c || 0;
			if (currentCount >= maxLists) return res.status(400).json({ success: false, message: 'max_lists_reached' });

			const insert = db.prepare(`
				INSERT INTO curatorial_lists (user_id, title, description, cover_image, is_public, is_collaborative, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`);

			const result = insert.run(userId, title, description || null, coverImageValue, isPublic, isCollaborative);
			const listId = result.lastInsertRowid;

			const list = db.prepare('SELECT id, user_id as userId, title, description, cover_image as coverImage, is_public as isPublic, is_collaborative as isCollaborative, total_sources as totalSources, total_views as totalViews, created_at as createdAt, updated_at as updatedAt FROM curatorial_lists WHERE id = ?').get(listId);

			return res.json({ success: true, list });
		} catch (err) {
			console.error('Error in POST /api/lists', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Add multiple sources to a list
	app.post('/api/lists/:id/sources', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			if (Number.isNaN(listId)) return res.status(400).json({ success: false, message: 'invalid_list_id' });

			const body = req.body || {};
			let sourceIds = Array.isArray(body.source_ids) ? body.source_ids.map(x => Number(x)).filter(n => !Number.isNaN(n)) : [];
			if (!sourceIds.length) return res.status(400).json({ success: false, message: 'no_sources' });

			// Load list and permission
			const listRow = db.prepare('SELECT * FROM curatorial_lists WHERE id = ?').get(listId);
			if (!listRow) return res.status(404).json({ success: false, message: 'list_not_found' });

			let allowed = false;
			if (listRow.user_id === userId) allowed = true;
			if (!allowed) {
				const coll = db.prepare("SELECT 1 FROM list_collaborators WHERE list_id = ? AND user_id = ? AND status = 'accepted'").get(listId, userId);
				if (coll) allowed = true;
			}
			if (!allowed) return res.status(403).json({ success: false, message: 'forbidden' });

			// enforce per-user limit per list
			const userRow = db.prepare('SELECT is_validated FROM users WHERE id = ?').get(userId) || { is_validated: 0 };
			const maxPerList = userRow.is_validated ? 50 : 15;
			const currentCount = db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(listId).c || 0;
			const remaining = Math.max(0, maxPerList - currentCount);
			if (remaining <= 0) return res.status(400).json({ success: false, message: 'list_full', maxPerList });

			// dedupe and filter out already present
			sourceIds = Array.from(new Set(sourceIds));
			const placeholders = sourceIds.map(() => '?').join(',');
			const existingRows = db.prepare(`SELECT source_id FROM list_sources WHERE list_id = ? AND source_id IN (${placeholders})`).all(listId, ...sourceIds);
			const already = new Set(existingRows.map(r => r.source_id));
			const toAdd = sourceIds.filter(id => !already.has(id)).slice(0, remaining);
			if (!toAdd.length) return res.json({ success: true, added: 0, totalSources: currentCount });

			const insert = db.prepare('INSERT INTO list_sources (list_id, source_id, added_at) VALUES (?, ?, datetime(\'now\'))');
			let added = 0;
			const insertTxn = db.transaction((items) => {
				for (const sid of items) { insert.run(listId, sid); added++; }
			});
			insertTxn(toAdd);

			// update total_sources counter (best effort)
			try {
				db.prepare('UPDATE curatorial_lists SET total_sources = COALESCE(total_sources,0) + ?, updated_at = datetime(\'now\') WHERE id = ?').run(added, listId);
			} catch (e) { console.error('Could not update total_sources', e); }

			const newTotal = db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(listId).c || 0;

			return res.json({ success: true, added, totalSources: newTotal });
		} catch (err) {
			console.error('Error in POST /api/lists/:id/sources', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Remove a single source from a list
	app.post('/api/remove-from-list/:id', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			const body = req.body || {};
			const sourceId = body.source_id ? Number(body.source_id) : null;
			if (Number.isNaN(listId) || !sourceId) return res.status(400).json({ success: false, message: 'invalid_params' });

			const listRow = db.prepare('SELECT user_id FROM curatorial_lists WHERE id = ?').get(listId);
			if (!listRow) return res.status(404).json({ success: false, message: 'list_not_found' });

			let allowedRem = false;
			if (listRow.user_id === userId) allowedRem = true;
			if (!allowedRem) {
				const coll = db.prepare("SELECT 1 FROM list_collaborators WHERE list_id = ? AND user_id = ? AND status = 'accepted'").get(listId, userId);
				if (coll) allowedRem = true;
			}
			if (!allowedRem) return res.status(403).json({ success: false, message: 'forbidden' });

			const del = db.prepare('DELETE FROM list_sources WHERE list_id = ? AND source_id = ?');
			const info = del.run(listId, sourceId);
			if (info.changes === 0) return res.status(404).json({ success: false, message: 'not_found' });

			try {
				db.prepare('UPDATE curatorial_lists SET total_sources = COALESCE(total_sources,0) - 1, updated_at = datetime(\'now\') WHERE id = ? AND total_sources > 0').run(listId);
			} catch (e) { console.error(e); }
			const newTotal = db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(listId).c || 0;
			return res.json({ success: true, removed: 1, totalSources: newTotal });
		} catch (err) {
			console.error('Error in POST /api/remove-from-list/:id', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Remove (delete) an entire list - only owner can do this
	app.post('/api/remove-list/:id', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			if (Number.isNaN(listId)) return res.status(400).json({ success: false, message: 'invalid_params' });

			const listRow = db.prepare('SELECT user_id FROM curatorial_lists WHERE id = ?').get(listId);
			if (!listRow) return res.status(404).json({ success: false, message: 'list_not_found' });
			if (listRow.user_id !== userId) return res.status(403).json({ success: false, message: 'forbidden' });

			const txn = db.transaction(() => {
				db.prepare('DELETE FROM list_sources WHERE list_id = ?').run(listId);
				db.prepare('DELETE FROM list_collaborators WHERE list_id = ?').run(listId);
				db.prepare('DELETE FROM curatorial_lists WHERE id = ?').run(listId);
			});
			txn();
			return res.json({ success: true, removed: true });
		} catch (err) {
			console.error('Error in POST /api/remove-list/:id', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Update list metadata (title, description, visibility, collaborative)
	app.post('/api/lists/:id', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			if (Number.isNaN(listId)) return res.status(400).json({ success: false, message: 'invalid_list_id' });

			const body = req.body || {};
			const title = sanitizeText(body.title || '').trim();
			const description = sanitizeText(body.description || '').trim();
			const isPublic = body.is_public === true || body.is_public === 1 || body.is_public === '1' ? 1 : 0;
			const isCollaborative = body.is_collaborative === true || body.is_collaborative === 1 || body.is_collaborative === '1' ? 1 : 0;

			const listRow = db.prepare('SELECT user_id FROM curatorial_lists WHERE id = ?').get(listId);
			if (!listRow) return res.status(404).json({ success: false, message: 'list_not_found' });

			// Only owner can change visibility or core metadata
			if (listRow.user_id !== userId) return res.status(403).json({ success: false, message: 'forbidden' });

			if (!title) return res.status(400).json({ success: false, message: 'title_required' });
			if (title.length > 50) return res.status(400).json({ success: false, message: 'title_too_long' });
			if (description && description.length > 500) return res.status(400).json({ success: false, message: 'description_too_long' });

			// Update cover_image only if client provided cover_type/cover_category to avoid overwriting unintentionally
			const coverProvided = Object.prototype.hasOwnProperty.call(body, 'cover_type') || Object.prototype.hasOwnProperty.call(body, 'cover_category');
			if (coverProvided) {
				const coverType = (body.cover_type || 'auto').toString();
				let coverImageValue = null;
				if (coverType === 'category') {
					const catId = body.cover_category ? Number(body.cover_category) : null;
					if (catId && !Number.isNaN(catId)) {
						const catRow = db.prepare('SELECT name FROM categories WHERE id = ?').get(catId);
						if (catRow && catRow.name) coverImageValue = sanitizeText(catRow.name);
					}
					if (!coverImageValue) coverImageValue = 'Primera Portada';
				} else {
					coverImageValue = 'Primera Portada';
				}
				db.prepare('UPDATE curatorial_lists SET title = ?, description = ?, is_public = ?, is_collaborative = ?, cover_image = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, description || null, isPublic, isCollaborative, coverImageValue, listId);
			} else {
				db.prepare('UPDATE curatorial_lists SET title = ?, description = ?, is_public = ?, is_collaborative = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, description || null, isPublic, isCollaborative, listId);
			}

			const updated = db.prepare('SELECT id, user_id as userId, title, description, cover_image as coverImage, is_public as isPublic, is_collaborative as isCollaborative, total_sources as totalSources, total_views as totalViews, created_at as createdAt, updated_at as updatedAt FROM curatorial_lists WHERE id = ?').get(listId);
			return res.json({ success: true, list: updated });
		} catch (err) {
			console.error('Error in POST /api/lists/:id', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Invite a user to collaborate on a list (owner only, invited user must be validated)
	app.post('/api/lists/:id/invite', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			if (Number.isNaN(listId)) return res.status(400).json({ success: false, message: 'invalid_list_id' });

			const body = req.body || {};
			const inviteeId = body.user_id ? Number(body.user_id) : null;
			if (!inviteeId) return res.status(400).json({ success: false, message: 'invalid_user' });

			const listRow = db.prepare('SELECT user_id, is_collaborative FROM curatorial_lists WHERE id = ?').get(listId);
			if (!listRow) return res.status(404).json({ success: false, message: 'list_not_found' });
			if (listRow.user_id !== userId) return res.status(403).json({ success: false, message: 'forbidden' });
			if (!listRow.is_collaborative) return res.status(400).json({ success: false, message: 'not_collaborative' });

			// inviter must be validated
			const inviter = db.prepare('SELECT is_validated FROM users WHERE id = ?').get(userId);
			if (!inviter || !inviter.is_validated) return res.status(403).json({ success: false, message: 'inviter_not_validated' });

			// invitee must exist and be validated
			const invitee = db.prepare('SELECT id, is_validated FROM users WHERE id = ?').get(inviteeId);
			if (!invitee) return res.status(404).json({ success: false, message: 'invitee_not_found' });
			if (!invitee.is_validated) return res.status(400).json({ success: false, message: 'invitee_not_validated' });

			// check existing collaborator count (accepted + pending)
			const collCount = db.prepare("SELECT COUNT(*) as c FROM list_collaborators WHERE list_id = ? AND status IN ('accepted','pending')").get(listId).c || 0;
			if (collCount >= 5) return res.status(400).json({ success: false, message: 'max_collaborators' });

			// check already present
			const existing = db.prepare('SELECT status FROM list_collaborators WHERE list_id = ? AND user_id = ?').get(listId, inviteeId);
			if (existing) return res.status(400).json({ success: false, message: 'already_invited', status: existing.status });

			// insert pending invitation
			db.prepare("INSERT INTO list_collaborators (list_id, user_id, invited_at, status) VALUES (?, ?, datetime('now'), 'pending')").run(listId, inviteeId);
			try { db.prepare("UPDATE curatorial_lists SET updated_at = datetime('now') WHERE id = ?").run(listId); } catch (e) { console.error('Could not update list updated_at on invite', e); }
			return res.json({ success: true, invited: true });
		} catch (err) {
			console.error('Error in POST /api/lists/:id/invite', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});

	// Respond to an invitation (accept/reject) - authenticated invitee only
	app.post('/api/lists/:id/collaborators/respond', IsRegistered, (req, res) => {
		try {
			const db = req.db;
			const userId = req.user && req.user.id;
			if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

			const listId = parseInt(req.params.id, 10);
			if (Number.isNaN(listId)) return res.status(400).json({ success: false, message: 'invalid_list_id' });

			const body = req.body || {};
			const action = body.action === 'accept' ? 'accept' : (body.action === 'reject' ? 'reject' : null);
			if (!action) return res.status(400).json({ success: false, message: 'invalid_action' });

			const row = db.prepare('SELECT status FROM list_collaborators WHERE list_id = ? AND user_id = ?').get(listId, userId);
			if (!row) return res.status(404).json({ success: false, message: 'invitation_not_found' });

			if (action === 'accept') {
				// check max collaborators
				const collCount = db.prepare("SELECT COUNT(*) as c FROM list_collaborators WHERE list_id = ? AND status = 'accepted'").get(listId).c || 0;
				if (collCount >= 5) return res.status(400).json({ success: false, message: 'max_collaborators' });
				db.prepare("UPDATE list_collaborators SET status = 'accepted', accepted_at = datetime('now') WHERE list_id = ? AND user_id = ?").run(listId, userId);
				try { db.prepare("UPDATE curatorial_lists SET updated_at = datetime('now') WHERE id = ?").run(listId); } catch (e) { console.error('Could not update list updated_at on accept', e); }
				return res.json({ success: true, status: 'accepted' });
			} else {
				db.prepare("UPDATE list_collaborators SET status = 'denied' WHERE list_id = ? AND user_id = ?").run(listId, userId);
				try { db.prepare("UPDATE curatorial_lists SET updated_at = datetime('now') WHERE id = ?").run(listId); } catch (e) { console.error('Could not update list updated_at on deny', e); }
				return res.json({ success: true, status: 'denied' });
			}
		} catch (err) {
			console.error('Error in POST /api/lists/:id/collaborators/respond', err);
			return res.status(500).json({ success: false, message: 'internal_error' });
		}
	});
};