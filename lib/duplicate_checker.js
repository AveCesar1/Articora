const normalize = (s) => {
  if (!s) return '';
  try {
    return s.toString().toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    // fallback for environments without \p{Diacritic}
    return s.toString().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};

function tokensFromTitle(title) {
  const n = normalize(title);
  if (!n) return new Set();
  const parts = n.split(' ').filter(Boolean).filter(w => w.length > 2);
  return new Set(parts);
}

function jaccard(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  aSet.forEach(v => { if (bSet.has(v)) inter++; });
  const uni = new Set([...aSet, ...bSet]).size;
  return uni === 0 ? 0 : (inter / uni);
}

function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp = Array(la + 1).fill(null).map(() => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[la][lb];
}

async function runDuplicateChecks(db) {
  try {
    if (!db) throw new Error('database instance required');

    // Load active sources (limit to 1000 to avoid O(n^2) explosion)
    const rows = db.prepare('SELECT id, title, publication_year FROM sources WHERE is_active = 1 ORDER BY id DESC LIMIT 1000').all();

    // Precompute tokens
    const items = rows.map(r => ({ id: r.id, title: r.title || '', year: r.publication_year || null, tokens: tokensFromTitle(r.title) }));

    const pairEdges = []; // {a,b,score,levSim}

    // Build candidate edges
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const score = jaccard(a.tokens, b.tokens);
        const normA = normalize(a.title || '');
        const normB = normalize(b.title || '');
        const lev = levenshtein(normA, normB);
        const maxL = Math.max(1, Math.max(normA.length, normB.length));
        const levSim = 1 - (lev / maxL);

        // Heuristics for an edge
        const isEdge = ((a.year && b.year && a.year === b.year && (score >= 0.35 || levSim >= 0.75)) || score >= 0.70);
        if (isEdge) {
          pairEdges.push({ a: a.id, b: b.id, score, levSim });
        }
      }
    }

    // Build adjacency and find connected components using BFS
    const adj = {};
    pairEdges.forEach(e => {
      adj[e.a] = adj[e.a] || new Set();
      adj[e.b] = adj[e.b] || new Set();
      adj[e.a].add(e.b);
      adj[e.b].add(e.a);
    });

    const visited = new Set();
    const groups = {};
    Object.keys(adj).forEach(nodeKey => {
      const node = Number(nodeKey);
      if (visited.has(node)) return;
      const queue = [node];
      const comp = new Set();
      visited.add(node);
      while (queue.length) {
        const cur = queue.shift();
        comp.add(cur);
        const neighbors = adj[cur] || new Set();
        neighbors.forEach(n => {
          if (!visited.has(n)) { visited.add(n); queue.push(n); }
        });
      }
      if (comp.size >= 2) groups[node] = comp;
    });

    const createdAlerts = [];
    // For each connected component with size >= 2, create a single alert
    Object.keys(groups).forEach(root => {
      const idsArr = Array.from(groups[root]).sort((a,b) => a - b);
      if (idsArr.length < 2) return;

      // Check if there's already an unresolved alert that mentions the exact set (parse details server-side to avoid false matches)
      const unresolvedAlerts = db.prepare("SELECT id, details FROM system_alerts WHERE alert_type = 'duplicate-detection' AND resolved_at IS NULL").all();
      let already = false;
      for (const a of unresolvedAlerts) {
        try {
          const d = a.details ? JSON.parse(a.details) : {};
          const existingIds = d.sourceIds || d.ids || d.source_ids || [];
          if (Array.isArray(existingIds)) {
            const sortedExisting = existingIds.map(Number).sort((x,y)=>x-y);
            const sortedIds = idsArr.slice().sort((x,y)=>x-y);
            if (JSON.stringify(sortedExisting) === JSON.stringify(sortedIds)) { already = true; break; }
          }
        } catch (e) {
          // ignore parse errors
        }
      }
      if (already) return;

      // Compute an aggregate similarity (max of pair scores * 100)
      const relevantPairs = pairEdges.filter(pe => idsArr.includes(pe.a) && idsArr.includes(pe.b));
      const agg = relevantPairs.length ? Math.round(Math.max(...relevantPairs.map(p => p.score)) * 100) : 0;
      const description = `Posible duplicado detectado entre fuentes ${idsArr.map(i => '#' + i).join(', ')} (similitud ${agg}%). Revisa y fusiona si corresponde.`;
      const titles = idsArr.map(id => (items.find(it => it.id === id) || {}).title || '');
      const details = JSON.stringify({ sourceIds: idsArr, titles, similarity: agg });
      db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run('duplicate-detection', 'medium', description, details);
      createdAlerts.push({ ids: idsArr, similarity: agg });
    });

    return { success: true, created: createdAlerts.length, alerts: createdAlerts };
  } catch (e) {
    console.error('duplicate_checker error', e && e.message);
    return { success: false, error: String(e && e.message) };
  }
}

module.exports = { runDuplicateChecks };
