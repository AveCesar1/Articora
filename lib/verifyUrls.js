const http = require('http');
const https = require('https');
const { db } = require('./database');

function checkUrl(url, timeout = 10000) {
    return new Promise((resolve) => {
        try {
            const parsed = new URL(url);
            const lib = parsed.protocol === 'https:' ? https : http;
            const options = {
                method: 'GET',
                timeout,
                headers: {
                    'User-Agent': 'Articora-URL-Checker/1.0'
                }
            };

            const req = lib.request(url, options, (res) => {
                // consume and ignore body
                res.on('data', () => {});
                res.on('end', () => {});
                resolve({ status: res.statusCode });
            });

            req.on('error', (err) => {
                resolve({ error: err.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ error: 'timeout' });
            });

            req.end();
        } catch (e) {
            resolve({ error: e.message });
        }
    });
}

async function run() {
    const rows = db.prepare("SELECT id, source_id, url FROM source_urls WHERE is_active = 1").all();
    if (!rows || rows.length === 0) return { checked: 0 };

    for (const row of rows) {
        try {
            const result = await checkUrl(row.url, 10000);

            // record the check
            const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
            if (result.status && result.status < 400) {
                db.prepare("UPDATE source_urls SET last_checked = datetime('now') WHERE id = ?").run(row.id);
                continue;
            }

            const statusCode = result.status || null;
            const description = `Verificación detectó error ${statusCode || result.error || 'network'} para URL ${row.url}`;
            const details = JSON.stringify({ source_id: row.source_id, source_url_id: row.id, url: row.url, status_code: statusCode, error: result.error || null });

            db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('broken-url-check', 'high', description, details);
            db.prepare("UPDATE source_urls SET last_checked = datetime('now') WHERE id = ?").run(row.id);

            // Count broken checks in the last 3 days for this specific source_url_id
            const cntRow = db.prepare("SELECT COUNT(*) as cnt FROM system_alerts WHERE alert_type = ? AND details LIKE ? AND created_at >= datetime('now','-3 days')").get('broken-url-check', '%\"source_url_id\":' + row.id + '%');
            const count = cntRow ? cntRow.cnt : 0;

            if (count >= 3) {
                // deactivate the single URL (not the source)
                db.prepare("UPDATE source_urls SET is_active = 0 WHERE id = ?").run(row.id);
                const remDesc = `URL eliminada automáticamente tras ${count} verificaciones fallidas: ${row.url}`;
                const remDetails = JSON.stringify({ source_id: row.source_id, source_url_id: row.id, url: row.url, reason: '3_consecutive_failures', failed_count: count });
                db.prepare("INSERT INTO system_alerts (alert_type, severity, description, details, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run('broken-url', 'high', remDesc, remDetails);
            }
        } catch (e) {
            console.error('verifyUrls.run error for row', row && row.id, e && e.message);
        }
    }

    return { checked: rows.length };
}

module.exports = { run, checkUrl };
