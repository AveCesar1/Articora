// lists.js - Funcionalidad para el módulo de Listas Curatoriales

document.addEventListener('DOMContentLoaded', function () {
    // Cargar datos del servidor
    const dataElement = document.getElementById('listsData') || document.getElementById('listDetailData');
    const data = dataElement ? JSON.parse(dataElement.textContent) : {};

    // Estado de la aplicación
    let appState = {
        selectedSources: [],
        currentSort: 'added',
        isEditing: false,
        draggedItem: null,
        collaborators: []
    };

    // Inicializar según la vista
    if (window.location.pathname === '/lists') {
        initListsView();
    } else if (window.location.pathname.includes('/lists/')) {
        initListDetailView();
    }

    function initListsView() {
        console.log('Inicializando vista de listas:', data);

        // Configurar búsqueda
        const searchInput = document.getElementById('searchLists');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                const searchTerm = this.value.toLowerCase();
                filterLists(searchTerm);
            });
        }

        // Configurar modal de creación
        setupCreateListModal();

        // Configurar contadores de caracteres
        setupCharacterCounters();

        // Configurar botones de acción
        setupListActions();

        // Configurar navegación por pestañas
        setupTabs();

        // Inicializar tooltips
        initTooltips();
    }

    function initListDetailView() {
        console.log('Inicializando vista detallada de lista:', data);

        if (!data.list) return;

        // Configurar modo edición si el usuario puede editar
        if (data.user.canEdit) {
            setupEditMode();
        }

        // Configurar botones de acción
        setupDetailActions();

        // Configurar modal de añadir fuentes
        setupAddSourcesModal();

        // Inicializar gráfico de categorías
        initCategoriesChart();

        // Inicializar tooltips
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

            const matches = title.includes(searchTerm) ||
                creator.includes(searchTerm) ||
                categories.includes(searchTerm);

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

    function setupCreateListModal() {
        const modal = document.getElementById('createListModal');
        if (!modal) return;

        // Contadores de caracteres
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

        // Configuración colaborativa
        const collaborativeSwitch = document.getElementById('collaborativeSwitch');
        const collaborativeSettings = document.getElementById('collaborativeSettings');

        if (collaborativeSwitch && collaborativeSettings) {
            collaborativeSwitch.addEventListener('change', function () {
                collaborativeSettings.style.display = this.checked ? 'block' : 'none';
                appState.collaborators = [];
                updateCollaboratorsList();
            });

            // Añadir colaborador
            const addCollaboratorBtn = document.getElementById('addCollaboratorBtn');
            const collaboratorSelect = document.getElementById('collaboratorSelect');

            if (addCollaboratorBtn && collaboratorSelect) {
                addCollaboratorBtn.addEventListener('click', function () {
                    const selectedId = collaboratorSelect.value;
                    if (!selectedId) return;

                    const selectedOption = collaboratorSelect.options[collaboratorSelect.selectedIndex];
                    const name = selectedOption.text.split(' (')[0];

                    // Evitar duplicados
                    if (!appState.collaborators.find(c => c.id === selectedId) && appState.collaborators.length < 5) {
                        appState.collaborators.push({
                            id: selectedId,
                            name: name
                        });
                        updateCollaboratorsList();
                        collaboratorSelect.value = '';
                    }
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
                const icon = selectedOption?.dataset.icon || 'book';
                const name = selectedOption?.text || 'Categoría';

                // Crear placeholder con categoría
                const encodedName = encodeURIComponent(name);
                coverPreview.src = `https://placehold.co/300x200/${color.replace('#', '')}/f5f1e6?text=${encodedName}`;
            } else {
                // Portada automática: siempre "Primera Fuente"
                coverPreview.src = `https://placehold.co/300x200/5d4037/f5f1e6?text=Primera+Fuente`;
            }
        }

        coverTypeRadios.forEach(radio => {
            radio.addEventListener('change', function () {
                if (this.value === 'category') {
                    categorySelection.style.display = 'block';
                    updateCoverPreview();
                } else {
                    categorySelection.style.display = 'none';
                    updateCoverPreview();
                }
            });
        });

        if (categorySelect) {
            categorySelect.addEventListener('change', updateCoverPreview);
        }

        if (titleInput) {
            titleInput.addEventListener('input', function () {
                // Solo actualizar si es tipo categoría
                const coverType = document.querySelector('input[name="coverType"]:checked')?.value || 'auto';
                if (coverType === 'category') {
                    updateCoverPreview();
                }
            });
        }

        // Envío del formulario
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

                if (description.length > 500) {
                    showNotification('La descripción no puede exceder 500 caracteres', 'error');
                    return;
                }

                // Simular creación de lista
                showNotification('Lista creada exitosamente', 'success');

                // Cerrar modal y resetear formulario
                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();

                // Simular recarga o actualización de la interfaz
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            });
        }
    }

    function updateCollaboratorsList() {
        const container = document.getElementById('collaboratorsList');
        if (!container) return;

        if (appState.collaborators.length === 0) {
            container.innerHTML = '<small class="text-muted d-block mb-2">Colaboradores invitados:</small><p class="text-muted small mb-0">No hay colaboradores invitados</p>';
            return;
        }

        let html = '<small class="text-muted d-block mb-2">Colaboradores invitados:</small>';

        appState.collaborators.forEach(collaborator => {
            html += `
                <div class="collaborator-item">
                    <i class="fas fa-user-circle me-2 text-muted"></i>
                    <span class="small">${collaborator.name}</span>
                    <button class="btn btn-sm btn-outline-danger remove-collaborator" data-id="${collaborator.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        html += `<small class="text-muted d-block mt-2">${appState.collaborators.length}/5 colaboradores</small>`;

        container.innerHTML = html;

        // Agregar eventos para eliminar colaboradores
        container.querySelectorAll('.remove-collaborator').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.dataset.id;
                appState.collaborators = appState.collaborators.filter(c => c.id !== id);
                updateCollaboratorsList();
            });
        });
    }

    function setupListActions() {
        // Botones de compartir
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const listId = this.dataset.listId;
                const listTitle = this.dataset.listTitle;
                showShareModal(listId, listTitle);
            });
        });

        // Botones de eliminar
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const listId = this.dataset.listId;
                confirmDeleteList(listId);
            });
        });
    }

    function showShareModal(listId, listTitle) {
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.value = `${window.location.origin}/lists/${listId}`;
        }

        const modal = new bootstrap.Modal(document.getElementById('shareListModal'));
        modal.show();

        // Configurar botón de copiar enlace
        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                if (shareLink) {
                    shareLink.select();
                    document.execCommand('copy');
                    showNotification('Enlace copiado al portapapeles', 'success');
                }
            });
        }
    }

    function confirmDeleteList(listId) {
        // En una implementación real, esto sería un modal de confirmación
        if (confirm('¿Estás seguro de que quieres eliminar esta lista? Esta acción es irreversible.')) {
            // Simular eliminación
            showNotification('Lista eliminada exitosamente', 'success');

            // Simular recarga de la página
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    function setupEditMode() {
        // Configurar drag & drop para reordenar fuentes
        setupDragAndDrop();

        // Configurar botones de ordenación
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const sortType = this.dataset.sort;
                sortSources(sortType);
            });
        });

        // Configurar switch de modo edición
        const editModeSwitch = document.getElementById('editModeSwitch');
        if (editModeSwitch) {
            editModeSwitch.addEventListener('change', function () {
                appState.isEditing = this.checked;
                toggleEditMode(this.checked);
            });
        }
    }

    function setupDragAndDrop() {
        const list = document.getElementById('sourcesList');
        if (!list) return;

        let dragged;

        list.addEventListener('dragstart', function (e) {
            if (e.target.classList.contains('sortable-item') || e.target.closest('.sortable-item')) {
                dragged = e.target.classList.contains('sortable-item') ? e.target : e.target.closest('.sortable-item');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', dragged.innerHTML);

                setTimeout(() => {
                    dragged.classList.add('sortable-ghost');
                }, 0);
            }
        });

        list.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const target = e.target.closest('.sortable-item');
            if (target && target !== dragged) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;

                list.insertBefore(dragged, next ? target.nextSibling : target);

                // Actualizar números de orden
                updateItemNumbers();

                // Mostrar botón de guardar
                const saveBtn = document.getElementById('saveOrderBtn');
                if (saveBtn) {
                    saveBtn.style.display = 'inline-block';
                }
            }
        });

        list.addEventListener('dragend', function () {
            if (dragged) {
                dragged.classList.remove('sortable-ghost');
                dragged = null;
            }
        });

        // Configurar botón de guardar orden
        const saveBtn = document.getElementById('saveOrderBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                saveNewOrder();
                this.style.display = 'none';
                showNotification('Orden guardado exitosamente', 'success');
            });
        }
    }

    function updateItemNumbers() {
        document.querySelectorAll('.item-number').forEach((span, index) => {
            span.textContent = index + 1;
        });
    }

    function saveNewOrder() {
        const items = Array.from(document.querySelectorAll('.sortable-item'));
        const newOrder = items.map((item, index) => ({
            id: item.dataset.id,
            order: index + 1
        }));

        console.log('Nuevo orden:', newOrder);
        // En una implementación real, enviarías esto al servidor
    }

    function sortSources(sortType) {
        const container = document.getElementById('sourcesList');
        if (!container) return;

        const items = Array.from(container.querySelectorAll('.sortable-item'));

        items.sort((a, b) => {
            const aData = {
                id: a.dataset.id,
                title: a.querySelector('td:nth-child(3) .fw-bold')?.textContent || '',
                rating: parseFloat(a.querySelector('.rating-display span')?.textContent || 0),
                date: a.querySelector('td:nth-child(6) small')?.textContent || ''
            };

            const bData = {
                id: b.dataset.id,
                title: b.querySelector('td:nth-child(3) .fw-bold')?.textContent || '',
                rating: parseFloat(b.querySelector('.rating-display span')?.textContent || 0),
                date: b.querySelector('td:nth-child(6) small')?.textContent || ''
            };

            switch (sortType) {
                case 'added':
                    return new Date(bData.date) - new Date(aData.date);
                case 'rating':
                    return bData.rating - aData.rating;
                case 'title-asc':
                    return aData.title.localeCompare(bData.title);
                case 'title-desc':
                    return bData.title.localeCompare(aData.title);
                default:
                    return 0;
            }
        });

        // Reorganizar elementos
        items.forEach(item => container.appendChild(item));
        updateItemNumbers();

        // Actualizar estado de orden actual
        appState.currentSort = sortType;
    }

    function toggleEditMode(isEditing) {
        const gripHandles = document.querySelectorAll('.grip-handle');
        const removeButtons = document.querySelectorAll('.remove-source-btn');

        if (isEditing) {
            // Activar drag & drop
            document.querySelectorAll('.sortable-item').forEach(item => {
                item.setAttribute('draggable', 'true');
            });

            // Mostrar controles
            gripHandles.forEach(handle => handle.style.visibility = 'visible');
            removeButtons.forEach(btn => btn.style.visibility = 'visible');
        } else {
            // Desactivar drag & drop
            document.querySelectorAll('.sortable-item').forEach(item => {
                item.setAttribute('draggable', 'false');
            });

            // Ocultar controles
            gripHandles.forEach(handle => handle.style.visibility = 'hidden');
            removeButtons.forEach(btn => btn.style.visibility = 'hidden');
        }
    }

    function setupDetailActions() {
        // Botón editar información
        const editBtn = document.getElementById('editListBtn');
        if (editBtn) {
            editBtn.addEventListener('click', function () {
                const modal = new bootstrap.Modal(document.getElementById('editListModal'));
                modal.show();

                // Configurar envío del formulario
                const form = document.getElementById('editListForm');
                if (form) {
                    form.addEventListener('submit', function (e) {
                        e.preventDefault();

                        const newTitle = document.getElementById('editListTitle').value;
                        const newDesc = document.getElementById('editListDescription').value;

                        // Actualizar visualización
                        document.getElementById('listTitleDisplay').textContent = newTitle;
                        document.getElementById('listDescriptionDisplay').textContent = newDesc;

                        modal.hide();
                        showNotification('Información actualizada', 'success');
                    });
                }
            });
        }

        // Botón eliminar lista
        const deleteBtn = document.getElementById('deleteListBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function () {
                const modal = new bootstrap.Modal(document.getElementById('deleteListModal'));
                modal.show();

                // Configurar confirmación
                const confirmCheckbox = document.getElementById('confirmDelete');
                const confirmBtn = document.getElementById('confirmDeleteBtn');

                if (confirmCheckbox && confirmBtn) {
                    confirmCheckbox.addEventListener('change', function () {
                        confirmBtn.disabled = !this.checked;
                    });

                    confirmBtn.addEventListener('click', function () {
                        // Simular eliminación
                        showNotification('Lista eliminada exitosamente', 'success');
                        modal.hide();

                        setTimeout(() => {
                            window.location.href = '/lists';
                        }, 1000);
                    });
                }
            });
        }

        // Botón exportar
        const exportBtn = document.getElementById('exportListBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                // Simular exportación
                const exportData = {
                    list: data.list,
                    exportedAt: new Date().toISOString(),
                    format: 'articora-v1'
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `lista-${data.list.id}-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification('Lista exportada exitosamente', 'success');
            });
        }

        // Botón compartir
        const shareBtn = document.getElementById('shareListBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', function () {
                showShareModal(data.list.id, data.list.title);
            });
        }
    }

    function setupAddSourcesModal() {
        const modal = document.getElementById('addSourcesModal');
        if (!modal) return;

        // Cargar fuentes disponibles
        loadAvailableSources();

        // Configurar búsqueda
        const searchInput = document.getElementById('searchSources');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                filterAvailableSources(this.value.toLowerCase());
            });
        }

        // Configurar botón limpiar selección
        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                appState.selectedSources = [];
                updateSelectedSources();
                updateAvailableSourcesDisplay();
            });
        }

        // Configurar botón añadir seleccionados
        const addBtn = document.getElementById('addSelectedBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                if (appState.selectedSources.length > 0) {
                    // Simular añadir fuentes
                    showNotification(`${appState.selectedSources.length} fuentes añadidas a la lista`, 'success');

                    // Cerrar modal
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    modalInstance.hide();

                    // Simular recarga
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            });
        }
    }

    function loadAvailableSources() {
        // En una implementación real, esto vendría del servidor
        const container = document.getElementById('availableSourcesList');
        if (!container) return;

        // Simular fuentes disponibles (incluyendo las ya eliminadas para demostración)
        const availableSources = data.availableSources || [];
        const deletedSources = data.deletedSources || [];

        const allSources = [...availableSources, ...deletedSources];

        let html = '';

        allSources.forEach(source => {
            const isDeleted = source.isDeleted || false;
            const isSelected = appState.selectedSources.some(s => s.id === source.id);

            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card h-100 source-card ${isSelected ? 'selected' : ''} ${isDeleted ? 'source-deleted' : ''}" 
                         data-id="${source.id}"
                         data-title="${source.title.toLowerCase()}"
                         data-author="${source.author.toLowerCase()}"
                         data-category="${source.category.toLowerCase()}">
                        <div class="row g-0">
                            <div class="col-5">
                                <img src="${source.cover}" 
                                     alt="${source.title}"
                                     class="img-fluid h-100 object-fit-cover">
                            </div>
                            <div class="col-7">
                                <div class="card-body p-2">
                                    <h6 class="card-title mb-1" title="${source.title}">
                                        ${source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                                    </h6>
                                    <p class="card-text small text-muted mb-1">
                                        ${source.author}
                                        ${source.year ? `(${source.year})` : ''}
                                    </p>
                                    ${isDeleted ?
                    `<div class="badge bg-danger mb-1">Eliminada</div>` :
                    `<div class="rating-display small mb-1">
                                            <i class="fas fa-star text-warning"></i>
                                            <span>${source.rating}</span>
                                        </div>`
                }
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="badge bg-light text-dark">
                                            ${source.category}
                                        </span>
                                        <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'} select-source-btn">
                                            ${isSelected ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Configurar eventos de selección
        container.querySelectorAll('.select-source-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const card = this.closest('.source-card');
                const sourceId = card.dataset.id;

                toggleSourceSelection(sourceId);
            });
        });
    }

    function toggleSourceSelection(sourceId) {
        const source = [...(data.availableSources || []), ...(data.deletedSources || [])]
            .find(s => s.id == sourceId);

        if (!source) return;

        const isSelected = appState.selectedSources.some(s => s.id == sourceId);

        if (isSelected) {
            appState.selectedSources = appState.selectedSources.filter(s => s.id != sourceId);
        } else {
            // Verificar límite
            if (data.user.maxSourcesPerList &&
                data.list.sources.length + appState.selectedSources.length >= data.user.maxSourcesPerList) {
                showNotification(`Límite alcanzado: máximo ${data.user.maxSourcesPerList} fuentes por lista`, 'error');
                return;
            }

            appState.selectedSources.push(source);
        }

        updateSelectedSources();
        updateAvailableSourcesDisplay();
    }

    function updateSelectedSources() {
        const container = document.getElementById('selectedSourcesList');
        const countElement = document.getElementById('selectedCount');
        const addBtn = document.getElementById('addSelectedBtn');

        if (!container) return;

        if (appState.selectedSources.length === 0) {
            container.innerHTML = '<p class="text-muted small">No hay fuentes seleccionadas</p>';
        } else {
            let html = '<div class="selected-sources-list">';

            appState.selectedSources.forEach(source => {
                html += `
                    <div class="d-flex align-items-center mb-2 selected-source-item" data-id="${source.id}">
                        <img src="${source.cover}" 
                             alt="${source.title}"
                             class="img-thumbnail me-2" style="width: 40px; height: 50px;">
                        <div class="flex-grow-1">
                            <div class="small fw-bold">${source.title.length > 40 ? source.title.substring(0, 40) + '...' : source.title}</div>
                            <div class="small text-muted">${source.author}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-danger remove-selected-source">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

            // Configurar botones de eliminación
            container.querySelectorAll('.remove-selected-source').forEach(btn => {
                btn.addEventListener('click', function () {
                    const item = this.closest('.selected-source-item');
                    const sourceId = item.dataset.id;
                    toggleSourceSelection(sourceId);
                });
            });
        }

        if (countElement) {
            countElement.textContent = appState.selectedSources.length;
        }

        if (addBtn) {
            addBtn.disabled = appState.selectedSources.length === 0;
        }
    }

    function updateAvailableSourcesDisplay() {
        document.querySelectorAll('.source-card').forEach(card => {
            const sourceId = card.dataset.id;
            const isSelected = appState.selectedSources.some(s => s.id == sourceId);

            card.classList.toggle('selected', isSelected);

            const btn = card.querySelector('.select-source-btn');
            if (btn) {
                btn.className = `btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'} select-source-btn`;
                btn.innerHTML = isSelected ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';
            }
        });
    }

    function filterAvailableSources(searchTerm) {
        const cards = document.querySelectorAll('.source-card');

        cards.forEach(card => {
            const title = card.dataset.title || '';
            const author = card.dataset.author || '';
            const category = card.dataset.category || '';

            const matches = title.includes(searchTerm) ||
                author.includes(searchTerm) ||
                category.includes(searchTerm);

            card.style.display = matches || searchTerm === '' ? 'block' : 'none';
        });
    }

function initCategoriesChart() {
    const container = document.getElementById('categoriesChart');
    if (!container || !data.list || !data.list.categoriesDistribution) return;
    
    const categories = Object.entries(data.list.categoriesDistribution);
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No hay datos de categorías disponibles</p>';
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '<canvas id="categoriesChartCanvas"></canvas>';
    
    const ctx = document.getElementById('categoriesChartCanvas').getContext('2d');
    
    // Preparar datos
    const labels = categories.map(([category]) => category);
    const values = categories.map(([, percentage]) => percentage);
    
    // Mapeo de colores por categoría
    const categoryColors = {
        'Ciencias Cognitivas': '#3498db',
        'Ciencias Sociales': '#2ecc71',
        'Ciencias Humanistas': '#9b59b6',
        'Disciplinas Creativas': '#e74c3c',
        'Ciencias Computacionales': '#f39c12',
        'Ciencias Exactas': '#1abc9c',
        'Ciencias Naturales': '#34495e',
        'Ciencias Aplicadas': '#e67e22'
    };
    
    // Asignar colores basados en las categorías
    const backgroundColors = labels.map(category => {
        // Buscar en categoryColors primero
        if (categoryColors[category]) {
            return categoryColors[category];
        }
        
        // Si no está en categoryColors, buscar en knowledgeCategories
        const catInfo = data.knowledgeCategories?.find(c => c.name === category);
        return catInfo ? catInfo.color : getDefaultColor(category);
    });
    
    // También crear colores más claros para hover
    const hoverBackgroundColors = backgroundColors.map(color => {
        return lightenColor(color, 30); // 30% más claro
    });
    
    // Crear el gráfico de torta
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderColor: '#f5f1e6',
                borderWidth: 2,
                hoverBackgroundColor: hoverBackgroundColors,
                hoverBorderColor: '#2c1810',
                hoverBorderWidth: 3,
                hoverOffset: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            family: "'Georgia', 'Times New Roman', serif",
                            size: 12,
                            weight: 'normal'
                        },
                        color: '#3e2723',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map(function(label, i) {
                                    const value = data.datasets[0].data[i];
                                    const percentage = Math.round((value / data.datasets[0].data.reduce((a, b) => a + b, 0)) * 100);
                                    
                                    return {
                                        text: `${label}: ${value}%`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].backgroundColor[i],
                                        lineWidth: 1,
                                        hidden: false,
                                        index: i,
                                        extra: {
                                            percentage: percentage
                                        }
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(44, 24, 16, 0.95)',
                    titleColor: '#f5f1e6',
                    bodyColor: '#f5f1e6',
                    borderColor: '#8d6e63',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value}% (${percentage}% del total)`;
                        },
                        afterLabel: function(context) {
                            // Opcional: mostrar información adicional si existe
                            const catInfo = data.knowledgeCategories?.find(c => c.name === context.label);
                            if (catInfo && catInfo.icon) {
                                return `Categoría: ${context.label}`;
                            }
                            return '';
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Función para aclarar un color
    function lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return "#" + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }
    
    // Función para color por defecto basado en el nombre de la categoría
    function getDefaultColor(categoryName) {
        // Asignar colores basados en palabras clave en el nombre
        if (categoryName.toLowerCase().includes('cognit')) return '#3498db';
        if (categoryName.toLowerCase().includes('social')) return '#2ecc71';
        if (categoryName.toLowerCase().includes('human')) return '#9b59b6';
        if (categoryName.toLowerCase().includes('creativ')) return '#e74c3c';
        if (categoryName.toLowerCase().includes('comput')) return '#f39c12';
        if (categoryName.toLowerCase().includes('exact')) return '#1abc9c';
        if (categoryName.toLowerCase().includes('natural')) return '#34495e';
        if (categoryName.toLowerCase().includes('aplicad')) return '#e67e22';
        
        // Si no coincide, generar color basado en hash del nombre
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = [
            '#3498db', '#2ecc71', '#9b59b6', '#e74c3c',
            '#f39c12', '#1abc9c', '#34495e', '#e67e22',
            '#16a085', '#27ae60', '#2980b9', '#8e44ad',
            '#d35400', '#c0392b', '#7f8c8d'
        ];
        
        return colors[Math.abs(hash) % colors.length];
    }
}

    function setupCharacterCounters() {
        // Configurar contadores para todos los textareas con maxlength
        document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
            const maxLength = parseInt(textarea.getAttribute('maxlength'));

            textarea.addEventListener('input', function () {
                const count = this.value.length;
                const remaining = maxLength - count;

                // Encontrar o crear contador
                let counter = this.parentElement.querySelector('.char-counter');
                if (!counter) {
                    counter = document.createElement('div');
                    counter.className = 'char-counter form-text';
                    this.parentElement.appendChild(counter);
                }

                counter.textContent = `${count}/${maxLength}`;
                counter.className = `char-counter form-text ${remaining < 50 ? 'text-warning' : ''} ${remaining < 0 ? 'text-danger' : ''}`;
            });

            // Disparar evento inicial
            textarea.dispatchEvent(new Event('input'));
        });
    }

    function setupTabs() {
        // Configurar comportamiento de pestañas
        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');

        tabButtons.forEach(btn => {
            btn.addEventListener('shown.bs.tab', function () {
                // Resetear búsqueda al cambiar de pestaña
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
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
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
        
        .source-card {
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .source-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .source-card.selected {
            border-color: var(--primary-color) !important;
            box-shadow: 0 0 0 2px rgba(44, 24, 16, 0.2);
        }
        
        .selected-source-item {
            padding: 0.5rem;
            background-color: rgba(0,0,0,0.02);
            border-radius: 0.375rem;
            transition: background-color 0.2s ease;
        }
        
        .selected-source-item:hover {
            background-color: rgba(0,0,0,0.05);
        }
    `;
    document.head.appendChild(style);
});