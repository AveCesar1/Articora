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
                // Update group counter in header without reloading and fetch full chat info
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

                    // Try to fetch full chat info so we have participants and public keys
                    let groupInfo = null;
                    const groupId = data.groupId;
                    try {
                        const infoResp = await fetch(`/api/chats/${groupId}/info`);
                        if (infoResp.ok) {
                            groupInfo = await infoResp.json();
                        }
                    } catch (e) { /* ignore fetch errors */ }

                    // Build a canonical group object compatible with server-provided shape
                    const membersList = [currentUser.id, ...selectedMembers];
                    const participants = (groupInfo && groupInfo.participants) ? groupInfo.participants : membersList.map(id => {
                        const c = (window.chatData && window.chatData.contacts) ? window.chatData.contacts.find(x => Number(x.id) === Number(id)) : null;
                        return {
                            user_id: id,
                            username: c && (c.name || c.username) || null,
                            full_name: c && c.full_name || null,
                            profile_picture: c && c.avatar || null,
                            public_key: c && (c.publicKey || c.public_key) || null
                        };
                    });

                    const groupObj = {
                        id: groupId,
                        name: (groupInfo && groupInfo.name) ? groupInfo.name : groupName,
                        description: (groupInfo && groupInfo.description) ? groupInfo.description : '',
                        avatar: (groupInfo && groupInfo.avatar) ? groupInfo.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=8B4513&color=fff&bold=true`,
                        members: participants.length,
                        maxMembers: 12,
                        isMember: true,
                        lastMessage: null,
                        participants: participants
                    };

                    // Insert the newly created group into the groups list in the sidebar
                    try {
                        const groupsContainer = document.getElementById('groups-content');
                        if (groupsContainer) {
                            const newItem = document.createElement('div');
                            newItem.className = 'chat-item';
                            newItem.setAttribute('data-id', String(groupObj.id));
                            newItem.setAttribute('data-chat-id', String(groupObj.id));
                            newItem.setAttribute('data-type', 'group');
                            newItem.innerHTML = `\n                                <div class="d-flex align-items-center">\n                                    <img src="${groupObj.avatar}" alt="Avatar" class="avatar-sm rounded-circle me-3">\n                                    <div class="chat-info flex-grow-1">\n                                        <strong class="chat-name">${groupObj.name}</strong>\n                                        <small class="text-muted d-block"><i class="fas fa-users me-1"></i>${groupObj.members}/12 miembros</small>\n                                    </div>\n                                </div>`;

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

                            // Keep an in-memory reference (make sure both window.chatData and window.data reflect it)
                            try {
                                window.chatData.groups = window.chatData.groups || [];
                                window.chatData.groups.push(groupObj);
                                if (window.data) {
                                    window.data.groups = window.data.groups || [];
                                    window.data.groups.push(groupObj);
                                }
                            } catch (e) {}

                            // Open the newly created chat immediately for the creator
                            try {
                                // mark UI active
                                document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                                newItem.classList.add('active');
                                if (window.socket && groupObj.id) {
                                    if (window._lastJoinedChatId && window._lastJoinedChatId !== groupObj.id) window.socket.emit('leave_chat', window._lastJoinedChatId);
                                    window.socket.emit('join_chat', groupObj.id);
                                    window._lastJoinedChatId = groupObj.id;
                                }
                                await switchToChat(groupObj.id, groupObj.id, 'group', false);
                            } catch (e) { /* ignore open errors */ }
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
