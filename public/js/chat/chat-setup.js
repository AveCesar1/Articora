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

    // Elementos del DOM
    const chatItems = document.querySelectorAll('.chat-item');
    const requestItems = document.querySelectorAll('.request-item');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const searchInput = document.querySelector('.sidebar-search input');

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
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                console.error(err);
                showNotification(err.message || 'Error al crear grupo', 'error');
            }
        });
    }
