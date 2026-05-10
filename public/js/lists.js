document.addEventListener('DOMContentLoaded', function () {
    // Cargar datos del servidor desde el script inyectado
    const dataElement = document.getElementById('listsData');
    const data = dataElement ? JSON.parse(dataElement.textContent) : {};

    // Estado mínimo para la creación colaborativa
    let collaborators = [];

    // Utilidades
    function escapeHtml(s) {
        return String(s).replace(/[&<>'"]/g, function(m) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];
        });
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
            if (notification.parentNode) notification.remove();
        }, 5000);
    }

    // --- Vista principal de listas ---
    if (window.location.pathname === '/lists') {
        initListsView();
    }

    function initListsView() {
        console.log('Inicializando vista de listas');

        // Búsqueda en tiempo real
        const searchInput = document.getElementById('searchLists');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                filterLists(this.value.toLowerCase());
            });
        }

        // Modal de creación
        setupCreateListModal();

        // Contadores de caracteres (para textareas)
        setupCharacterCounters();

        // Botones de acción (compartir, eliminar, responder invitaciones)
        setupListActions();

        // Pestañas
        setupTabs();

        // Tooltips de Bootstrap
        initTooltips();
    }

    function filterLists(searchTerm) {
        const activeTab = document.querySelector('#listsTabs .nav-link.active').id;
        const containerId = activeTab.includes('my-lists') ? 'myListsContainer' : 'publicListsContainer';
        const container = document.getElementById(containerId);
        if (!container) return;

        const listCards = container.querySelectorAll('.list-card');
        let visibleCount = 0;

        listCards.forEach(card => {
            const title = card.dataset.title || '';
            const creator = card.dataset.creator || '';
            const categories = card.dataset.categories || '';
            const matches = title.includes(searchTerm) || creator.includes(searchTerm) || categories.includes(searchTerm);
            if (matches || searchTerm === '') {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Mostrar mensaje si no hay resultados
        const noResults = container.querySelector('.no-results-message');
        if (visibleCount === 0 && searchTerm !== '') {
            if (!noResults) {
                const message = document.createElement('div');
                message.className = 'col-12 text-center py-5 no-results-message';
                message.innerHTML = `
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No se encontraron listas</h5>
                    <p class="text-muted">Intenta con otros términos de búsqueda</p>
                `;
                container.appendChild(message);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    // --- Configuración del modal de creación ---
    function setupCreateListModal() {
        const modal = document.getElementById('createListModal');
        if (!modal) return;

        // Contadores de caracteres dentro del modal
        const titleInput = document.getElementById('listTitle');
        const descInput = document.getElementById('listDescription');
        if (titleInput) {
            titleInput.addEventListener('input', function () {
                const count = this.value.length;
                const counter = document.getElementById('titleCount');
                if (counter) {
                    counter.textContent = `${count}/50`;
                    counter.className = `char-count ${count >= 45 ? 'warning' : ''} ${count > 50 ? 'danger' : ''}`;
                }
            });
        }
        if (descInput) {
            descInput.addEventListener('input', function () {
                const count = this.value.length;
                const counter = document.getElementById('descCount');
                if (counter) {
                    counter.textContent = `${count}/500`;
                    counter.className = `char-count ${count >= 450 ? 'warning' : ''} ${count > 500 ? 'danger' : ''}`;
                }
            });
        }

        // Colaboradores: solo si el usuario puede crear listas colaborativas
        const collaborativeSwitch = document.getElementById('collaborativeSwitch');
        const collaborativeSettings = document.getElementById('collaborativeSettings');
        if (collaborativeSwitch && collaborativeSettings) {
            collaborativeSwitch.addEventListener('change', function () {
                collaborativeSettings.style.display = this.checked ? 'block' : 'none';
                collaborators = [];
                updateCollaboratorsList();
            });

            const collaboratorSearch = document.getElementById('collaboratorSearchCreate');
            const suggestionsContainer = document.getElementById('collaboratorSuggestionsCreate');
            let searchTimer = null;

            if (collaboratorSearch) {
                collaboratorSearch.addEventListener('input', function (e) {
                    const query = e.target.value.trim();
                    clearTimeout(searchTimer);
                    if (suggestionsContainer) suggestionsContainer.innerHTML = '';
                    if (query.length < 3) return;

                    searchTimer = setTimeout(async () => {
                        try {
                            const resp = await fetch('/api/users/search?' + new URLSearchParams({ q: query }).toString());
                            const json = await resp.json();
                            if (!json || !json.success) {
                                if (suggestionsContainer) suggestionsContainer.innerHTML = '<div class="list-group-item small text-muted">Error en búsqueda</div>';
                                return;
                            }
                            const results = json.results || [];
                            if (results.length === 0) {
                                if (suggestionsContainer) suggestionsContainer.innerHTML = '<div class="list-group-item small text-muted">No se encontraron usuarios</div>';
                                return;
                            }
                            if (suggestionsContainer) suggestionsContainer.innerHTML = '';
                            results.forEach(u => {
                                const item = document.createElement('div');
                                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                                item.innerHTML = `
                                    <div>
                                        <strong>${escapeHtml(u.full_name || u.username)}</strong>
                                        <br><small class="text-muted">@${escapeHtml(u.username)}</small>
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary add-coll-create" data-id="${u.id}" data-name="${escapeHtml(u.full_name || u.username)}">Agregar</button>
                                `;
                                suggestionsContainer.appendChild(item);
                            });
                            suggestionsContainer.querySelectorAll('.add-coll-create').forEach(btn => {
                                btn.addEventListener('click', function () {
                                    const id = this.dataset.id;
                                    const name = this.dataset.name;
                                    if (!id) return;
                                    if (collaborators.find(c => String(c.id) === String(id))) return;
                                    if (collaborators.length >= 5) {
                                        showNotification('Máximo 5 colaboradores', 'error');
                                        return;
                                    }
                                    collaborators.push({ id: id, name: name });
                                    updateCollaboratorsList();
                                    collaboratorSearch.value = '';
                                    if (suggestionsContainer) suggestionsContainer.innerHTML = '';
                                });
                            });
                        } catch (err) {
                            console.error(err);
                            if (suggestionsContainer) suggestionsContainer.innerHTML = '<div class="list-group-item small text-muted">Error de red</div>';
                        }
                    }, 300);
                });
            }
        }

        // Vista previa de portada
        const coverTypeRadios = document.querySelectorAll('input[name="coverType"]');
        const categorySelection = document.getElementById('categorySelection');
        const coverPreview = document.getElementById('coverPreview');
        const categorySelect = document.getElementById('coverCategorySelect');

        function updateCoverPreview() {
            if (!coverPreview) return;
            const coverType = document.querySelector('input[name="coverType"]:checked')?.value || 'auto';
            if (coverType === 'category') {
                const selectedOption = categorySelect?.options[categorySelect.selectedIndex];
                const color = selectedOption?.dataset.color || '#5d4037';
                const name = selectedOption?.text || 'Categoría';
                coverPreview.src = `https://placehold.co/300x200/${color.replace('#', '')}/f5f1e6?text=${encodeURIComponent(name)}`;
            } else {
                coverPreview.src = `https://placehold.co/300x200/5d4037/f5f1e6?text=Primera+Fuente`;
            }
        }

        coverTypeRadios.forEach(radio => {
            radio.addEventListener('change', function () {
                if (this.value === 'category') {
                    if (categorySelection) categorySelection.style.display = 'block';
                    updateCoverPreview();
                } else {
                    if (categorySelection) categorySelection.style.display = 'none';
                    updateCoverPreview();
                }
            });
        });
        if (categorySelect) {
            categorySelect.addEventListener('change', updateCoverPreview);
        }
        if (titleInput) {
            titleInput.addEventListener('input', function () {
                const coverType = document.querySelector('input[name="coverType"]:checked')?.value || 'auto';
                if (coverType === 'category') updateCoverPreview();
            });
        }

        // Envío del formulario de creación
        const form = document.getElementById('createListForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const title = titleInput?.value.trim();
                const description = descInput?.value.trim();
                if (!title) {
                    showNotification('El título es obligatorio', 'error');
                    return;
                }
                if (title.length > 50) {
                    showNotification('El título no puede exceder 50 caracteres', 'error');
                    return;
                }
                if (description && description.length > 500) {
                    showNotification('La descripción no puede exceder 500 caracteres', 'error');
                    return;
                }

                const coverType = document.querySelector('input[name="coverType"]:checked')?.value || 'auto';
                const isPublic = document.getElementById('visibilityPublic')?.checked ? 1 : 0;
                const isCollaborative = collaborativeSwitch?.checked ? 1 : 0;

                const payload = {
                    title: title,
                    description: description,
                    cover_type: coverType,
                    cover_category: (coverType === 'category' && categorySelect) ? categorySelect.value : null,
                    is_public: isPublic,
                    is_collaborative: isCollaborative,
                    collaborators: collaborators.map(c => c.id)
                };

                (async () => {
                    try {
                        const resp = await fetch('/api/lists', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const json = await resp.json();
                        if (!resp.ok || !json || !json.success) {
                            showNotification(json?.message || 'Error creando la lista', 'error');
                            return;
                        }
                        showNotification('Lista creada exitosamente', 'success');
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        modalInstance.hide();
                        setTimeout(() => {
                            if (json.list && json.list.id) {
                                window.location.href = `/lists/${json.list.id}`;
                            } else {
                                window.location.reload();
                            }
                        }, 700);
                    } catch (err) {
                        console.error('Error creating list:', err);
                        showNotification('Error de red al crear la lista', 'error');
                    }
                })();
            });
        }
    }

    function updateCollaboratorsList() {
        const container = document.getElementById('collaboratorsList');
        if (!container) return;

        if (collaborators.length === 0) {
            container.innerHTML = '<small class="text-muted d-block mb-2">Colaboradores invitados:</small><p class="text-muted small mb-0">No hay colaboradores invitados</p>';
            return;
        }

        let html = '<small class="text-muted d-block mb-2">Colaboradores invitados:</small>';
        collaborators.forEach(collab => {
            html += `
                <div class="collaborator-item">
                    <i class="fas fa-user-circle me-2 text-muted"></i>
                    <span class="small">${collab.name}</span>
                    <button class="btn btn-sm btn-outline-danger remove-collaborator" data-id="${collab.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        html += `<small class="text-muted d-block mt-2">${collaborators.length}/5 colaboradores</small>`;
        container.innerHTML = html;

        container.querySelectorAll('.remove-collaborator').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.dataset.id;
                collaborators = collaborators.filter(c => c.id !== id);
                updateCollaboratorsList();
            });
        });
    }

    // --- Acciones sobre las listas (compartir, eliminar, responder invitaciones) ---
    function setupListActions() {
        // Botones compartir
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const listId = this.dataset.listId;
                const listTitle = this.dataset.listTitle;
                showShareModal(listId, listTitle);
            });
        });

        // Botones eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const listId = this.dataset.listId;
                confirmDeleteList(listId);
            });
        });

        // Botones responder invitación (aceptar/rechazar)
        document.querySelectorAll('.respond-invite-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const listId = this.dataset.listId;
                const action = this.dataset.action; // 'accept' or 'reject'
                if (!listId || !action) return;
                try {
                    const resp = await fetch(`/api/lists/${listId}/collaborators/respond`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action })
                    });
                    const json = await resp.json();
                    if (json && json.success) {
                        window.location.reload();
                    } else {
                        showNotification('No se pudo procesar la respuesta', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showNotification('Error de red', 'error');
                }
            });
        });
    }

    function showShareModal(listId, listTitle) {
        const shareUrl = `${window.location.origin}/lists/${listId}`;
        const shareLink = document.getElementById('shareLink');
        if (shareLink) shareLink.value = shareUrl;

        const modalEl = document.getElementById('shareListModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
            copyBtn.onclick = function () {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareUrl).then(() => showNotification('Enlace copiado al portapapeles', 'success')).catch(() => {
                        if (shareLink) { shareLink.select(); document.execCommand('copy'); showNotification('Enlace copiado al portapapeles', 'success'); }
                    });
                } else if (shareLink) {
                    shareLink.select();
                    document.execCommand('copy');
                    showNotification('Enlace copiado al portapapeles', 'success');
                }
            };
        }

        const textEnc = encodeURIComponent(listTitle || 'Lista en Artícora');
        const twitterBtn = document.getElementById('shareTwitterBtn');
        const facebookBtn = document.getElementById('shareFacebookBtn');
        const linkedinBtn = document.getElementById('shareLinkedinBtn');
        if (twitterBtn) twitterBtn.onclick = () => window.open(`https://twitter.com/intent/tweet?text=${textEnc}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
        if (facebookBtn) facebookBtn.onclick = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
        if (linkedinBtn) linkedinBtn.onclick = () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
    }

    async function confirmDeleteList(listId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta lista? Esta acción es irreversible.')) return;
        try {
            const resp = await fetch(`/api/remove-list/${listId}`, { method: 'POST' });
            const json = await resp.json().catch(() => null);
            if (resp.ok && json && json.success) {
                showNotification('Lista eliminada exitosamente', 'success');
                setTimeout(() => window.location.reload(), 750);
            } else {
                showNotification(json?.message || 'No se pudo eliminar la lista', 'error');
            }
        } catch (err) {
            console.error('Error eliminando lista:', err);
            showNotification('Error de red al eliminar la lista', 'error');
        }
    }

    // --- Utilidades generales ---
    function setupCharacterCounters() {
        document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
            const maxLength = parseInt(textarea.getAttribute('maxlength'));
            textarea.addEventListener('input', function () {
                const count = this.value.length;
                let counter = this.parentElement.querySelector('.char-counter');
                if (!counter) {
                    counter = document.createElement('div');
                    counter.className = 'char-counter form-text';
                    this.parentElement.appendChild(counter);
                }
                counter.textContent = `${count}/${maxLength}`;
                counter.className = `char-counter form-text ${(maxLength - count) < 50 ? 'text-warning' : ''} ${count > maxLength ? 'text-danger' : ''}`;
            });
            textarea.dispatchEvent(new Event('input'));
        });
    }

    function setupTabs() {
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabButtons.forEach(btn => {
            btn.addEventListener('shown.bs.tab', function () {
                const searchInput = document.getElementById('searchLists');
                if (searchInput) {
                    searchInput.value = '';
                    filterLists('');
                }
            });
        });
    }

    function initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }
});