const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);
// Middleware that prevents admins from accessing certain user-facing pages
const noAdmin = checkRoles(['validado', 'no_validado']);
const { sanitizeText } = require('../../middlewares/sanitize');

module.exports = function (app) {

    // Helper: normalize cover URLs coming from DB
    function normalizeCoverUrl(raw, sourceId) {
        if (!raw) {
            return sourceId ? `/portadas/fuente_${sourceId}.png` : null;
        }
        const s = String(raw).trim();
        if (!s) return sourceId ? `/portadas/fuente_${sourceId}.png` : null;
        if (s.match(/^https?:\/\//i)) return s;
        if (s.startsWith('/')) return s;
        if (s.startsWith('portadas/')) return '/' + s;
        const idx = s.indexOf('/portadas/');
        if (idx !== -1) {
            // ensure leading slash
            return s.startsWith('/') ? s.slice(idx) : s.slice(idx);
        }
        // If it's a bare filename, assume it's under /portadas/
        if (!s.includes('/')) {
            if (s.includes('.')) return `/portadas/${s}`;
            return `/portadas/${s}.png`;
        }
        // Fallback: prepend slash
        return '/' + s;
    }
    // Página: Listas (lista del usuario + públicas)
    app.get('/lists', IsRegistered, noAdmin, (req, res) => {
        try {
            const userId = req.user && req.user.id;
            if (!userId) return res.redirect('/login');

            const userRow = req.db.prepare('SELECT id, username, full_name, profile_picture, is_validated FROM users WHERE id = ?').get(userId);
            if (!userRow) return res.redirect('/login');

            const isValidated = !!userRow.is_validated;
            const maxLists = isValidated ? 10 : 3;
            const maxSourcesPerList = isValidated ? 50 : 15;

            const currentListsCount = req.db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(userId).c || 0;

            const user = {
                id: userRow.id,
                name: userRow.full_name || userRow.username,
                type: isValidated ? 'validated' : 'registered',
                isAdmin: false,
                avatar: userRow.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userRow.full_name || userRow.username)}&background=8d6e63&color=fff`,
                maxLists,
                maxSourcesPerList,
                currentLists: currentListsCount,
                canCreateCollaborative: isValidated
            };

            // Cargar categorías
            const categoryRows = req.db.prepare('SELECT id, name, icon_name FROM categories ORDER BY name').all();
            const categoryColorMap = req.app && req.app.locals && req.app.locals.categoryColorMap ? req.app.locals.categoryColorMap : {};
            const knowledgeCategories = categoryRows.map(c => ({ id: c.id, name: c.name, icon: c.icon_name || 'book', color: categoryColorMap[c.name] || '#8d6e63' }));

            // Listas del usuario + listas donde es colaborador (accepted or pending)
            const myListsRows = req.db.prepare(`
                SELECT cl.*, u.full_name as creatorName,
                       (SELECT status FROM list_collaborators lc WHERE lc.list_id = cl.id AND lc.user_id = ?) as collaborator_status
                FROM curatorial_lists cl
                JOIN users u ON cl.user_id = u.id
                WHERE cl.user_id = ? OR cl.id IN (SELECT list_id FROM list_collaborators WHERE user_id = ?)
                ORDER BY cl.updated_at DESC
            `).all(userId, userId, userId);

            const myLists = myListsRows.map(list => {
                const totalSources = req.db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(list.id).c || 0;

                const cats = req.db.prepare(`
                    SELECT coalesce(c.name, 'Desconocida') as name, COUNT(*) as cnt
                    FROM list_sources ls
                    JOIN sources s ON ls.source_id = s.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE ls.list_id = ?
                    GROUP BY c.name
                `).all(list.id);

                const categoriesDistribution = {};
                cats.forEach(r => { categoriesDistribution[r.name] = r.cnt; });

                const categoriesPercent = {};
                if (totalSources > 0) {
                    Object.entries(categoriesDistribution).forEach(([k, v]) => {
                        categoriesPercent[k] = Math.round((v / totalSources) * 100);
                    });
                }

                let coverImage = null;
                let coverIsCategory = false;
                let coverIsPng = false;

                if (list.dominant_category_id) {
                    const dom = req.db.prepare('SELECT id, name FROM categories WHERE id = ?').get(list.dominant_category_id) || {};
                    if (dom && dom.name) {
                        const catColor = req.app && req.app.locals && req.app.locals.categoryColorMap ? req.app.locals.categoryColorMap[dom.name] : null;
                        coverImage = `https://placehold.co/300x200/${String(catColor || '#8d6e63').replace('#','')}/f5f1e6?text=${encodeURIComponent(dom.name)}`;
                        coverIsCategory = true;
                    }
                } else if (list.cover_image) {
                    const catMatch = knowledgeCategories.find(c => String(c.name) === String(list.cover_image));
                    if (catMatch) {
                        coverImage = `https://placehold.co/300x200/${String(catMatch.color).replace('#','')}/f5f1e6?text=${encodeURIComponent(catMatch.name)}`;
                        coverIsCategory = true;
                    } else {
                        const token = String(list.cover_image).trim().toLowerCase();
                        if (token === 'primera portada' || token === 'primera_portada' || token === 'auto' || token === 'first') {
                            coverImage = null; // fallthrough to first source
                        } else {
                            coverImage = normalizeCoverUrl(list.cover_image, null);
                            if (coverImage && /.png$/i.test(coverImage)) coverIsPng = true;
                        }
                    }
                }
                if (!coverImage) {
                    const firstSource = req.db.prepare(`
                        SELECT s.id, s.cover_image_url
                        FROM list_sources ls
                        JOIN sources s ON ls.source_id = s.id
                        WHERE ls.list_id = ?
                        ORDER BY ls.added_at ASC, s.title ASC
                        LIMIT 1
                    `).get(list.id);
                    if (firstSource) coverImage = normalizeCoverUrl(firstSource.cover_image_url, firstSource.id);
                    else coverImage = 'https://placehold.co/300x200/5d4037/f5f1e6?text=Primera+Fuente';
                }

                const collaborators = req.db.prepare(`
                    SELECT u.id, u.full_name as name, u.profile_picture, lc.status FROM list_collaborators lc
                    JOIN users u ON lc.user_id = u.id
                    WHERE lc.list_id = ?
                    LIMIT 10
                `).all(list.id).map(r => ({ id: r.id, name: r.name || r.username, avatar: r.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name || '')}&background=2E8B57&color=fff`, status: r.status }));

                // collaborator_status indicates whether current user is a collaborator and their status (accepted/pending/denied)
                const collaboratorStatus = list.collaborator_status || null;

                return {
                    id: list.id,
                    title: list.title,
                    description: list.description,
                    creatorId: list.user_id,
                    creatorName: list.creatorName || user.name,
                    isPublic: !!list.is_public,
                    isCollaborative: !!list.is_collaborative,
                    createdAt: list.created_at,
                    lastModified: list.updated_at || list.created_at,
                    totalSources,
                    totalVisits: list.total_views || 0,
                    monthlyVisits: Array(12).fill(0),
                    categoriesDistribution: Object.keys(categoriesPercent).length ? categoriesPercent : {},
                    coverType: list.cover_type || 'auto',
                    coverImage,
                    coverIsCategory: coverIsCategory,
                    coverIsPng: coverIsPng,
                    collaborators,
                    collaboratorStatus
                };
            });

            // Public lists
            const publicRows = req.db.prepare('SELECT cl.*, u.full_name as creatorName FROM curatorial_lists cl JOIN users u ON cl.user_id = u.id WHERE cl.is_public = 1 ORDER BY cl.created_at DESC LIMIT 30').all();
            const publicLists = publicRows.map(list => {
                const totalSources = req.db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(list.id).c || 0;
                let coverImage = null;
                if (list.cover_image) {
                    const catMatch = knowledgeCategories.find(c => String(c.name) === String(list.cover_image));
                    if (catMatch) {
                        coverImage = `https://placehold.co/300x200/${String(catMatch.color).replace('#','')}/f5f1e6?text=${encodeURIComponent(catMatch.name)}`;
                    } else {
                        const token = String(list.cover_image).trim().toLowerCase();
                        if (token === 'primera portada' || token === 'primera_portada' || token === 'auto' || token === 'first') {
                            coverImage = null;
                        } else {
                            coverImage = normalizeCoverUrl(list.cover_image, null);
                        }
                    }
                }
                if (!coverImage) coverImage = 'https://placehold.co/300x200/2c1810/f5f1e6?text=Primera+Fuente';
                return {
                    id: list.id,
                    title: list.title,
                    description: list.description,
                    creatorId: list.user_id,
                    creatorName: list.creatorName || 'Usuario',
                    isPublic: !!list.is_public,
                    isCollaborative: !!list.is_collaborative,
                    createdAt: list.created_at,
                    lastModified: list.updated_at || list.created_at,
                    totalSources,
                    totalVisits: list.total_views || 0,
                    monthlyVisits: Array(12).fill(0),
                    categoriesDistribution: {},
                    coverType: list.cover_type || 'auto',
                    coverImage
                };
            });

            const availableSourcesRows = req.db.prepare(`
                SELECT s.id, s.title, s.publication_year as year, s.cover_image_url as cover, s.overall_rating as rating, c.name as category
                FROM sources s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.is_active = 1
                ORDER BY s.created_at DESC
                LIMIT 8
            `).all();
            const availableSources = availableSourcesRows.map(s => ({ id: s.id, title: s.title, author: 'N/A', year: s.year, category: s.category || 'Desconocida', rating: s.rating || 0, cover: normalizeCoverUrl(s.cover, s.id) || 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada' }));

            const deletedRows = req.db.prepare('SELECT id, title FROM sources WHERE is_active = 0 ORDER BY updated_at DESC LIMIT 3').all();
            const deletedSources = deletedRows.map(s => ({ id: s.id, title: s.title, author: 'N/A', year: null, category: 'Desconocida', rating: 0, isDeleted: true, cover: 'https://placehold.co/150x200/cccccc/999999?text=Eliminado' }));

            const validContactsRows = req.db.prepare('SELECT id, full_name FROM users WHERE is_validated = 1 AND id != ? LIMIT 30').all(userId);
            const validContacts = validContactsRows.map(u => ({ id: u.id, name: u.full_name || 'Usuario', type: 'validated', avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'Usuario')}&background=2E8B57&color=fff` }));

            const listsData = {
                user,
                myLists,
                publicLists,
                knowledgeCategories,
                availableSources,
                deletedSources,
                validContacts
            };

            res.render('lists', {
                title: 'Listas Curatoriales - Artícora',
                currentPage: 'lists',
                cssFile: 'lists.css',
                data: listsData
            });
        } catch (err) {
            console.error('Error en GET /lists:', err);
            res.status(500).render('lists', { title: 'Listas Curatoriales - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: { user: {}, myLists: [], publicLists: [], knowledgeCategories: [], availableSources: [], deletedSources: [], validContacts: [] } });
        }
    });

    // Detalle de lista
    app.get('/lists/:id', IsRegistered, noAdmin, (req, res) => {
        try {
            const listId = parseInt(req.params.id, 10);
            const userId = req.user && req.user.id;

            const fallbackUser = {
                id: userId || null,
                isOwner: false,
                isCollaborator: false,
                canEdit: false,
                maxSourcesPerList: 15
            };
            const fallbackList = {
                id: null,
                title: 'Lista no encontrada',
                description: '',
                creatorName: '',
                isCollaborative: false,
                isPublic: false,
                totalSources: 0,
                totalVisits: 0,
                monthlyVisits: Array(12).fill(0),
                categoriesDistribution: {},
                collaborators: [],
                sources: [],
                coverImage: 'https://placehold.co/400x250/5d4037/f5f1e6?text=Sin+lista',
                createdAt: null,
                lastModified: null
            };

            if (!listId) return res.render('list-detail', { title: 'Lista no encontrada - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: { user: fallbackUser, list: fallbackList, knowledgeCategories: [] } });

            const listRow = req.db.prepare('SELECT cl.*, u.full_name as creatorName FROM curatorial_lists cl JOIN users u ON cl.user_id = u.id WHERE cl.id = ?').get(listId);
            if (!listRow) return res.render('list-detail', { title: 'Lista no encontrada - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: { user: fallbackUser, list: fallbackList, knowledgeCategories: [] } });

            if (!listRow.is_public) {
                if (!userId || userId !== listRow.user_id) {
                    const coll = req.db.prepare("SELECT 1 FROM list_collaborators WHERE list_id = ? AND user_id = ? AND status = 'accepted'").get(listId, userId);
                    if (!coll) return res.render('list-detail', { title: 'Lista no encontrada - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: { user: fallbackUser, list: fallbackList, knowledgeCategories: [] } });
                }
            }

            const totalSources = req.db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(listId).c || 0;

            const sourcesRows = req.db.prepare(`
                SELECT s.id, s.title, s.publication_year as year, s.cover_image_url as cover, s.overall_rating as rating, s.is_active, s.uploaded_by, c.name as category, ls.added_at as addedDate, ls.sort_order as sort_order
                FROM list_sources ls
                JOIN sources s ON ls.source_id = s.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE ls.list_id = ?
                ORDER BY COALESCE(ls.sort_order, ls.added_at) ASC
            `).all(listId);

            const sources = sourcesRows.map(s => {
                const isDeleted = !s.is_active;
                const cover = !isDeleted ? (normalizeCoverUrl(s.cover, s.id) || 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada') : 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada';

                const uploader = (s.uploaded_by) ? req.db.prepare('SELECT full_name FROM users WHERE id = ?').get(s.uploaded_by) : null;
                const author = uploader ? (uploader.full_name || 'Usuario') : 'N/A';

                return {
                    id: s.id,
                    title: s.title,
                    author,
                    year: s.year,
                    category: s.category || 'Desconocida',
                    rating: s.rating || 0,
                    addedDate: s.addedDate,
                    cover,
                    isDeleted,
                    order: s.sort_order
                };
            });

            const cats = req.db.prepare(`
                SELECT coalesce(c.name,'Desconocida') as name, COUNT(*) as cnt
                FROM list_sources ls
                JOIN sources s ON ls.source_id = s.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE ls.list_id = ?
                GROUP BY c.name
            `).all(listId);
            const categoriesDistribution = {};
            cats.forEach(r => { categoriesDistribution[r.name] = Math.round((r.cnt / (totalSources || 1)) * 100); });

            const collaborators = req.db.prepare("SELECT u.id, u.full_name as name, u.profile_picture, lc.status FROM list_collaborators lc JOIN users u ON lc.user_id = u.id WHERE lc.list_id = ?").all(listId).map(r => ({ id: r.id, name: r.name || 'Usuario', avatar: r.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name || 'Usuario')}&background=2E8B57&color=fff`, status: r.status }));

                let computedCoverImage = null;
                let coverIsCategory = false;
                let coverIsPng = false;

                // Prefer dominant_category_id (dynamic) if present
                if (listRow.dominant_category_id) {
                    const dom = req.db.prepare('SELECT id, name FROM categories WHERE id = ?').get(listRow.dominant_category_id) || {};
                    if (dom && dom.name) {
                        const catColor = req.app && req.app.locals && req.app.locals.categoryColorMap ? req.app.locals.categoryColorMap[dom.name] : null;
                        computedCoverImage = `https://placehold.co/600x300/${String(catColor || '#8d6e63').replace('#','')}/f5f1e6?text=${encodeURIComponent(dom.name)}`;
                        coverIsCategory = true;
                    }
                } else if (listRow.cover_image) {
                    const catColor = req.app && req.app.locals && req.app.locals.categoryColorMap ? req.app.locals.categoryColorMap[listRow.cover_image] : null;
                    if (catColor) {
                        computedCoverImage = `https://placehold.co/600x300/${String(catColor).replace('#','')}/f5f1e6?text=${encodeURIComponent(listRow.cover_image)}`;
                        coverIsCategory = true;
                    } else {
                        const token = String(listRow.cover_image).trim().toLowerCase();
                        if (token === 'primera portada' || token === 'primera_portada' || token === 'auto' || token === 'first') {
                            computedCoverImage = null;
                        } else {
                            computedCoverImage = normalizeCoverUrl(listRow.cover_image, sources && sources[0] ? sources[0].id : null);
                            if (computedCoverImage && /.png$/i.test(computedCoverImage)) coverIsPng = true;
                        }
                    }
                }

                const list = {
                id: listRow.id,
                title: listRow.title,
                description: listRow.description,
                creatorName: listRow.creatorName || 'Usuario',
                isCollaborative: !!listRow.is_collaborative,
                isPublic: !!listRow.is_public,
                totalSources,
                totalVisits: listRow.total_views || 0,
                monthlyVisits: Array(12).fill(0),
                categoriesDistribution,
                collaborators,
                sources,
                coverImage: computedCoverImage || (sources[0] && sources[0].cover) || 'https://placehold.co/400x250/5d4037/f5f1e6?text=Primera+Fuente',
                coverIsCategory: coverIsCategory,
                coverIsPng: coverIsPng || (computedCoverImage ? (/\.png$/i.test(computedCoverImage)) : false),
                createdAt: listRow.created_at,
                lastModified: listRow.updated_at || listRow.created_at
            };

            const userRow = req.db.prepare('SELECT id, username, full_name, profile_picture, is_validated FROM users WHERE id = ?').get(req.user.id);
            const isOwner = req.user.id === listRow.user_id;
            const user = {
                id: req.user.id,
                isOwner,
                isCollaborator: collaborators.find(c => c.id === req.user.id) ? true : false,
                canEdit: isOwner || collaborators.find(c => c.id === req.user.id) ? true : false,
                maxSourcesPerList: (userRow && userRow.is_validated) ? 50 : 15
            };

            const data = {
                user,
                list,
                knowledgeCategories: (req.app && req.app.locals && req.app.locals.categoryColorMap) ? Object.keys(req.app.locals.categoryColorMap).map(name => ({ name, color: req.app.locals.categoryColorMap[name] })) : []
            };

            res.render('list-detail', { title: `${list.title} - Artícora`, currentPage: 'lists', cssFile: 'lists.css', data });
        } catch (err) {
            console.error('Error en GET /lists/:id', err);
            const fallbackUser = {
                id: req.user ? req.user.id : null,
                isOwner: false,
                isCollaborator: false,
                canEdit: false,
                maxSourcesPerList: 15
            };
            const fallbackList = {
                id: null,
                title: 'Lista no encontrada',
                description: '',
                creatorName: '',
                isCollaborative: false,
                isPublic: false,
                totalSources: 0,
                totalVisits: 0,
                monthlyVisits: Array(12).fill(0),
                categoriesDistribution: {},
                collaborators: [],
                sources: [],
                coverImage: 'https://placehold.co/400x250/5d4037/f5f1e6?text=Sin+lista',
                createdAt: null,
                lastModified: null
            };
            res.status(500).render('list-detail', { title: 'Lista no encontrada - Artícora', currentPage: 'lists', cssFile: 'lists.css', data: { user: fallbackUser, list: fallbackList, knowledgeCategories: [] } });
        }
    });

    // Comparar fuentes (DB-driven) — interfaz para usuarios registrados
    app.get('/compare', IsRegistered, (req, res) => {
        try {
            // Optional pre-selected IDs via ?ids=1,2,3
            const idsParam = (req.query.ids || '').toString().trim();
            const selectedIds = idsParam ? idsParam.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n)) : [];

            // Available sources for search selector (lightweight fields)
            const availRows = req.db.prepare(`
                SELECT s.id, s.title, s.publication_year as year, st.name as type, c.name as category, s.keywords
                FROM sources s
                LEFT JOIN source_types st ON s.source_type_id = st.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.is_active = 1
                ORDER BY s.title COLLATE NOCASE
                LIMIT 500
            `).all();

            const searchOptions = availRows.map(sr => ({
                id: sr.id,
                title: sr.title,
                authors: (function(){
                    const arows = req.db.prepare(`
                        SELECT a.full_name FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = ? ORDER BY sa.sort_order ASC
                    `).all(sr.id);
                    return arows.map(a=>a.full_name).join(', ');
                })(),
                year: sr.year,
                type: sr.type || 'N/A',
                category: sr.category || 'Desconocida',
                keywords: sr.keywords || ''
            }));

            // Build selectedSources full objects (limit to 4)
            const selected = [];
            const idsToFetch = (selectedIds.length ? selectedIds.slice(0,4) : []);
            if (idsToFetch.length > 0) {
                const placeholders = idsToFetch.map(()=>'?').join(',');
                const q = req.db.prepare(`
                    SELECT s.*, st.name as type, c.name as category
                    FROM sources s
                    LEFT JOIN source_types st ON s.source_type_id = st.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE s.id IN (${placeholders})
                `).all(...idsToFetch);

                q.forEach(sr => {
                    const authorsRows = req.db.prepare(`SELECT a.full_name FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = ? ORDER BY sa.sort_order ASC`).all(sr.id);
                    const authors = authorsRows.map(a=>a.full_name);

                    const criteria = {
                        extension: roundTo(sr.avg_readability || 0, 1),
                        completeness: roundTo(sr.avg_completeness || 0, 1),
                        detail: roundTo(sr.avg_detail_level || 0, 1),
                        veracity: roundTo(sr.avg_veracity || 0, 1),
                        difficulty: roundTo(sr.avg_technical_difficulty || 0, 1)
                    };

                    selected.push({
                        id: sr.id,
                        title: sr.title,
                        authors: authors,
                        year: sr.publication_year,
                        type: sr.type || 'N/A',
                        category: sr.category || 'Desconocida',
                        publisher: sr.journal_publisher || '',
                        pages: sr.pages || '',
                        edition: sr.edition || null,
                        rating: roundTo(sr.overall_rating || 0, 1),
                        readCount: sr.total_reads || 0,
                        trend: 'stable',
                        criteria,
                        cover: normalizeCoverUrl(sr.cover_image_url, sr.id) || 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada',
                        keywords: (sr.keywords || '').split(',').map(k=>k.trim()).filter(Boolean)
                    });
                });
            }

            const totalCount = req.db.prepare('SELECT COUNT(*) as c FROM sources WHERE is_active = 1').get().c || 0;

            const searchExamples = [
                'Cognitive Science', 'Stephen Hawking', 'Deep Learning', 'neurociencia', 'filosofía', 'sociología', 'Kuhn', 'Foucault', 'ciencias sociales', 'aprendizaje automático'
            ];

            res.render('compare-user', {
                title: 'Comparador de Fuentes - Artícora',
                currentPage: 'compare',
                cssFile: 'compare.css',
                jsFile: 'compare.js',
                userType: 'user',
                availableSources: searchOptions,
                selectedSources: selected,
                searchExamples: searchExamples,
                totalSourcesCount: totalCount
            });
        } catch (err) {
            console.error('Error en GET /compare:', err);
            res.status(500).render('compare-user', { title: 'Comparador de Fuentes - Artícora', currentPage: 'compare', cssFile: 'compare.css', jsFile: 'compare.js', userType: 'user', availableSources: [], selectedSources: [], searchExamples: [], totalSourcesCount: 0 });
        }
    });

    // API: obtener datos agregados para una lista de fuentes (ids=1,2,3)
    app.get('/api/compare/sources', IsRegistered, (req, res) => {
        try {
            const idsParam = (req.query.ids || '').toString().trim();
            if (!idsParam) return res.status(400).json({ error: 'Debe indicar ids, por ejemplo ?ids=1,2' });
            const ids = idsParam.split(',').map(s => parseInt(s,10)).filter(n => !isNaN(n));
            if (ids.length < 2 || ids.length > 4) return res.status(400).json({ error: 'Se requieren entre 2 y 4 ids para comparar' });

            const placeholders = ids.map(()=>'?').join(',');
            const rows = req.db.prepare(`
                SELECT s.*, st.name as type, c.name as category
                FROM sources s
                LEFT JOIN source_types st ON s.source_type_id = st.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.id IN (${placeholders})
            `).all(...ids);

            const out = rows.map(sr => {
                const authorsRows = req.db.prepare(`SELECT a.full_name FROM source_authors sa JOIN authors a ON sa.author_id = a.id WHERE sa.source_id = ? ORDER BY sa.sort_order ASC`).all(sr.id);
                const authors = authorsRows.map(a=>a.full_name);

                const criteria = {
                    extension: roundTo(sr.avg_readability || 0, 1),
                    completeness: roundTo(sr.avg_completeness || 0, 1),
                    detail: roundTo(sr.avg_detail_level || 0, 1),
                    veracity: roundTo(sr.avg_veracity || 0, 1),
                    difficulty: roundTo(sr.avg_technical_difficulty || 0, 1)
                };

                return {
                    id: sr.id,
                    title: sr.title,
                    authors,
                    year: sr.publication_year,
                    type: sr.type || 'N/A',
                    category: sr.category || 'Desconocida',
                    publisher: sr.journal_publisher || '',
                    rating: roundTo(sr.overall_rating || 0, 1),
                    criteria,
                    readCount: sr.total_reads || 0,
                    cover: normalizeCoverUrl(sr.cover_image_url, sr.id) || null
                };
            });

            res.json({ sources: out });
        } catch (err) {
            console.error('Error en GET /api/compare/sources', err);
            res.status(500).json({ error: 'Error interno' });
        }
    });

    // API: get lists owned by user or where user is an accepted collaborator
    app.get('/api/my-lists', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.user && req.user.id;
            if (!userId) return res.status(401).json({ success: false, message: 'auth_required' });

            const own = db.prepare('SELECT id, title, total_sources, is_collaborative, cover_image, dominant_category_id FROM curatorial_lists WHERE user_id = ? ORDER BY updated_at DESC').all(userId) || [];
            const coll = db.prepare(`SELECT cl.id, cl.title, cl.total_sources, cl.is_collaborative, cl.cover_image, cl.dominant_category_id
                FROM curatorial_lists cl JOIN list_collaborators lc ON cl.id = lc.list_id
                WHERE lc.user_id = ? AND lc.status = 'accepted' ORDER BY cl.updated_at DESC`).all(userId) || [];

            // merge unique by id (own first)
            const map = new Map();
            own.forEach(l => map.set(l.id, l));
            coll.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });

            const lists = Array.from(map.values()).map(l => ({ id: l.id, title: l.title, totalSources: l.total_sources || 0, isCollaborative: !!l.is_collaborative, coverImageToken: l.cover_image || null, dominantCategoryId: l.dominant_category_id || null }));
            return res.json({ success: true, lists });
        } catch (err) {
            console.error('Error in GET /api/my-lists', err);
            return res.status(500).json({ success: false, message: 'internal_error' });
        }
    });

    // Helper: round to n decimals
    function roundTo(v, decimals) {
        const m = Math.pow(10, decimals || 0);
        return Math.round((v || 0) * m) / m;
    }
};