const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'database', 'articora.db');
console.log('Using DB path:', dbPath);

let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.error('Could not open DB:', e.message);
  process.exit(1);
}

function check(sql) {
  try {
    db.prepare(sql);
    console.log('OK:', sql.split(/\s+/).slice(0,6).join(' '));
  } catch (e) {
    console.error('ERROR preparing SQL:', e.message);
    console.error(sql);
    process.exit(1);
  }
}

const sqls = [
  "SELECT 1 FROM list_collaborators WHERE list_id = ? AND user_id = ? AND status = 'accepted'",
  "SELECT s.id, s.title, s.publication_year as year, s.cover_image_url as cover, s.overall_rating as rating, s.is_active, s.uploaded_by, c.name as category, ls.added_at as addedDate, ls.sort_order as sort_order FROM list_sources ls JOIN sources s ON ls.source_id = s.id LEFT JOIN categories c ON s.category_id = c.id WHERE ls.list_id = ? ORDER BY COALESCE(ls.sort_order, ls.added_at) ASC"
];

sqls.forEach(check);

try { db.close(); } catch (e) {}
console.log('Done');
