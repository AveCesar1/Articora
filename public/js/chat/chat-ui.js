// chat-ui: funciones de renderizado y utilidades de interfaz

function updateChatHeader() {
    const chatHeader = document.getElementById('chatHeader');
    const chatName = document.getElementById('chatName');
    const chatStatus = document.getElementById('chatStatus');
    const chatActions = document.getElementById('chatActions');

    if (!chatHeader) return;

    let name = currentChat.name || 'Chat';
    let status = '';
    let avatar = currentChat.avatar || '';
    let actionsHTML = '';

    if (currentChat.type === 'channel') {
        status = '<i class="fas fa-bullhorn me-1"></i>Canal oficial';
        actionsHTML = `
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="offcanvas" data-bs-target="#chatInfoOffcanvas" aria-controls="chatInfoOffcanvas" title="Información">
                    <i class="fas fa-info-circle"></i>
                </button>
            `;
    } else if (currentChat.type === 'group') {
        status = '<i class="fas fa-users me-1"></i>Grupo académico';
        actionsHTML = `
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="offcanvas" data-bs-target="#chatInfoOffcanvas" aria-controls="chatInfoOffcanvas" title="Información">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
                    <i class="fas fa-paperclip"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#reportModal">
                    <i class="fas fa-flag"></i>
                </button>
            `;
    } else if (currentChat.type === 'request') {
        status = '<i class="fas fa-user-clock me-1"></i>Solicitud de contacto';
        actionsHTML = `
                <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#reportModal">
                    <i class="fas fa-flag"></i>
                </button>
            `;
    } else {
        if (currentChat.isRequest) {
            status = '<i class="fas fa-clock me-1"></i>Solicitud enviada';
        } else {
            status = `<i class="fas fa-lock text-success me-1"></i>${currentChat.status === 'online' ? 'En línea' : 'Desconectado'}`;
            actionsHTML = `
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="offcanvas" data-bs-target="#chatInfoOffcanvas" aria-controls="chatInfoOffcanvas" title="Información">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
                        <i class="fas fa-paperclip"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#reportModal">
                        <i class="fas fa-flag"></i>
                    </button>
                `;
        }
    }

    // Actualizar HTML
    if (chatName) chatName.textContent = name;
    if (chatStatus) chatStatus.innerHTML = status;
    if (chatActions) chatActions.innerHTML = actionsHTML;

    // Actualizar avatar en el encabezado
    const avatarContainer = chatHeader.querySelector('.avatar-container img');
    if (avatarContainer && avatar) {
        avatarContainer.src = avatar;
    }

    // Actualizar tooltips
    const tooltips = chatHeader.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => {
        new bootstrap.Tooltip(el);
    });
}

