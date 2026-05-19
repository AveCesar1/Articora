const crypto = require('crypto');
const fs = require('fs');

const inputFile = process.argv[2];
const outputFile = process.argv[3];
const keyHex = process.env.ENCRYPTION_KEY;

if (!inputFile || !outputFile || !keyHex) {
    console.error('Usage: ENCRYPTION_KEY=<hex> node decrypt-backup.js backup.enc output.db');
    process.exit(1);
}

const key = Buffer.from(keyHex, 'hex');
const encryptedData = fs.readFileSync(inputFile);

// First 16 bytes = IV
const iv = encryptedData.subarray(0, 16);
const ciphertext = encryptedData.subarray(16);

const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

fs.writeFileSync(outputFile, decrypted);
console.log(`Decrypted to ${outputFile}`);

/*
RUN:
    export ENCRYPTION_KEY="{key}"
    node decrypt-backup.js {input}.db.enc {output}.db
*/