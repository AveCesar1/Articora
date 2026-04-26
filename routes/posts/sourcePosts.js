const path = require('path');
const { sanitizeText } = require('../../middlewares/sanitize');
const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const util = require('util');
const execPromise = util.promisify(exec);

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

module.exports = function (app) {
  // Helper: update reading_stats for a user
  function updateReadingStats(db, userId) {
    try {
      const totalReadRow = db.prepare('SELECT COUNT(1) as cnt FROM user_readings WHERE user_id = ? AND status = ?').get(userId, 'read');
      const totalRead = totalReadRow && totalReadRow.cnt ? totalReadRow.cnt : 0;
      const totalToReadRow = db.prepare('SELECT COUNT(1) as cnt FROM user_reading_list WHERE user_id = ?').get(userId);
      const totalToRead = totalToReadRow && totalToReadRow.cnt ? totalToReadRow.cnt : 0;

      const catRows = db.prepare('SELECT s.category_id as category_id, COUNT(1) as cnt FROM user_readings u JOIN sources s ON u.source_id = s.id WHERE u.user_id = ? AND u.status = ? GROUP BY s.category_id').all(userId, 'read');
      const distribution = {};
      for (const r of catRows) {
        distribution[r.category_id || 'unknown'] = r.cnt;
      }
      const distText = Object.keys(distribution).length ? JSON.stringify(distribution) : null;

      const exists = db.prepare('SELECT user_id FROM reading_stats WHERE user_id = ?').get(userId);
      if (exists) {
        db.prepare('UPDATE reading_stats SET total_read = ?, total_to_read = ?, category_distribution = ?, last_updated = datetime(\'now\') WHERE user_id = ?').run(totalRead, totalToRead, distText, userId);
      } else {
        db.prepare('INSERT INTO reading_stats (user_id, total_read, total_to_read, category_distribution, last_updated) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(userId, totalRead, totalToRead, distText);
      }
    } catch (e) {
      if (debugging) console.warn('updateReadingStats error', e && e.message);
    }
  }

  // Helper: parse a user-supplied date string (YYYY-MM or YYYY-MM-DD) and ensure not future
  function normalizeReadDate(input) {
    try {
      if (!input) return null;
      const m = String(input).trim();
      const full = m.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
      if (!full) return null;
      const y = parseInt(full[1], 10);
      const mo = parseInt(full[2], 10);
      const da = full[3] ? parseInt(full[3], 10) : 1;
      const d = new Date(Date.UTC(y, mo - 1, da));
      const today = new Date();
      // compare yyyy-mm-dd (local)
      const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const cand = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (cand > t) return null; // future date not allowed
      // return YYYY-MM-DD
      return cand.toISOString().slice(0, 10);
    } catch (e) {
      return null;
    }
  }
  // Endpoint to receive upload metadata (JSON). Expects authenticated & validated user.
  app.post('/upload', soloValidado, async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const body = req.body || {};

      // Sanitize inputs
      const title = sanitizeText(body.title || '');
      const authorsInput = body.authors || [];
      const year = parseInt(body.year, 10) || null;
      const sourceType = sanitizeText(body.sourceType || '');
      const primaryUrl = sanitizeText(body.primary_url || body.primaryUrl || '');
      const categoryId = parseInt(body.category_id || body.categoryId || body.category, 10) || null;
      const subcategoryId = parseInt(body.subcategory_id || body.subcategoryId || body.subcategory, 10) || null;
      const publisher = sanitizeText(body.publisher || '');
      const edition = body.edition ? parseInt(body.edition, 10) : null;
      const pages = sanitizeText(body.pages || '');
      const doi = sanitizeText(body.doi || '');
      const keywords = Array.isArray(body.keywords) ? body.keywords.map(k => sanitizeText(k)) : sanitizeText(body.keywords || '').split(',').map(s => s.trim()).filter(Boolean);

      // Basic validations
      if (!title) return res.status(400).json({ success: false, message: 'title_required' });
      if (!Array.isArray(authorsInput) && typeof authorsInput !== 'string') return res.status(400).json({ success: false, message: 'authors_required' });
      const authors = Array.isArray(authorsInput) ? authorsInput : String(authorsInput).split(',').map(s => s.trim()).filter(Boolean);
      if (authors.length === 0) return res.status(400).json({ success: false, message: 'at_least_one_author' });
      if (!year) return res.status(400).json({ success: false, message: 'year_required' });
      if (!sourceType) return res.status(400).json({ success: false, message: 'type_required' });
      if (!primaryUrl) return res.status(400).json({ success: false, message: 'primary_url_required' });
      if (!categoryId || !subcategoryId) return res.status(400).json({ success: false, message: 'category_and_subcategory_required' });

      // Duplicate checks
      try {
        if (primaryUrl) {
          const existingByUrl = db.prepare(`SELECT s.id FROM sources s JOIN source_urls u ON s.id = u.source_id WHERE u.url = ? LIMIT 1`).get(primaryUrl);
          if (existingByUrl && existingByUrl.id) {
            if (debugging) console.log('Upload skipped: existing source by URL', existingByUrl.id);
            return res.json({ success: true, sourceId: existingByUrl.id, existing: true, reason: 'url' });
          }
        }

        if (doi) {
          const existingByDoi = db.prepare(`SELECT id FROM sources WHERE doi = ? LIMIT 1`).get(doi);
          if (existingByDoi && existingByDoi.id) {
            if (debugging) console.log('Upload skipped: existing source by DOI', existingByDoi.id);
            return res.json({ success: true, sourceId: existingByDoi.id, existing: true, reason: 'doi' });
          }
        }

        const existingByTitleYear = db.prepare(`SELECT id FROM sources WHERE lower(trim(title)) = lower(trim(?)) AND publication_year = ? LIMIT 1`).get(title, year);
        if (existingByTitleYear && existingByTitleYear.id) {
          if (debugging) console.log('Upload skipped: existing source by title+year', existingByTitleYear.id);
          return res.json({ success: true, sourceId: existingByTitleYear.id, existing: true, reason: 'title_year' });
        }
      } catch (e) {
        if (debugging) console.warn('Error during duplicate checks', e.message);
      }

      // Verify that source type exists (case‑insensitive)
      const sourceTypeRow = db.prepare(`SELECT id FROM source_types WHERE LOWER(name) = LOWER(?) LIMIT 1`).get(sourceType);
      if (!sourceTypeRow) {
        if (debugging) console.warn('Invalid source type provided:', sourceType);
        return res.status(400).json({ success: false, message: 'invalid_source_type' });
      }
      const sourceTypeId = sourceTypeRow.id;

      // Verify category exists
      const categoryExists = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId);
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: 'invalid_category' });
      }

      // Verify subcategory exists
      const subcategoryExists = db.prepare('SELECT 1 FROM subcategories WHERE id = ?').get(subcategoryId);
      console.log('Subcategory check for ID', subcategoryId, 'exists:', !!subcategoryExists);
      if (!subcategoryExists) {
        return res.status(400).json({ success: false, message: 'invalid_subcategory' });
      }

      // Convert numeric fields
      const volume = body.volume ? String(body.volume).trim() : null;
      const issueNumber = body.number ? parseInt(body.number, 10) : null;

      // Insert source
      const insertSource = db.prepare(`
        INSERT INTO sources (
          title, publication_year, journal_publisher, volume, issue_number, pages, edition,
          source_type_id, doi, keywords, primary_url, category_id, subcategory_id, uploaded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const keywordsText = keywords.length ? keywords.join(',') : null;

      const result = insertSource.run(
        title,
        year,
        publisher || null,
        volume,
        issueNumber,
        pages || null,
        edition,
        sourceTypeId,
        doi || null,
        keywordsText,
        primaryUrl,
        categoryId,
        subcategoryId,
        userId
      );

      const sourceId = result.lastInsertRowid;

      if (debugging) console.log('Inserted new source', sourceId);

      // Link authors
      const findAuthor = db.prepare('SELECT id FROM authors WHERE full_name = ? LIMIT 1');
      const insertAuthor = db.prepare('INSERT INTO authors (full_name) VALUES (?)');
      const insertLink = db.prepare('INSERT OR IGNORE INTO source_authors (source_id, author_id, sort_order) VALUES (?, ?, ?)');

      for (let i = 0; i < authors.length; i++) {
        const full = sanitizeText(authors[i]);
        if (!full) continue;
        let a = findAuthor.get(full);
        let authorId;
        if (a && a.id) {
          authorId = a.id;
        } else {
          const r = insertAuthor.run(full);
          authorId = r.lastInsertRowid;
        }
        insertLink.run(sourceId, authorId, i);
      }

      // Store primary URL
      try {
        const insertUrl = db.prepare('INSERT OR IGNORE INTO source_urls (source_id, url, url_type) VALUES (?, ?, ?)');
        insertUrl.run(sourceId, primaryUrl, 'primary');
      } catch (e) { /* ignore */ }

      try { // Prepare metadata for cover generation (ensure fields expected by generarPortadaLaTeX)
        const fuenteId = sourceId; // capture for closure
        const coverMetadata = {
          titulo: title,
          autores: Array.isArray(authors) ? authors : String(authors).split(',').map(s => s.trim()).filter(Boolean),
          year: year,
          publisher: publisher,
          doi: doi,
          primary_url: primaryUrl
        };

        // Send a single response to the client and stop further execution
        res.json({ success: true, sourceId: fuenteId, message: 'Fuente registrada. La portada se generará en segundo plano.' });

        // Schedule background generation of the cover using the prepared metadata
        setImmediate(() => {
          generarPortadaLaTeX(fuenteId, coverMetadata).catch(err => {
            console.error(`Error generando portada para fuente ${fuenteId}:`, err);
            // Optional: mark in DB that the cover generation failed
          });
        });

        // Schedule background TF-IDF indexing as well
        setImmediate(() => {
          // use keywordsText computed earlier in this scope
          try {
            indexSourceInPython(fuenteId, coverMetadata.titulo, coverMetadata.autores.join(', '), keywordsText || '')
              .then(() => console.log(`Fuente ${fuenteId} indexada (background)`))
              .catch(err => console.error(`Error indexando fuente ${fuenteId} (background):`, err));
          } catch (e) {
            console.error('Error programando indexacion TF-IDF:', e);
          }
        });

        return; // ensure we do not send any other response
      } catch (e) {
        console.warn('Error programando generación de portada', e.message);
      }

      indexSourceInPython(sourceId, req.body.titulo, req.body.autores.join(', '), req.body.palabras_clave)
        .then(() => console.log(`Fuente ${sourceId} indexada`))
        .catch(err => console.error('Error indexando:', err));
    } catch (err) {
      console.error('Error in POST /upload', err);
      // Mensaje específico para errores de clave foránea
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return res.status(400).json({ success: false, message: 'foreign_key_error: some referenced record does not exist (category, subcategory, or source type)' });
      }
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // -----------------------------
  // Ratings API endpoints
  // -----------------------------

  // Create or update a rating (and optional comment) for a source
  app.post('/api/sources/:id/rate', async (req, res) => {
    try {
      const db = req.db;
      const sourceId = parseInt(req.params.id, 10);
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      // Validate source id
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      const body = req.body || {};
      // required criteria
      const criteria = ['readability', 'completeness', 'detail_level', 'veracity', 'technical_difficulty'];
      const values = {};
      for (const c of criteria) {
        if (typeof body[c] === 'undefined') return res.status(400).json({ success: false, message: 'missing_criteria' });
        const v = parseFloat(body[c]);
        if (Number.isNaN(v) || v < 0 || v > 5 || Math.round(v * 2) !== v * 2) {
          return res.status(400).json({ success: false, message: 'invalid_score', field: c });
        }
        values[c] = v;
      }

      // Detect if comment was explicitly provided (allow empty string to clear)
      const commentProvided = Object.prototype.hasOwnProperty.call(body, 'comment');
      const comment = commentProvided ? sanitizeText(body.comment || '', { maxLength: 1000 }) : undefined;

      // Get academic level of user at time of rating (store snapshot) and mark unvalidated users
      let academic = 'unknown';
      try {
        const u = db.prepare('SELECT academic_level, is_validated FROM users WHERE id = ? LIMIT 1').get(userId) || {};
        const level = u.academic_level ? String(u.academic_level).slice(0, 50) : 'Sin grado';
        academic = u.is_validated ? level : `${level} (no verificado)`;
      } catch (e) {
        academic = 'unknown';
      }

      // Check if rating exists
      const existing = db.prepare('SELECT * FROM ratings WHERE source_id = ? AND user_id = ? LIMIT 1').get(sourceId, userId);
      let ratingId = null;
      if (existing && existing.id) {
        // Insert history of previous values
        try {
          db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
            existing.id,
            existing.readability,
            existing.completeness,
            existing.detail_level,
            existing.veracity,
            existing.technical_difficulty,
            existing.academic_context || '',
            existing.comment || ''
          );
        } catch (e) { /* ignore history failure */ }

        // Update existing rating. Only update the comment column if it was provided in the request
        if (commentProvided) {
          db.prepare(`UPDATE ratings SET readability = ?, completeness = ?, detail_level = ?, veracity = ?, technical_difficulty = ?, comment = ?, academic_context = ?, updated_at = datetime('now'), version = version + 1 WHERE id = ?`).run(
            values.readability,
            values.completeness,
            values.detail_level,
            values.veracity,
            values.technical_difficulty,
            comment,
            academic,
            existing.id
          );
        } else {
          db.prepare(`UPDATE ratings SET readability = ?, completeness = ?, detail_level = ?, veracity = ?, technical_difficulty = ?, academic_context = ?, updated_at = datetime('now'), version = version + 1 WHERE id = ?`).run(
            values.readability,
            values.completeness,
            values.detail_level,
            values.veracity,
            values.technical_difficulty,
            academic,
            existing.id
          );
        }

        ratingId = existing.id;
      } else {
        // Insert new rating
        const insert = db.prepare(`INSERT INTO ratings (source_id, user_id, readability, completeness, detail_level, veracity, technical_difficulty, comment, academic_context, created_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`);
        const r = insert.run(
          sourceId,
          userId,
          values.readability,
          values.completeness,
          values.detail_level,
          values.veracity,
          values.technical_difficulty,
          comment,
          academic
        );
        ratingId = r.lastInsertRowid;
      }

      // Recompute aggregates for the source (use latest ratings table entries)
      const agg = db.prepare(`SELECT COUNT(1) as cnt, AVG(readability) AS avg_readability, AVG(completeness) AS avg_completeness, AVG(detail_level) AS avg_detail_level, AVG(veracity) AS avg_veracity, AVG(technical_difficulty) AS avg_technical_difficulty FROM ratings WHERE source_id = ?`).get(sourceId);
      const total = agg ? (agg.cnt || 0) : 0;
      const avgRead = parseFloat(((agg && agg.avg_readability) || 0).toFixed(2));
      const avgComp = parseFloat(((agg && agg.avg_completeness) || 0).toFixed(2));
      const avgDetail = parseFloat(((agg && agg.avg_detail_level) || 0).toFixed(2));
      const avgVer = parseFloat(((agg && agg.avg_veracity) || 0).toFixed(2));
      const avgTech = parseFloat(((agg && agg.avg_technical_difficulty) || 0).toFixed(2));
      const overall = total ? parseFloat(((avgRead + avgComp + avgDetail + avgVer + avgTech) / 5).toFixed(2)) : 0;

      try {
        db.prepare(`UPDATE sources SET total_ratings = ?, avg_readability = ?, avg_completeness = ?, avg_detail_level = ?, avg_veracity = ?, avg_technical_difficulty = ?, overall_rating = ? WHERE id = ?`).run(total, avgRead, avgComp, avgDetail, avgVer, avgTech, overall, sourceId);
      } catch (e) { /* ignore update failures */ }

      const userRating = db.prepare('SELECT id, readability, completeness, detail_level, veracity, technical_difficulty, comment, academic_context, version, created_at FROM ratings WHERE id = ?').get(ratingId);

      // RQF174: when a user rates a source, register it as read (with optional read_date)
      try {
        // body may include an optional read_date (YYYY-MM or YYYY-MM-DD). Default: today
        const suppliedDate = req.body && req.body.read_date ? req.body.read_date : null;
        const normalized = normalizeReadDate(suppliedDate) || new Date().toISOString().slice(0, 10);

        // insert or update user_readings with status 'read'
        try {
          const existingRead = db.prepare('SELECT id FROM user_readings WHERE user_id = ? AND source_id = ? AND status = ? LIMIT 1').get(userId, sourceId, 'read');
          if (existingRead && existingRead.id) {
            db.prepare('UPDATE user_readings SET read_date = ?, added_at = datetime(\'now\') WHERE id = ?').run(normalized, existingRead.id);
          } else {
            db.prepare('INSERT INTO user_readings (user_id, source_id, status, read_date, added_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(userId, sourceId, 'read', normalized);
          }
        } catch (e) {
          if (debugging) console.warn('Could not insert/update user_readings', e && e.message);
        }

        // remove from pending list if present
        try {
          db.prepare('DELETE FROM user_reading_list WHERE user_id = ? AND source_id = ?').run(userId, sourceId);
        } catch (e) { /* ignore if table missing */ }

        // update reading_stats
        try { updateReadingStats(db, userId); } catch (e) { /* ignore */ }
      } catch (e) {
        if (debugging) console.warn('automatic read registration failed', e && e.message);
      }

      return res.json({ success: true, ratingId, averages: { readability: avgRead, completeness: avgComp, detail_level: avgDetail, veracity: avgVer, technical_difficulty: avgTech }, overall, total, userRating });
    } catch (err) {
      console.error('Error in POST /api/sources/:id/rate', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Add or update comment separately (requires an existing rating by the user)
  app.post('/api/sources/:id/comment', async (req, res) => {
    try {
      const db = req.db;
      const sourceId = parseInt(req.params.id, 10);
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      const rawComment = req.body && req.body.comment ? req.body.comment : '';
      const comment = sanitizeText(rawComment, { maxLength: 1000 });

      const existing = db.prepare('SELECT * FROM ratings WHERE source_id = ? AND user_id = ? LIMIT 1').get(sourceId, userId);
      if (!existing) return res.status(400).json({ success: false, message: 'must_rate_before_comment' });

      // Determine current academic snapshot for the user (mark not-validated)
      let newAcademic = existing.academic_context || '';
      try {
        const u = db.prepare('SELECT academic_level, is_validated FROM users WHERE id = ? LIMIT 1').get(userId) || {};
        const level = u.academic_level ? String(u.academic_level).slice(0, 50) : 'Sin grado';
        newAcademic = u.is_validated ? level : `${level} (no verificado)`;
      } catch (e) { /* ignore */ }

      // store history then update (history captures previous values)
      try {
        db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
          existing.id,
          existing.readability,
          existing.completeness,
          existing.detail_level,
          existing.veracity,
          existing.technical_difficulty,
          existing.academic_context || '',
          existing.comment || ''
        );
      } catch (e) { /* ignore history errors */ }

      // Update comment and academic_context and bump version
      db.prepare('UPDATE ratings SET comment = ?, academic_context = ?, updated_at = datetime(\'now\'), version = version + 1 WHERE id = ?').run(comment, newAcademic, existing.id);
      return res.json({ success: true, ratingId: existing.id, comment });
    } catch (err) {
      console.error('Error in POST /api/sources/:id/comment', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Update only academic_context for a rating (ownership or admin required)
  app.put('/api/ratings/:id/grade', async (req, res) => {
    try {
      const db = req.db;
      const ratingId = parseInt(req.params.id, 10);
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      if (Number.isNaN(ratingId)) return res.status(400).json({ success: false, message: 'invalid_rating_id' });

      const newGrade = req.body && req.body.academic_context ? sanitizeText(req.body.academic_context, { maxLength: 50 }) : null;
      if (!newGrade) return res.status(400).json({ success: false, message: 'invalid_academic_context' });

      const r = db.prepare('SELECT id, user_id FROM ratings WHERE id = ? LIMIT 1').get(ratingId);
      if (!r) return res.status(404).json({ success: false, message: 'rating_not_found' });

      // check ownership or admin role
      const isAdmin = req.session && req.session.isAdmin;
      if (r.user_id !== userId && !isAdmin) return res.status(403).json({ success: false, message: 'forbidden' });

      // insert history of previous value
      try {
        const prev = db.prepare('SELECT * FROM ratings WHERE id = ? LIMIT 1').get(ratingId);
        if (prev) {
          db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
            prev.id,
            prev.readability,
            prev.completeness,
            prev.detail_level,
            prev.veracity,
            prev.technical_difficulty,
            prev.academic_context || '',
            prev.comment || ''
          );
        }
      } catch (e) { /* ignore */ }

      db.prepare('UPDATE ratings SET academic_context = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newGrade, ratingId);
      return res.json({ success: true, ratingId, academic_context: newGrade });
    } catch (err) {
      console.error('Error in PUT /api/ratings/:id/grade', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Update entire rating (comment + scores) - creates a new history record and updates rating
  app.put('/api/ratings/:id', async (req, res) => {
    try {
      const db = req.db;
      const ratingId = parseInt(req.params.id, 10);
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      if (Number.isNaN(ratingId)) return res.status(400).json({ success: false, message: 'invalid_rating_id' });

      const existing = db.prepare('SELECT * FROM ratings WHERE id = ? LIMIT 1').get(ratingId);
      if (!existing) return res.status(404).json({ success: false, message: 'rating_not_found' });

      const isAdmin = req.session && req.session.isAdmin;
      if (existing.user_id !== userId && !isAdmin) return res.status(403).json({ success: false, message: 'forbidden' });

      const body = req.body || {};
      const criteria = ['readability', 'completeness', 'detail_level', 'veracity', 'technical_difficulty'];

      // Determine if rating values are being changed
      let newValues = {};
      let changingScores = false;
      if (typeof body.overall !== 'undefined') {
        const v = parseFloat(body.overall);
        if (Number.isNaN(v) || v < 0 || v > 5 || Math.round(v * 2) !== v * 2) return res.status(400).json({ success: false, message: 'invalid_overall' });
        // map overall to all criteria for simplicity
        criteria.forEach(c => newValues[c] = v);
        changingScores = true;
      } else {
        // if any criterion is provided, require all five
        const hasAny = criteria.some(c => typeof body[c] !== 'undefined');
        if (hasAny) {
          for (const c of criteria) {
            if (typeof body[c] === 'undefined') return res.status(400).json({ success: false, message: 'missing_criteria' });
            const v = parseFloat(body[c]);
            if (Number.isNaN(v) || v < 0 || v > 5 || Math.round(v * 2) !== v * 2) return res.status(400).json({ success: false, message: 'invalid_score', field: c });
            newValues[c] = v;
          }
          changingScores = true;
        }
      }

      const comment = typeof body.comment !== 'undefined' ? sanitizeText(body.comment || '', { maxLength: 1000 }) : existing.comment;

      // Determine user's current academic context snapshot
      let newAcademic = '';
      try {
        const u = db.prepare('SELECT academic_level, is_validated FROM users WHERE id = ? LIMIT 1').get(userId) || {};
        const userLevel = u.academic_level ? String(u.academic_level) : '';
        if (u.is_validated) newAcademic = userLevel || 'Sin grado';
        else newAcademic = (userLevel || 'Sin grado') + ' (no verificado)';
      } catch (e) {
        newAcademic = existing.academic_context || '';
      }

      // Ensure rating_history has previous_rating_id column (add if missing)
      try {
        const cols = db.prepare("PRAGMA table_info('rating_history')").all();
        const hasPrev = cols.some(c => c.name === 'previous_rating_id');
        if (!hasPrev) {
          try { db.prepare('ALTER TABLE rating_history ADD COLUMN previous_rating_id INTEGER').run(); } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }

      // Find previous history id for chaining
      let prevHistoryId = null;
      try {
        const lastHist = db.prepare('SELECT id FROM rating_history WHERE rating_id = ? ORDER BY created_at DESC LIMIT 1').get(existing.id);
        if (lastHist && lastHist.id) prevHistoryId = lastHist.id;
      } catch (e) { /* ignore */ }

      // Insert history snapshot of previous values
      try {
        const cols = db.prepare("PRAGMA table_info('rating_history')").all();
        const hasPrev = cols.some(c => c.name === 'previous_rating_id');
        if (hasPrev) {
          db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, previous_rating_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
            existing.id,
            existing.readability,
            existing.completeness,
            existing.detail_level,
            existing.veracity,
            existing.technical_difficulty,
            existing.academic_context || '',
            existing.comment || '',
            prevHistoryId
          );
        } else {
          db.prepare(`INSERT INTO rating_history (rating_id, readability, completeness, detail_level, veracity, technical_difficulty, academic_context, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
            existing.id,
            existing.readability,
            existing.completeness,
            existing.detail_level,
            existing.veracity,
            existing.technical_difficulty,
            existing.academic_context || '',
            existing.comment || ''
          );
        }
      } catch (e) { /* ignore history insertion errors */ }

      // Build update statement
      const updates = [];
      const params = [];
      if (changingScores) {
        for (const c of criteria) {
          updates.push(`${c} = ?`);
          params.push(newValues[c]);
        }
      }
      // always update comment and academic_context
      updates.push('comment = ?'); params.push(comment);
      updates.push('academic_context = ?'); params.push(newAcademic);
      updates.push('updated_at = datetime(\'now\')');
      updates.push('version = version + 1');
      const updateSql = `UPDATE ratings SET ${updates.join(', ')} WHERE id = ?`;
      params.push(existing.id);

      db.prepare(updateSql).run(...params);

      // Recompute aggregates for the source
      try {
        const agg = db.prepare(`SELECT COUNT(1) as cnt, AVG(readability) AS avg_readability, AVG(completeness) AS avg_completeness, AVG(detail_level) AS avg_detail_level, AVG(veracity) AS avg_veracity, AVG(technical_difficulty) AS avg_technical_difficulty FROM ratings WHERE source_id = ?`).get(existing.source_id);
        const total = agg ? (agg.cnt || 0) : 0;
        const avgRead = parseFloat(((agg && agg.avg_readability) || 0).toFixed(2));
        const avgComp = parseFloat(((agg && agg.avg_completeness) || 0).toFixed(2));
        const avgDetail = parseFloat(((agg && agg.avg_detail_level) || 0).toFixed(2));
        const avgVer = parseFloat(((agg && agg.avg_veracity) || 0).toFixed(2));
        const avgTech = parseFloat(((agg && agg.avg_technical_difficulty) || 0).toFixed(2));
        const overall = total ? parseFloat(((avgRead + avgComp + avgDetail + avgVer + avgTech) / 5).toFixed(2)) : 0;
        db.prepare(`UPDATE sources SET total_ratings = ?, avg_readability = ?, avg_completeness = ?, avg_detail_level = ?, avg_veracity = ?, avg_technical_difficulty = ?, overall_rating = ? WHERE id = ?`).run(total, avgRead, avgComp, avgDetail, avgVer, avgTech, overall, existing.source_id);
      } catch (e) { /* ignore */ }

      const userRating = db.prepare('SELECT id, readability, completeness, detail_level, veracity, technical_difficulty, comment, academic_context, version, created_at FROM ratings WHERE id = ?').get(existing.id);
      return res.json({ success: true, ratingId: existing.id, userRating });
    } catch (err) {
      console.error('Error in PUT /api/ratings/:id', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Get ratings history for current user
  app.get('/api/user/ratings/history', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const rows = db.prepare(`SELECT rh.id, rh.rating_id, rh.readability, rh.completeness, rh.detail_level, rh.veracity, rh.technical_difficulty, rh.academic_context, rh.comment, rh.created_at, s.id as source_id, s.title as source_title
        FROM rating_history rh
        JOIN ratings r ON rh.rating_id = r.id
        LEFT JOIN sources s ON r.source_id = s.id
        WHERE r.user_id = ?
        ORDER BY rh.created_at DESC
        LIMIT 200`).all(userId);

      return res.json({ success: true, history: rows });
    } catch (err) {
      console.error('Error in GET /api/user/ratings/history', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // -----------------------------
  // Reading list and reads API
  // -----------------------------

  // Get pending reading list and read history for current user
  app.get('/api/user/reading-list', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const toRead = db.prepare('SELECT l.source_id, l.position, s.title, s.publication_year AS year, s.journal_publisher AS publisher FROM user_reading_list l JOIN sources s ON l.source_id = s.id WHERE l.user_id = ? ORDER BY l.position ASC').all(userId);
      const reads = db.prepare('SELECT ur.id, ur.source_id, ur.read_date, ur.added_at, s.title FROM user_readings ur LEFT JOIN sources s ON ur.source_id = s.id WHERE ur.user_id = ? AND ur.status = ? ORDER BY ur.read_date DESC').all(userId, 'read');

      const u = db.prepare('SELECT is_validated FROM users WHERE id = ? LIMIT 1').get(userId) || {};
      const max = u.is_validated ? 10 : 3;
      const used = toRead ? toRead.length : 0;

      return res.json({ success: true, to_read: toRead, reads, limits: { max, used } });
    } catch (err) {
      console.error('Error in GET /api/user/reading-list', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Add a source to pending reading list
  app.post('/api/user/reading-list', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const sourceId = parseInt(req.body && (req.body.sourceId || req.body.source_id), 10);
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      const source = db.prepare('SELECT id FROM sources WHERE id = ? LIMIT 1').get(sourceId);
      if (!source) return res.status(404).json({ success: false, message: 'source_not_found' });

      const already = db.prepare('SELECT 1 FROM user_reading_list WHERE user_id = ? AND source_id = ?').get(userId, sourceId);
      if (already) return res.json({ success: true, message: 'already_in_list' });

      const u = db.prepare('SELECT is_validated FROM users WHERE id = ? LIMIT 1').get(userId) || {};
      const limit = u.is_validated ? 10 : 3;
      const cntRow = db.prepare('SELECT COUNT(1) as cnt FROM user_reading_list WHERE user_id = ?').get(userId);
      const cnt = cntRow && cntRow.cnt ? cntRow.cnt : 0;
      if (cnt >= limit) return res.status(400).json({ success: false, message: 'limit_reached', limit });

      const maxPosRow = db.prepare('SELECT COALESCE(MAX(position), 0) as maxpos FROM user_reading_list WHERE user_id = ?').get(userId);
      const pos = (maxPosRow && maxPosRow.maxpos ? maxPosRow.maxpos : 0) + 1;

      db.prepare('INSERT INTO user_reading_list (user_id, source_id, position, added_at) VALUES (?, ?, ?, datetime(\'now\'))').run(userId, sourceId, pos);
      try { updateReadingStats(db, userId); } catch (e) { }

      return res.json({ success: true, sourceId, position: pos });
    } catch (err) {
      console.error('Error in POST /api/user/reading-list', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Reorder pending list: expects { order: [sourceId, ...] }
  app.put('/api/user/reading-list/reorder', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const order = Array.isArray(req.body && req.body.order) ? req.body.order : null;
      if (!order) return res.status(400).json({ success: false, message: 'invalid_order' });

      // validate that all provided ids belong to the user's list
      const existing = db.prepare('SELECT source_id FROM user_reading_list WHERE user_id = ?').all(userId).map(r => r.source_id);
      const setExisting = new Set(existing);
      for (const s of order) if (!setExisting.has(s)) return res.status(400).json({ success: false, message: 'invalid_source_in_order' });

      // update positions
      const update = db.prepare('UPDATE user_reading_list SET position = ? WHERE user_id = ? AND source_id = ?');
      for (let i = 0; i < order.length; i++) {
        update.run(i + 1, userId, order[i]);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('Error in PUT /api/user/reading-list/reorder', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Remove from pending list
  app.delete('/api/user/reading-list/:sourceId', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      const sourceId = parseInt(req.params.sourceId, 10);
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      db.prepare('DELETE FROM user_reading_list WHERE user_id = ? AND source_id = ?').run(userId, sourceId);

      // resequence positions
      const rows = db.prepare('SELECT source_id FROM user_reading_list WHERE user_id = ? ORDER BY position ASC').all(userId);
      const update = db.prepare('UPDATE user_reading_list SET position = ? WHERE user_id = ? AND source_id = ?');
      for (let i = 0; i < rows.length; i++) update.run(i + 1, userId, rows[i].source_id);

      try { updateReadingStats(db, userId); } catch (e) { }
      return res.json({ success: true });
    } catch (err) {
      console.error('Error in DELETE /api/user/reading-list/:sourceId', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Add a read record (manual) — body: { sourceId, read_date (optional YYYY-MM or YYYY-MM-DD) }
  app.post('/api/user/reads', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      const sourceId = parseInt(req.body && (req.body.sourceId || req.body.source_id), 10);
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      const source = db.prepare('SELECT id FROM sources WHERE id = ? LIMIT 1').get(sourceId);
      if (!source) return res.status(404).json({ success: false, message: 'source_not_found' });

      const supplied = req.body && req.body.read_date ? req.body.read_date : null;
      const normalized = normalizeReadDate(supplied) || new Date().toISOString().slice(0, 10);

      const existingRead = db.prepare('SELECT id FROM user_readings WHERE user_id = ? AND source_id = ? AND status = ? LIMIT 1').get(userId, sourceId, 'read');
      if (existingRead && existingRead.id) {
        db.prepare('UPDATE user_readings SET read_date = ?, added_at = datetime(\'now\') WHERE id = ?').run(normalized, existingRead.id);
      } else {
        db.prepare('INSERT INTO user_readings (user_id, source_id, status, read_date, added_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(userId, sourceId, 'read', normalized);
      }

      // remove from pending list if present
      try { db.prepare('DELETE FROM user_reading_list WHERE user_id = ? AND source_id = ?').run(userId, sourceId); } catch (e) { }

      try { updateReadingStats(db, userId); } catch (e) { }

      return res.json({ success: true, sourceId, read_date: normalized });
    } catch (err) {
      console.error('Error in POST /api/user/reads', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Update read date
  app.put('/api/user/reads/:sourceId', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      const sourceId = parseInt(req.params.sourceId, 10);
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      const supplied = req.body && req.body.read_date ? req.body.read_date : null;
      const normalized = normalizeReadDate(supplied);
      if (!normalized) return res.status(400).json({ success: false, message: 'invalid_date' });

      const existingRead = db.prepare('SELECT id FROM user_readings WHERE user_id = ? AND source_id = ? AND status = ? LIMIT 1').get(userId, sourceId, 'read');
      if (!existingRead || !existingRead.id) return res.status(404).json({ success: false, message: 'read_not_found' });

      db.prepare('UPDATE user_readings SET read_date = ? WHERE id = ?').run(normalized, existingRead.id);
      try { updateReadingStats(db, userId); } catch (e) { }

      return res.json({ success: true, sourceId, read_date: normalized });
    } catch (err) {
      console.error('Error in PUT /api/user/reads/:sourceId', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Delete a read record
  app.delete('/api/user/reads/:sourceId', async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });
      const sourceId = parseInt(req.params.sourceId, 10);
      if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_source_id' });

      db.prepare('DELETE FROM user_readings WHERE user_id = ? AND source_id = ? AND status = ?').run(userId, sourceId, 'read');
      try { updateReadingStats(db, userId); } catch (e) { }
      return res.json({ success: true });
    } catch (err) {
      console.error('Error in DELETE /api/user/reads/:sourceId', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  async function generarPortadaLaTeX(fuenteId, metadata) {
    // Directorio temporal único (por si acaso, aunque el ID ya es único)
    const tempDir = path.join('/tmp', `portada_${fuenteId}_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const texPath = path.join(tempDir, 'portada.tex');
    const pdfPath = path.join(tempDir, 'portada.pdf');
    const pngPath = path.join(tempDir, 'portada.png');
    const logPath = path.join(tempDir, 'portada.build.log');

    // Ensure metadata shape
    const titulo = metadata && (metadata.titulo || metadata.title || '');
    const autoresArr = metadata && (metadata.autores || metadata.authors || []);
    const autores = Array.isArray(autoresArr) ? autoresArr : String(autoresArr || '').split(',').map(s => s.trim()).filter(Boolean);

    // Generar contenido LaTeX con garabatos por medio de la librería de lorem ipsum
    const contenidoLatex =
      `\\documentclass{article}
      \\usepackage{graphicx}
      \\usepackage{amssymb}
      \\usepackage{lipsum}
      \\begin{document}
      \\begin{center}
      {\\Huge \\textsf{${escapeLatex(titulo)}}}\\\\[1cm]
      {\\Large \\textsf{${escapeLatex(autores.join(', '))}}}\\\\[2cm]
      {\\small \\lipsum[1-5]}
      \\end{center}
      \\end{document}`;

    function escapeLatex(str) {
      return String(str || '')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/@/g, '\\@');
    }

    await fs.writeFile(texPath, contenidoLatex);
        
    // Helper to append build logs
    async function appendLog(prefix, content) {
      try {
        await fs.appendFile(logPath, `[${new Date().toISOString()}] ${prefix}\n`);
        await fs.appendFile(logPath, content + '\n\n');
      } catch (e) { /* ignore logging errors */ }
    }

    try {
      // Compile LaTeX (use cwd so auxiliary files are created in tempDir)
      const pdflatexCmd = `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${tempDir} ${texPath}`;
      let out = '', errOut = '';
      try {
        const { stdout, stderr } = await execPromise(pdflatexCmd, { cwd: tempDir, maxBuffer: 10 * 1024 * 1024 });
        out = stdout || '';
        errOut = stderr || '';
        await appendLog('pdflatex stdout', out);
        await appendLog('pdflatex stderr', errOut);
      } catch (pdflErr) {
        // Capture stdout/stderr from the error object when available
        out = (pdflErr.stdout) ? String(pdflErr.stdout) : out;
        errOut = (pdflErr.stderr) ? String(pdflErr.stderr) : errOut;
        await appendLog('pdflatex error', `${pdflErr.message}\nstdout:\n${out}\nstderr:\n${errOut}`);
        // Try to save .log if present
      }

      // Read LaTeX log file if exists and append it for diagnosis
      const texLogFile = path.join(tempDir, 'portada.log');
      try {
        const logContent = await fs.readFile(texLogFile, 'utf8');
        await appendLog('latex .log', logContent);
      } catch (e) {
        // log file might not exist if pdflatex failed early
      }

      // Check PDF existence
      let pdfExists = false;
      try {
        await fs.access(pdfPath);
        pdfExists = true;
      } catch (e) {
        pdfExists = false;
      }

      if (!pdfExists) {
        await appendLog('error', 'PDF was not generated. See previous logs.');
        throw new Error('pdflatex failed to produce PDF. Check log at ' + logPath);
      }

      // Convert PDF to PNG with ImageMagick (ensure 'convert' available in PATH)
      try {
        await execPromise(`convert -density 150 ${pdfPath} -quality 90 ${pngPath}`, { cwd: tempDir, maxBuffer: 20 * 1024 * 1024 });
      } catch (convErr) {
        await appendLog('convert error', String(convErr));
        throw new Error('ImageMagick convert failed. ' + (convErr.message || ''));
      }

      // If the expected pngPath does not exist (convert may have emitted other names for multi-page PDFs),
      // search for any PNG files in the tempDir and pick the first one.
      let actualPngPath = pngPath;
      try {
        await fs.access(actualPngPath);
      } catch (e) {
        // not found, search for alternatives
        const entries = await fs.readdir(tempDir);
        const pngFiles = entries.filter(n => n.toLowerCase().endsWith('.png'));
        await appendLog('convert lookup', `Expected ${pngPath} not found. PNG candidates: ${pngFiles.join(', ')}`);
        if (pngFiles.length === 0) {
          throw new Error('No PNG files found after convert. Temp dir contents: ' + entries.join(', '));
        }
        // prefer exact 'portada.png' if present
        const prefer = pngFiles.find(n => n === path.basename(pngPath)) || pngFiles[0];
        actualPngPath = path.join(tempDir, prefer);
      }

      // Mover a ubicación definitiva (public/portadas/)
      const destDir = path.join(__dirname, '..', '..', 'public', 'portadas');
      await fs.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, `fuente_${fuenteId}.png`);
      try {
        await fs.rename(actualPngPath, destPath);
      } catch (moveErr) {
        // EXDEV means cross-device rename not permitted (tmp on different FS). Fall back to copy + unlink.
        if (moveErr && moveErr.code === 'EXDEV') {
          try {
            await fs.copyFile(actualPngPath, destPath);
            await fs.unlink(actualPngPath);
          } catch (copyErr) {
            // rethrow original move error if copy also fails
            throw copyErr || moveErr;
          }
        } else {
          throw moveErr;
        }
      }

      // Guardar ruta en BD (use existing db connection from module scope via getDb if available)
      try {
        const db = await getDb(); // if you have this helper; otherwise use app db connection strategy
        await db.run(
          'INSERT INTO portadas (fuente_id, ruta_imagen) VALUES (?, ?)',
          [fuenteId, `/portadas/fuente_${fuenteId}.png`]
        );
      } catch (e) {
        // If DB helper not available, just log the path for manual inspection
        await appendLog('db save warning', `Could not save portada record to DB: ${e.message}`);
      }

      // Limpiar temporales
      await fs.rm(tempDir, { recursive: true, force: true });

      console.log(`Portada generada para fuente ${fuenteId}`);
    } catch (error) {
      // Keep the build log for inspection
      try {
        const finalLogDest = path.join(__dirname, '..', '..', 'public', 'portadas', `portada_${fuenteId}.build.log`);
        await fs.mkdir(path.dirname(finalLogDest), { recursive: true });
        // copy temp log if exists
        try { await fs.copyFile(logPath, finalLogDest); } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }

      // Limpieza del temporario
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  // Función auxiliar para ofuscar texto
  function crearGarabato(texto) {
    // Reemplazar caracteres por símbolos aleatorios no legibles
    // Return raw symbols (no backslashes) and let escapeLatex handle escaping
    return texto.split('').map(() => {
      const aleatorio = Math.floor(Math.random() * 3);
      if (aleatorio === 0) return '?';
      if (aleatorio === 1) return '#';
      return '@';
    }).join('');
  }
};

// Función para indexar una fuente
function indexSourceInPython(sourceId, title, authors, keywords) {
  return new Promise((resolve, reject) => {
    try {
      const args = ['tf-idf/index_source.py', String(sourceId), String(title || ''), String(authors || ''), String(keywords || '')];
      const py = spawn('python3', args, { cwd: process.cwd() });

      let output = '';
      let errOutput = '';

      py.stdout.on('data', (data) => { output += data.toString(); });
      py.stderr.on('data', (data) => { errOutput += data.toString(); });

      py.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = output ? JSON.parse(output) : { status: 'ok' };
            resolve(parsed);
          } catch (e) {
            // If output is not JSON, still resolve with raw output
            resolve({ status: 'ok', raw: output });
          }
        } else {
          const err = new Error(`Python exited with code ${code}: ${errOutput}`);
          reject(err);
        }
      });

      py.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}
