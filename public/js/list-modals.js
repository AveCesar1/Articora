(() => {
    const dataEl = document.getElementById('listDetailData');
    if (!dataEl) return;
    let pageData = {};
    try { pageData = JSON.parse(dataEl.textContent || '{}'); } catch (e) { pageData = {}; }
    const list = pageData.list || null;
    if (!list || !list.id) return;

    const listId = list.id;
    const maxPerList = pageData.user ? pageData.user.maxSourcesPerList : 15;
    const currentCount = list.sources ? list.sources.length : 0;

    const modalEl = document.getElementById('addSourcesModal');
    const availableListEl = document.getElementById('availableSourcesList');
    const searchInput = document.getElementById('searchSources');
    const selectedCountEl = document.getElementById('selectedCount');
    const selectedListEl = document.getElementById('selectedSourcesList');
    const addBtn = document.getElementById('addSelectedBtn');
    const clearBtn = document.getElementById('clearSelectionBtn');

    let selected = new Set();
    let currentPage = 1;

    function setAddButtonState() {
        const canAdd = selected.size > 0 && (currentCount + selected.size) <= maxPerList;
        addBtn.disabled = !canAdd;
    }

    function renderAvailable(results, pagination) {
        availableListEl.innerHTML = '';
        if (!results || results.length === 0) {
            availableListEl.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted small">No hay resultados</p></div>';
            return;
        }

        // Render as a clean list: left large select button, metadata to the right
        results.forEach(s => {
            const row = document.createElement('div');
            row.className = 'col-12 mb-2';

            const title = escapeHtml(s.title || 'Sin título');
            const authors = (s.authors && s.authors.length > 0) ? escapeHtml(s.authors.join(', ')) : 'Usuario';
            const year = s.year ? escapeHtml(String(s.year)) : '';
            const type = s.type ? escapeHtml(s.type) : '';

            row.innerHTML = `
                <div class="list-group-item d-flex align-items-center shadow-sm rounded">
                    <div class="me-3">
                        <button class="btn btn-outline-primary select-source-btn btn-lg" data-id="${s.id}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1" style="margin-bottom:0.15rem">${title}</h6>
                                <div class="small text-muted">${authors} ${year ? ' • ' + year : ''} ${type ? ' • ' + type : ''}</div>
                            </div>
                            <div class="text-end small text-muted">
                                <div>Fuente #${s.id}</div>
                            </div>
                        </div>
                    </div>
                </div>`;

            availableListEl.appendChild(row);
        });

        // attach listeners to select buttons
        availableListEl.querySelectorAll('.select-source-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(btn.dataset.id);
                if (!id) return;
                if (selected.has(id)) {
                    selected.delete(id);
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-outline-primary');
                    btn.innerHTML = '<i class="fas fa-plus"></i>';
                } else {
                    selected.add(id);
                    btn.classList.remove('btn-outline-primary');
                    btn.classList.add('btn-primary');
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                }
                renderSelectedList();
                setAddButtonState();
            });
        });
    }

    function renderSelectedList() {
        selectedListEl.innerHTML = '';
        if (selected.size === 0) {
            selectedListEl.innerHTML = '<p class="text-muted small">No hay fuentes seleccionadas</p>';
            selectedCountEl.textContent = '0';
            return;
        }
        selectedCountEl.textContent = String(selected.size);
        const ul = document.createElement('div');
        Array.from(selected).forEach(id => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2';
            div.innerHTML = `<small>Fuente #${id}</small> <button class="btn btn-sm btn-link remove-selected" data-id="${id}">Quitar</button>`;
            ul.appendChild(div);
        });
        selectedListEl.appendChild(ul);

        selectedListEl.querySelectorAll('.remove-selected').forEach(btn=>{
            btn.addEventListener('click', (e)=>{
                const id = Number(e.target.dataset.id);
                selected.delete(id);
                const checkbox = document.querySelector(`.add-source-checkbox[data-id="${id}"]`);
                if (checkbox) checkbox.checked = false;
                renderSelectedList(); setAddButtonState();
            });
        });
    }

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; }); }

    async function loadAvailable(q=''){
        currentPage = 1;
        availableListEl.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
        try{
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            params.set('page', String(currentPage));
            params.set('perPage', '12');
            params.set('exclude_list_id', String(listId));
            const resp = await fetch('/api/listsources?'+params.toString());
            const j = await resp.json();
            if (j && j.success) renderAvailable(j.results || [], j.pagination || {});
            else availableListEl.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted small">Error cargando fuentes</p></div>';
        } catch (e) { console.error(e); availableListEl.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted small">Error cargando fuentes</p></div>'; }
    }

    let searchTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e)=>{
            const v = e.target.value || '';
            clearTimeout(searchTimer);
            searchTimer = setTimeout(()=>{ loadAvailable(v); }, 300);
        });
    }

    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', ()=>{ // bootstrap event
            selected = new Set(); renderSelectedList(); setAddButtonState(); loadAvailable('');
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', ()=>{ selected = new Set(); renderSelectedList(); setAddButtonState(); });
    }

    if (addBtn) {
        addBtn.addEventListener('click', async ()=>{
            if (selected.size === 0) return;
            const ids = Array.from(selected);
            addBtn.disabled = true; addBtn.textContent = 'Añadiendo...';
            try {
                const resp = await fetch(`/api/lists/${listId}/sources`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ source_ids: ids }) });
                const j = await resp.json();
                if (j && j.success) {
                    // Update UI in-place: update counters and cover if provided
                    const sc = document.getElementById('sourceCount');
                    if (sc && typeof j.totalSources !== 'undefined') sc.textContent = String(j.totalSources);

                    try {
                        if (j.dominantCategory && j.dominantCategory.coverImageUrl) {
                            const coverImg = document.getElementById('listCoverImg');
                            if (coverImg) {
                                coverImg.src = j.dominantCategory.coverImageUrl;
                                coverImg.classList.toggle('cover-category', !!j.dominantCategory.coverIsCategory);
                                coverImg.classList.toggle('cover-png', !!j.dominantCategory.coverIsPng);
                            }
                            const coverModalImg = document.getElementById('coverModalImg');
                            if (coverModalImg) {
                                coverModalImg.src = j.dominantCategory.coverImageUrl;
                                coverModalImg.classList.toggle('cover-category', !!j.dominantCategory.coverIsCategory);
                                coverModalImg.classList.toggle('cover-png', !!j.dominantCategory.coverIsPng);
                            }
                        }
                    } catch (e) { console.error('Error updating cover image', e); }

                    // close modal
                    try {
                        const bsModal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        bsModal.hide();
                    } catch (e) { /* ignore */ }

                    // optionally clear selection state
                    selected = new Set(); renderSelectedList(); setAddButtonState();

                    // Try to fetch updated list data (so we can refresh the DOM without full reload)
                    try {
                        const resp2 = await fetch(`/api/lists/${listId}`);
                        const j2 = await resp2.json();
                        if (j2 && j2.success && j2.list) {
                            // update local model and refresh UI
                            pageData.list = pageData.list || {};
                            pageData.list = j2.list;
                            // update counters again from authoritative response
                            if (typeof j2.list.totalSources !== 'undefined') {
                                const sc2 = document.getElementById('sourceCount'); if (sc2) sc2.textContent = String(j2.list.totalSources);
                            }
                            updateSourcesDisplay(j2.list);
                        }
                    } catch (e) {
                        console.error('Could not refresh list after add', e);
                    }
                } else {
                    alert('Error: ' + (j && j.message ? j.message : 'no se pudo añadir'));
                    addBtn.disabled = false; addBtn.textContent = 'Añadir a la lista';
                }
            } catch (e) { console.error(e); alert('Error de red'); addBtn.disabled = false; addBtn.textContent = 'Añadir a la lista'; }
        });
    }

    // Update the sources display area after changes (used for both edit table and public grid)
    function updateSourcesDisplay(list) {
        try {
            if (!list) return;

            // Update edit-mode table if present
            const tbody = document.getElementById('sourcesList');
            if (tbody) {
                let rows = '';
                if (list.sources && list.sources.length > 0) {
                    list.sources.forEach((source, index) => {
                        rows += `
                            <tr class="sortable-item" data-id="${source.id}" data-order="${source.order || index+1}">
                                <td class="text-muted"><i class="fas fa-grip-vertical grip-handle"></i> <span class="item-number">${index+1}</span></td>
                                <td><img src="${source.cover}" alt="${escapeHtml(source.title)}" class="img-thumbnail" style="width:60px;height:80px;object-fit:cover;"></td>
                                <td>
                                    <div class="fw-bold">${escapeHtml(source.title)}</div>
                                    <div class="small text-muted">${escapeHtml(source.author || 'Usuario')} ${source.year ? ' • ('+escapeHtml(String(source.year))+')' : ''}</div>
                                </td>
                                <td><span class="badge bg-light text-dark">${escapeHtml(source.category || 'Desconocida')}</span></td>
                                <td>${!source.isDeleted ? `<div class="rating-display"><i class="fas fa-star text-warning"></i> <span class="ms-1">${escapeHtml(String(source.rating||0))}</span></div>` : '<span class="text-muted">N/A</span>'}</td>
                                <td><small class="text-muted">${source.addedDate ? new Date(source.addedDate).toLocaleDateString('es-ES') : ''}</small></td>
                                <td><div class="btn-group btn-group-sm"><a href="/source/${source.id}" class="btn btn-outline-primary" title="Ver fuente"><i class="fas fa-eye"></i></a><button class="btn btn-outline-danger remove-source-btn" data-id="${source.id}" title="Eliminar de la lista"><i class="fas fa-times"></i></button></div></td>
                            </tr>`;
                    });
                } else {
                    rows = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-3"></i><p class="mb-0">No hay fuentes en esta lista</p></td></tr>';
                }
                tbody.innerHTML = rows;
                // Reattach handlers
                attachRemoveSourceHandlers();
                updateItemNumbers();
            }

            // Update public grid if present
            const publicGrid = document.getElementById('publicSourcesGrid');
            if (publicGrid) {
                if (!list.sources || list.sources.length === 0) {
                    publicGrid.innerHTML = '<div class="text-center py-4"><i class="fas fa-inbox fa-3x text-muted mb-3"></i><h5 class="text-muted">Esta lista está vacía</h5><p class="text-muted">El creador aún no ha añadido fuentes a esta lista.</p></div>';
                } else {
                    let html = '<div class="row">';
                    list.sources.forEach(source => {
                        html += `
                            <div class="col-md-6 col-lg-4 mb-4">
                                <div class="card h-100 border-0 shadow-sm hover-lift">
                                    <div class="row g-0">
                                        <div class="col-4">
                                            <img src="${source.cover}" alt="${escapeHtml(source.title)}" class="img-fluid h-100 object-fit-cover rounded-start">
                                        </div>
                                        <div class="col-8">
                                            <div class="card-body">
                                                <h6 class="card-title mb-1" title="${escapeHtml(source.title)}">${escapeHtml(source.title.length>50?source.title.substring(0,50)+'...':source.title)}</h6>
                                                <p class="card-text small text-muted mb-2">${escapeHtml(source.author)} ${source.year ? ' ('+escapeHtml(String(source.year))+')' : ''}</p>
                                                ${source.isDeleted ? '<div class="alert alert-warning py-1 mb-2"><i class="fas fa-exclamation-triangle me-1"></i><small>Este título se ha eliminado de la plataforma</small></div>' : `<div class="d-flex justify-content-between align-items-center"><span class="badge bg-light text-dark">${escapeHtml(source.category)}</span><div class="rating-display small"><i class="fas fa-star text-warning"></i><span>${escapeHtml(String(source.rating||0))}</span></div></div>`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
                    });
                    html += '</div>';
                    publicGrid.innerHTML = html;
                }
            }
        } catch (e) { console.error('updateSourcesDisplay error', e); }
    }

    // Attach handlers to existing remove buttons in the list (remove single source)
    function attachRemoveSourceHandlers() {
        document.querySelectorAll('.remove-source-btn').forEach(btn => {
            if (btn.dataset._handled) return; // idempotent
            btn.dataset._handled = '1';
            btn.addEventListener('click', async (e) => {
                const sid = Number(btn.dataset.id);
                if (!sid) return;
                if (!confirm('¿Eliminar esta fuente de la lista?')) return;
                btn.disabled = true;
                try {
                    const resp = await fetch(`/api/remove-from-list/${listId}`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ source_id: sid }) });
                    const j = await resp.json();
                    if (j && j.success) {
                        // remove row from DOM if present
                        const row = document.querySelector(`tr[data-id="${sid}"]`);
                        if (row) row.remove();
                            // update counters (use server value if provided)
                            const sc = document.getElementById('sourceCount'); if (sc) sc.textContent = String(typeof j.totalSources !== 'undefined' ? j.totalSources : ((Number(sc.textContent)||0) - 1));
                            // update cover if provided
                            if (j.dominantCategory && j.dominantCategory.coverImageUrl) {
                                const coverImg = document.getElementById('listCoverImg');
                                if (coverImg) {
                                    coverImg.src = j.dominantCategory.coverImageUrl;
                                    coverImg.classList.toggle('cover-category', !!j.dominantCategory.coverIsCategory);
                                    coverImg.classList.toggle('cover-png', !!j.dominantCategory.coverIsPng);
                                }
                                const coverModalImg = document.getElementById('coverModalImg');
                                if (coverModalImg) {
                                    coverModalImg.src = j.dominantCategory.coverImageUrl;
                                    coverModalImg.classList.toggle('cover-category', !!j.dominantCategory.coverIsCategory);
                                    coverModalImg.classList.toggle('cover-png', !!j.dominantCategory.coverIsPng);
                                }
                            }
                    } else {
                        alert('No se pudo eliminar: ' + (j && j.message ? j.message : 'error'));
                        btn.disabled = false;
                    }
                } catch (err) { console.error(err); alert('Error de red'); btn.disabled = false; }
            });
        });
    }

    // Attach delete-list logic (confirm checkbox + button)
    (function attachDeleteListHandler(){
        const confirmCheckbox = document.getElementById('confirmDelete');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (!confirmBtn) return;
        if (confirmCheckbox) {
            confirmCheckbox.addEventListener('change', (e)=>{ confirmBtn.disabled = !e.target.checked; });
        }
        confirmBtn.addEventListener('click', async ()=>{
            if (!confirm('¿Eliminar permanentemente esta lista? Esta acción no se puede deshacer.')) return;
            confirmBtn.disabled = true; confirmBtn.textContent = 'Eliminando...';
            try {
                const resp = await fetch(`/api/remove-list/${listId}`, { method: 'POST' });
                const j = await resp.json();
                if (j && j.success) {
                    window.location.href = '/lists';
                } else {
                    alert('No se pudo eliminar la lista'); confirmBtn.disabled = false; confirmBtn.textContent = 'Eliminar permanentemente';
                }
            } catch (e) { console.error(e); alert('Error de red'); confirmBtn.disabled = false; confirmBtn.textContent = 'Eliminar permanentemente'; }
        });
    })();

    // Run remove handlers for any existing buttons now
    attachRemoveSourceHandlers();

    // --- Collaborative: edit modal search & invite (owner) ---
    const editModalEl = document.getElementById('editListModal');
    const editCollaborativeSwitch = document.getElementById('editCollaborativeSwitch');
    const editCollaborativeSettings = document.getElementById('editCollaborativeSettings');
    const collaboratorSearchEdit = document.getElementById('collaboratorSearchEdit');
    const collaboratorSuggestionsEdit = document.getElementById('collaboratorSuggestionsEdit');
    const editCollaboratorsList = document.getElementById('editCollaboratorsList');

    // Only allow inviting after the collaborative flag is persisted (owner pressed "Modificar/Guardar")
    let editCollaborativeSaved = !!(pageData.list && pageData.list.isCollaborative);

    function renderEditCollaborators() {
        if (!editCollaboratorsList) return;
        const collaborators = (pageData.list && pageData.list.collaborators) ? pageData.list.collaborators.slice() : [];
        if (collaborators.length === 0) {
            editCollaboratorsList.innerHTML = '<small class="text-muted d-block mb-2">Colaboradores:</small><p class="text-muted small mb-0">No hay colaboradores</p>';
            return;
        }
        let html = '<small class="text-muted d-block mb-2">Colaboradores:</small>';
        collaborators.forEach(c => {
            html += `<div class="d-flex align-items-center mb-2"><img src="${c.avatar}" class="avatar-xs rounded-circle me-2"><span class="small me-2">${escapeHtml(c.name)}</span><span class="badge bg-${c.status === 'accepted' ? 'success' : c.status === 'pending' ? 'warning' : 'secondary'} ms-auto">${c.status}</span></div>`;
        });
        editCollaboratorsList.innerHTML = html;
    }

    function setInviteControlsEnabled(enabled) {
        // enable/disable search input and suggestion buttons
        if (collaboratorSearchEdit) collaboratorSearchEdit.disabled = !enabled;
        if (collaboratorSuggestionsEdit) {
            collaboratorSuggestionsEdit.querySelectorAll('button.invite-user-btn').forEach(b => { b.disabled = !enabled; });
        }
    }

    async function searchUsers(q) {
        if (!q || q.length < 3) return [];
        try {
            const params = new URLSearchParams({ q });
            const resp = await fetch('/api/users/search?' + params.toString());
            const j = await resp.json();
            if (j && j.success) return j.results || [];
        } catch (e) { console.error('searchUsers error', e); }
        return [];
    }

    let editSearchTimer = null;
    if (collaboratorSearchEdit) {
        collaboratorSearchEdit.addEventListener('input', (e) => {
            const v = e.target.value || '';
            clearTimeout(editSearchTimer);
            editSearchTimer = setTimeout(async () => {
                collaboratorSuggestionsEdit.innerHTML = '';
                if (v.length < 3) return;
                const results = await searchUsers(v);
                if (!results || results.length === 0) {
                    collaboratorSuggestionsEdit.innerHTML = '<div class="list-group-item small text-muted">No se encontraron usuarios</div>';
                    return;
                }
                collaboratorSuggestionsEdit.innerHTML = '';
                results.forEach(u => {
                    const item = document.createElement('div');
                    item.className = 'list-group-item d-flex justify-content-between align-items-center';
                    item.innerHTML = `<div><strong>${escapeHtml(u.full_name || u.username || 'Usuario')}</strong><br><small class="text-muted">@${escapeHtml(u.username)}</small></div><div><button class="btn btn-sm btn-primary invite-user-btn" data-user-id="${u.id}" data-fullname="${escapeHtml(u.full_name || '')}" data-username="${escapeHtml(u.username || '')}">Invitar</button></div>`;
                    collaboratorSuggestionsEdit.appendChild(item);
                });
                collaboratorSuggestionsEdit.querySelectorAll('.invite-user-btn').forEach(btn => {
                    btn.addEventListener('click', async (ev) => {
                        const uid = Number(btn.dataset.userId);
                        if (!uid) return;
                        // require saved collaborative flag
                        if (!editCollaborativeSaved) {
                            alert('Debes guardar los cambios (Modificar) antes de invitar colaboradores.');
                            return;
                        }
                        btn.disabled = true; btn.textContent = 'Enviando...';
                        try {
                            const resp = await fetch(`/api/lists/${listId}/invite`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ user_id: uid }) });
                            const j = await resp.json();
                            if (j && j.success) {
                                // append to pageData.list.collaborators as pending
                                const fullname = btn.dataset.fullname || btn.dataset.username || ('Usuario ' + uid);
                                pageData.list.collaborators = pageData.list.collaborators || [];
                                pageData.list.collaborators.push({ id: uid, name: fullname, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=2E8B57&color=fff`, status: 'pending' });
                                renderEditCollaborators();
                                btn.textContent = 'Invitado';
                            } else {
                                alert('No se pudo invitar: ' + (j && j.message ? j.message : 'error'));
                                btn.disabled = false; btn.textContent = 'Invitar';
                            }
                        } catch (err) { console.error(err); alert('Error de red'); btn.disabled = false; btn.textContent = 'Invitar'; }
                    });
                });
            }, 300);
        });
    }

    if (editModalEl) {
        editModalEl.addEventListener('show.bs.modal', () => {
            // ensure collaborators list rendered
            renderEditCollaborators();
            // set invite controls initially based on whether collaborative flag is already saved
            setInviteControlsEnabled(editCollaborativeSaved);
        });
    }

    if (editCollaborativeSwitch) {
        editCollaborativeSwitch.addEventListener('change', (e) => {
            if (editCollaborativeSettings) editCollaborativeSettings.style.display = e.target.checked ? 'block' : 'none';
            // toggling doesn't persist until owner saves; disable invites until save
            editCollaborativeSaved = editCollaborativeSwitch.checked && (!!(pageData.list && pageData.list.isCollaborative));
            // If user toggled from false->true, mark unsaved (false) until server update triggers list:updated
            if (editCollaborativeSwitch.checked && !(pageData.list && pageData.list.isCollaborative)) editCollaborativeSaved = false;
            setInviteControlsEnabled(editCollaborativeSaved);
        });
    }

    // Listen for save event from edit form to enable invites once server has persisted the collaborative flag
    document.addEventListener('list:updated', (ev) => {
        try {
            const newList = ev && ev.detail && ev.detail.list ? ev.detail.list : null;
            if (!newList) return;
            // update local pageData
            pageData.list = pageData.list || {};
            // server may return is_collaborative or isCollaborative
            const isColl = (typeof newList.is_collaborative !== 'undefined') ? Boolean(newList.is_collaborative) : Boolean(newList.isCollaborative);
            pageData.list.isCollaborative = isColl;
            editCollaborativeSaved = isColl;
            setInviteControlsEnabled(editCollaborativeSaved);
            // re-render collaborators if server returned collaborators
            if (newList.collaborators) {
                pageData.list.collaborators = newList.collaborators;
                renderEditCollaborators();
            }
        } catch (e) { console.error('Error handling list:updated', e); }
    });

    // expose a flag so other scripts (e.g., lists.js) know modal handlers are present
    try { window._articoraListModalsInitialized = true; } catch (e) { /* ignore */ }

})();
