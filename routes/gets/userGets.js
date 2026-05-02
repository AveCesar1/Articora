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
                        // keys in stored distribution may be category_id (numeric) or category name
                        const topKey = entries[0][0];
                        let categoryName = topKey;
                        // if key looks like an id, fetch name
                        if (/^\d+$/.test(String(topKey))) {
                            const catRow = db.prepare('SELECT name FROM categories WHERE id = ?').get(parseInt(topKey, 10)) || {};
                            categoryName = catRow.name || String(topKey);
                        }
                        recentStudyTopic.category = categoryName;
                        recentStudyTopic.percentage = total ? Math.round((entries[0][1] / total) * 100) : 0;
                        recentStudyTopic.recentReadings = entries[0][1] || 0;
                        recentStudyTopic.color = (req.app.locals.categoryColorMap && req.app.locals.categoryColorMap[categoryName]) || '#6c757d';
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

            // Get recent activity (last readings, uploads, reviews)
            const recentReadings = db.prepare(`
                SELECT s.title, c.name as category, ur.added_at
                FROM user_readings ur
                JOIN sources s ON ur.source_id = s.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE ur.user_id = ? AND ur.status = 'read'
                ORDER BY ur.added_at DESC
                LIMIT 5
            `).all(userId) || [];

             const recentUploads = db.prepare(`
                SELECT title, created_at
                FROM sources
                WHERE uploaded_by = ?
                ORDER BY created_at DESC
                LIMIT 5
            `).all(userId) || [];

            const recentReviews = db.prepare(`
                SELECT s.title, r.created_at
                FROM ratings r
                JOIN sources s ON r.source_id = s.id
                WHERE r.user_id = ?
                ORDER BY r.created_at DESC
                LIMIT 5
            `).all(userId) || [];
            
            const recentActivity = []
                .concat(recentReadings.map(r => ({ type: 'reading', title: r.title, category: r.category || 'General', date: r.added_at })))
                .concat(recentUploads.map(u => ({ type: 'upload', title: u.title, date: u.created_at })))
                .concat(recentReviews.map(rev => ({ type: 'review', title: rev.title, date: rev.created_at })))
                .sort((a,b) => new Date(b.date) - new Date(a.date))
                .slice(0,5);

            // Load user dashboard settings (if any)
            const uds = db.prepare('SELECT * FROM user_dashboard_settings WHERE user_id = ?').get(userId) || {};
            const dashboardSettings = {
                radarChartPublic: !!uds.radar_chart_public,
                showRecentStudy: typeof uds.show_recent_study !== 'undefined' ? !!uds.show_recent_study : true,
                showMyReferences: typeof uds.show_my_references !== 'undefined' ? !!uds.show_my_references : true,
                showMostRead: typeof uds.show_most_read !== 'undefined' ? !!uds.show_most_read : true,
                showGlobalTrends: typeof uds.show_global_trends !== 'undefined' ? !!uds.show_global_trends : true,
                widgetOrder: (uds.widget_order ? (function(){ try { return JSON.parse(uds.widget_order); } catch(e){ return ['recent_study','my_references','most_read','global_trends']; } })() : ['recent_study','my_references','most_read','global_trends'])
            };

            const dashboardData = {
                userStats: { totalReadings, uploadedSources, completedReadings, activeDays },
                recentStudyTopic,
                myReferences,
                mostReadTopic,
                globalTrends: globalTrends.map(g => ({ id: g.id, title: g.title, authors: g.authors ? String(g.authors).split(',') : [], category: g.category || 'General', reads: g.reads || 0, trend: 'stable' })),
                recentReadings,
                recentActivity,
                readingHistory: { last30Days, categories: [], categoryDistribution: [] },
                dashboardSettings
            };

            const username = req.session.username || 'usuario';

            res.render('dashboard', {
                title: 'Dashboard - Artícora',
                currentPage: 'dashboard',
                cssFile: 'dashboard.css',
                data: dashboardData,
                user: { id: userId, username: username }
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
                readingStats = Object.assign({ 'Empty': 0 }, readingStats);
            } catch (e) { 
                console.error('Error parsing readingStats for user', userId, e && e.message);
                readingStats = {'Empty': 1}; // fallback to avoid breaking frontend
            }

            // Get recent activity (last readings, uploads, reviews)
            const recentReadings = db.prepare(`
                SELECT s.title, c.name as category, ur.added_at
                FROM user_readings ur
                JOIN sources s ON ur.source_id = s.id
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE ur.user_id = ? AND ur.status = 'read'
                ORDER BY ur.added_at DESC
                LIMIT 5
            `).all(userId) || [];

             const recentUploads = db.prepare(`
                SELECT title, created_at
                FROM sources
                WHERE uploaded_by = ?
                ORDER BY created_at DESC
                LIMIT 5
            `).all(userId) || [];

            const recentReviews = db.prepare(`
                SELECT s.title, r.created_at
                FROM ratings r
                JOIN sources s ON r.source_id = s.id
                WHERE r.user_id = ?
                ORDER BY r.created_at DESC
                LIMIT 5
            `).all(userId) || [];
            
            const recentActivity = []
                .concat(recentReadings.map(r => ({ type: 'reading', title: r.title, category: r.category || 'General', date: r.added_at })))
                .concat(recentUploads.map(u => ({ type: 'upload', title: u.title, date: u.created_at })))
                .concat(recentReviews.map(rev => ({ type: 'review', title: rev.title, date: rev.created_at })))
                .sort((a,b) => new Date(b.date) - new Date(a.date))
                .slice(0,5);
            

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
                recentActivity: recentActivity,
                interests: interests,
                lists: db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(userId)
            };

            // Load dashboard settings for profile-config prefill
            try {
                const uds = db.prepare('SELECT * FROM user_dashboard_settings WHERE user_id = ?').get(userId) || {};
                const dashboardSettings = {
                    radarChartPublic: !!uds.radar_chart_public,
                    showRecentStudy: typeof uds.show_recent_study !== 'undefined' ? !!uds.show_recent_study : true,
                    showMyReferences: typeof uds.show_my_references !== 'undefined' ? !!uds.show_my_references : true,
                    showMostRead: typeof uds.show_most_read !== 'undefined' ? !!uds.show_most_read : true,
                    widgetOrder: uds.widget_order ? (function(){ try { return JSON.parse(uds.widget_order); } catch(e){ return ['recent_study','my_references','most_read','global_trends']; } })() : ['recent_study','my_references','most_read','global_trends']
                };
                userData.dashboardSettings = dashboardSettings;
            } catch (e) {
                console.error('Could not load user_dashboard_settings for profile-config', e && e.message);
                userData.dashboardSettings = { radarChartPublic: false, showRecentStudy: true, showMyReferences: true, showMostRead: true, widgetOrder: ['recent_study','my_references','most_read','global_trends'] };
            }

            res.render('profile', {
                title: 'Perfil - Artícora',
                currentPage: 'profile',
                cssFile: 'profile.css',
                jsFile: 'profile.js',
                user: userData,
                isOwnProfile: true,
                canViewFullProfile: true
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

        // Load privacy settings (if table exists). Provide defaults.
        try {
            const ups = db.prepare('SELECT profile_visibility, allow_group_invites, show_institution, show_join_date FROM user_privacy_settings WHERE user_id = ?').get(userId) || {};
            userData.profileVisibility = ups.profile_visibility || 'public';
            userData.allowGroupInvites = typeof ups.allow_group_invites !== 'undefined' ? !!ups.allow_group_invites : true;
            userData.showInstitution = typeof ups.show_institution !== 'undefined' ? !!ups.show_institution : true;
            userData.showJoinDate = typeof ups.show_join_date !== 'undefined' ? !!ups.show_join_date : true;
        } catch (e) {
            userData.profileVisibility = 'public';
            userData.allowGroupInvites = true;
            userData.showInstitution = true;
            userData.showJoinDate = true;
        }

        // Load dashboard settings so profile-config can prefill correctly
        try {
            const uds = db.prepare('SELECT * FROM user_dashboard_settings WHERE user_id = ?').get(userId) || {};
            userData.dashboardSettings = {
                radarChartPublic: !!uds.radar_chart_public,
                showRecentStudy: typeof uds.show_recent_study !== 'undefined' ? !!uds.show_recent_study : true,
                showMyReferences: typeof uds.show_my_references !== 'undefined' ? !!uds.show_my_references : true,
                showMostRead: typeof uds.show_most_read !== 'undefined' ? !!uds.show_most_read : true,
                widgetOrder: uds.widget_order ? (function(){ try { return JSON.parse(uds.widget_order); } catch(e){ return ['recent_study','my_references','most_read','global_trends']; } })() : ['recent_study','my_references','most_read','global_trends']
            };
        } catch (e) {
            console.error('Could not load user_dashboard_settings for profile-config (prefill)', e && e.message);
            userData.dashboardSettings = { radarChartPublic: false, showRecentStudy: true, showMyReferences: true, showMostRead: true, widgetOrder: ['recent_study','my_references','most_read','global_trends'] };
        }

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
    app.get('/profile/:id', (req, res) => {
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

            if (!userRow) return res.status(404).render('404', { 
                errorTitle: 'Usuario no encontrado',
                errorMessage: 'El usuario que buscas no existe o fue eliminado.',
                title: 'Usuario no encontrado - Artícora',
                currentPage: 'post',
                cssFile: '404.css' 
            });

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

            // Load privacy settings for the profile being viewed
            let ups = {};
            try {
                ups = db.prepare('SELECT profile_visibility, allow_group_invites, show_institution, show_join_date FROM user_privacy_settings WHERE user_id = ?').get(profileId) || {};
            } catch (e) { ups = {}; }

            const profileVisibility = ups.profile_visibility || 'public';
            const showInstitution = typeof ups.show_institution !== 'undefined' ? !!ups.show_institution : true;
            const showJoinDate = typeof ups.show_join_date !== 'undefined' ? !!ups.show_join_date : true;

            // Decide visibility
            let canViewFullProfile = true;
            if (profileVisibility === 'private') {
                return res.status(404).render('404', { 
                    errorTitle: 'Usuario no encontrado',
                    errorMessage: 'El usuario que buscas no existe o fue eliminado.',
                    title: 'Usuario no encontrado - Artícora',
                    currentPage: 'post',
                    cssFile: '404.css' 
                });
            } else if (profileVisibility === 'contacts') {
                canViewFullProfile = (currentUserId === profileId) || !!contactExists;
            } else if (profileVisibility === 'registered') {
                canViewFullProfile = !!currentUserId; // IsRegistered middleware ensures true
            } else {
                canViewFullProfile = true;
            }

            // Build a fuller userData similar to /profile (but for another user)
            const userData = {
                id: userRow.id,
                username: userRow.username,
                fullName: canViewFullProfile ? (userRow.full_name || userRow.username) : 'Perfil privado',
                academicStatus: canViewFullProfile ? (userRow.is_validated ? 'Validado' : 'No validado') : '',
                academicDegree: canViewFullProfile ? (userRow.academic_level || '') : 'Atributo privado',
                institution: (canViewFullProfile && showInstitution) ? userRow.institution || 'Error' : 'Atributo privado',
                joinDate: (canViewFullProfile && showJoinDate && userRow.created_at) ? new Date(userRow.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Atributo privado',
                bio: canViewFullProfile ? (userRow.bio || '') : '',
                availableForMessages: !!userRow.available_for_messages,
                profile_picture: userRow.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userRow.full_name || userRow.username)}&background=2c1810&color=e0d6c2`,
                stats: canViewFullProfile ? { sourcesAdded, reviewsWritten, readingLists, collaborations } : { sourcesAdded: 0, reviewsWritten: 0, readingLists: 0, collaborations: 0 },
                interests: canViewFullProfile ? interests : [],
                canSendRequest: userRow.available_for_messages && !contactExists && !pendingRequest,
                hasPendingRequest: !!pendingRequest,
                lists: canViewFullProfile ? db.prepare('SELECT id, title, description, total_sources, total_views FROM curatorial_lists WHERE user_id = ? ORDER BY created_at DESC').all(profileId) : [],
                pendingRequestSentByMe: pendingRequest && pendingRequest.sender_id === currentUserId,
                profileVisibility: profileVisibility,
                canViewFullProfile: canViewFullProfile
            };

            // Recent activity for the public profile
            try {
                const recentReadings = db.prepare(`
                    SELECT s.title, c.name as category, ur.added_at
                    FROM user_readings ur
                    JOIN sources s ON ur.source_id = s.id
                    LEFT JOIN categories c ON s.category_id = c.id
                    WHERE ur.user_id = ? AND ur.status = 'read'
                    ORDER BY ur.added_at DESC
                    LIMIT 5
                `).all(profileId) || [];

                const recentUploads = db.prepare(`
                    SELECT title, created_at
                    FROM sources
                    WHERE uploaded_by = ?
                    ORDER BY created_at DESC
                    LIMIT 5
                `).all(profileId) || [];

                const recentReviews = db.prepare(`
                    SELECT s.title, r.created_at
                    FROM ratings r
                    JOIN sources s ON r.source_id = s.id
                    WHERE r.user_id = ?
                    ORDER BY r.created_at DESC
                    LIMIT 5
                `).all(profileId) || [];

                userData.recentActivity = [].concat(
                    recentReadings.map(r => ({ type: 'reading', title: r.title, category: r.category || 'General', date: r.added_at })),
                    recentUploads.map(u => ({ type: 'upload', title: u.title, date: u.created_at })),
                    recentReviews.map(rev => ({ type: 'review', title: rev.title, date: rev.created_at }))
                ).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
            } catch (e) {
                console.error('Could not load recentActivity for profile view', e && e.message);
                userData.recentActivity = [];
            }

            // Reading stats: transform category_distribution into an ordered array [1..8]
            try {
                const readingStatsRow = db.prepare('SELECT * FROM reading_stats WHERE user_id = ?').get(profileId) || {};
                let dist = {};
                if (readingStatsRow && readingStatsRow.category_distribution) {
                    try { dist = JSON.parse(readingStatsRow.category_distribution); } catch(e) { dist = {}; }
                }
                const readingStatsArr = new Array(8).fill(0);
                Object.keys(dist).forEach(k => {
                    const idx = parseInt(k, 10) - 1;
                    if (!Number.isNaN(idx) && idx >= 0 && idx < 8) readingStatsArr[idx] = dist[k] || 0;
                });
                userData.readingStats = readingStatsArr;
            } catch (e) {
                console.error('Could not compute readingStats for profile view', e && e.message);
                userData.readingStats = new Array(8).fill(0);
            }

            // Load dashboard settings for the profile being viewed
            try {
                const uds = db.prepare('SELECT * FROM user_dashboard_settings WHERE user_id = ?').get(profileId) || {};
                userData.dashboardSettings = {
                    radarChartPublic: !!uds.radar_chart_public,
                    showRecentStudy: typeof uds.show_recent_study !== 'undefined' ? !!uds.show_recent_study : true,
                    showMyReferences: typeof uds.show_my_references !== 'undefined' ? !!uds.show_my_references : true,
                    showMostRead: typeof uds.show_most_read !== 'undefined' ? !!uds.show_most_read : true,
                    widgetOrder: uds.widget_order ? (function(){ try { return JSON.parse(uds.widget_order); } catch(e){ return ['recent_study','my_references','most_read','global_trends']; } })() : ['recent_study','my_references','most_read','global_trends']
                };
            } catch (e) {
                console.error('Could not load user_dashboard_settings for public profile', e && e.message);
                userData.dashboardSettings = { radarChartPublic: false, showRecentStudy: true, showMyReferences: true, showMostRead: true, widgetOrder: ['recent_study','my_references','most_read','global_trends'] };
            }

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