function updateMessagesArea() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    let messagesHTML = '';

    if (currentChat.type === 'channel') {
        // Canal Artícora
        messagesHTML = `
                <div class="channel-welcome">
                    <div class="text-center mb-4">
                        <i class="fas fa-bullhorn fa-3x text-warning mb-3"></i>
                        <h4>Canal oficial Artícora</h4>
                        <p class="text-muted">Anuncios y notificaciones importantes</p>
                    </div>
            `;

        data.articoraMessages.forEach(message => {
            messagesHTML += `
                    <div class="channel-message ${message.isAnnouncement ? 'announcement' : ''}">
                        <div class="d-flex">
                            <div class="message-icon me-3">
                                <i class="fas fa-${message.isAnnouncement ? 'bullhorn' : 'info-circle'} fa-lg
                                    ${message.isAnnouncement ? 'text-warning' : 'text-info'}"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <strong>${message.sender}</strong>
                                    <small class="text-muted">${message.time}</small>
                                </div>
                                <p class="mb-0">${message.text}</p>
                            </div>
                        </div>
                    </div>
                `;
        });

        messagesHTML += `</div>`;

    } else if (currentChat.type === 'request') {
        // Solicitud entrante
        const request = data.incomingRequests.find(r => r.id === currentChat.id);
        if (request) {
            messagesHTML = `
                    <div class="request-chat-view">
                        <div class="text-center py-4">
                            <img src="${request.avatar}" alt="Avatar" class="avatar-lg rounded-circle mb-3">
                            <h4>${request.name}</h4>
                            <p class="text-muted mb-4">
                                <span class="badge ${request.type === 'validated' ? 'bg-success' : 'bg-secondary'}">
                                    ${request.type === 'validated' ? 'Validado' : 'Registrado'}
                                </span>
                                <span class="ms-2">${request.time}</span>
                            </p>
                            
                            <div class="card mb-4">
                                <div class="card-body">
                                    <p class="mb-0">${request.message}</p>
                                </div>
                            </div>
                            
                            <div class="request-actions mb-4">
                                <button class="btn btn-success accept-btn" style="min-width: 120px;">
                                    <i class="fas fa-check me-2"></i> Aceptar
                                </button>
                                <button class="btn btn-danger reject-btn" style="min-width: 120px;">
                                    <i class="fas fa-times me-2"></i> Rechazar
                                </button>
                                <button class="btn btn-outline-secondary report-btn">
                                    <i class="fas fa-flag"></i>
                                </button>
                            </div>
                            
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Acepta o rechaza esta solicitud. Podrás chatear después de aceptar.
                            </div>
                        </div>
                    </div>
                `;
        }

    } else if (currentChat.isRequest && currentChat.type === 'individual') {
        // Solicitud que yo envié
        const contact = data.contacts.find(c => c.id === currentChat.id);
        if (contact) {
            messagesHTML = `
                    <div class="request-chat-view">
                        <div class="text-center py-4">
                            <img src="${contact.avatar}" alt="Avatar" class="avatar-lg rounded-circle mb-3">
                            <h4>${contact.name}</h4>
                            <p class="text-muted mb-4">
                                <span class="badge ${contact.type === 'validated' ? 'bg-success' : 'bg-secondary'}">
                                    ${contact.type === 'validated' ? 'Validado' : 'Registrado'}
                                </span>
                                <span class="ms-2">Última conexión: ${contact.lastSeen}</span>
                            </p>
                            
                            <div class="card border-warning mb-4">
                                <div class="card-header bg-warning bg-opacity-10">
                                    <i class="fas fa-paper-plane me-2"></i>Tu solicitud de contacto
                                </div>
                                <div class="card-body">
                                    <p class="mb-0">${contact.requestMessage || 'Solicitud enviada'}</p>
                                </div>
                            </div>
                            
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Esperando respuesta. No puedes enviar mensajes hasta que acepten tu solicitud.
                            </div>
                        </div>
                    </div>
                `;
        }

    } else {
        // Chat normal (individual o grupo)
        currentChat.messages.forEach(message => {
            let messageHtml = '';
            if (message.type === 'file') {
                messageHtml = `
                        <div class="message ${message.isOwn ? 'own' : ''}">
                            ${!message.isOwn && currentChat.type === 'group' ? `<small class="message-sender">${message.sender}</small>` : ''}
                            <div class="message-content">
                                <div class="message-bubble file-message d-flex align-items-center">
                                    <i class="fas ${getFileIconClass(message.fileName)} file-icon me-3"></i>
                                    <div class="file-meta flex-grow-1">
                                        <div class="file-name">${escapeHtml(message.fileName)}</div>
                                        <div class="file-sub">${formatFileSize(message.fileSize)} • ${escapeHtml(message.fileType || '')}</div>
                                    </div>
                                    <button class="btn btn-sm btn-primary download-file ms-3" data-message-id="${message.id}">
                                        <i class="fas fa-download me-1"></i> Descargar
                                    </button>
                                </div>
                                <div class="message-footer">
                                    <small class="text-muted">${message.time}</small>
                                    ${message.isOwn ? `<div class="message-status"><i class="fas fa-${message.status === 'read' ? 'check-double text-primary' : 'check text-muted'}"></i></div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
            } else if (message.type === 'text') {
                // Versión corregida, con el message-sender arriba, ambos a la izquierda:
                messageHtml = `
                        <div class="message ${message.isOwn ? 'own' : ''}">
                            <div class="message-content" style="display: flex; flex-direction: column; align-items: flex-start;">
                                ${!message.isOwn && currentChat.type === 'group' ? `<small class="message-sender">${message.sender}</small>` : ''}
                                <div class="message-bubble">
                                    <p class="mb-0">${escapeHtml(message.text).replace(/\n/g, '<br>')}</p>
                                </div>
                                <div class="message-footer">
                                    <small class="text-muted">${message.time}</small>
                                    ${message.isOwn ? `<div class="message-status"><i class="fas fa-${message.status === 'read' ? 'check-double text-primary' : 'check text-muted'}"></i></div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
            } else {
                // Mensaje de error
                messageHtml = `... mensaje de error ...`;
            }
            messagesHTML += messageHtml;
        });

        // Indicador de cifrado para chats normales (no grupo)
        if (currentChat.type === 'individual') {
            messagesHTML += `
                    <div class="encryption-notice">
                        <i class="fas fa-lock text-success me-2"></i>
                        <small class="text-muted">
                            Cifrado de extremo a extremo activo (AES-256 & RSA-2048)
                        </small>
                    </div>
                `;
        }
    }

    messagesContainer.innerHTML = messagesHTML;

    // Configurar eventos para solicitudes entrantes en la vista de chat
    if (currentChat.type === 'request') {
        const acceptBtn = messagesContainer.querySelector('.accept-btn');
        const rejectBtn = messagesContainer.querySelector('.reject-btn');
        const reportBtn = messagesContainer.querySelector('.report-btn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                acceptRequest(currentChat.id);
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                rejectRequest(currentChat.id);
            });
        }

        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('reportModal'));
                modal.show();
            });
        }
    }
}

