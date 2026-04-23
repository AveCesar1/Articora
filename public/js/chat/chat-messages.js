// chat-messages: cambio de chat, envío de mensajes y gestión de solicitudes

async function switchToChat(userId, chatId, type, isRequest = false) {
    console.log('Cambiando a chat:', { userId, chatId, type, isRequest });

    // Actualizar el objeto currentChat con los datos básicos
    if (type === 'individual' || type === 'channel') {
        const contact = data.contacts.find(c => c.id === userId);
        if (contact) {
            currentChat = {
                id: userId,
                chatId: chatId,
                type: type,
                name: contact.name,
                status: contact.status,
                avatar: contact.avatar,
                encryption: contact.encryption || false,
                isRequest: isRequest,
                messages: []
            };
        }
    } else if (type === 'group') {
        const group = data.groups.find(g => g.id === userId);
        if (group) {
            currentChat = {
                id: userId,
                chatId: chatId,
                type: 'group',
                name: group.name,
                avatar: group.avatar,
                isRequest: false,
                messages: [],
                participants: group.participants
            };
        }
    } else if (type === 'request') {
        const request = data.incomingRequests.find(r => r.id === userId);
        if (request) {
            currentChat = {
                id: userId,
                chatId: null,
                type: 'request',
                name: request.name,
                avatar: request.avatar,
                isRequest: true,
                messages: []
            };
        }
    }

    // Actualizar encabezado inmediatamente
    updateChatHeader();

    // Si es un chat individual normal (no solicitud, no canal), obtener mensajes del servidor y descifrar
    if ((type === 'individual' || type === 'group') && !isRequest && chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`);
            if (!response.ok) throw new Error('Error al cargar mensajes');
            const messages = await response.json();

            const decryptedMessages = [];
            for (const m of messages) {
                try {
                    if (m.content_type === 'file') {
                        // Mensaje de archivo: no descifrar contenido
                        decryptedMessages.push({
                            id: m.id,
                            sender: (m.full_name || m.username),
                            type: 'file',
                            fileName: m.file_name,
                            filePath: m.file_path,
                            fileType: m.file_type,
                            fileSize: m.file_size,
                            time: new Date(m.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            isOwn: m.user_id === currentUser.id,
                            status: m.read_at ? 'read' : (m.sent_at ? 'delivered' : 'sent')
                        });
                        continue;
                    }

                    // Para mensajes de texto: intentar descifrar si tenemos la clave privada
                    let encryptedKeys = {};
                    try {
                        encryptedKeys = m.encrypted_key ? JSON.parse(m.encrypted_key) : {};
                    } catch (e) {
                        console.error('Error parseando encrypted_key:', e);
                        encryptedKeys = {};
                    }
                    const encryptedAESForMe = encryptedKeys ? encryptedKeys[currentUser.id] : undefined;

                    // Si no hay clave cifrada para este usuario o no tenemos privada, mostrar placeholder
                    if (!encryptedAESForMe || !myPrivateKey) {
                        decryptedMessages.push({
                            id: m.id,
                            sender: (m.full_name || m.username),
                            type: 'encrypted',
                            text: '[Mensaje cifrado]',
                            time: new Date(m.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            isOwn: m.user_id === currentUser.id,
                            status: m.read_at ? 'read' : (m.sent_at ? 'delivered' : 'sent')
                        });
                        continue;
                    }

                    const aesRaw = await decryptAESKeyWithRSA(myPrivateKey, encryptedAESForMe);
                    const aesKey = await importAESKey(aesRaw);
                    const plaintext = await decryptAES(aesKey, m.iv, m.encrypted_content);

                    decryptedMessages.push({
                        id: m.id,
                        sender: (m.full_name || m.username),
                        type: 'text',
                        text: plaintext,
                        time: new Date(m.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        isOwn: m.user_id === currentUser.id,
                        status: m.read_at ? 'read' : (m.sent_at ? 'delivered' : 'sent')
                    });
                } catch (err) {
                    console.error('Error procesando mensaje:', err);
                    decryptedMessages.push({
                        id: m.id,
                        sender: (m.full_name || m.username),
                        type: 'error',
                        text: '[Mensaje no disponible]',
                        time: new Date(m.sent_at).toLocaleTimeString(),
                        isOwn: m.user_id === currentUser.id,
                        status: 'error'
                    });
                }
            }
            currentChat.messages = decryptedMessages;
            updateMessagesArea();
            scrollToBottom();
        } catch (err) {
            console.error('Error al cargar mensajes:', err);
            showNotification('Error al cargar mensajes', 'error');
        }
    } else {
        // Para canales o solicitudes, usar datos disponibles
        if (type === 'channel') {
            currentChat.messages = data.articoraMessages.map(m => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                time: m.time,
                isOwn: false,
                status: 'read'
            }));
            updateMessagesArea();
            scrollToBottom();
        } else if (type === 'request') {
            // Las solicitudes no tienen mensajes
            currentChat.messages = [];
            updateMessagesArea();
            scrollToBottom();
        }
    }

    // Actualizar área de entrada
    updateInputArea();

    // Marcar como leído (solo para chats individuales)
    if (type === 'individual' && !isRequest && chatId) {
        markAsRead(chatId, type);
    }
}

async function sendMessage(text) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    // Mostrar el mensaje inmediatamente en la UI (optimista)
    const messageId = Date.now();
    const messageElement = document.createElement('div');
    messageElement.className = 'message own new';
    messageElement.dataset.messageId = messageId;

    messageElement.innerHTML = `
            <div class="message-content">
                ${currentChat.type === 'group' ? `<small class="message-sender">${currentUser.name}</small>` : ''}
                <div class="message-bubble">
                    <p class="mb-0">${text.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="message-footer">
                    <small class="text-muted">${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                    <div class="message-status">
                        <i class="fas fa-check text-muted" title="Enviando..."></i>
                    </div>
                </div>
            </div>
        `;

    // Insertar antes del encryption notice si existe
    const encryptionNotice = messagesContainer.querySelector('.encryption-notice');
    if (encryptionNotice) {
        messagesContainer.insertBefore(messageElement, encryptionNotice);
    } else {
        messagesContainer.appendChild(messageElement);
    }

    scrollToBottom();

    try {
        let encryptedKeys = {};
        let iv, encryptedContent, aesKey, aesRaw;

        // 1. Generar clave AES aleatoria (común)
        aesKey = await generateAESKey();
        aesRaw = await exportAESKey(aesKey);

        // 2. Cifrar el mensaje con AES (común)
        const encrypted = await encryptAES(aesKey, text);
        iv = encrypted.iv;
        encryptedContent = encrypted.encryptedContent;

        if (currentChat.type === 'group') {
            // Obtener participantes del grupo
            const participants = currentChat.participants;
            if (!participants || participants.length === 0) {
                throw new Error('No se encontraron participantes del grupo');
            }

            // Cifrar la clave AES para cada participante
            for (const p of participants) {
                if (!p.public_key) continue;
                const pubKey = await importPublicKey(p.public_key);
                const encryptedKey = await encryptAESKeyWithRSA(pubKey, aesRaw);
                encryptedKeys[p.user_id] = encryptedKey;
            }

            // Asegurar que el propio usuario esté incluido (por si acaso)
            if (!encryptedKeys[currentUser.id]) {
                if (!myPublicKeyBase64) {
                    console.warn('Clave pública propia ausente; no se añadirá la clave para el remitente. No podrás descifrar tus mensajes en este dispositivo.');
                } else {
                    const myPublicKey = await importPublicKey(myPublicKeyBase64);
                    encryptedKeys[currentUser.id] = await encryptAESKeyWithRSA(myPublicKey, aesRaw);
                }
            }
        } else {
            // Chat individual: destinatario
            const contact = data.contacts.find(c => c.id === currentChat.id);
            if (!contact || !contact.publicKey) {
                throw new Error('No se encontró la clave pública del destinatario');
            }
            const recipientPublicKey = await importPublicKey(contact.publicKey);

            // Cifrar clave AES para el destinatario
            const encryptedForRecipient = await encryptAESKeyWithRSA(recipientPublicKey, aesRaw);

            // Cifrar para uno mismo
            if (!myPublicKeyBase64) {
                showNotification('Tu clave pública no está disponible. Genera claves en Registro/Perfil para poder descifrar tus mensajes en este dispositivo.', 'error');
                throw new Error('Clave pública propia ausente');
            }
            const myPublicKey = await importPublicKey(myPublicKeyBase64);
            const encryptedForSelf = await encryptAESKeyWithRSA(myPublicKey, aesRaw);

            encryptedKeys = {
                [currentUser.id]: encryptedForSelf,
                [currentChat.id]: encryptedForRecipient
            };
        }

        const encryptedKeyJson = JSON.stringify(encryptedKeys);

        // 3. Enviar al servidor
        const response = await fetch(`/api/chats/${currentChat.chatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encryptedContent: encryptedContent,
                iv: iv,
                encryptedKey: encryptedKeyJson,
                contentType: 'text'
            })
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Error al enviar');

        // Actualizar el estado del mensaje a "enviado"
        const statusIcon = messageElement.querySelector('.message-status i');
        if (statusIcon) {
            statusIcon.className = 'fas fa-check text-muted';
            statusIcon.title = 'Enviado';
        }
    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        const statusIcon = messageElement.querySelector('.message-status i');
        if (statusIcon) {
            statusIcon.className = 'fas fa-exclamation-circle text-danger';
            statusIcon.title = 'Error al enviar';
        }
        showNotification('No se pudo enviar el mensaje: ' + err.message, 'error');
    }
}

async function acceptRequest(requestId, element = null) {
    try {
        const response = await fetch(`/api/contacts/requests/${requestId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
        }
        showNotification('Solicitud aceptada', 'success');

        if (element) {
            element.remove();
        }
        updateRequestsCount();

        // Recargar la página para actualizar los datos
        location.reload();
    } catch (err) {
        console.error('Error al aceptar solicitud:', err);
        showNotification(err.message || 'Error al aceptar solicitud', 'error');
    }
}

async function rejectRequest(requestId, element = null) {
    try {
        const response = await fetch(`/api/contacts/requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error);
        }
        showNotification('Solicitud rechazada', 'info');

        if (element) {
            element.remove();
        }
        updateRequestsCount();

        // Si estábamos en la vista de solicitud, volver a la lista de chats
        if (currentChat.type === 'request' && currentChat.id === requestId) {
            const chatsTab = document.querySelector('.tab-btn[data-tab="chats"]');
            if (chatsTab) {
                chatsTab.click();
            }
        }
        location.reload();
    } catch (err) {
        console.error('Error al rechazar solicitud:', err);
        showNotification(err.message || 'Error al rechazar solicitud', 'error');
    }
}
