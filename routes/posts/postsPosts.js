const path = require('path');
const fs = require('fs');
const { sanitizeText } = require('../../middlewares/sanitize');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

module.exports = function (app) {
  // Endpoint to receive upload metadata (JSON). Expects authenticated & validated user.
  app.post('/upload', soloValidado, async (req, res) => {
    try {
      const db = req.db;
      const userId = req.session && req.session.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

      // Accept JSON body with fields from upload form
      const body = req.body || {};

      const title = sanitizeText(body.title || '');
      const authorsInput = body.authors || []; // array of strings or comma-separated
      const year = parseInt(body.year, 10) || null;
      const sourceType = sanitizeText(body.sourceType || '');
      const primaryUrl = sanitizeText(body.primary_url || body.primaryUrl || '');
      const categoryId = parseInt(body.category_id || body.categoryId || body.category, 10) || null;
      const subcategoryId = parseInt(body.subcategory_id || body.subcategoryId || body.subcategory, 10) || null;
      const publisher = sanitizeText(body.publisher || '');
      const edition = body.edition ? parseInt(body.edition, 10) : null;
      const pages = sanitizeText(body.pages || '');
      const doi = sanitizeText(body.doi || '');
      const keywords = Array.isArray(body.keywords) ? body.keywords.map(k => sanitizeText(k)) : sanitizeText(body.keywords || '').split(',').map(s=>s.trim()).filter(Boolean);

      // Basic validations
      if (!title) return res.status(400).json({ success: false, message: 'title_required' });
      if (!Array.isArray(authorsInput) && typeof authorsInput !== 'string') return res.status(400).json({ success: false, message: 'authors_required' });
      const authors = Array.isArray(authorsInput) ? authorsInput : String(authorsInput).split(',').map(s => s.trim()).filter(Boolean);
      if (authors.length === 0) return res.status(400).json({ success: false, message: 'at_least_one_author' });
      if (!year) return res.status(400).json({ success: false, message: 'year_required' });
      if (!sourceType) return res.status(400).json({ success: false, message: 'type_required' });
      if (!primaryUrl) return res.status(400).json({ success: false, message: 'primary_url_required' });
      if (!categoryId || !subcategoryId) return res.status(400).json({ success: false, message: 'category_and_subcategory_required' });

      // Duplicate checks: primary URL, DOI, title+year
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
        // ignore and continue to insert
        if (debugging) console.warn('Error during duplicate checks', e.message);
      }

      // Insert source
      const insertSource = db.prepare(`
        INSERT INTO sources (title, publication_year, journal_publisher, volume, issue_number, pages, edition, source_type_id, doi, keywords, primary_url, category_id, subcategory_id, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT id FROM source_types WHERE name = ? LIMIT 1), ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      // Proceed with insertion

      const keywordsText = keywords.length ? keywords.join(',') : null;

      const result = insertSource.run(
        title,
        year,
        publisher || null,
        body.volume || null,
        body.number || null,
        pages || null,
        edition,
        sourceType,
        doi || null,
        keywordsText,
        primaryUrl,
        categoryId,
        subcategoryId,
        userId
      );

      const sourceId = result.lastInsertRowid;

      if (debugging) console.log('Inserted new source', sourceId);

      // Ensure authors exist and link them (preserve order)
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

      // Debug: revisar autores recibidos
      if (debugging) {
        console.log('Authors received for upload:', authors);
      }

      // Store primary URL in source_urls
      try {
        const insertUrl = db.prepare('INSERT OR IGNORE INTO source_urls (source_id, url, url_type) VALUES (?, ?, ?)');
        insertUrl.run(sourceId, primaryUrl, 'primary');
      } catch (e) { /* ignore */ }

      // Debug: revisar autores después de sanitizar
       if (debugging) {
        console.log('Authors after sanitization:', authors.map(a => sanitizeText(a)));
      }

      // Generate a simple SVG placeholder cover and save it under public/uploads/covers
      try {
        const coversDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'covers');
        fs.mkdirSync(coversDir, { recursive: true });
        const coverName = `${Date.now()}_${sourceId}.svg`;
        const coverPath = path.join(coversDir, coverName);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#f5f5f5"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-size="28" fill="#333">${escapeXml(title)}</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#666">${escapeXml((authors || []).slice(0,3).join(', '))}</text></svg>`;
        fs.writeFileSync(coverPath, svg, { mode: 0o644 });
        const coverUrl = `/uploads/covers/${coverName}`;
        db.prepare('UPDATE sources SET cover_image_url = ? WHERE id = ?').run(coverUrl, sourceId);
      } catch (e) {
        console.warn('Could not generate cover placeholder', e.message);
      }

      // Debug: revisar resultado final del upload
        if (debugging) {
            const insertedSource = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId);
            console.log('Inserted Source Record:', insertedSource);
        }

      return res.json({ success: true, sourceId });
    } catch (err) {
      console.error('Error in POST /upload', err);
      return res.status(500).json({ success: false, message: 'internal_error' });
    }
  });

  // Helper to escape minimal XML for SVG
  function escapeXml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
};