function updateInputArea() {
    const messageInputArea = document.getElementById('messageInputArea');
    if (!messageInputArea) return;

    let inputHTML = '';

    if (currentChat.type === 'channel') {
        inputHTML = `
                <div class="alert alert-warning mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    Este es un canal de solo lectura. Solo los administradores pueden publicar anuncios.
                </div>
            `;
    } else if (currentChat.isRequest || currentChat.type === 'request') {
        inputHTML = `
                <div class="alert alert-info mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    ${currentChat.type === 'request' ? 'Acepta o rechaza la solicitud para poder chatear.' : 'No puedes enviar mensajes hasta que acepten tu solicitud.'}
                </div>
            `;
    } else {
        inputHTML = `
                <form id="messageForm">
                    <div class="input-group">
                        <textarea class="form-control" id="messageInput" 
                                  placeholder="Escribe tu mensaje..." 
                                  rows="1"></textarea>
                        
                        <div class="btn-group">
                            <button type="button" class="btn btn-outline-secondary" 
                                    data-bs-toggle="modal" data-bs-target="#uploadModal"
                                    data-bs-toggle="tooltip" title="Adjuntar archivo">
                                <i class="fas fa-paperclip"></i>
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="input-info mt-2">
                        <small class="text-muted">
                            <i class="fas fa-shield-alt me-1"></i>
                            Cifrado de extremo a extremo activo
                        </small>
                        <small class="text-muted">
                            <i class="fas fa-file-upload me-1"></i>
                            Límite: 5MB por archivo
                        </small>
                    </div>
                </form>
            `;
    }

    messageInputArea.innerHTML = inputHTML;

    // Reconfigurar el formulario si existe
    if (currentChat.type !== 'channel' && !currentChat.isRequest && currentChat.type !== 'request') {
        const form = document.getElementById('messageForm');
        const input = document.getElementById('messageInput');

        if (form && input) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                const message = input.value.trim();
                if (!message) return;

                sendMessage(message);
                input.value = '';
                input.style.height = 'auto';
            });

            // Auto-ajustar altura
            input.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            // Atajo de teclado
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            });
        }
    }
}

function updateRequestsCount() {
    const requestCount = document.querySelectorAll('.request-item').length;
    const badge = document.querySelector('.tab-btn[data-tab="requests"] .badge');

    if (badge) {
        if (requestCount > 0) {
            badge.textContent = requestCount;
        } else {
            badge.remove();
        }
    }
}

function markAsRead(id, type) {
    // Marcar como leído en la UI
    const chatItem = document.querySelector(`.chat-item[data-id="${id}"][data-type="${type}"]`);
    if (chatItem) {
        const badge = chatItem.querySelector('.badge');
        if (badge) {
            badge.remove();
        }
    }
}

function filterChats(searchTerm) {
    // Obtener la pestaña activa
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

    // Seleccionar el contenido activo
    const activeContent = document.querySelector(`#${activeTab}-content`);

    if (!activeContent) return;

    // Obtener todos los items de chat en el contenido activo
    const items = activeContent.querySelectorAll('.chat-item, .request-item');

    items.forEach(item => {
        // Buscar en el nombre del chat
        const nameElement = item.querySelector('.chat-name, .request-info strong');
        if (nameElement) {
            const name = nameElement.textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        }
    });
}

function simulateChatActivity() {
    // Simular cambios de estado
    setInterval(() => {
        if (Math.random() > 0.7) {
            const contactItems = document.querySelectorAll('.chat-item[data-type="individual"]');
            if (contactItems.length > 0) {
                const randomContact = contactItems[Math.floor(Math.random() * contactItems.length)];
                const statusIndicator = randomContact.querySelector('.status-indicator');

                if (statusIndicator) {
                    const statuses = ['online', 'away', 'offline'];
                    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

                    statusIndicator.classList.remove('online', 'away', 'offline');
                    statusIndicator.classList.add(newStatus);

                    // Actualizar también en el encabezado si es el chat activo
                    const chatId = parseInt(randomContact.dataset.id);
                    if (currentChat.id === chatId && currentChat.type === 'individual') {
                        currentChat.status = newStatus;
                        updateChatHeader();
                    }
                }
            }
        }
    }, 30000);
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1050;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInUp 0.3s ease;
        `;

    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}
