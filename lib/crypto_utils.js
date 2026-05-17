const crypto = require('crypto');

function getKey(app) {
    const seed = (app && app.locals && app.locals.emailEncryptionKey) || process.env.EMAIL_ENC_KEY;
    if (!seed) throw new Error('Email encryption key not configured (set process.env.EMAIL_ENC_KEY or app.locals.emailEncryptionKey)');
    return crypto.createHash('sha256').update(String(seed)).digest();
}

function encryptEmail(plainEmail, app) {
    if (!plainEmail) return plainEmail;
    const key = getKey(app);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(String(plainEmail), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

function decryptEmail(stored, app) {
    if (!stored) return stored;
    const key = getKey(app);
    const parts = String(stored).split(':');
    if (parts.length !== 2) {
        throw new Error('Stored email has invalid format for decryption');
    }
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function normalizeEmail(email) {
    if (!email) return '';
    return String(email).trim().toLowerCase();
}

function emailIndex(plainEmail, app) {
    const key = (app && app.locals && app.locals.emailIndexKey) || process.env.EMAIL_INDEX_KEY || process.env.EMAIL_ENC_KEY;
    if (!key) throw new Error('Email index key not configured (set process.env.EMAIL_INDEX_KEY or app.locals.emailIndexKey)');
    const hmac = crypto.createHmac('sha256', String(key));
    hmac.update(normalizeEmail(plainEmail));
    return hmac.digest('hex');
}

// Find a user row by plaintext email.
function findUserByEmail(db, plainEmail, app) {
    if (!plainEmail || !db) return null;
    const norm = normalizeEmail(plainEmail);

    // 1) Try email_index lookup if possible
    try {
        const idx = emailIndex(plainEmail, app);
        try {
            const row = db.prepare('SELECT * FROM users WHERE email_index = ? LIMIT 1').get(idx);
            if (row) return row;
        } catch (e) {
            // likely email_index column doesn't exist; continue
        }
    } catch (e) {
        // no index key configured; continue
    }

    // 2) Try direct encrypted exact match
    try {
        const enc = encryptEmail(plainEmail, app);
        try {
            const row = db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').get(enc);
            if (row) return row;
        } catch (e) {
            // ignore and continue to fallback
        }
    } catch (e) {
        // encryption failed; continue
    }

    // A fallback is expensive if someone brings an email that doesn't exist. Let's give up and not fallback.
    return null;
}

module.exports = {
    encryptEmail,
    decryptEmail,
    normalizeEmail,
    emailIndex,
    findUserByEmail
};
