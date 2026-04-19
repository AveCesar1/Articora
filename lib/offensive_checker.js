// Simple offensive-language scanner for comments/messages
const DEFAULT_TERMS = ['idiota','estupido','estúpido','imbecil','imbécil','tonto','inútil'];

function stripDiacritics(str) {
  if (!str) return '';
  try {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  } catch (e) {
    // fallback: remove common accents
    return str.replace(/[\u0300-\u036f]/g, '');
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runCommentChecks(db) {
  try {
    if (!db) throw new Error('database instance required');

    // Load offensive dictionary from system_config
    let cfg = db.prepare("SELECT config_value FROM system_config WHERE config_key = ?").get('offensive_dictionary');
    let terms = [];
    if (cfg && cfg.config_value) {
      terms = String(cfg.config_value).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (!terms || terms.length === 0) terms = DEFAULT_TERMS.slice();

    // Normalize terms (diacritics removed, lowercased)
    const normalizedTerms = terms.map(t => stripDiacritics(t.toLowerCase()));

    // Fetch all comments that are not null
    const rows = db.prepare('SELECT id, source_id, user_id, comment, created_at FROM ratings WHERE comment IS NOT NULL').all();
    let created = 0;
    for (const r of rows) {
      const commentText = r.comment || '';
      const norm = stripDiacritics(String(commentText).toLowerCase());
      // Skip short comments
      if (!norm || norm.length < 3) continue;

      // Check each term
      let matchedTerm = null;
      for (const t of normalizedTerms) {
        if (!t) continue;
        const re = new RegExp('\\b' + escapeRegExp(t) + '\\b', 'u');
        if (re.test(norm)) { matchedTerm = t; break; }
      }
      if (!matchedTerm) continue;

      // Avoid duplicate unresolved alerts for same comment
      const existing = db.prepare("SELECT id FROM system_alerts WHERE alert_type = 'offensive-language' AND resolved_at IS NULL AND details LIKE ? LIMIT 1").get('%"comment_id":' + r.id + '%');
      if (existing) continue;

      const snippet = commentText.length > 200 ? (commentText.substring(0, 200) + '...') : commentText;
      const description = `Lenguaje ofensivo detectado en comentario #${r.id} (usuario #${r.user_id}). Fragmento: "${snippet}"`;
      const details = JSON.stringify({ comment_id: r.id, user_id: r.user_id, source_id: r.source_id, snippet, detected_term: matchedTerm });
      db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('offensive-language', 'high', description, details);
      created += 1;
    }

    return { success: true, created };
  } catch (e) {
    console.error('runCommentChecks error', e && e.message);
    return { success: false, error: String(e && e.message) };
  }
}

module.exports = { runCommentChecks };
