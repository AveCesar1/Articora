// chat-crypto: gestión de claves locales y utilidades de carga

// Variables para cifrado
let myPrivateKey = null;
let myPublicKeyBase64 = null;

// Queues y flags globales para manejo de claves y mensajes pendientes
window._messageSendQueue = window._messageSendQueue || [];
window._decryptQueue = window._decryptQueue || [];
window.myKeysReady = window.myKeysReady || false;

async function loadMyKeys() {
    try {
        // Recuperar clave privada
        const storedPrivate = localStorage.getItem('articora_private_key');
        if (!storedPrivate) {
            console.error('No se encontró la clave privada en localStorage. El cifrado no funcionará.');
            showNotification('Error: No se encontró tu clave privada. No podrás descifrar mensajes.', 'error');
            return false;
        }
        myPrivateKey = await importPrivateKey(storedPrivate);
        console.log('Clave privada cargada correctamente');

        // Obtener clave pública (de localStorage o de data.user)
        myPublicKeyBase64 = localStorage.getItem('articora_public_key');
        if (!myPublicKeyBase64 && currentUser.publicKey) {
            myPublicKeyBase64 = currentUser.publicKey;
            // Guardar para futuras sesiones
            localStorage.setItem('articora_public_key', myPublicKeyBase64);
        }
        if (!myPublicKeyBase64) {
            console.warn('No se encontró la clave pública propia. No se podrá cifrar mensajes para uno mismo.');
        }
        // Mark keys as ready for other modules
        window.myKeysReady = true;
        // Notify any listeners waiting for keys
        try { window.dispatchEvent(new Event('myKeysReady')); } catch (e) { }
        return true;
    } catch (err) {
        console.error('Error al cargar claves:', err);
        showNotification('Error al cargar claves de cifrado. Recarga la página.', 'error');
        return false;
    }
}
