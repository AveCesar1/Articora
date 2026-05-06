const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getVerificationKey() {
    // If env var provided, accept hex or base64 encoding (32 bytes required)
    if (process.env.ENCRYPTION_KEY) {
        let keyBuffer = null;
        try {
            keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
            if (keyBuffer.length !== 32) keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
        } catch (e) {
            try { keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'base64'); } catch (e2) { keyBuffer = null; }
        }
        if (keyBuffer && keyBuffer.length === 32) return keyBuffer;
        // If key is present but invalid, fail hard in production, but in development
        // fall back to a persistent development key so restarts don't break decrypts.
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY invalid (must be 32 bytes, hex or base64)');
        }
        console.warn('[encryption_key] ENCRYPTION_KEY present but invalid; falling back to development persistent key. Set a proper ENCRYPTION_KEY in production.');
    }

    // Development fallback: persist a random key to secure_storage so restarts keep the same key.
    const storage = process.env.VERIFY_DIR ? path.dirname(process.env.VERIFY_DIR) : path.join(__dirname, '..', '..', 'secure_storage');
    try { fs.mkdirSync(storage, { recursive: true, mode: 0o700 }); } catch (e) { /* ignore */ }
    const keyFile = path.join(storage, 'encryption_key.bin');
    try {
        if (fs.existsSync(keyFile)) {
            const existing = fs.readFileSync(keyFile);
            if (existing && existing.length === 32) return existing;
        }
        const newKey = crypto.randomBytes(32);
        fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
        return newKey;
    } catch (e) {
        throw new Error('Could not create/read development encryption key: ' + String(e && e.message));
    }
}

module.exports = { getVerificationKey };
