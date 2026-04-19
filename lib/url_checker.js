const http = require('http');
const https = require('https');

function checkUrlOnce(targetUrl, timeout = 10000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === 'https:' ? https : http;
      const opts = {
        method: 'GET',
        headers: { 'User-Agent': 'Articora-url-checker/1.0' },
        timeout
      };

      const req = lib.request(parsed, opts, (res) => {
        const status = res.statusCode || 0;
        // consume and discard body
        res.on('data', () => {});
        res.on('end', () => {
          resolve({ ok: status >= 200 && status < 400, statusCode: status });
        });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: String(err && err.message) });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'timeout' });
      });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: String(e && e.message) });
    }
  });
}

async function runDailyUrlChecks(db) {
  try {
    if (!db) throw new Error('database instance required');

    // Ensure monitoring table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS url_monitors (
        url_id INTEGER PRIMARY KEY,
        consecutive_errors INTEGER DEFAULT 0,
        first_error_at TIMESTAMP,
        last_error_at TIMESTAMP,
        last_status INTEGER,
        last_checked TIMESTAMP,
        FOREIGN KEY (url_id) REFERENCES source_urls(id) ON DELETE CASCADE
      )
    `).run();

    const urls = db.prepare('SELECT id, source_id, url, last_checked, is_active FROM source_urls').all();
    const now = new Date();

    for (const u of urls) {
      const urlId = u.id;
      const sourceId = u.source_id;
      const urlStr = u.url;

      let result = await checkUrlOnce(urlStr, 12000);

      // Normalize result
      const status = result.statusCode || null;
      const ok = !!result.ok;

      const monitor = db.prepare('SELECT * FROM url_monitors WHERE url_id = ?').get(urlId);
      let lastChecked = monitor && monitor.last_checked ? new Date(monitor.last_checked) : null;
      let daysSinceLast = null;
      if (lastChecked) {
        daysSinceLast = Math.floor((now - lastChecked) / (24 * 60 * 60 * 1000));
      }

      let newConsecutive = 0;
      let firstErrorAt = monitor && monitor.first_error_at ? monitor.first_error_at : null;

      if (!ok) {
        // If we checked yesterday (daysSinceLast === 1) continue the streak, otherwise restart
        if (monitor && daysSinceLast === 1) newConsecutive = (monitor.consecutive_errors || 0) + 1;
        else newConsecutive = 1;
        if (!firstErrorAt) firstErrorAt = (new Date()).toISOString();
        db.prepare(`INSERT INTO url_monitors (url_id, consecutive_errors, first_error_at, last_error_at, last_status, last_checked)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(url_id) DO UPDATE SET consecutive_errors = ?, first_error_at = ?, last_error_at = ?, last_status = ?, last_checked = datetime('now')
        `).run(urlId, newConsecutive, firstErrorAt, new Date().toISOString(), status, newConsecutive, firstErrorAt, new Date().toISOString(), status);
      } else {
        // success: reset consecutive counter
        db.prepare(`INSERT INTO url_monitors (url_id, consecutive_errors, first_error_at, last_error_at, last_status, last_checked)
                    VALUES (?, 0, NULL, NULL, ?, datetime('now'))
                    ON CONFLICT(url_id) DO UPDATE SET consecutive_errors = 0, first_error_at = NULL, last_error_at = NULL, last_status = ?, last_checked = datetime('now')
        `).run(urlId, status, status);
        newConsecutive = 0;
      }

      // If we have reached persistent failure (3 dias consecutivos), disable the url and create an alert
      try {
        if (newConsecutive >= 3 && u.is_active) {
          // Avoid duplicate unresolved alerts for same url
          const existingAlert = db.prepare("SELECT id FROM system_alerts WHERE alert_type = 'broken-url' AND resolved_at IS NULL AND details LIKE ? LIMIT 1").get('%"url_id":' + urlId + '%');
          if (!existingAlert) {
            // disable the url
            db.prepare('UPDATE source_urls SET is_active = 0, last_checked = datetime(\'now\') WHERE id = ?').run(urlId);

            const desc = `La URL ${urlStr} en la fuente #${sourceId} ha presentado errores HTTP persistentes (${status}). Se ha desactivado automáticamente.`;
            const details = JSON.stringify({ url_id: urlId, source_id: sourceId, url: urlStr, status: status, consecutive_errors: newConsecutive, first_error_at: firstErrorAt });
            db.prepare('INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run('broken-url', 'high', desc, details);
            if (global && global.debugging) console.log('[url_checker] created broken-url alert for url_id', urlId);
          }
        }
      } catch (e) {
        console.error('url_checker inner error', e && e.message);
      }
    }

    if (global && global.debugging) console.log('[url_checker] runDailyUrlChecks complete');
    return { success: true };
  } catch (e) {
    console.error('runDailyUrlChecks error', e && e.message);
    return { success: false, error: String(e && e.message) };
  }
}

module.exports = { runDailyUrlChecks };
