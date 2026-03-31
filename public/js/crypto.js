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