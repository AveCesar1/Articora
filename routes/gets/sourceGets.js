const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const { spawn } = require('child_process');

//Alias de middlewares
const soloValidado = checkRoles(['validado', 'admin']);
module.exports = function (app) {

    //////////////////
    //   SOURCES    //
    //////////////////

    // Búsqueda de fuentes (fetch dinámico desde DB)
    app.get('/search', async (req, res) => {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const perPage = 10;

        const db = req.db;

        // Read filters from querystring (keeps compatibility with template)
        const selectedSourceType = req.query.sourceType || req.query.type || null; // e.g. 'book' (accept alias 'type')
        const selectedSort = req.query.sort || req.query.sortBy || null;

        // Support multiple categories/subcategories passed as CSV or repeated params
        const selectedCategories = (() => {
            if (!req.query.category) return [];
            if (Array.isArray(req.query.category)) return req.query.category.map(Number).filter(Boolean);
            return String(req.query.category).split(',').map(s => Number(s)).filter(Boolean);
        })();

        const selectedSubcategories = (() => {
            if (!req.query.subcategory) return [];
            if (Array.isArray(req.query.subcategory)) return req.query.subcategory.map(Number).filter(Boolean);
            return String(req.query.subcategory).split(',').map(s => Number(s)).filter(Boolean);
        })();

        const yearFromParam = req.query.yearFrom ? Number(req.query.yearFrom) : null;
        const yearToParam = req.query.yearTo ? Number(req.query.yearTo) : null;
        const ratingMin = (typeof req.query.ratingMin !== 'undefined') ? Number(req.query.ratingMin) : null;
        const ratingMax = (typeof req.query.ratingMax !== 'undefined') ? Number(req.query.ratingMax) : null;
        const academicAdjustmentFlag = (req.query.academicAdjustment === '1' || req.query.academicAdjustment === 'true' || req.query.academicAdjustment === 'on');

        // Build filters object compatible with the EJS template (arrays for categories/subcategories)
        const filters = {
            sourceType: selectedSourceType || 'book',
            type: selectedSourceType || 'book',
            categories: selectedCategories,
            subcategories: selectedSubcategories,
            sort: selectedSort || '',
            sortBy: selectedSort || '',
            academicAdjustment: academicAdjustmentFlag,
            yearFrom: yearFromParam,
            yearTo: yearToParam,
            ratingMin: ratingMin,
            ratingMax: ratingMax
        };

        const categoryColorMap = req.app.locals.categoryColorMap || {};


        // Fetch categories and their subcategories from DB
        const categoryRows = db.prepare('SELECT id, name FROM categories ORDER BY id').all();
        const categories = categoryRows.map(cat => {
            const subcatRows = db.prepare('SELECT id, name FROM subcategories WHERE category_id = ? ORDER BY id').all(cat.id);
            return {
                id: cat.id,
                name: cat.name,
                color: categoryColorMap[cat.name] || '#6c757d',
                subcategories: subcatRows.map(sc => ({ id: sc.id, name: sc.name }))
            };
        });

        // Build quick lookup maps for categories/subcategories
        const categoryMap = new Map();
        categories.forEach(c => categoryMap.set(c.id, { name: c.name, color: c.color }));
        const subcategoryMap = new Map();
        categories.forEach(c => c.subcategories.forEach(sc => subcategoryMap.set(sc.id, sc.name)));

        // Rating criteria: keep as static list (not stored in DB currently)
        const ratingCriteria = [
            { id: 'extension', name: 'Extensión de lectura' },
            { id: 'completeness', name: 'Completitud' },
            { id: 'detail', name: 'Nivel de detalle' },
            { id: 'veracity', name: 'Veracidad' },
            { id: 'difficulty', name: 'Dificultad técnica' }
        ];

        // Load source types from DB
        const sourceTypeRows = db.prepare('SELECT id, name FROM source_types ORDER BY id').all();
        const sourceTypes = sourceTypeRows.map(st => ({ value: String(st.name).toLowerCase(), label: st.name }));

        try {
            // Resolve selected source type id (if any)
            let sourceTypeId = null;
            if (selectedSourceType) {
                const stRow = db.prepare('SELECT id FROM source_types WHERE LOWER(name) = LOWER(?) LIMIT 1').get(selectedSourceType);
                if (stRow) sourceTypeId = stRow.id;
            }

            let results = [];
            let totalResults = 0;

            if (!query || query.trim().length === 0) {
                // No query: return recent sources optionally filtered by type/category/subcategory/year/rating
                const whereParts = [];
                const params = [];
                if (sourceTypeId) { whereParts.push('s.source_type_id = ?'); params.push(sourceTypeId); }
                if (selectedCategories.length) { whereParts.push(`s.category_id IN (${selectedCategories.map(() => '?').join(',')})`); params.push(...selectedCategories); }
                if (selectedSubcategories.length) { whereParts.push(`s.subcategory_id IN (${selectedSubcategories.map(() => '?').join(',')})`); params.push(...selectedSubcategories); }
                if (yearFromParam) { whereParts.push('s.publication_year >= ?'); params.push(yearFromParam); }
                if (yearToParam) { whereParts.push('s.publication_year <= ?'); params.push(yearToParam); }
                if (ratingMin !== null) { whereParts.push('s.overall_rating >= ?'); params.push(ratingMin); }
                if (ratingMax !== null) { whereParts.push('s.overall_rating <= ?'); params.push(ratingMax); }

                const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

                let orderClause = 'ORDER BY s.created_at DESC';
                if (selectedSort) {
                    if (selectedSort === 'rating') orderClause = 'ORDER BY s.overall_rating DESC';
                    else if (selectedSort === 'recent') orderClause = 'ORDER BY s.created_at DESC';
                    else if (selectedSort === 'popular') orderClause = 'ORDER BY s.total_reads DESC';
                    else if (selectedSort === 'difficulty') orderClause = 'ORDER BY s.avg_technical_difficulty DESC';
                }

                const rows = db.prepare(`SELECT s.id, s.title, s.publication_year AS year, s.doi, s.keywords, st.name AS type, s.pages, s.primary_url, s.cover_image_url, s.category_id, s.subcategory_id, s.uploaded_by, s.created_at, s.overall_rating, s.total_ratings, s.total_reads, s.avg_technical_difficulty FROM sources s LEFT JOIN source_types st ON s.source_type_id = st.id ${whereClause} ${orderClause} LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);

                const countRow = db.prepare(`SELECT COUNT(1) as c FROM sources s ${whereClause}`).get(...params);
                totalResults = countRow ? (countRow.c || 0) : 0;

                // attach authors, normalize keywords and populate metadata
                results = rows.map(r => {
                    const authorsRows = db.prepare('SELECT a.full_name FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ? ORDER BY sa.sort_order').all(r.id);
                    const authors = authorsRows.map(a => a.full_name);
                    const keywords = r.keywords ? String(r.keywords).split(',').map(k => k.trim()).filter(Boolean) : [];

                    // attach uploader info if available
                    let uploader = { id: null, name: 'Usuario' };
                    try {
                        if (r.uploaded_by) {
                            const u = db.prepare('SELECT id, username, full_name FROM users WHERE id = ? LIMIT 1').get(r.uploaded_by);
                            if (u) uploader = { id: u.id, name: u.full_name || u.username || 'Usuario' };
                        }
                    } catch (e) { uploader = { id: null, name: 'Usuario' }; }

                    const pagesDisplay = r.pages ? r.pages : 'Completo';
                    const ratingAvg = (typeof r.overall_rating !== 'undefined' && r.overall_rating !== null) ? r.overall_rating : 0;
                    const ratingCount = r.total_ratings || 0;
                    const cat = categoryMap.get(r.category_id) || { name: '', color: categoryColorMap[''] || '#6c757d' };
                    const subcatName = subcategoryMap.get(r.subcategory_id) || '';

                    return {
                        id: r.id,
                        title: r.title,
                        authors,
                        year: r.year,
                        type: r.type || 'Book',
                        pages: pagesDisplay,
                        doi: r.doi,
                        keywords,
                        excerpt: '',
                        rating: { average: ratingAvg, count: ratingCount, criteria: [], avgDifficulty: r.avg_technical_difficulty || 0 },
                        category: { id: r.category_id, name: cat.name, color: cat.color },
                        subcategory: { id: r.subcategory_id, name: subcatName },
                        stats: { views: (typeof r.total_reads !== 'undefined' && r.total_reads !== null && r.total_reads > 0) ? r.total_reads : 'N/A', bookmarks: 'N/A' },
                        uploadDate: r.created_at || null,
                        uploader: uploader,
                    };
                });
            } else {
                // Call Python TF-IDF search
                let pyResults = [];
                try {
                    pyResults = await searchWithPython(query);
                } catch (e) {
                    console.error('Error calling TF-IDF search.py:', e);
                    pyResults = [];
                }

                // pyResults expected to be [{source_id: <int>, score: <float>}, ...]
                if (Array.isArray(pyResults) && pyResults.length > 0) {
                    // Filter only those that match optional filters
                    const ids = pyResults.map(r => r.source_id).filter(Boolean);
                    if (ids.length > 0) {
                        const placeholders = ids.map(() => '?').join(',');
                        const whereParts = [`s.id IN (${placeholders})`];
                        const params = [...ids];
                        if (sourceTypeId) { whereParts.push('s.source_type_id = ?'); params.push(sourceTypeId); }
                        if (selectedCategories.length) { whereParts.push(`s.category_id IN (${selectedCategories.map(() => '?').join(',')})`); params.push(...selectedCategories); }
                        if (selectedSubcategories.length) { whereParts.push(`s.subcategory_id IN (${selectedSubcategories.map(() => '?').join(',')})`); params.push(...selectedSubcategories); }
                        if (yearFromParam) { whereParts.push('s.publication_year >= ?'); params.push(yearFromParam); }
                        if (yearToParam) { whereParts.push('s.publication_year <= ?'); params.push(yearToParam); }
                        if (ratingMin !== null) { whereParts.push('s.overall_rating >= ?'); params.push(ratingMin); }
                        if (ratingMax !== null) { whereParts.push('s.overall_rating <= ?'); params.push(ratingMax); }

                        const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

                        const rows = db.prepare(`SELECT s.id, s.title, s.publication_year AS year, s.doi, s.keywords, st.name AS type, s.pages, s.primary_url, s.cover_image_url, s.category_id, s.subcategory_id, s.uploaded_by, s.created_at, s.overall_rating, s.total_ratings, s.total_reads, s.avg_technical_difficulty FROM sources s LEFT JOIN source_types st ON s.source_type_id = st.id ${whereClause}`).all(...params);

                        // Map rows by id
                        const rowMap = new Map();
                        rows.forEach(r => rowMap.set(r.id, r));

                        // Build results in the order of pyResults and attach authors/keywords
                        const ordered = [];
                        for (const item of pyResults) {
                            const rid = item.source_id;
                            const row = rowMap.get(rid);
                            if (!row) continue; // skip filtered-out or missing
                            const authorsRows = db.prepare('SELECT a.full_name FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ? ORDER BY sa.sort_order').all(row.id);
                            const authors = authorsRows.map(a => a.full_name);
                            const keywords = row.keywords ? String(row.keywords).split(',').map(k => k.trim()).filter(Boolean) : [];

                            // uploader info
                            let uploader = { id: null, name: 'Usuario' };
                            try {
                                if (row.uploaded_by) {
                                    const u = db.prepare('SELECT id, username, full_name FROM users WHERE id = ? LIMIT 1').get(row.uploaded_by);
                                    if (u) uploader = { id: u.id, name: u.full_name || u.username || 'Usuario' };
                                }
                            } catch (e) { uploader = { id: null, name: 'Usuario' }; }

                            const pagesDisplay = row.pages ? row.pages : 'Completo';
                            const ratingAvg = (typeof row.overall_rating !== 'undefined' && row.overall_rating !== null) ? row.overall_rating : 0;
                            const ratingCount = row.total_ratings || 0;
                            const cat = categoryMap.get(row.category_id) || { name: '', color: categoryColorMap[''] || '#6c757d' };
                            const subcatName = subcategoryMap.get(row.subcategory_id) || '';

                            ordered.push({
                                id: row.id,
                                title: row.title,
                                authors,
                                year: row.year,
                                type: row.type || 'Book',
                                pages: pagesDisplay,
                                doi: row.doi,
                                keywords,
                                excerpt: '',
                                rating: { average: ratingAvg, count: ratingCount, criteria: [], avgDifficulty: row.avg_technical_difficulty || 0 },
                                category: { id: row.category_id, name: cat.name, color: cat.color },
                                subcategory: { id: row.subcategory_id, name: subcatName },
                                stats: { views: (typeof row.total_reads !== 'undefined' && row.total_reads !== null && row.total_reads > 0) ? row.total_reads : 'N/A', bookmarks: 'N/A' },
                                uploadDate: row.created_at || null,
                                uploader: uploader,
                                score: item.score
                            });
                        }

                        // Apply alternative sorting if requested (TF-IDF order preserved by default)
                        if (selectedSort) {
                            if (selectedSort === 'rating') ordered.sort((a,b) => (b.rating.average || 0) - (a.rating.average || 0));
                            else if (selectedSort === 'recent') ordered.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                            else if (selectedSort === 'popular') ordered.sort((a,b) => ( (b.stats.views === 'N/A' ? 0 : b.stats.views) - (a.stats.views === 'N/A' ? 0 : a.stats.views) ));
                            else if (selectedSort === 'difficulty') ordered.sort((a,b) => ( (b.rating.avgDifficulty || 0) - (a.rating.avgDifficulty || 0) ));
                        }

                        totalResults = ordered.length;
                        // simple pagination on ordered results
                        results = ordered.slice((page - 1) * perPage, page * perPage);
                    }
                }
            }

            res.render('search', {
                title: query ? `"${query}" - Búsqueda - Artícora` : 'Búsqueda - Artícora',
                currentPage: 'search',
                cssFile: 'search.css',
                jsFile: 'search.js',
                query: query,
                filters: filters,
                categories: categories,
                ratingCriteria: ratingCriteria,
                sourceTypes: sourceTypes,
                results: results,
                pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalResults / perPage)), totalResults: totalResults }
            });
        } catch (err) {
            console.error('Error in /search handler:', err);
            res.status(500).send('Internal server error');
        }
    });

    // API: Return sources as JSON for list modal (supports search, filters and excluding an existing list)
    app.get('/api/listsources', async (req, res) => {
        try {
            const query = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 10;
            const db = req.db;

            const selectedSourceType = req.query.sourceType || req.query.type || null;
            const selectedCategory = req.query.category ? Number(req.query.category) : null;
            const selectedSubcategory = req.query.subcategory ? Number(req.query.subcategory) : null;
            const excludeListId = req.query.exclude_list_id ? Number(req.query.exclude_list_id) : null;

            // resolve source type id if passed as name
            let sourceTypeId = null;
            if (selectedSourceType) {
                const stRow = db.prepare('SELECT id FROM source_types WHERE LOWER(name) = LOWER(?) LIMIT 1').get(selectedSourceType);
                if (stRow) sourceTypeId = stRow.id;
            }

            let results = [];
            let totalResults = 0;

            if (!query || query.trim().length === 0) {
                const whereParts = [];
                const params = [];
                if (sourceTypeId) { whereParts.push('s.source_type_id = ?'); params.push(sourceTypeId); }
                if (selectedCategory) { whereParts.push('s.category_id = ?'); params.push(selectedCategory); }
                if (selectedSubcategory) { whereParts.push('s.subcategory_id = ?'); params.push(selectedSubcategory); }
                if (excludeListId) { whereParts.push(`s.id NOT IN (SELECT source_id FROM list_sources WHERE list_id = ?)`); params.push(excludeListId); }

                const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

                const rows = db.prepare(`SELECT s.id, s.title, s.publication_year AS year, s.doi, s.keywords, st.name AS type, s.pages, s.primary_url, s.cover_image_url, s.category_id, s.subcategory_id, s.uploaded_by, s.created_at FROM sources s LEFT JOIN source_types st ON s.source_type_id = st.id ${whereClause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`).all(...params, perPage, (page - 1) * perPage);

                const countRow = db.prepare(`SELECT COUNT(1) as c FROM sources s ${whereClause}`).get(...params);
                totalResults = countRow ? (countRow.c || 0) : 0;

                results = rows.map(r => {
                    const authorsRows = db.prepare('SELECT a.full_name FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ? ORDER BY sa.sort_order').all(r.id);
                    const authors = authorsRows.map(a => a.full_name);
                    const keywords = r.keywords ? String(r.keywords).split(',').map(k => k.trim()).filter(Boolean) : [];

                    let uploader = { id: null, name: 'Usuario' };
                    try {
                        if (r.uploaded_by) {
                            const u = db.prepare('SELECT id, username, full_name FROM users WHERE id = ? LIMIT 1').get(r.uploaded_by);
                            if (u) uploader = { id: u.id, name: u.full_name || u.username || 'Usuario' };
                        }
                    } catch (e) { uploader = { id: null, name: 'Usuario' }; }

                    return {
                        id: r.id,
                        title: r.title,
                        authors,
                        year: r.year,
                        type: r.type || 'Book',
                        pages: r.pages,
                        doi: r.doi,
                        keywords,
                        uploadDate: r.created_at || null,
                        uploader,
                        cover: r.cover_image_url || null
                    };
                });
            } else {
                let pyResults = [];
                try { pyResults = await searchWithPython(query); } catch (e) { console.error('TF-IDF error', e); pyResults = []; }

                if (Array.isArray(pyResults) && pyResults.length > 0) {
                    const ids = pyResults.map(r => r.source_id).filter(Boolean);
                    if (ids.length > 0) {
                        const placeholders = ids.map(() => '?').join(',');
                        const whereParts = [`s.id IN (${placeholders})`];
                        const params = [...ids];
                        if (sourceTypeId) { whereParts.push('s.source_type_id = ?'); params.push(sourceTypeId); }
                        if (selectedCategory) { whereParts.push('s.category_id = ?'); params.push(selectedCategory); }
                        if (selectedSubcategory) { whereParts.push('s.subcategory_id = ?'); params.push(selectedSubcategory); }
                        if (excludeListId) { whereParts.push(`s.id NOT IN (SELECT source_id FROM list_sources WHERE list_id = ?)`); params.push(excludeListId); }

                        const whereClause = `WHERE ${whereParts.join(' AND ')}`;

                        const rows = db.prepare(`SELECT s.id, s.title, s.publication_year AS year, s.doi, s.keywords, st.name AS type, s.pages, s.primary_url, s.cover_image_url, s.category_id, s.subcategory_id, s.uploaded_by, s.created_at FROM sources s LEFT JOIN source_types st ON s.source_type_id = st.id ${whereClause}`).all(...params);

                        const rowMap = new Map();
                        rows.forEach(r => rowMap.set(r.id, r));

                        const ordered = [];
                        for (const item of pyResults) {
                            const rid = item.source_id;
                            const row = rowMap.get(rid);
                            if (!row) continue;
                            const authorsRows = db.prepare('SELECT a.full_name FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ? ORDER BY sa.sort_order').all(row.id);
                            const authors = authorsRows.map(a => a.full_name);
                            const keywords = row.keywords ? String(row.keywords).split(',').map(k => k.trim()).filter(Boolean) : [];

                            let uploader = { id: null, name: 'Usuario' };
                            try {
                                if (row.uploaded_by) {
                                    const u = db.prepare('SELECT id, username, full_name FROM users WHERE id = ? LIMIT 1').get(row.uploaded_by);
                                    if (u) uploader = { id: u.id, name: u.full_name || u.username || 'Usuario' };
                                }
                            } catch (e) { uploader = { id: null, name: 'Usuario' }; }

                            ordered.push({
                                id: row.id,
                                title: row.title,
                                authors,
                                year: row.year,
                                type: row.type || 'Book',
                                pages: row.pages,
                                doi: row.doi,
                                keywords,
                                uploadDate: row.created_at || null,
                                uploader,
                                cover: row.cover_image_url || null,
                                score: item.score
                            });
                        }

                        totalResults = ordered.length;
                        results = ordered.slice((page - 1) * perPage, page * perPage);
                    }
                }
            }

            return res.json({ success: true, results, pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalResults / perPage)), totalResults } });
        } catch (err) {
            console.error('Error in GET /api/listsources', err);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
    
    // Detalle de fuente (fetch dinámico por id desde DB)
    app.get('/post/:id', (req, res) => {
        const postId = parseInt(req.params.id, 10);
        const db = req.db;

        if (Number.isNaN(postId)) return res.status(400).send('Invalid id');

        try {
            const row = db.prepare(`SELECT s.id, s.title, s.publication_year AS year, s.journal_publisher AS publisher, s.pages, s.doi, s.keywords, st.name AS type, s.primary_url AS url, s.cover_image_url AS coverImage, s.category_id, s.subcategory_id, s.uploaded_by, s.created_at, s.volume, s.edition FROM sources s LEFT JOIN source_types st ON s.source_type_id = st.id WHERE s.id = ? LIMIT 1`).get(postId);

            if (!row) {
                return res.status(404).render('404', { title: 'Fuente no encontrada - Artícora', currentPage: 'post' });
            }

            const authorsRows = db.prepare('SELECT a.full_name FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ? ORDER BY sa.sort_order').all(postId);
            const authors = authorsRows.map(a => a.full_name);
            const keywords = row.keywords ? String(row.keywords).split(',').map(k => k.trim()).filter(Boolean) : [];

            // uploader
            let uploader = 'Usuario';
            try {
                if (row.uploaded_by) {
                    const u = db.prepare('SELECT id, username, full_name FROM users WHERE id = ? LIMIT 1').get(row.uploaded_by);
                    if (u) uploader = u.full_name || u.username || 'Usuario';
                }
            } catch (e) { uploader = 'Usuario'; }

                const post = {
                id: row.id,
                title: row.title,
                authors: authors,
                year: row.year,
                type: row.type || 'Libro',
                journal: null,
                publisher: row.publisher || null,
                volume: row.volume || null,
                edition: row.edition || null,
                pages: row.pages || null,
                doi: row.doi || null,
                keywords: keywords,
                category: { id: row.category_id },
                subcategory: row.subcategory_id ? String(row.subcategory_id) : null,
                rating: { average: 0, count: 0, criteria: [] },
                stats: {},
                uploadedBy: uploader,
                uploadedById: row.uploaded_by || null,
                uploadDate: row.created_at || null,
                language: null,
                license: null,
                url: row.url || null,
                coverImage: row.coverImage || `/portadas/fuente_${row.id}.png`
            };

            // Load comments from ratings table (ratings that include a non-empty comment)
            let commentRows = [];
            try {
                commentRows = db.prepare(`
                    SELECT r.id, r.user_id, r.comment, r.readability, r.completeness, r.detail_level, r.veracity, r.technical_difficulty, r.academic_context, r.created_at, u.username, u.full_name, u.profile_picture, u.is_validated, u.academic_level as user_academic_level
                    FROM ratings r
                    LEFT JOIN users u ON r.user_id = u.id
                    WHERE r.source_id = ? AND r.comment IS NOT NULL AND TRIM(r.comment) != ''
                    ORDER BY r.created_at DESC
                `).all(postId);
            } catch (e) {
                console.error('Error loading comments for source', postId, e);
                commentRows = [];
            }

            const comments = commentRows.map(r => {
                const avg = ((r.readability || 0) + (r.completeness || 0) + (r.detail_level || 0) + (r.veracity || 0) + (r.technical_difficulty || 0)) / 5;
                const ratingRounded = parseFloat((avg || 0).toFixed(1));
                const avatar = r.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.full_name || r.username)}&background=6c757d&color=fff`;
                const userDisplay = r.full_name || r.username || 'Usuario';
                // Show only date (YYYY-MM-DD)
                const date = r.created_at ? String(r.created_at).split(' ')[0] : '';
                // Determine academic display: prefer snapshot in rating (r.academic_context), otherwise derive from user.
                // If the user is not validated, ensure the display marks it as not verified.
                let academic = '';
                if (r.academic_context && String(r.academic_context).trim().length > 0) {
                    academic = String(r.academic_context);
                    if (!r.is_validated && !academic.includes('(no verificado)')) academic = academic + ' (no verificado)';
                } else if (r.user_academic_level) {
                    academic = String(r.user_academic_level) + (r.is_validated ? '' : ' (no verificado)');
                } else {
                    academic = r.is_validated ? 'Sin grado' : 'Sin grado (no verificado)';
                }

                return {
                    id: r.id,
                    user_id: r.user_id,
                    user: userDisplay,
                    avatar: avatar,
                    date: date,
                    rating: ratingRounded,
                    academic: academic,
                    text: r.comment
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                };
            });

            const relatedSources = [];

            // citation formats minimal (can be expanded)
            const citationFormats = {
                apa: `${post.authors.join(', ')} (${post.year}). ${post.title}.`,
                chicago: `${post.authors.join(', ')}. ${post.year}. ${post.title}.`,
                bibtex: `@book{source${post.id}, title={${post.title}}, author={${post.authors.join(' and ')}}, year={${post.year}} }`
            };

            res.render('post', {
                title: `${post.title} - Artícora`,
                currentPage: 'post',
                cssFile: 'post.css',
                jsFile: 'post.js',
                post,
                comments,
                relatedSources,
                citationFormats,
                currentUserId: req.session && req.session.userId ? req.session.userId : (res.locals.user && res.locals.user.id ? res.locals.user.id : null)
            });
        } catch (err) {
            console.error('Error fetching post by id:', err);
            res.status(500).send('Internal server error');
        }
    });

    // Redirect /source/:id to existing /post/:id for compatibility
    app.get('/source/:id', (req, res) => {
        const id = req.params.id;
        return res.redirect(302, `/post/${id}`);
    });

    // API: search validated users by username or full_name (for collaborator invites)
    app.get('/api/users/search', IsRegistered, (req, res) => {
        try {
            const q = (req.query.q || '').trim();
            if (!q || q.length < 3) return res.json({ success: true, results: [] });
            const db = req.db;
            const like = `%${q}%`;
            const rows = db.prepare("SELECT id, username, full_name FROM users WHERE is_validated = 1 AND (username LIKE ? OR full_name LIKE ?) ORDER BY username LIMIT 20").all(like, like);
            const results = rows.map(r => ({ id: r.id, username: r.username, full_name: r.full_name, name: r.full_name || r.username }));
            return res.json({ success: true, results });
        } catch (err) {
            console.error('Error in GET /api/users/search', err);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // API: get aggregated ratings and (optionally) the current user's rating for a source
    app.get('/api/sources/:id/ratings', (req, res) => {
        try {
            const db = req.db;
            const sourceId = parseInt(req.params.id, 10);
            if (Number.isNaN(sourceId)) return res.status(400).json({ success: false, message: 'invalid_id' });

            const agg = db.prepare(`SELECT COUNT(1) as cnt, AVG(readability) AS avg_readability, AVG(completeness) AS avg_completeness, AVG(detail_level) AS avg_detail_level, AVG(veracity) AS avg_veracity, AVG(technical_difficulty) AS avg_technical_difficulty FROM ratings WHERE source_id = ?`).get(sourceId);
            const total = agg ? (agg.cnt || 0) : 0;
            const avgRead = parseFloat(((agg && agg.avg_readability) || 0).toFixed(2));
            const avgComp = parseFloat(((agg && agg.avg_completeness) || 0).toFixed(2));
            const avgDetail = parseFloat(((agg && agg.avg_detail_level) || 0).toFixed(2));
            const avgVer = parseFloat(((agg && agg.avg_veracity) || 0).toFixed(2));
            const avgTech = parseFloat(((agg && agg.avg_technical_difficulty) || 0).toFixed(2));
            const overall = total ? parseFloat(((avgRead + avgComp + avgDetail + avgVer + avgTech) / 5).toFixed(2)) : 0;

            let userRating = null;
            const userId = req.session && req.session.userId;
            if (userId) {
                userRating = db.prepare('SELECT id, readability, completeness, detail_level, veracity, technical_difficulty, comment, academic_context, version, created_at FROM ratings WHERE source_id = ? AND user_id = ? LIMIT 1').get(sourceId, userId) || null;
            }

            return res.json({ success: true, has_ratings: total > 0, total, averages: { readability: avgRead, completeness: avgComp, detail_level: avgDetail, veracity: avgVer, technical_difficulty: avgTech }, overall, userRating });
        } catch (err) {
            console.error('Error in GET /api/sources/:id/ratings', err);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });
    
    // Subir fuente (carga dinámica de categorías, subcategorías y tipos de fuente desde DB)
    app.get('/upload', soloValidado, (req, res) => {
        const db = req.db;
        const categoryColorMap = req.app.locals.categoryColorMap || {};

        // Load categories and subcategories from DB
        const categoryRows = db.prepare('SELECT id, name FROM categories ORDER BY id').all();
        const categories = categoryRows.map(cat => {
            const subcatRows = db.prepare('SELECT id, name FROM subcategories WHERE category_id = ? ORDER BY id').all(cat.id);
            return {
                id: cat.id,
                name: cat.name,
                color: categoryColorMap[cat.name] || '#6c757d',
                subcategories: subcatRows.map(sc => ({ id: sc.id, name: sc.name }))
            };
        });

        // Load source types from DB
        const sourceTypeRows = db.prepare('SELECT id, name FROM source_types ORDER BY id').all();
        const sourceTypes = sourceTypeRows.map(st => ({ value: String(st.name).toLowerCase(), label: st.name }));

        res.render('upload', { title: 'Subir fuente - Artícora', currentPage: 'upload', cssFile: 'upload.css', categories: categories, sourceTypes: sourceTypes });
    });


    ////////////////////
    //   DUPLICATES   //
    ////////////////////

    // Endpoint de verificación de títulos duplicados
    app.get('/api/check-duplicate-title', async (req, res) => {
        const { title } = req.query;
        if (!title || title.length < 3) {
            return res.json({ duplicado: false, fuentes: [] });
        }

        // Usar la base de datos desde req (inyectada por middleware)
        const db = req.db;
        if (!db) {
            console.error('Base de datos no disponible en req.db');
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        try {
            // Usar el sistema TF-IDF ya implementado (llama a Python)
            const results = await searchWithPython(title);
            
            // Filtrar por similitud > 0.3 (ajustable)
            const similares = results.filter(r => r.score > 0.3);
            
            if (similares.length === 0) {
                return res.json({ duplicado: false, fuentes: [] });
            }

            const ids = similares.map(r => r.source_id);
            const placeholders = ids.map(() => '?').join(',');
            
            // if(debugging) console.log('Placeholders:', placeholders);
            // if(debugging) console.log('Real values:', ids);

            // We need one case if it's only one id (no placeholders) and another if it's multiple
            let fuentes = [];
            if (ids.length === 1) {
                const f = db.prepare(`
                    SELECT s.id, s.title, a.full_name AS authors
                    FROM sources s
                    LEFT JOIN source_authors fa ON s.id = fa.source_id
                    LEFT JOIN authors a ON fa.author_id = a.id
                    WHERE s.id = ?
                    GROUP BY s.id
                `).get(ids[0]);
                if (f) fuentes.push(f);
            } else {
                fuentes = db.prepare(`
                    SELECT s.id, s.title, 
                        GROUP_CONCAT(DISTINCT a.full_name) AS authors
                    FROM sources s
                    LEFT JOIN source_authors fa ON s.id = fa.source_id
                    LEFT JOIN authors a ON fa.author_id = a.id
                    WHERE s.id IN (${placeholders})
                    GROUP BY s.id
                `).all(...ids);
            }

            // Añadir el score a cada fuente
            fuentes.forEach(f => {
                const match = similares.find(s => s.source_id == f.id);
                f.score = match ? match.score : 0;
            });

            res.json({
                duplicado: true,
                mensaje: '¿Es su fuente alguna de estas?',
                fuentes: fuentes.sort((a, b) => b.score - a.score).slice(0, 5) // top 5
            });
            
        } catch (err) {
            console.error('Error en verificación título:', err);
            res.status(500).json({ error: 'Error interno' });
        }
    });

    // Endpoint de verificación de títulos duplicados + autores
    app.get('/api/check-duplicate-title-authors', async (req, res) => {
        if(debugging) console.log('Received check-duplicate-title-authors request with query:', req.query);

        const { title, authors } = req.query;
        if (!title || !authors) return res.json({ duplicado: false });

        const autoresArray = authors.split(';').map(a => a.trim()).filter(a => a.length > 0);
        if (autoresArray.length === 0) return res.json({ duplicado: false });

        const db = req.db;
        if (!db) {
            console.error('Base de datos no disponible en req.db');
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        try {
            // 1. Primero buscar títulos similares con TF-IDF
            const similares = await searchWithPython(title);
            const titulosSimilares = similares.filter(r => r.score > 0.3);
            
            if (titulosSimilares.length === 0) {
                return res.json({ duplicado: false });
            }

            const idsSimilares = titulosSimilares.map(r => r.source_id);
            
            // Construir placeholders
            const idsPlaceholders = idsSimilares.map(() => '?').join(',');
            const autoresPlaceholders = autoresArray.map(() => '?').join(',');
            
            // Buscar fuentes que tengan título similar y al menos un autor coincidente
            const fuentes = await db.prepare(`
                SELECT s.id, s.title, 
                    GROUP_CONCAT(DISTINCT a.full_name) as authors,
                    COUNT(DISTINCT CASE WHEN a.full_name IN (${autoresPlaceholders}) THEN a.id END) as coincidences
                FROM sources s
                JOIN source_authors sa ON s.id = sa.source_id
                JOIN authors a ON sa.author_id = a.id
                WHERE s.id IN (${idsPlaceholders})
                GROUP BY s.id
                HAVING coincidences > 0
            `).all([...autoresArray, ...idsSimilares]); // <-- primero autores, luego ids


            if (debugging) console.log('Fuentes encontradas con título similar y autores coincidentes:', fuentes);
            if (debugging) console.log('Autores buscados:', autoresArray);
            if (debugging) console.log('IDs similares:', idsSimilares);

            if (fuentes.length === 0) {
                return res.json({ duplicado: false });
            }

            // Eliminar campo auxiliar antes de enviar
            fuentes.forEach(f => delete f.autores_coincidentes);

            res.json({
                duplicado: true,
                mensaje: `Ya existen registros titulados '${title}' del autor(es) ${authors}. ¿Corresponde a alguna de estas ediciones?`,
                fuentes: fuentes.map(f => ({
                    id: f.id,
                    titulo: f.title,
                    autores: f.authors
                }))
            });
            
        } catch (err) {
            console.error('Error en verificación título+autores:', err);
            res.status(500).json({ error: 'Error interno' });
        }
    });

    // Endpoint de verificación de duplicados exactos (título + autores + edición)
    app.get('/api/check-exact-duplicate', async (req, res) => {
        const { title, authors, edition } = req.query;
        if (!title || !authors || !edition) {
            return res.json({ duplicado: false });
        }

        // Separar por punto y coma (;) y limpiar espacios
        const autoresArray = authors.split(';').map(a => a.trim()).filter(a => a.length > 0);
        if (autoresArray.length === 0) return res.json({ duplicado: false });

        const db = req.db;
        if (!db) {
            console.error('Base de datos no disponible en req.db');
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        try {
            // Buscar fuentes con título y edición exactos (tabla 'sources')
            const posibles = await db.prepare(`
                SELECT s.id, s.title, s.edition
                FROM sources s
                WHERE s.title = ? AND s.edition = ?
            `).all(title, edition);

            if (posibles.length === 0) {
                return res.json({ duplicado: false });
            }

            // Para cada posible, obtener sus autores y comparar
            let fuenteEncontrada = null;
            for (let p of posibles) {
                const autoresFuente = await db.prepare(`
                    SELECT a.full_name
                    FROM authors a
                    JOIN source_authors sa ON a.id = sa.author_id
                    WHERE sa.source_id = ?
                `).all(p.id);
                
                const nombresAutores = autoresFuente.map(a => a.full_name).sort();
                const autoresBuscados = [...autoresArray].sort(); // copia ordenada
                
                // Comparar conjuntos de autores (misma longitud y mismos nombres)
                if (nombresAutores.length === autoresBuscados.length &&
                    nombresAutores.every((val, idx) => val === autoresBuscados[idx])) {
                    fuenteEncontrada = p;
                    break;
                }
            }

            if (!fuenteEncontrada) {
                return res.json({ duplicado: false });
            }

            // Devolver la fuente encontrada
            res.json({
                duplicado: true,
                exacto: true,
                redirect: true, 
                fuente: {
                    id: fuenteEncontrada.id,
                    titulo: fuenteEncontrada.title,   // mantenemos 'titulo' para el frontend
                    autores: autoresArray.join('; '), // opcional: puedes devolver los nombres reales si quieres
                    edicion: fuenteEncontrada.edition
                }
            });
            
        } catch (err) {
            console.error('Error en verificación exacta:', err);
            res.status(500).json({ error: 'Error interno' });
        }
    });
};


// Función para buscar
function searchWithPython(query) {
  return new Promise((resolve, reject) => {
    try {
      const args = ['tf-idf/search.py', query];
      const py = spawn('python3', args, { cwd: process.cwd() });
      let output = '';
      let errOutput = '';
      py.stdout.on('data', (data) => { output += data.toString(); });
      py.stderr.on('data', (data) => { errOutput += data.toString(); console.error(`Python error: ${data}`); });
      py.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(output);
            resolve(results);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Python exited with code ${code}: ${errOutput}`));
        }
      });
      py.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}