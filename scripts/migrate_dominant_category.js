const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

(async function() {
    try {
        const dbPath = path.resolve(__dirname, '..', 'database', 'articora.db');
        console.log('DB path:', dbPath);
        if (!fs.existsSync(dbPath)) {
            console.error('Database file not found at', dbPath);
            process.exit(1);
        }

        const db = new Database(dbPath);
        db.pragma('foreign_keys = ON');

        // Check if column exists
        const cols = db.prepare("PRAGMA table_info(curatorial_lists)").all();
        const hasDominant = cols.some(c => c && c.name === 'dominant_category_id');
        if (!hasDominant) {
            console.log('Adding column dominant_category_id to curatorial_lists...');
            try {
                db.prepare('ALTER TABLE curatorial_lists ADD COLUMN dominant_category_id INTEGER').run();
                console.log('Column added.');
            } catch (e) {
                console.warn('Could not add column (it may already exist):', e.message);
            }
        } else {
            console.log('Column dominant_category_id already exists.');
        }

        // Backfill dominant_category_id for each list
        const lists = db.prepare('SELECT id FROM curatorial_lists').all();
        console.log(`Found ${lists.length} lists; computing dominant category for each...`);

        const sel = db.prepare(`
            SELECT s.category_id as cid, COUNT(*) as cnt
            FROM list_sources ls
            JOIN sources s ON ls.source_id = s.id
            WHERE ls.list_id = ?
            GROUP BY s.category_id
            ORDER BY cnt DESC
            LIMIT 1
        `);

        const upd = db.prepare('UPDATE curatorial_lists SET dominant_category_id = ?, updated_at = datetime(\'now\') WHERE id = ?');

        let updated = 0;
        for (const row of lists) {
            const d = sel.get(row.id);
            const domId = d && d.cid ? d.cid : null;
            upd.run(domId, row.id);
            updated++;
        }
        console.log(`Backfilled dominant_category_id for ${updated} lists.`);

        // Apply indexes from database/indexes.sql if present
        const indexesPath = path.resolve(__dirname, '..', 'database', 'indexes.sql');
        if (fs.existsSync(indexesPath)) {
            try {
                const sql = fs.readFileSync(indexesPath, 'utf-8');
                // Execute the file in a simple way
                console.log('Applying indexes from', indexesPath);
                db.exec(sql);
                console.log('Indexes applied.');
            } catch (e) {
                console.warn('Could not apply indexes file:', e.message);
            }
        } else {
            console.log('No indexes.sql found at', indexesPath);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
