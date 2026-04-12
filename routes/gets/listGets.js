const IsRegistered = require('../../middlewares/auth');
const checkRoles = require('../../middlewares/checkrole');
const soloValidado = checkRoles(['validado', 'admin']);
const { sanitizeText } = require('../../middlewares/sanitize');

module.exports = function (app) {
    // Página: Listas (lista del usuario + públicas)
    app.get('/lists', IsRegistered, (req, res) => {
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

                let coverImage = list.cover_image || null;
                if (!coverImage) {
                    const firstSource = req.db.prepare(`
                        SELECT s.cover_image_url FROM list_sources ls
                        JOIN sources s ON ls.source_id = s.id
                        WHERE ls.list_id = ? ORDER BY ls.added_at ASC LIMIT 1
                    `).get(list.id);
                    coverImage = (firstSource && firstSource.cover_image_url) ? firstSource.cover_image_url : 'https://placehold.co/300x200/5d4037/f5f1e6?text=Primera+Fuente';
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
                    collaborators,
                    collaboratorStatus
                };
            });

            // Public lists
            const publicRows = req.db.prepare('SELECT cl.*, u.full_name as creatorName FROM curatorial_lists cl JOIN users u ON cl.user_id = u.id WHERE cl.is_public = 1 ORDER BY cl.created_at DESC LIMIT 30').all();
            const publicLists = publicRows.map(list => {
                const totalSources = req.db.prepare('SELECT COUNT(*) as c FROM list_sources WHERE list_id = ?').get(list.id).c || 0;
                const coverImage = list.cover_image || 'https://placehold.co/300x200/2c1810/f5f1e6?text=Primera+Fuente';
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
            const availableSources = availableSourcesRows.map(s => ({ id: s.id, title: s.title, author: 'N/A', year: s.year, category: s.category || 'Desconocida', rating: s.rating || 0, cover: s.cover || 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada' }));

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
    app.get('/lists/:id', IsRegistered, (req, res) => {
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
                const cover = !isDeleted && s.cover ? s.cover : 'https://placehold.co/150x200/cccccc/999999?text=Sin+portada';

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
                coverImage: listRow.cover_image || (sources[0] && sources[0].cover) || 'https://placehold.co/400x250/5d4037/f5f1e6?text=Primera+Fuente',
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

    // Comparar fuentes (simulado con datos mock)
    app.get('/compare', soloValidado, (req, res) => {
        const mockSources = [
            {
                id: 1,
                title: "Cognitive Science: An Introduction to the Study of Mind",
                authors: ["Jay Friedenberg", "Gordon Silverman"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Neurociencia Cognitiva",
                publisher: "SAGE Publications",
                pages: "480",
                edition: 4,
                rating: 4.7,
                readCount: 342,
                trend: "increasing",
                criteria: {
                    extension: 4.5,
                    completeness: 4.8,
                    detail: 4.6,
                    veracity: 4.9,
                    difficulty: 4.2
                },
                keywords: ["ciencia cognitiva", "mente", "neurociencia", "cognición"]
            },
            {
                id: 2,
                title: "The Social Construction of Reality: A Treatise in the Sociology of Knowledge",
                authors: ["Peter L. Berger", "Thomas Luckmann"],
                year: 1966,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Sociología del Conocimiento",
                publisher: "Anchor Books",
                pages: "240",
                edition: 1,
                rating: 4.8,
                readCount: 512,
                trend: "stable",
                criteria: {
                    extension: 4.7,
                    completeness: 4.9,
                    detail: 4.5,
                    veracity: 4.8,
                    difficulty: 4.0
                },
                keywords: ["construcción social", "realidad", "sociología", "conocimiento"]
            },
            {
                id: 3,
                title: "Deep Learning with Python",
                authors: ["François Chollet"],
                year: 2021,
                type: "Libro",
                category: "Ciencias Computacionales",
                subcategory: "Aprendizaje Automático",
                publisher: "Manning Publications",
                pages: "384",
                edition: 2,
                rating: 4.6,
                readCount: 789,
                trend: "increasing",
                criteria: {
                    extension: 4.4,
                    completeness: 4.7,
                    detail: 4.8,
                    veracity: 4.5,
                    difficulty: 4.3
                },
                keywords: ["deep learning", "python", "redes neuronales", "IA"]
            },
            {
                id: 4,
                title: "A Brief History of Time: From the Big Bang to Black Holes",
                authors: ["Stephen Hawking"],
                year: 1988,
                type: "Libro",
                category: "Ciencias Exactas",
                subcategory: "Cosmología",
                publisher: "Bantam Books",
                pages: "256",
                edition: 1,
                rating: 4.9,
                readCount: 921,
                trend: "stable",
                criteria: {
                    extension: 4.2,
                    completeness: 4.8,
                    detail: 4.4,
                    veracity: 4.9,
                    difficulty: 3.8
                },
                keywords: ["cosmología", "big bang", "agujeros negros", "física teórica"]
            },
            {
                id: 5,
                title: "The Structure of Scientific Revolutions",
                authors: ["Thomas S. Kuhn"],
                year: 1962,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía de la Ciencia",
                publisher: "University of Chicago Press",
                pages: "264",
                edition: 1,
                rating: 4.8,
                readCount: 654,
                trend: "stable",
                criteria: {
                    extension: 4.3,
                    completeness: 4.7,
                    detail: 4.6,
                    veracity: 4.8,
                    difficulty: 4.1
                },
                keywords: ["revoluciones científicas", "paradigma", "ciencia", "historia"]
            },
            {
                id: 6,
                title: "Thinking, Fast and Slow",
                authors: ["Daniel Kahneman"],
                year: 2011,
                type: "Libro",
                category: "Ciencias Cognitivas",
                subcategory: "Psicología Cognitiva",
                publisher: "Farrar, Straus and Giroux",
                pages: "499",
                edition: 1,
                rating: 4.7,
                readCount: 1200,
                trend: "increasing",
                criteria: {
                    extension: 4.6,
                    completeness: 4.8,
                    detail: 4.5,
                    veracity: 4.9,
                    difficulty: 3.9
                },
                keywords: ["psicología", "decisiones", "cognición", "sesgos"]
            },
            {
                id: 7,
                title: "The Order of Things: An Archaeology of the Human Sciences",
                authors: ["Michel Foucault"],
                year: 1966,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía",
                publisher: "Gallimard",
                pages: "387",
                edition: 1,
                rating: 4.8,
                readCount: 850,
                trend: "stable",
                criteria: {
                    extension: 4.7,
                    completeness: 4.5,
                    detail: 4.8,
                    veracity: 4.9,
                    difficulty: 4.5
                },
                keywords: ["arqueología del saber", "ciencias humanas", "episteme", "Foucault"]
            },
            {
                id: 8,
                title: "The Theory of Communicative Action",
                authors: ["Jürgen Habermas"],
                year: 1981,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Sociología",
                publisher: "Beacon Press",
                pages: "465",
                edition: 1,
                rating: 4.6,
                readCount: 720,
                trend: "stable",
                criteria: {
                    extension: 4.8,
                    completeness: 4.7,
                    detail: 4.6,
                    veracity: 4.8,
                    difficulty: 4.4
                },
                keywords: ["acción comunicativa", "teoría social", "Habermas", "racionalidad"]
            },
            {
                id: 9,
                title: "The Logic of Scientific Discovery",
                authors: ["Karl Popper"],
                year: 1934,
                type: "Libro",
                category: "Ciencias Humanistas",
                subcategory: "Filosofía de la Ciencia",
                publisher: "Routledge",
                pages: "513",
                edition: 1,
                rating: 4.9,
                readCount: 950,
                trend: "stable",
                criteria: {
                    extension: 4.5,
                    completeness: 4.8,
                    detail: 4.7,
                    veracity: 4.9,
                    difficulty: 4.3
                },
                keywords: ["filosofía de la ciencia", "falsabilidad", "Popper", "epistemología"]
            },
            {
                id: 10,
                title: "The Interpretation of Cultures",
                authors: ["Clifford Geertz"],
                year: 1973,
                type: "Libro",
                category: "Ciencias Sociales",
                subcategory: "Antropología",
                publisher: "Basic Books",
                pages: "470",
                edition: 1,
                rating: 4.7,
                readCount: 880,
                trend: "increasing",
                criteria: {
                    extension: 4.6,
                    completeness: 4.7,
                    detail: 4.8,
                    veracity: 4.8,
                    difficulty: 4.2
                },
                keywords: ["antropología", "cultura", "interpretación", "símbolos"]
            }
        ];

        const searchOptions = mockSources.map(
            source => ({
                id: source.id,
                title: source.title,
                authors: source.authors.join(', '),
                year: source.year,
                type: source.type,
                category: source.category,
                keywords: source.keywords.join(', ')
            }));

        const searchExamples = [
            "Cognitive Science",
            "Stephen Hawking",
            "Deep Learning",
            "neurociencia",
            "filosofía",
            "sociología",
            "Kuhn",
            "Foucault",
            "ciencias sociales",
            "aprendizaje automático"
        ];

        res.render('compare-user', {
            title: 'Comparador de Fuentes - Artícora',
            currentPage: 'compare',
            cssFile: 'compare.css',
            jsFile: 'compare.js',
            userType: 'user',
            availableSources: searchOptions,
            selectedSources: mockSources.slice(0, 3),
            searchExamples: searchExamples,
            totalSourcesCount: mockSources.length
        });
    });
};