// chat-init: inicialización del chat y configuración de listeners generales

async function initChat() {
    // Cargar claves antes de cualquier interacción
    const keysLoaded = await loadMyKeys();
    if (!keysLoaded) {
        // Podemos continuar, pero el cifrado no funcionará
    }

    console.log('Inicializando chat con datos:', data);

    // Configurar navegación por pestañas (sin cambios)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
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
        item.addEventListener('click', async function (e) {   // <-- async
            e.stopPropagation();

            const userId = parseInt(this.dataset.id);
            const chatId = parseInt(this.dataset.chatId);
            const chatType = this.dataset.type;
            const isRequest = this.dataset.isRequest === 'true';

            console.log('Clic en chat:', { userId, chatId, chatType, isRequest });

            // Actualizar estado activo
            chatItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Cambiar al chat seleccionado, pasando el chatId
            await switchToChat(userId, chatId, chatType, isRequest);   // <-- await
        });
    });

    // Configurar solicitudes entrantes (con async)
    requestItems.forEach(item => {
        item.addEventListener('click', async function (e) {
            if (!e.target.closest('.request-actions')) {
                const requestId = parseInt(this.dataset.id);
                await switchToChat(requestId, null, 'request', true);
            }
        });

        const acceptBtn = item.querySelector('.accept-btn');
        const rejectBtn = item.querySelector('.reject-btn');
        const reportBtn = item.querySelector('.report-btn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const requestId = parseInt(item.dataset.id);
                await acceptRequest(requestId, item);
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const requestId = parseInt(item.dataset.id);
                await rejectRequest(requestId, item);
            });
        }

        if (reportBtn) {
            reportBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const modal = new bootstrap.Modal(document.getElementById('reportModal'));
                modal.show();
            });
        }
    });

    // Barra de búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            filterChats(searchTerm);
        });
    }

    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length === 0) {
                showNotification('Selecciona un archivo', 'warning');
                return;
            }
            await sendFile(fileInput);
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            modal.hide();
            uploadForm.reset();
        });
    }

    // Delegación de eventos para descargar archivos
    document.getElementById('messagesContainer').addEventListener('click', async (e) => {
        const btn = e.target.closest('.download-file');
        if (btn && btn.dataset.messageId) {
            e.preventDefault();
            await downloadFile(btn.dataset.messageId);
        }
    });

    // Scroll al final de los mensajes
    scrollToBottom();

    // Simular actividad del chat (opcional, se puede quitar)
    simulateChatActivity();
}
