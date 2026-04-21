const IsRegistered = require('../../middlewares/auth');
const { decryptEmail } = require('../../lib/crypto_utils');

// Usa esto como condicional para activar los debuggings.
const debugging = global.debugging;

module.exports = function (app) {
    app.get('/dashboard', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.session.userId;
            if (!userId) return res.redirect('/login');

            // Basic user stats
            const totalReadings = db.prepare('SELECT COUNT(1) as c FROM user_readings WHERE user_id = ? AND status = ?').get(userId, 'read').c || 0;
            const uploadedSources = db.prepare('SELECT COUNT(1) as c FROM sources WHERE uploaded_by = ?').get(userId).c || 0;
            const completedReadings = db.prepare('SELECT COUNT(1) as c FROM ratings WHERE user_id = ?').get(userId).c || 0;
            const activeDays = db.prepare('SELECT COUNT(DISTINCT DATE(added_at)) as c FROM user_readings WHERE user_id = ?').get(userId).c || 0;

            // Recent study topic (try reading_stats.category_distribution first)
            let recentStudyTopic = { category: 'Sin datos', percentage: 0, subcategory: '', recentReadings: 0, color: '#6c757d' };
            try {
                const rs = db.prepare('SELECT category_distribution FROM reading_stats WHERE user_id = ?').get(userId) || {};
                let dist = null;
                if (rs.category_distribution) {
                    dist = JSON.parse(rs.category_distribution);
                }
                if (!dist) {
                    // fallback: aggregate from user_readings
                    const agg = db.prepare(`SELECT c.name as category, COUNT(*) as cnt FROM user_readings ur JOIN sources s ON ur.source_id = s.id JOIN categories c ON s.category_id = c.id WHERE ur.user_id = ? AND ur.status = 'read' GROUP BY c.id ORDER BY cnt DESC`).all(userId);
                    if (agg && agg.length > 0) {
                        const top = agg[0];
                        const total = agg.reduce((a,b) => a + b.cnt, 0);
                        recentStudyTopic.category = top.category;
                        recentStudyTopic.percentage = total ? Math.round((top.cnt / total) * 100) : 0;
                        recentStudyTopic.recentReadings = top.cnt || 0;
                        recentStudyTopic.color = (req.app.locals.categoryColorMap && req.app.locals.categoryColorMap[top.category]) || '#6c757d';
                    }
                } else {
                    const entries = Object.entries(dist).sort((a,b) => b[1] - a[1]);
                    if (entries.length > 0) {
                        const total = entries.reduce((s, e) => s + e[1], 0);
                        recentStudyTopic.category = entries[0][0];
                        recentStudyTopic.percentage = total ? Math.round((entries[0][1] / total) * 100) : 0;
                        recentStudyTopic.recentReadings = entries[0][1] || 0;
                        recentStudyTopic.color = (req.app.locals.categoryColorMap && req.app.locals.categoryColorMap[entries[0][0]]) || '#6c757d';
                    }
                }
            } catch (e) {
                console.error('Error computing recentStudyTopic', e && e.message);
            }

            // My references (recent uploads by user)
            const refs = db.prepare('SELECT s.id, s.title, s.publication_year as year, s.source_type_id, s.cover_image_url, s.total_reads FROM sources s WHERE s.uploaded_by = ? ORDER BY s.created_at DESC LIMIT 6').all(userId) || [];
            const myReferences = refs.map(r => {
                const aRow = db.prepare('SELECT GROUP_CONCAT(a.full_name) as authors FROM authors a JOIN source_authors sa ON a.id = sa.author_id WHERE sa.source_id = ?').get(r.id) || {};
                const authors = aRow.authors ? String(aRow.authors).split(',') : [];
                const bookmarks = db.prepare('SELECT COUNT(1) as c FROM list_sources WHERE source_id = ?').get(r.id).c || 0;
                const st = db.prepare('SELECT name FROM source_types WHERE id = ?').get(r.source_type_id) || {};
                return {
                    id: r.id,
                    title: r.title,
                    authors: authors,
                    year: r.year,
                    type: st.name || 'Fuente',
                    uploadDate: r.created_at || null,
                    views: r.total_reads || 0,
                    bookmarks: bookmarks
                };
            });

            // Most read topic (by user)
            let mostReadTopic = { category: 'Sin datos', totalReadings: 0, percentage: 0, subcategories: [], color: '#6c757d' };
            try {
                const top = db.prepare(`SELECT c.id as cid, c.name as category, COUNT(*) as cnt FROM user_readings ur JOIN sources s ON ur.source_id = s.id JOIN categories c ON s.category_id = c.id WHERE ur.user_id = ? AND ur.status = 'read' GROUP BY c.id ORDER BY cnt DESC LIMIT 1`).get(userId);
                if (top && top.cid) {
                    const totalReadsUser = totalReadings || 0;
                    mostReadTopic.category = top.category;
                    mostReadTopic.totalReadings = top.cnt || 0;
                    mostReadTopic.percentage = totalReadsUser ? Math.round((top.cnt / totalReadsUser) * 100) : 0;
                    mostReadTopic.color = (req.app.locals.categoryColorMap && req.app.locals.categoryColorMap[top.category]) || '#6c757d';
                    const subcats = db.prepare(`SELECT sc.name as name, COUNT(*) as count FROM user_readings ur JOIN sources s ON ur.source_id = s.id JOIN subcategories sc ON s.subcategory_id = sc.id WHERE ur.user_id = ? AND sc.category_id = ? AND ur.status = 'read' GROUP BY sc.id ORDER BY count DESC LIMIT 3`).all(userId, top.cid) || [];
                    mostReadTopic.subcategories = subcats.map(sc => ({ name: sc.name, count: sc.count }));
                }
            } catch (e) {
                console.error('Error computing mostReadTopic', e && e.message);
            }

            // Global trends (top sources in last 30 days)
            const globalTrends = db.prepare(`
                SELECT s.id, s.title, GROUP_CONCAT(DISTINCT a.full_name) as authors, c.name as category, COUNT(*) as reads
                FROM user_readings ur
                JOIN sources s ON ur.source_id = s.id
                LEFT JOIN source_authors sa ON sa.source_id = s.id
                LEFT JOIN authors a ON sa.author_id = a.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE ur.added_at >= datetime('now', '-30 days') AND ur.status = 'read'
                GROUP BY s.id
                ORDER BY reads DESC
                LIMIT 10
            `).all() || [];

            // Recent readings (last 7 days by day)
            const recentRows = db.prepare(`SELECT DATE(added_at) as day, COUNT(*) as cnt FROM user_readings WHERE user_id = ? AND status = 'read' AND added_at >= datetime('now','-7 days') GROUP BY DATE(added_at) ORDER BY day DESC LIMIT 5`).all(userId) || [];
            const recentReadings = recentRows.map(r => {
                const d = new Date(r.day + 'T00:00:00');
                const today = new Date();
                const diffDays = Math.floor((+today - +d) / (1000 * 60 * 60 * 24));
                return { category: 'General', count: r.cnt, date: diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Ayer' : `${diffDays} días` };
            });

            // Reading history - last 30 days (simple series)
            const daysRows = db.prepare(`SELECT DATE(added_at) as day, COUNT(*) as cnt FROM user_readings WHERE user_id = ? AND status = 'read' AND added_at >= datetime('now','-29 days') GROUP BY DATE(added_at) ORDER BY day ASC`).all(userId) || [];
            const dayMap = new Map();
            daysRows.forEach(r => dayMap.set(r.day, r.cnt));
            const last30Days = [];
            for (let i = 29; i >= 0; i--) {
                const dt = new Date();
                dt.setDate(dt.getDate() - i);
                const key = dt.toISOString().slice(0,10);
                last30Days.push(dayMap.get(key) || 0);
            }

            const dashboardData = {
                userStats: { totalReadings, uploadedSources, completedReadings, activeDays },
                recentStudyTopic,
                myReferences,
                mostReadTopic,
                globalTrends: globalTrends.map(g => ({ id: g.id, title: g.title, authors: g.authors ? String(g.authors).split(',') : [], category: g.category || 'General', reads: g.reads || 0, trend: 'stable' })),
                recentReadings,
                readingHistory: { last30Days, categories: [], categoryDistribution: [] }
            };

            res.render('dashboard', {
                title: 'Dashboard - Artícora',
                currentPage: 'dashboard',
                cssFile: 'dashboard.css',
                data: dashboardData
            });
        } catch (err) {
            console.error('Error rendering dashboard:', err);
            res.status(500).send('Internal server error');
        }
    });

    // Ruta temporal para comprobar disponibilidad de un usuario (JSON puro)
    /*
    app.get('/testing-disponibility/:id', checkDisponibilidad, (req, res) => {
        res.json({ id: req.checkedUserId, available: req.userAvailability });
    });
    */

    // Perfil propio
    app.get('/profile', IsRegistered, (req, res) => {
        try {
            const db = req.db;
            const userId = req.session.userId;
            if (!userId) return res.redirect('/login');

            const userRow = db.prepare(`
                SELECT id, username, email, profile_picture, bio, institution, 
                    academic_level, available_for_messages, is_validated, 
                    created_at, first_name, last_name, full_name
                FROM users WHERE id = ?
            `).get(userId);

            if (!userRow) return res.redirect('/login');

            const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(userId);
            const interests = interestsRows.map(r => r.interest);

            const sourcesAdded = db.prepare('SELECT COUNT(*) as c FROM sources WHERE uploaded_by = ?').get(userId).c || 0;
            const reviewsWritten = db.prepare('SELECT COUNT(*) as c FROM ratings WHERE user_id = ?').get(userId).c || 0;
            const readingLists = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(userId).c || 0;
            const collaborations = db.prepare('SELECT COUNT(*) as c FROM list_collaborators WHERE user_id = ?').get(userId).c || 0;

            const readingStatsRow = db.prepare('SELECT * FROM reading_stats WHERE user_id = ?').get(userId) || {};
            let readingStats = {};
            try {
                if (readingStatsRow.category_distribution) {
                    readingStats = JSON.parse(readingStatsRow.category_distribution);
                }
            } catch (e) { }

            const userData = {
                id: userId,
                username: userRow.username,
                fullName: userRow.full_name || userRow.username,
                academicStatus: userRow.is_validated ? 'Validado' : 'No validado',
                academicDegree: userRow.academic_level || '',
                institution: userRow.institution || '',
                joinDate: userRow.created_at ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                bio: userRow.bio || '',
                availableForMessages: !!userRow.available_for_messages,
                profile_picture: userRow.profile_picture,
                stats: { sourcesAdded, reviewsWritten, readingLists, collaborations },
                readingStats: readingStats,
                recentActivity: [],
                interests: interests,
                lists: db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(userId)
            };

            res.render('profile', {
                title: 'Perfil - Artícora',
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData,
                isOwnProfile: true
            });
        } catch (err) {
            console.error('Error al obtener perfil de usuario:', err);
            return res.redirect('/login');
        }
    });

    // Configuración del perfil
    app.get('/profile/config', IsRegistered, (req, res) => {
        const userId = req.session.userId;
        const db = req.db;
        if (!userId) return res.redirect('/login');

        const userRow = db.prepare(`
        SELECT id, username, email, profile_picture, bio, institution, 
               academic_level, available_for_messages, first_name, last_name
        FROM users WHERE id = ?
    `).get(userId);

        const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(userId);
        const interests = interestsRows.map(r => r.interest);

        const userData = {
            username: userRow.username,
            email: (function(){ try { return decryptEmail(userRow.email, req.app); } catch(e) { console.error('Email decryption failed:', e); return userRow.email; } })(),
            bio: userRow.bio || '',
            first_name: userRow.first_name || '',
            last_name: userRow.last_name || '',
            institution: userRow.institution || '',
            academicDegree: userRow.academic_level || '',
            availableForMessages: !!userRow.available_for_messages,
            profile_picture: userRow.profile_picture || null,
            interests: interests
        };

        res.render('profile-config', {
            title: 'Configuración del Perfil - Artícora',
            currentPage: 'profile-config',
            cssFile: 'profile-config.css',
            jsFile: 'profile-config.js',
            user: userData
        });
    });

    // Perfil de otro usuario 
    // ⚠️⚠️ (Animal: esto va al final pq sino detecta 'profile' como un ID) ⚠️⚠️
    app.get('/profile/:id', IsRegistered, (req, res) => {
        const currentUserId = req.session.userId;
        const profileId = parseInt(req.params.id, 10);

        if (isNaN(profileId)) {
            return res.status(400).send('ID inválido');
        }

        if (profileId === currentUserId) {
            return res.redirect('/profile');
        }

        try {
            const db = req.db;

            const userRow = db.prepare(`
            SELECT id, username, email, profile_picture, bio, institution, 
                   academic_level, available_for_messages, is_validated, 
                   created_at, first_name, last_name, full_name
            FROM users WHERE id = ? AND account_active = 1
        `).get(profileId);

            if (!userRow) return res.status(404).send('Usuario no encontrado');

            const sourcesAdded = db.prepare('SELECT COUNT(*) as c FROM sources WHERE uploaded_by = ?').get(profileId).c || 0;
            const reviewsWritten = db.prepare('SELECT COUNT(*) as c FROM ratings WHERE user_id = ?').get(profileId).c || 0;
            const readingLists = db.prepare('SELECT COUNT(*) as c FROM curatorial_lists WHERE user_id = ?').get(profileId).c || 0;
            const collaborations = db.prepare('SELECT COUNT(*) as c FROM list_collaborators WHERE user_id = ?').get(profileId).c || 0;

            const interestsRows = db.prepare('SELECT interest FROM user_interests WHERE user_id = ?').all(profileId);
            const interests = interestsRows.map(r => r.interest);

            const contactExists = db.prepare(`
            SELECT 1 FROM confirmed_contacts
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        `).get(currentUserId, profileId, profileId, currentUserId);

            const pendingRequest = db.prepare(`
            SELECT id, sender_id FROM contact_requests
            WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
            AND status = 'pending'
        `).get(currentUserId, profileId, profileId, currentUserId);

            const userData = {
                id: userRow.id,
                username: userRow.username,
                fullName: userRow.full_name || userRow.username,
                academicStatus: userRow.is_validated ? 'Validado' : 'No validado',
                academicDegree: userRow.academic_level || '',
                institution: userRow.institution || '',
                joinDate: userRow.created_at ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
                bio: userRow.bio || '',
                availableForMessages: !!userRow.available_for_messages,
                profilePicture: userRow.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userRow.full_name || userRow.username)}&background=2c1810&color=e0d6c2`,
                stats: { sourcesAdded, reviewsWritten, readingLists, collaborations },
                interests: interests,
                canSendRequest: userRow.available_for_messages && !contactExists && !pendingRequest,
                hasPendingRequest: !!pendingRequest,
                lists: db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(profileId),
                pendingRequestSentByMe: pendingRequest && pendingRequest.sender_id === currentUserId,
                recentActivity: []
            };

            res.render('profile', {
                title: `Perfil de ${userData.fullName} - Artícora`,
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData,
                isOwnProfile: false
            });
        } catch (err) {
            console.error('Error al cargar perfil ajeno:', err);
            res.status(500).send('Error interno');
        }
    });
};