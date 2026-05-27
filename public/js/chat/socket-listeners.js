// socket-listeners.js - listeners para eventos entrantes de Socket.io
(function() {
  async function onSocketReady() {
    const socket = window.socket;
    if (!socket) return;

    socket.on('new_message', async (msg) => {
      try {
        // Si el mensaje pertenece al chat abierto, intentar descifrar y renderizar
        const chatId = parseInt(msg.chatId, 10);
        if (window.currentChat && window.currentChat.chatId === chatId) {
          // Construir objeto de mensaje similar a los usados en switchToChat
          if (msg.content_type === 'file' || msg.content_type === 'file') {
            const rendered = {
              id: msg.messageId,
              sender: msg.full_name || msg.username || 'Usuario',
              type: 'file',
              fileName: msg.file_name || null,
              filePath: msg.file_path || null,
              fileType: msg.file_type || null,
              fileSize: msg.file_size || null,
              time: new Date(msg.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              isOwn: msg.userId === currentUser.id,
              status: 'delivered'
            };
            window.currentChat.messages.push(rendered);
            updateMessagesArea();
            scrollToBottom();
            return;
          }

          // Mensaje de texto cifrado
          let encryptedKeys = {};
          try { encryptedKeys = msg.encrypted_key ? JSON.parse(msg.encrypted_key) : {}; } catch (e) { encryptedKeys = {}; }
          const encryptedAESForMe = encryptedKeys ? encryptedKeys[currentUser.id] : undefined;

          if (!encryptedAESForMe || typeof myPrivateKey === 'undefined' || !myPrivateKey) {
            // No podemos descifrar: mostrar placeholder
            const placeholder = {
              id: msg.messageId,
              sender: msg.full_name || msg.username || 'Usuario',
              type: 'encrypted',
              text: '[Mensaje cifrado]',
              time: new Date(msg.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              isOwn: msg.userId === currentUser.id,
              status: 'delivered'
            };
            window.currentChat.messages.push(placeholder);
            updateMessagesArea();
            scrollToBottom();
            return;
          }

          try {
            const aesRaw = await decryptAESKeyWithRSA(myPrivateKey, encryptedAESForMe);
            const aesKey = await importAESKey(aesRaw);
            const plaintext = await decryptAES(aesKey, msg.iv, msg.encrypted_content);

            const messageObj = {
              id: msg.messageId,
              sender: msg.full_name || msg.username || 'Usuario',
              type: 'text',
              text: plaintext,
              time: new Date(msg.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              isOwn: msg.userId === currentUser.id,
              status: 'delivered'
            };
            window.currentChat.messages.push(messageObj);
            updateMessagesArea();
            scrollToBottom();
          } catch (e) {
            console.error('Error descifrando mensaje entrante:', e && e.message);
            const fallback = {
              id: msg.messageId,
              sender: msg.full_name || msg.username || 'Usuario',
              type: 'encrypted',
              text: '[Mensaje cifrado]',
              time: new Date(msg.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              isOwn: msg.userId === currentUser.id,
              status: 'delivered'
            };
            window.currentChat.messages.push(fallback);
            updateMessagesArea();
            scrollToBottom();
          }
        } else {
          // Mensaje para otro chat: incrementar contador de unread en la lista de chats
          try {
            const selector = `.chat-item[data-chat-id="${chatId}"]`;
            const item = document.querySelector(selector);
            if (item) {
              let badge = item.querySelector('.badge');
              if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge bg-primary rounded-pill';
                badge.textContent = '1';
                const header = item.querySelector('.chat-info .d-flex');
                if (header) header.appendChild(badge);
                else item.appendChild(badge);
              } else {
                const n = parseInt(badge.textContent || '0', 10) || 0;
                badge.textContent = String(n + 1);
              }
            }
          } catch (e) { console.warn('No se pudo actualizar badge de unread', e && e.message); }
        }
      } catch (e) {
        console.error('Error procesando new_message:', e && e.message);
      }
    });

    socket.on('message_read', (data) => {
      try {
        // Si corresponde al chat abierto, actualizar estados de mensajes
        if (window.currentChat && window.currentChat.chatId === data.chatId) {
          // Marcar mensaje como leído si coincide
          for (const m of window.currentChat.messages) {
            if (m.id === data.messageId) m.status = 'read';
          }
          updateMessagesArea();
        }
      } catch (e) { console.error('Error message_read handler', e && e.message); }
    });

    socket.on('user_typing', (data) => {
      try {
        if (window.currentChat && window.currentChat.chatId === data.chatId) {
          const el = document.getElementById('chatStatus');
          if (el) el.textContent = `${data.username} está escribiendo...`;
        }
      } catch (e) { }
    });

    socket.on('stop_typing', (data) => {
      try {
        if (window.currentChat && window.currentChat.chatId === data.chatId) {
          const el = document.getElementById('chatStatus');
          if (el) el.textContent = '';
        }
      } catch (e) { }
    });
  }

  if (window.socket) onSocketReady();
  else window.addEventListener('socketReady', onSocketReady);
})();
