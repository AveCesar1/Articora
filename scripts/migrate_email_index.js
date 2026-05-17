#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { db } = require('../lib/database');
const { decryptEmail, emailIndex } = require('../lib/crypto_utils');

async function run() {
    console.log('Starting email_index migration');

    try {
        const cols = db.prepare("PRAGMA table_info(users)").all();
        const hasEmailIndex = cols.some(c => c && c.name === 'email_index');

        if (!hasEmailIndex) {
            console.log('Adding column email_index to users...');
            try {
                db.prepare('ALTER TABLE users ADD COLUMN email_index TEXT').run();
                console.log('Column added');
            } catch (e) {
                console.error('Failed to add column email_index:', e && e.message);
                process.exit(1);
            }
        } else {
            console.log('email_index column already exists');
        }

        // Check if index key available
        const key = process.env.EMAIL_INDEX_KEY || process.env.EMAIL_ENC_KEY;
        if (!key) {
            console.error('No EMAIL_INDEX_KEY or EMAIL_ENC_KEY configured in environment. Aborting population step.');
            console.log('You can still run the script later after setting EMAIL_INDEX_KEY.');
            process.exit(1);
        }

        const rows = db.prepare('SELECT id, email, email_index FROM users').all();
        let updated = 0;
        for (const r of rows) {
            try {
                if (r.email_index) continue; // already populated
                if (!r.email) continue;
                const plain = decryptEmail(r.email, { locals: { emailEncryptionKey: process.env.EMAIL_ENC_KEY } });
                const idx = emailIndex(plain, { locals: { emailIndexKey: process.env.EMAIL_INDEX_KEY, emailEncryptionKey: process.env.EMAIL_ENC_KEY } });
                db.prepare('UPDATE users SET email_index = ? WHERE id = ?').run(idx, r.id);
                updated++;
            } catch (e) {
                console.warn(`Skipping user id=${r.id} due to decrypt/index error: ${e && e.message}`);
            }
        }

        console.log(`Population complete. Updated ${updated} rows.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err && err.stack);
        process.exit(1);
    }
}

run();
