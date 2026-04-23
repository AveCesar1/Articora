// chat-files: envío/descarga de archivos y utilidades relacionadas

async function sendFile(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    // 1. Validar tamaño (5 MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('El archivo no puede superar los 5 MB', 'error');
        return;
    }

    // 2. Validar extensión (lista permitida)
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        showNotification('Formato de archivo no permitido', 'error');
        return;
    }

    // 3. Leer el archivo como ArrayBuffer
    const fileBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    let encryptedKeys = {};
    try {
        // 4. Generar clave AES
        const aesKey = await generateAESKey();
        const aesRaw = await exportAESKey(aesKey);

        // 5. Cifrar el contenido del archivo con AES
        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const encryptedFile = await window.crypto.subtle.encrypt(
            { name: 'AES-CBC', iv },
            aesKey,
            fileBuffer
        );
        const encryptedContentBase64 = arrayBufferToBase64(encryptedFile);
        const ivBase64 = arrayBufferToBase64(iv);

        // 6. Cifrar la clave AES para cada participante
        if (currentChat.type === 'group') {
            const participants = currentChat.participants;
            for (const p of participants) {
                if (!p.public_key) continue;
                const pubKey = await importPublicKey(p.public_key);
                const encryptedKey = await encryptAESKeyWithRSA(pubKey, aesRaw);
                encryptedKeys[p.user_id] = encryptedKey;
            }
            if (!encryptedKeys[currentUser.id]) {
                console.log('myPublicKeyBase64:', myPublicKeyBase64);
                const myPublicKey = await importPublicKey(myPublicKeyBase64);
                encryptedKeys[currentUser.id] = await encryptAESKeyWithRSA(myPublicKey, aesRaw);
            }
        } else {
            // Chat individual
            const contact = data.contacts.find(c => c.id === currentChat.id);
            if (!contact || !contact.publicKey) throw new Error('No se encontró clave pública del destinatario');
            const recipientPubKey = await importPublicKey(contact.publicKey);
            const myPublicKey = await importPublicKey(myPublicKeyBase64);
            encryptedKeys = {
                [currentUser.id]: await encryptAESKeyWithRSA(myPublicKey, aesRaw),
                [currentChat.id]: await encryptAESKeyWithRSA(recipientPubKey, aesRaw)
            };
        }

        const encryptedKeyJson = JSON.stringify(encryptedKeys);

        // 7. Enviar al servidor (usamos FormData para el archivo + metadata)
        const formData = new FormData();
        // Convertir el contenido cifrado a Blob (opcional, pero multer espera un archivo)
        const encryptedBlob = new Blob([encryptedFile], { type: 'application/octet-stream' });
        formData.append('file', encryptedBlob, 'encrypted.bin');
        formData.append('iv', ivBase64);
        formData.append('encryptedKey', encryptedKeyJson);
        formData.append('originalName', file.name);
        formData.append('mimeType', file.type);

        const response = await fetch(`/api/chats/${currentChat.chatId}/files`, {
            method: 'POST',
            headers: {
                // No pongas Content-Type, el navegador lo establecerá con el boundary correcto
            },
            body: formData
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error);

        showNotification('Archivo enviado correctamente', 'success');
        // Recargar mensajes para ver el nuevo mensaje de archivo (o añadirlo optimistamente)
        await switchToChat(currentChat.id, currentChat.chatId, currentChat.type, false);
    } catch (err) {
        console.error('Error al enviar archivo:', err);
        showNotification('No se pudo enviar el archivo: ' + err.message, 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Devuelve una clase de FontAwesome según la extensión del archivo
function getFileIconClass(filename) {
    if (!filename || typeof filename !== 'string') return 'fa-file';
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'fa-file-image';
    if (['pdf'].includes(ext)) return 'fa-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'fa-file-word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'fa-file-excel';
    if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-file-archive';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'fa-file-audio';
    if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'fa-file-video';
    return 'fa-file';
}

async function downloadFile(messageId) {
    try {
        const response = await fetch(`/api/files/${messageId}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al descargar');
        }
        const data = await response.json();

        // 1. Descifrar la clave AES con nuestra clave privada RSA
        const aesRaw = await decryptAESKeyWithRSA(myPrivateKey, data.encryptedKey);
        const aesKey = await importAESKey(aesRaw);

        // 2. Descifrar el contenido del archivo con AES
        const decryptedBuffer = await decryptAESBuffer(aesKey, data.iv, data.encryptedContent);

        // 3. Crear un blob y forzar la descarga
        const blob = new Blob([decryptedBuffer], { type: data.fileType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Archivo descargado correctamente', 'success');
    } catch (err) {
        console.error('Error descargando archivo:', err);
        showNotification('No se pudo descargar el archivo: ' + err.message, 'error');
    }
}
