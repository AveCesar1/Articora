// chat.js - Funcionalidad completa del chat

document.addEventListener('DOMContentLoaded', function() {
    // Usar datos desde window (pasados desde el servidor)
    const data = window.chatData;
    const currentUser = data.user;
    
    // Estado actual del chat
    let currentChat = data.activeChat;

    // Elementos del DOM
    const chatItems = document.querySelectorAll('.chat-item');
    const requestItems = document.querySelectorAll('.request-item');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const newChatBtn = document.getElementById('newChatBtn');
    const searchInput = document.querySelector('.sidebar-search input');
    
    // Inicializar
    initChat();
    
    function initChat() {
        console.log('Inicializando chat con datos:', data);
        
        // Configurar navegación por pestañas
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.dataset.tab;
                
                // Actualizar botones activos
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Mostrar contenido correspondiente
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tab}-content`) {
                        content.classList.add('active');
                    }
                });
            });
        });
        
        // Configurar clic en chats (individuales, canales y grupos)
        chatItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                
                const chatId = parseInt(this.dataset.id);
                const chatType = this.dataset.type;
                const isRequest = this.dataset.isRequest === 'true';
                
                console.log('Clic en chat:', { chatId, chatType, isRequest });
                
                // Actualizar estado activo
                chatItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                
                // Cambiar al chat seleccionado
                switchToChat(chatId, chatType, isRequest);
            });
        });
        
        // Configurar solicitudes entrantes
        requestItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Solo manejar clic en el item, no en los botones
                if (!e.target.closest('.request-actions')) {
                    const requestId = parseInt(this.dataset.id);
                    
                    // Cambiar a vista de solicitud
                    switchToChat(requestId, 'request', true);
                }
            });
            
            // Botones de aceptar/rechazar
            const acceptBtn = item.querySelector('.accept-btn');
            const rejectBtn = item.querySelector('.reject-btn');
            const reportBtn = item.querySelector('.report-btn');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const requestId = parseInt(item.dataset.id);
                    acceptRequest(requestId, item);
                });
            }
            
            if (rejectBtn) {
                rejectBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const requestId = parseInt(item.dataset.id);
                    rejectRequest(requestId, item);
                });
            }
            
            if (reportBtn) {
                reportBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
                    modal.show();
                });
            }
        });
        
        // Botón para nuevo chat
        if (newChatBtn) {
            newChatBtn.addEventListener('click', function() {
                showNotification('Funcionalidad para nuevo chat en desarrollo', 'info');
            });
        }
        
        // Barra de búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                filterChats(searchTerm);
            });
        }
        
        // Inicializar tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Scroll al final de los mensajes
        scrollToBottom();
        
        // Simular actividad del chat
        simulateChatActivity();
    }
    
    function switchToChat(id, type, isRequest = false) {
        console.log('Cambiando a chat:', { id, type, isRequest });
        
        // Actualizar el objeto currentChat con los datos del chat seleccionado
        if (type === 'individual' || type === 'channel') {
            const contact = data.contacts.find(c => c.id === id);
            if (contact) {
                currentChat = {
                    id: contact.id,
                    type: type,
                    name: contact.name,
                    status: contact.status,
                    avatar: contact.avatar,
                    encryption: contact.encryption || false,
                    isRequest: isRequest,
                    messages: getChatMessages(id, type)
                };
            }
        } else if (type === 'group') {
            const group = data.groups.find(g => g.id === id);
            if (group) {
                currentChat = {
                    id: group.id,
                    type: 'group',
                    name: group.name,
                    avatar: group.avatar,
                    isRequest: false,
                    messages: getGroupMessages(id)
                };
            }
        } else if (type === 'request') {
            const request = data.incomingRequests.find(r => r.id === id);
            if (request) {
                currentChat = {
                    id: request.id,
                    type: 'request',
                    name: request.name,
                    avatar: request.avatar,
                    isRequest: true,
                    messages: []
                };
            }
        }
        
        // Actualizar encabezado
        updateChatHeader();
        
        // Actualizar área de mensajes
        updateMessagesArea();
        
        // Actualizar área de entrada
        updateInputArea();
        
        // Marcar como leído (si no es una solicitud)
        if (type !== 'request') {
            markAsRead(id, type);
        }
        
        // Scroll al final
        scrollToBottom();
    }
    
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
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Información">
                    <i class="fas fa-info-circle"></i>
                </button>
            `;
        } else if (currentChat.type === 'group') {
            status = '<i class="fas fa-users me-1"></i>Grupo académico';
            actionsHTML = `
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Información">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
                    <i class="fas fa-paperclip"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Llamada">
                    <i class="fas fa-phone"></i>
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
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Información">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#uploadModal">
                        <i class="fas fa-paperclip"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Llamada">
                        <i class="fas fa-phone"></i>
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
                messagesHTML += `
                    <div class="message ${message.isOwn ? 'own' : ''}">
                        <div class="message-content">
                            ${!message.isOwn && currentChat.type === 'group' ? `<small class="message-sender">${message.sender}</small>` : ''}
                            
                            <div class="message-bubble">
                                <p class="mb-0">${message.text}</p>
                            </div>
                            
                            <div class="message-footer">
                                <small class="text-muted">${message.time}</small>
                                ${message.isOwn ? `
                                    <div class="message-status">
                                        <i class="fas fa-${message.status === 'read' ? 'check-double text-primary' : 
                                                            message.status === 'delivered' ? 'check-double text-muted' : 
                                                            'check text-muted'}"></i>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
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
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const message = input.value.trim();
                    if (!message) return;
                    
                    sendMessage(message);
                    input.value = '';
                    input.style.height = 'auto';
                    
                    // Simular respuesta
                    if (Math.random() > 0.5) {
                        setTimeout(simulateResponse, 2000);
                    }
                });
                
                // Auto-ajustar altura
                input.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
                
                // Atajo de teclado
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        form.dispatchEvent(new Event('submit'));
                    }
                });
            }
        }
    }
    
    function sendMessage(text) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageId = Date.now();
        const messageElement = document.createElement('div');
        messageElement.className = 'message own new';
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${currentChat.type === 'group' ? `<small class="message-sender">${currentUser.name}</small>` : ''}
                <div class="message-bubble">
                    <p class="mb-0">${text}</p>
                </div>
                <div class="message-footer">
                    <small class="text-muted">${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                    <div class="message-status">
                        <i class="fas fa-check text-muted"></i>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar antes del encryption notice si existe, de lo contrario al final
        const encryptionNotice = messagesContainer.querySelector('.encryption-notice');
        if (encryptionNotice) {
            messagesContainer.insertBefore(messageElement, encryptionNotice);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        scrollToBottom();
        
        // Actualizar estado de envío
        setTimeout(() => {
            const statusIcon = messageElement.querySelector('.message-status i');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check-double text-primary';
            }
        }, 1500);
    }
    
    function simulateResponse() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const responses = [
            'Gracias por tu mensaje.',
            'Interesante punto de vista.',
            '¿Podrías explicar más sobre eso?',
            'Tengo una pregunta relacionada...',
            'Estoy de acuerdo contigo.'
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        const sender = currentChat.type === 'group' ? 'Usuario' : currentChat.name;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message new';
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${currentChat.type === 'group' ? `<small class="message-sender">${sender}</small>` : ''}
                <div class="message-bubble">
                    <p class="mb-0">${response}</p>
                </div>
                <div class="message-footer">
                    <small class="text-muted">${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
            </div>
        `;
        
        // Insertar antes del encryption notice si existe, de lo contrario al final
        const encryptionNotice = messagesContainer.querySelector('.encryption-notice');
        if (encryptionNotice) {
            messagesContainer.insertBefore(messageElement, encryptionNotice);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        scrollToBottom();
    }
    
    function acceptRequest(requestId, element = null) {
        // En un caso real, aquí se enviaría al servidor
        showNotification('Solicitud aceptada', 'success');
        
        if (element) {
            element.remove();
        }
        
        // Actualizar contador
        updateRequestsCount();
        
        // Si estábamos en la vista de solicitud, cambiar a chat normal
        if (currentChat.type === 'request') {
            const request = data.incomingRequests.find(r => r.id === requestId);
            if (request) {
                // Simular que ahora es un contacto
                const newContact = {
                    id: request.id,
                    name: request.name,
                    status: 'online',
                    type: request.type,
                    isContact: true,
                    lastSeen: 'En línea',
                    avatar: request.avatar
                };
                
                // Agregar a la lista de contactos (solo en el frontend para la simulación)
                data.contacts.push(newContact);
                
                // Cambiar a chat individual con este usuario
                switchToChat(requestId, 'individual', false);
            }
        }
    }
    
    function rejectRequest(requestId, element = null) {
        // En un caso real, aquí se enviaría al servidor
        showNotification('Solicitud rechazada', 'info');
        
        if (element) {
            element.remove();
        }
        
        // Actualizar contador
        updateRequestsCount();
        
        // Si estábamos en la vista de solicitud, volver a la lista
        if (currentChat.type === 'request') {
            const chatsTab = document.querySelector('.tab-btn[data-tab="chats"]');
            if (chatsTab) {
                chatsTab.click();
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
    
    function getChatMessages(chatId, type) {
        // Mensajes simulados para diferentes chats
        if (type === 'channel') {
            return [];
        }
        
        // Para chats individuales, mensajes simulados por contacto
        const individualMessages = {
            2: [ // Ana García
                { id: 1, sender: 'Ana García', text: 'Hola, ¿has revisado el artículo que te envié?', time: '10:30', isOwn: false, status: 'read' },
                { id: 2, sender: 'Tú', text: 'Sí, justo lo estaba leyendo. Muy interesante la metodología que usaron.', time: '10:32', isOwn: true, status: 'read' },
                { id: 3, sender: 'Ana García', text: '¿Podrías enviarme tu análisis cuando lo termines? Me gustaría contrastar opiniones.', time: '10:33', isOwn: false, status: 'read' },
                { id: 4, sender: 'Tú', text: 'Claro, tengo algunas notas aquí. Te las envío mañana.', time: '10:35', isOwn: true, status: 'delivered' }
            ],
            3: [ // Carlos López
                { id: 1, sender: 'Carlos López', text: 'Hola, ¿cómo va el proyecto?', time: '11:20', isOwn: false, status: 'read' },
                { id: 2, sender: 'Tú', text: 'Bien, avanzando. ¿Tú?', time: '11:22', isOwn: true, status: 'read' },
                { id: 3, sender: 'Carlos López', text: 'Terminando la fase de pruebas.', time: '11:25', isOwn: false, status: 'read' }
            ],
            4: [ // María Rodríguez (solicitud enviada)
                // No hay mensajes porque es una solicitud pendiente
            ],
            5: [ // Pedro Sánchez
                { id: 1, sender: 'Pedro Sánchez', text: '¿Nos vemos en la conferencia?', time: '09:15', isOwn: false, status: 'read' },
                { id: 2, sender: 'Tú', text: 'Sí, allí nos vemos.', time: '09:18', isOwn: true, status: 'read' }
            ]
        };
        
        return individualMessages[chatId] || [
            { id: 1, sender: 'Contacto', text: 'Hola, ¿cómo estás?', time: '10:00', isOwn: false, status: 'read' },
            { id: 2, sender: 'Tú', text: 'Muy bien, ¿y tú?', time: '10:02', isOwn: true, status: 'read' }
        ];
    }
    
    function getGroupMessages(groupId) {
        // Mensajes simulados para grupos
        const groupMessages = {
            101: [ // Grupo de Neurociencia
                { id: 1, sender: 'Ana García', text: 'Hola a todos, ¿han leído el último paper de Park?', time: '10:45', isOwn: false, status: 'read' },
                { id: 2, sender: 'Carlos López', text: 'Sí, muy interesante la metodología.', time: '10:50', isOwn: false, status: 'read' },
                { id: 3, sender: 'Tú', text: 'Aún no, ¿me lo puedes enviar?', time: '10:52', isOwn: true, status: 'read' },
                { id: 4, sender: 'Ana García', text: 'Claro, te lo paso por correo.', time: '10:55', isOwn: false, status: 'read' }
            ],
            102: [ // Estudios Filosóficos
                { id: 1, sender: 'Carlos López', text: 'La discusión sobre Heidegger fue muy productiva.', time: 'Ayer 15:30', isOwn: false, status: 'read' },
                { id: 2, sender: 'Tú', text: 'Sí, me ayudó a aclarar varios conceptos.', time: 'Ayer 15:35', isOwn: true, status: 'read' },
                { id: 3, sender: 'Ana García', text: '¿Podemos programar otra reunión?', time: 'Ayer 16:00', isOwn: false, status: 'read' }
            ]
        };
        
        return groupMessages[groupId] || [
            { id: 1, sender: 'Usuario', text: 'Bienvenidos al grupo!', time: '10:00', isOwn: false, status: 'read' },
            { id: 2, sender: 'Tú', text: 'Hola a todos!', time: '10:02', isOwn: true, status: 'read' }
        ];
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
    
    // Agregar CSS para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});