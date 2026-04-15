// Cifrado E2E con Web Crypto API

// ==================== RSA Key Management ====================
async function generateRSAKeyPair() {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]), // 65537
            hash: "SHA-256"
        },
        true, // extractable (para poder exportar)
        ["encrypt", "decrypt"]
    );
}

// Exporta la clave pública en formato SPKI (Base64)
async function exportPublicKey(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(exported);
}

// Importa una clave pública desde SPKI Base64
async function importPublicKey(base64Key) {
    const buffer = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        "spki",
        buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

// Exporta la clave privada en formato PKCS8 (Base64)
async function exportPrivateKey(privateKey) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    return arrayBufferToBase64(exported);
}

// Importa una clave privada desde PKCS8 Base64
async function importPrivateKey(base64Key) {
    const buffer = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        "pkcs8",
        buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );
}

// ==================== AES Symmetric Encryption ====================
async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
        { name: "AES-CBC", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Exporta clave AES en formato raw (ArrayBuffer)
async function exportAESKey(aesKey) {
    return await window.crypto.subtle.exportKey("raw", aesKey);
}

// Importa clave AES desde raw (ArrayBuffer)
async function importAESKey(rawKey) {
    return await window.crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "AES-CBC" },
        true,
        ["encrypt", "decrypt"]
    );
}

// Cifra un mensaje con AES-CBC, devuelve { iv, encryptedContent }
async function encryptAES(aesKey, plaintext) {
    const iv = window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes para AES-CBC
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        aesKey,
        data
    );
    return {
        iv: arrayBufferToBase64(iv),
        encryptedContent: arrayBufferToBase64(encrypted)
    };
}

// Descifra un mensaje con AES-CBC
async function decryptAES(aesKey, ivBase64, encryptedBase64) {
    const iv = base64ToArrayBuffer(ivBase64);
    const encrypted = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        aesKey,
        encrypted
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

// ==================== Password-based key derivation (PBKDF2) & AES-GCM for private key storage
async function deriveKeyFromPassword(password, saltBase64, iterations = 100000) {
    const enc = new TextEncoder();
    const pwKey = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    const saltBuf = base64ToArrayBuffer(saltBase64);
    return await window.crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBuf, iterations, hash: 'SHA-256' },
        pwKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt a PKCS8 private key (base64) with a password. Returns ciphertext (without tag), iv, salt and tag (all base64).
async function encryptPrivateKeyWithPassword(privateKeyBase64, password, iterations = 100000) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const saltB64 = arrayBufferToBase64(salt.buffer);
    const key = await deriveKeyFromPassword(password, saltB64, iterations);

    const plaintext = base64ToArrayBuffer(privateKeyBase64);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, tagLength: 128 },
        key,
        plaintext
    );

    const encryptedArr = new Uint8Array(encrypted);
    const tag = encryptedArr.slice(encryptedArr.length - 16);
    const ciphertext = encryptedArr.slice(0, encryptedArr.length - 16);

    return {
        encryptedPrivateKey: arrayBufferToBase64(ciphertext.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        salt: saltB64,
        tag: arrayBufferToBase64(tag.buffer)
    };
}

// Decrypt a previously encrypted private key using the password and stored salt/iv/tag.
// Returns the private key as base64 (PKCS8) if successful.
async function decryptPrivateKeyWithPassword(password, saltBase64, ivBase64, ciphertextBase64, tagBase64, iterations = 100000) {
    const key = await deriveKeyFromPassword(password, saltBase64, iterations);
    const iv = base64ToArrayBuffer(ivBase64);
    const ct = base64ToArrayBuffer(ciphertextBase64);
    const tag = base64ToArrayBuffer(tagBase64);

    const ctArr = new Uint8Array(ct);
    const tagArr = new Uint8Array(tag);
    const combined = new Uint8Array(ctArr.length + tagArr.length);
    combined.set(ctArr, 0);
    combined.set(tagArr, ctArr.length);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv), tagLength: 128 },
        key,
        combined.buffer
    );
    return arrayBufferToBase64(decrypted);
}

// ==================== RSA Encryption of AES Key ====================
// Cifra una clave AES (raw) con una clave pública RSA
async function encryptAESKeyWithRSA(publicKey, aesRawKey) {
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        aesRawKey
    );
    return arrayBufferToBase64(encrypted);
}

// Descifra una clave AES (raw) con una clave privada RSA
async function decryptAESKeyWithRSA(privateKey, encryptedBase64) {
    const encrypted = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encrypted
    );
    return new Uint8Array(decrypted);
}

// ==================== Utilidades de conversión ====================
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function decryptAESBuffer(aesKey, ivBase64, encryptedBase64) {
    const iv = base64ToArrayBuffer(ivBase64);
    const encrypted = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        aesKey,
        encrypted
    );
    return decrypted; // ArrayBuffer
}