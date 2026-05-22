// Offensive-language scanner for comments, list descriptions and user bios
const DEFAULT_TERMS = ['idiota','estupido','estúpido','imbecil','imbécil','tonto','inútil'];

function stripDiacritics(str) {
  if (!str) return '';
  try {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  } catch (e) {
    return str.replace(/[\u0300-\u036f]/g, '');
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasColumn(db, table, column) {
  try {
    const info = db.prepare("PRAGMA table_info('" + table + "')").all();
    return (info || []).some(c => c.name === column);
  } catch (e) { return false; }
}

async function runCommentChecks(db) {
  try {
    if (!db) throw new Error('database instance required');

    // Load offensive terms: prefer offensive_terms table if present
    let terms = [];
    if (hasColumn(db, 'offensive_terms', 'term') || true) {
      try {
        const rows = db.prepare('SELECT term FROM offensive_terms WHERE is_active = 1').all();
        if (rows && rows.length) terms = rows.map(r => String(r.term || '').trim()).filter(Boolean);
      } catch (e) {
        // ignore
      }
    }

    // Fallback to system_config key
    if (!terms.length) {
      try {
        const cfg = db.prepare("SELECT config_value FROM system_config WHERE config_key = ?").get('offensive_dictionary');
        if (cfg && cfg.config_value) {
          terms = String(cfg.config_value).split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch (e) { /* ignore */ }
    }

    if (!terms || terms.length === 0) terms = DEFAULT_TERMS.slice();

    const normalizedTerms = terms.map(t => stripDiacritics(t.toLowerCase())).filter(Boolean);
    if (!normalizedTerms.length) return { success: true, created: 0, checked: 0 };

    // Build a single alternation regex for speed (word boundaries)
    const pattern = '\\b(' + normalizedTerms.map(escapeRegExp).join('|') + ')\\b';
    const re = new RegExp(pattern, 'iu');

    let created = 0;
    let checked = 0;

    // Helper to mark checked status for a table row
    function markChecked(table, idCol, idVal, detected) {
      try {
        const hasChecked = hasColumn(db, table, 'offensive_checked_at');
        const hasFlag = hasColumn(db, table, 'offensive_detected') || hasColumn(db, table, 'offensive_flagged');
        if (hasChecked && hasFlag) {
          const flagCol = hasColumn(db, table, 'offensive_detected') ? 'offensive_detected' : 'offensive_flagged';
          db.prepare(`UPDATE ${table} SET offensive_checked_at = datetime('now'), ${flagCol} = ? WHERE ${idCol} = ?`).run(detected ? 1 : 0, idVal);
        } else if (hasChecked) {
          db.prepare(`UPDATE ${table} SET offensive_checked_at = datetime('now') WHERE ${idCol} = ?`).run(idVal);
        }
      } catch (e) { /* ignore */ }
    }

    // 1) Ratings comments
    try {
      const ratingCols = hasColumn(db, 'ratings', 'offensive_checked_at') ? 'offensive_checked_at' : null;
      // Prefer to re-scan only when updated or never checked
      const rows = db.prepare(`SELECT id, source_id, user_id, comment, created_at, updated_at, offensive_checked_at FROM ratings WHERE comment IS NOT NULL`).all();
      for (const r of rows) {
        const commentText = r.comment || '';
        const norm = stripDiacritics(String(commentText).toLowerCase());
        if (!norm || norm.length < 3) { markChecked('ratings','id', r.id, false); checked++; continue; }

        // skip if checked and not modified
        if (r.offensive_checked_at && r.updated_at) {
          const updated = new Date(r.updated_at).getTime();
          const checkedAt = new Date(r.offensive_checked_at).getTime();
          if (!isNaN(updated) && !isNaN(checkedAt) && updated <= checkedAt) { continue; }
        } else if (r.offensive_checked_at && !r.updated_at) {
          // already checked and no update time — skip
          continue;
        }

        checked++;
        const m = re.exec(norm);
        if (m) {
          const matchedTerm = m[1];
          const snippet = commentText.length > 200 ? (commentText.substring(0, 200) + '...') : commentText;
          const description = `Lenguaje ofensivo detectado en comentario #${r.id} (usuario #${r.user_id}). Fragmento: "${snippet}"`;
          const details = JSON.stringify({ comment_id: r.id, user_id: r.user_id, source_id: r.source_id, snippet, detected_term: matchedTerm });
          db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('offensive-language', 'high', description, details);
          created += 1;
          markChecked('ratings','id', r.id, true);
        } else {
          markChecked('ratings','id', r.id, false);
        }
      }
    } catch (e) { console.error('offensive_checker ratings error', e && e.message); }

    // 2) Curatorial lists (public descriptions)
    try {
      const listRows = db.prepare(`SELECT id, user_id, title, description, updated_at, offensive_checked_at FROM curatorial_lists WHERE is_public = 1`).all();
      for (const r of listRows) {
        const text = (r.description || '') + ' ' + (r.title || '');
        const norm = stripDiacritics(String(text).toLowerCase());
        if (!norm || norm.length < 3) { markChecked('curatorial_lists','id', r.id, false); checked++; continue; }

        if (r.offensive_checked_at && r.updated_at) {
          const updated = new Date(r.updated_at).getTime();
          const checkedAt = new Date(r.offensive_checked_at).getTime();
          if (!isNaN(updated) && !isNaN(checkedAt) && updated <= checkedAt) { continue; }
        } else if (r.offensive_checked_at && !r.updated_at) { continue; }

        checked++;
        const m = re.exec(norm);
        if (m) {
          const matchedTerm = m[1];
          const snippet = (r.description || '').substring(0, 200);
          const description = `Lenguaje ofensivo detectado en lista #${r.id} (usuario #${r.user_id}). Fragmento: "${snippet}"`;
          const details = JSON.stringify({ list_id: r.id, user_id: r.user_id, snippet, detected_term: matchedTerm });
          db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('offensive-language', 'medium', description, details);
          created += 1;
          markChecked('curatorial_lists','id', r.id, true);
        } else {
          markChecked('curatorial_lists','id', r.id, false);
        }
      }
    } catch (e) { console.error('offensive_checker lists error', e && e.message); }

    // 3) User profiles (bio, full_name)
    try {
      const usrRows = db.prepare(`SELECT id, username, full_name, bio, updated_at, offensive_checked_at FROM users WHERE bio IS NOT NULL OR full_name IS NOT NULL`).all();
      for (const r of usrRows) {
        const text = (r.bio || '') + ' ' + (r.full_name || '');
        const norm = stripDiacritics(String(text).toLowerCase());
        if (!norm || norm.length < 3) { markChecked('users','id', r.id, false); checked++; continue; }

        if (r.offensive_checked_at && r.updated_at) {
          const updated = new Date(r.updated_at).getTime();
          const checkedAt = new Date(r.offensive_checked_at).getTime();
          if (!isNaN(updated) && !isNaN(checkedAt) && updated <= checkedAt) { continue; }
        } else if (r.offensive_checked_at && !r.updated_at) { continue; }

        checked++;
        const m = re.exec(norm);
        if (m) {
          const matchedTerm = m[1];
          const snippet = (r.bio || r.full_name || '').substring(0, 200);
          const description = `Lenguaje ofensivo detectado en perfil de usuario #${r.id} (username ${r.username}). Fragmento: "${snippet}"`;
          const details = JSON.stringify({ user_id: r.id, snippet, detected_term: matchedTerm });
          db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('offensive-language', 'medium', description, details);
          created += 1;
          markChecked('users','id', r.id, true);
        } else {
          markChecked('users','id', r.id, false);
        }
      }
    } catch (e) { console.error('offensive_checker users error', e && e.message); }

    return { success: true, created, checked };
  } catch (e) {
    console.error('runCommentChecks error', e && e.message);
    return { success: false, error: String(e && e.message) };
  }
}

module.exports = { runCommentChecks };
