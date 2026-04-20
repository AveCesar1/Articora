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

module.exports = {
    encryptEmail,
    decryptEmail
};
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

module.exports = {
    encryptEmail,
    decryptEmail
};
