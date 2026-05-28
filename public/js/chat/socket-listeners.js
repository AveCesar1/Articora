// socket-listeners.js - listeners para eventos entrantes de Socket.io
(function() {
  async function onSocketReady() {
    const socket = window.socket;
    if (!socket) return;

    // Helper to update contact DOM in the left sidebar
    function updateContactDOMStatus(uid, status, lastSeen) {
      try {
        const item = document.querySelector(`.chat-item[data-id="${uid}"]`);
        if (!item) return;
        if (item.getAttribute('data-type') !== 'individual') return;
        const statusSpan = item.querySelector('.avatar-container .status-indicator');
        if (statusSpan) statusSpan.className = 'status-indicator ' + status;
        const small = item.querySelector('.chat-info small.text-muted');
        if (small) {
          const badge = small.querySelector('.badge');
          const badgeHTML = badge ? badge.outerHTML + ' ' : '';
          const statusText = status === 'online' ? 'En línea' : (lastSeen || 'Desconectado');
          small.innerHTML = badgeHTML + statusText;
        }
      } catch (e) { /* ignore DOM update errors */ }
    }

    // Presence: initial state and updates
    socket.on('presence_state', (payload) => {
      try {
        const online = payload && payload.online ? payload.online : [];
        window._onlineUsers = new Set(online.map(x => String(x)));

        if (window.data && Array.isArray(window.data.contacts)) {
          window.data.contacts.forEach(c => {
            const st = window._onlineUsers.has(String(c.id)) ? 'online' : 'offline';
            c.status = st;
            updateContactDOMStatus(c.id, st, c.lastSeen);
          });
        }

        if (window.currentChat && window.currentChat.type === 'individual') {
          const otherId = String(window.currentChat.id);
          window.currentChat.status = window._onlineUsers.has(otherId) ? 'online' : 'offline';
          updateContactDOMStatus(otherId, window.currentChat.status, window.currentChat.lastSeen);
          updateChatHeader();
        }
      } catch (e) { console.warn('presence_state handler error', e && e.message); }
    });

    socket.on('user_online', (p) => {
      try {
        const uid = p && p.userId;
        if (!uid) return;
        if (!window._onlineUsers) window._onlineUsers = new Set();
        window._onlineUsers.add(String(uid));
        if (window.data && Array.isArray(window.data.contacts)) {
          const c = window.data.contacts.find(x => String(x.id) === String(uid));
          if (c) {
            c.status = 'online';
            updateContactDOMStatus(uid, 'online', c.lastSeen);
          }
        }
        if (window.currentChat && String(window.currentChat.id) === String(uid)) {
          window.currentChat.status = 'online';
          updateContactDOMStatus(uid, 'online', window.currentChat.lastSeen);
          updateChatHeader();
        }
      } catch (e) { console.warn('user_online handler error', e && e.message); }
    });

    socket.on('user_offline', (p) => {
      try {
        const uid = p && p.userId;
        if (!uid) return;
        if (!window._onlineUsers) window._onlineUsers = new Set();
        window._onlineUsers.delete(String(uid));
        if (window.data && Array.isArray(window.data.contacts)) {
          const c = window.data.contacts.find(x => String(x.id) === String(uid));
          if (c) {
            c.status = 'offline';
            if (p && p.lastSeen) c.lastSeen = p.lastSeen;
            updateContactDOMStatus(uid, 'offline', c.lastSeen);
          }
        }
        if (window.currentChat && String(window.currentChat.id) === String(uid)) {
          window.currentChat.status = 'offline';
          if (p && p.lastSeen) window.currentChat.lastSeen = p.lastSeen;
          updateContactDOMStatus(uid, 'offline', window.currentChat.lastSeen);
          updateChatHeader();
        }
      } catch (e) { console.warn('user_offline handler error', e && e.message); }
    });

    // Helper to show notifications (use existing showNotification if available)
    function displayToast(message, type = 'info') {
      try {
        if (typeof showNotification === 'function') return showNotification(message, type);
      } catch (e) { }
      // Fallback simple toast
      try {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1050; min-width: 240px; max-width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        notification.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 5000);
      } catch (e) { console.warn('displayToast fallback failed', e && e.message); }
    }

    // Contact requests
    socket.on('contact_request', (payload) => {
      try {
        window.data = window.data || {};
        window.data.incomingRequests = window.data.incomingRequests || [];
        window.data.incomingRequests.unshift(payload);
        // update simple counter if present
        const el = document.querySelector('#requestsCount') || document.querySelector('.requests-count');
        if (el) el.textContent = String((parseInt(el.textContent || '0', 10) || 0) + 1);
        displayToast(`Nueva solicitud de ${payload.sender.full_name || payload.sender.username || 'usuario'}`, 'info');
      } catch (e) { console.warn('contact_request handler error', e && e.message); }
    });

    socket.on('contact_request_accepted', async (payload) => {
      try {
        displayToast('Tu solicitud fue aceptada', 'success');
        if (payload && payload.chatId) {
          // Refresh chat list to include the new chat
          try {
            const resp = await fetch('/api/chats');
            if (resp.ok) {
              const chats = await resp.json();
              window.chatData = window.chatData || {};
              window.chatData.chats = chats;
            }
          } catch (e) { console.warn('Could not refresh chats after accept', e && e.message); }
        }
      } catch (e) { console.warn('contact_request_accepted handler error', e && e.message); }
    });

    socket.on('contact_request_rejected', (payload) => {
      try { displayToast('Tu solicitud fue rechazada', 'info'); } catch (e) { }
    });

    // Group added
    socket.on('group_added', (payload) => {
      try {
        window.chatData = window.chatData || {};
        window.chatData.groups = window.chatData.groups || [];
        window.chatData.groups.push({ id: payload.groupId, group_name: payload.groupName });
        try {
          window.chatData.user = window.chatData.user || {};
          window.chatData.user.currentGroups = (parseInt(window.chatData.user.currentGroups || '0', 10) || 0) + 1;
          const el = document.getElementById('groupCount'); if (el) el.textContent = String(window.chatData.user.currentGroups);
        } catch (e) { }
        displayToast(`Fuiste agregado al grupo '${payload.groupName}' por ${payload.createdBy && (payload.createdBy.full_name || payload.createdBy.username)}`, 'info');
      } catch (e) { console.warn('group_added handler error', e && e.message); }
    });

    // Admin / system alerts
    socket.on('system_alert', (payload) => {
      try { displayToast(payload && payload.description ? payload.description : 'Alerta del sistema', 'warning'); } catch (e) { }
    });

    socket.on('new_system_alert', (payload) => {
      try {
        displayToast(payload && payload.description ? payload.description : 'Alerta en Artícora', 'warning');
        // If user is viewing Artícora (chatId 0) optionally refresh
        if (window.currentChat && window.currentChat.chatId === 0) {
          try { fetch('/api/chats/0/messages').then(r => r.ok && r.json()).then(() => { /* client will handle new_message via socket if implemented */ }); } catch (e) { }
        }
      } catch (e) { console.warn('new_system_alert handler error', e && e.message); }
    });

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

          if (!encryptedAESForMe) {
            // No hay clave cifrada para este usuario: mostrar placeholder
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

          if (typeof myPrivateKey === 'undefined' || !myPrivateKey) {
            // Keys not loaded yet: queue for later decryption
            window._decryptQueue = window._decryptQueue || [];
            window._decryptQueue.push({ chatId, msg });
            const placeholder = {
              id: msg.messageId,
              sender: msg.full_name || msg.username || 'Usuario',
              type: 'encrypted',
              text: '[Descifrado pendiente]',
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
            console.debug('socket new_message decrypt attempt', msg.messageId, 'encKeyLen=', encryptedAESForMe ? encryptedAESForMe.length : 0, 'ivLen=', msg.iv ? msg.iv.length : 0, 'encContentLen=', msg.encrypted_content ? msg.encrypted_content.length : 0, 'hasPrivate=', !!myPrivateKey);
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
        // data may contain messageId or messageIds array
        const msgIds = Array.isArray(data.messageIds) ? data.messageIds : (data.messageId ? [data.messageId] : []);
        const chatId = data.chatId || data.chat_id;

        // Update current chat messages statuses
        if (window.currentChat && String(window.currentChat.chatId) === String(chatId) && msgIds.length > 0) {
          for (const m of window.currentChat.messages) {
            if (msgIds.find(id => String(id) === String(m.id))) m.status = 'read';
          }
          updateMessagesArea();
        }

        // Update unread badge in sidebar: subtract number of read messages
        try {
          const selector = `.chat-item[data-chat-id="${chatId}"]`;
          const item = document.querySelector(selector);
          if (item) {
            const badge = item.querySelector('.badge');
            if (badge) {
              const old = parseInt(badge.textContent || '0', 10) || 0;
              const dec = msgIds.length || 1;
              const now = Math.max(0, old - dec);
              if (now === 0) badge.remove();
              else badge.textContent = String(now);
            }
          }
        } catch (e) { /* ignore badge update errors */ }
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
