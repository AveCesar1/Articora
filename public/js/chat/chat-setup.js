// chat-setup: inicialización y selección de elementos DOM

(function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
})(function() {
    // Usar datos desde window (pasados desde el servidor)
    const data = window.chatData;
    const currentUser = data.user;

    // Estado actual del chat
    let currentChat = data.activeChat;

    window.data = data;
    window.currentUser = currentUser;
    window.currentChat = currentChat;

    // Elementos del DOM
    const chatItems = document.querySelectorAll('.chat-item');
    window.chatItems = chatItems;
    const requestItems = document.querySelectorAll('.request-item');
    window.requestItems = requestItems;
    const tabBtns = document.querySelectorAll('.tab-btn');
    window.tabBtns = tabBtns;
    const tabContents = document.querySelectorAll('.tab-content');
    window.tabContents = tabContents;
    const searchInput = document.querySelector('.sidebar-search input');
    window.searchInput = searchInput;

    const createGroupForm = document.getElementById('createGroupForm');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const groupName = this.querySelector('input[type="text"]').value;
            const selectedMembers = Array.from(this.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => parseInt(cb.value, 10));

            if (!groupName) {
                showNotification('Debes ingresar un nombre para el grupo', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupName, memberIds: selectedMembers })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                showNotification('Grupo creado exitosamente', 'success');
                // Update group counter in header without reloading
                try {
                    window.chatData = window.chatData || {};
                    window.chatData.user = window.chatData.user || {};
                    const prev = parseInt(window.chatData.user.currentGroups || '0', 10) || 0;
                    window.chatData.user.currentGroups = prev + 1;
                    const el = document.getElementById('groupCount');
                    if (el) el.textContent = String(window.chatData.user.currentGroups);

                    // Close the modal automatically
                    try {
                        const modalEl = document.getElementById('createGroupModal');
                        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modalInstance.hide();
                    } catch (e) { /* ignore modal hide errors */ }

                    // Insert the newly created group into the groups list in the sidebar
                    try {
                        const groupsContainer = document.getElementById('groups-content');
                        if (groupsContainer) {
                            const newItem = document.createElement('div');
                            newItem.className = 'chat-item';
                            newItem.setAttribute('data-id', data.groupId);
                            newItem.setAttribute('data-chat-id', data.groupId);
                            newItem.setAttribute('data-type', 'group');
                            newItem.innerHTML = `\n                                <div class="d-flex align-items-center">\n                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=8B4513&color=fff&bold=true" alt="Avatar" class="avatar-sm rounded-circle me-3">\n                                    <div class="chat-info flex-grow-1">\n                                        <strong class="chat-name">${groupName}</strong>\n                                        <small class="text-muted d-block"><i class="fas fa-users me-1"></i>${selectedMembers.length + 1}/12 miembros</small>\n                                    </div>\n                                </div>`;

                            // Insert after the "new group" button if present
                            const btnContainer = groupsContainer.querySelector('.mb-3');
                            if (btnContainer && btnContainer.parentNode === groupsContainer) groupsContainer.insertBefore(newItem, btnContainer.nextSibling);
                            else groupsContainer.appendChild(newItem);

                            // Attach click handler to open the new group chat
                            newItem.addEventListener('click', async function (e) {
                                e.stopPropagation();
                                const userId = parseInt(this.dataset.id, 10);
                                const chatId = parseInt(this.dataset.chatId, 10);
                                const chatType = this.dataset.type;
                                document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                                this.classList.add('active');
                                try {
                                    await switchToChat(userId, chatId, chatType, false);
                                    if (window.socket && chatId) {
                                        if (window._lastJoinedChatId && window._lastJoinedChatId !== chatId) window.socket.emit('leave_chat', window._lastJoinedChatId);
                                        window.socket.emit('join_chat', chatId);
                                        window._lastJoinedChatId = chatId;
                                    }
                                } catch (e) { console.warn('Could not open new group chat', e && e.message); }
                            });

                            // Keep an in-memory reference
                            try { window.chatData.groups = window.chatData.groups || []; window.chatData.groups.push({ id: data.groupId, group_name: groupName }); } catch (e) {}
                        }
                    } catch (e) { console.warn('Could not insert new group into DOM', e && e.message); }

                    // Reset the form
                    try { createGroupForm.reset(); } catch (e) { }
                } catch (e) { console.warn('Could not update group counter in DOM', e && e.message); }
            } catch (err) {
                console.error(err);
                showNotification(err.message || 'Error al crear grupo', 'error');
            }
        });
    }
});
