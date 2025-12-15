// chat.js - Actualizado para el nuevo diseño

document.addEventListener('DOMContentLoaded', function() {
    // Navegación del sidebar
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.target;
            
            // Actualizar pestaña activa
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenido correspondiente
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${target}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Si es el canal Artícora, cambiar el chat principal
            if (target === 'articora') {
                switchToChat('channel', 0);
            }
        });
    });
    
    // Contactos y grupos
    document.querySelectorAll('.contact-item:not(.pending)').forEach(item => {
        item.addEventListener('click', function() {
            const contactId = this.dataset.contactId;
            
            // Actualizar estado activo
            document.querySelectorAll('.contact-item, .group-item').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');
            
            // Cambiar a chat individual
            switchToChat('individual', contactId);
        });
    });
    
    document.querySelectorAll('.group-item').forEach(item => {
        item.addEventListener('click', function() {
            const groupId = this.dataset.groupId;
            
            // Actualizar estado activo
            document.querySelectorAll('.contact-item, .group-item').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');
            
            // Cambiar a chat grupal
            switchToChat('group', groupId);
        });
    });
    
    // Botón para nueva conversación
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            // Aquí se implementaría la funcionalidad para buscar usuarios
            showNotification('Funcionalidad para buscar usuarios próximamente', 'info');
        });
    }
    
    // Funcionalidad para solicitudes pendientes
    document.querySelectorAll('.accept-request').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const requestItem = this.closest('.request-item');
            showNotification('Solicitud aceptada. Ahora son contactos.', 'success');
            requestItem.style.opacity = '0.5';
            setTimeout(() => {
                requestItem.remove();
                updateRequestsCount();
            }, 500);
        });
    });
    
    document.querySelectorAll('.reject-request').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const requestItem = this.closest('.request-item');
            showNotification('Solicitud rechazada.', 'info');
            requestItem.style.opacity = '0.5';
            setTimeout(() => {
                requestItem.remove();
                updateRequestsCount();
            }, 500);
        });
    });
    
    // Auto-scroll al área de mensajes
    function scrollToBottom() {
        const messagesArea = document.querySelector('.messages-area');
        if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }
    
    // Función para cambiar entre chats
    function switchToChat(type, id) {
        const chatHeader = document.querySelector('.chat-header');
        const messageInputArea = document.querySelector('.message-input-area');
        
        // Actualizar encabezado
        if (type === 'channel') {
            chatHeader.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-bullhorn fa-2x text-warning"></i>
                    </div>
                    <div>
                        <h5 class="mb-0">Canal Artícora</h5>
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i> Anuncios oficiales
                        </small>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="tooltip" title="Información">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;
            
            if (messageInputArea) {
                messageInputArea.style.display = 'none';
            }
            
            // Mostrar mensajes del canal
            const messagesArea = document.querySelector('.messages-area');
            if (messagesArea) {
                // Aquí cargaríamos los mensajes del canal desde el servidor
                // Por ahora, solo mostramos un mensaje de ejemplo
                messagesArea.innerHTML = `
                    <div class="text-center mb-4">
                        <div class="channel-welcome">
                            <i class="fas fa-bullhorn fa-3x text-warning mb-3"></i>
                            <h4>Canal oficial Artícora</h4>
                            <p class="text-muted">Aquí encontrarás anuncios y notificaciones importantes</p>
                        </div>
                    </div>
                    <div class="channel-message-card">
                        <div class="d-flex">
                            <div class="message-icon me-3">
                                <i class="fas fa-bullhorn fa-lg text-warning"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <strong>Administración</strong>
                                    <small class="text-muted">Hoy 09:00</small>
                                </div>
                                <p class="mb-0">⚠️ Mantenimiento programado: El sistema estará en mantenimiento el próximo domingo de 2:00 a 6:00 AM.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Para chats normales
            if (messageInputArea) {
                messageInputArea.style.display = 'block';
            }
            
            // Cargar mensajes del chat seleccionado (simulado)
            loadChatMessages(type, id);
        }
        
        scrollToBottom();
    }
    
    // Función para cargar mensajes (simulada)
    function loadChatMessages(type, id) {
        const messagesArea = document.querySelector('.messages-area');
        if (!messagesArea) return;
        
        let messages = [];
        
        if (type === 'individual') {
            messages = [
                {
                    id: 1,
                    sender: 'Ana García',
                    text: 'Hola, ¿cómo estás?',
                    time: '10:30',
                    isOwn: false,
                    status: 'read'
                },
                {
                    id: 2,
                    sender: 'Tú',
                    text: '¡Hola! Todo bien, trabajando en el proyecto.',
                    time: '10:32',
                    isOwn: true,
                    status: 'read'
                },
                {
                    id: 3,
                    sender: 'Ana García',
                    text: 'Excelente. ¿Has revisado el material que te envié?',
                    time: '10:33',
                    isOwn: false,
                    status: 'read'
                }
            ];
        } else if (type === 'group') {
            messages = [
                {
                    id: 1,
                    sender: 'Carlos López',
                    text: 'Buenos días a todos. ¿Han avanzado con la investigación?',
                    time: '09:15',
                    isOwn: false,
                    status: 'read'
                },
                {
                    id: 2,
                    sender: 'Tú',
                    text: 'Sí, tengo algunos avances. Comparto el documento esta tarde.',
                    time: '09:20',
                    isOwn: true,
                    status: 'read'
                },
                {
                    id: 3,
                    sender: 'María Rodríguez',
                    text: 'Perfecto, estaré atenta. También tengo datos para compartir.',
                    time: '09:25',
                    isOwn: false,
                    status: 'read'
                }
            ];
        }
        
        // Limpiar y agregar mensajes
        messagesArea.innerHTML = '';
        messages.forEach(msg => {
            const messageEl = createMessageElement(msg, type === 'group');
            messagesArea.appendChild(messageEl);
        });
        
        // Agregar indicador de cifrado
        const encryptionNotice = document.createElement('div');
        encryptionNotice.className = 'encryption-notice';
        encryptionNotice.innerHTML = `
            <i class="fas fa-lock text-success me-2"></i>
            <small class="text-muted">
                Los mensajes están protegidos con cifrado de extremo a extremo (AES-256 & RSA-2048)
            </small>
        `;
        messagesArea.appendChild(encryptionNotice);
    }
    
    // Función para crear elementos de mensaje
    function createMessageElement(message, isGroup = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isOwn ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;
        
        let senderHtml = '';
        if (!message.isOwn && isGroup) {
            senderHtml = `<small class="message-sender">${message.sender}</small>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${senderHtml}
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
        `;
        
        return messageDiv;
    }
    
    // Función para actualizar contador de solicitudes
    function updateRequestsCount() {
        const requestItems = document.querySelectorAll('.request-item').length;
        const requestTab = document.querySelector('.nav-tab[data-target="requests"] .badge');
        
        if (requestTab) {
            if (requestItems > 0) {
                requestTab.textContent = requestItems;
                requestTab.classList.remove('d-none');
            } else {
                requestTab.classList.add('d-none');
            }
        }
        
        // Actualizar también en la pestaña de contactos
        const contactsBadge = document.querySelector('.nav-tab[data-target="contacts"] .badge');
        if (contactsBadge && requestItems > 0) {
            contactsBadge.textContent = requestItems;
            contactsBadge.classList.remove('d-none');
        }
    }
    
    // Función para mostrar notificaciones
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
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Agregar CSS para la animación
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
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Scroll inicial al fondo
    scrollToBottom();
    
    // Simular actividad
    setInterval(() => {
        // Simular nuevos mensajes aleatoriamente
        if (Math.random() > 0.8) {
            const messagesArea = document.querySelector('.messages-area');
            if (messagesArea && !messagesArea.querySelector('.channel-welcome')) {
                const newMessage = {
                    id: Date.now(),
                    sender: 'Ana García',
                    text: '¿Has visto la nueva publicación?',
                    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    isOwn: false,
                    status: 'read'
                };
                
                const messageEl = createMessageElement(newMessage);
                messageEl.classList.add('new');
                messagesArea.insertBefore(messageEl, messagesArea.lastElementChild);
                scrollToBottom();
            }
        }
    }, 30000);
});