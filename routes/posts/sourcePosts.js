const path = require('path');
const { sanitizeText } = require('../../middlewares/sanitize');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const util = require('util');
const execPromise = util.promisify(exec);

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

module.exports = function (app) {
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
