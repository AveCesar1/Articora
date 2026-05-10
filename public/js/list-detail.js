// list-detail.js - Funcionalidad real para la vista detalle de listas curatoriales

(() => {
    const dataElement = document.getElementById('listDetailData');
    if (!dataElement) return;
    const initialData = JSON.parse(dataElement.textContent);
    if (!initialData.list) return;

    let chartInstance = null;
    let currentSources = [...(initialData.list.sources || [])];
    let currentCategories = { ...initialData.list.categoriesDistribution };

    function escapeHtml(s) {
        return String(s).replace(/[&<>'"]/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
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
        const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        notification.innerHTML = `
      <i class="fas fa-${icons[type] || 'info-circle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function updateSourceCount() {
        const countSpan = document.getElementById('sourceCount');
        if (countSpan) countSpan.textContent = currentSources.length;
        const maxPerList = initialData.user.maxSourcesPerList || 15;
        const remainingSpan = document.querySelector('#sourceCount + span');
        if (remainingSpan) remainingSpan.textContent = `${currentSources.length}/${maxPerList}`;
        const badgeSpan = document.querySelector('.card-header .badge');
        if (badgeSpan && badgeSpan.classList.contains('bg-secondary')) badgeSpan.textContent = currentSources.length;
    }

    function renderSourcesTable(sources) {
        const tbody = document.getElementById('sourcesList');
        if (!tbody) return;
        if (!sources.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-3"></i><p class="mb-0">No hay fuentes en esta lista</p></td></tr>`;
            return;
        }
        let html = '';
        sources.forEach((source, idx) => {
            const isDeleted = source.isDeleted || false;
            html += `
        <tr class="sortable-item" data-id="${source.id}" data-order="${source.order || idx + 1}">
          <td class="text-muted">
            <i class="fas fa-grip-vertical grip-handle" style="visibility: ${initialData.user.canEdit ? 'visible' : 'hidden'}"></i>
            <span class="item-number">${idx + 1}</span>
          </td>
          <td><img src="${source.cover}" alt="${escapeHtml(source.title)}" class="img-thumbnail" style="width:60px;height:80px;object-fit:cover"></td>
          <td><div class="fw-bold">${escapeHtml(source.title)}</div><div class="small text-muted">${escapeHtml(source.author)}${source.year ? ` (${source.year})` : ''}</div>${isDeleted ? '<div class="small text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Fuente eliminada</div>' : ''}</td>
          <td><span class="badge bg-light text-dark">${escapeHtml(source.category)}</span></td>
          <td>${!isDeleted ? `<div class="rating-display"><i class="fas fa-star text-warning"></i><span class="ms-1">${source.rating}</span></div>` : '<span class="text-muted">N/A</span>'}</td>
          <td><small class="text-muted">${new Date(source.addedDate).toLocaleDateString('es-ES')}</small></td>
          <td><div class="btn-group btn-group-sm"><a href="/source/${source.id}" class="btn btn-outline-primary" title="Ver fuente"><i class="fas fa-eye"></i></a><button class="btn btn-outline-danger remove-source-btn" data-id="${source.id}" title="Eliminar de la lista"><i class="fas fa-times"></i></button></div></td>
        </tr>`;
        });
        tbody.innerHTML = html;
        attachRemoveEvents();
    }

    function renderPublicGrid(sources) {
        const container = document.getElementById('publicSourcesGrid');
        if (!container) return;
        if (!sources.length) {
            container.innerHTML = '<div class="text-center py-4"><i class="fas fa-inbox fa-3x text-muted mb-3"></i><h5 class="text-muted">Esta lista está vacía</h5><p class="text-muted">El creador aún no ha añadido fuentes a esta lista.</p></div>';
            return;
        }
        let html = '<div class="row">';
        sources.forEach(source => {
            const isDeleted = source.isDeleted || false;
            html += `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100 border-0 shadow-sm hover-lift">
            <div class="row g-0">
              <div class="col-4"><img src="${source.cover}" alt="${escapeHtml(source.title)}" class="img-fluid h-100 object-fit-cover rounded-start"></div>
              <div class="col-8"><div class="card-body"><h6 class="card-title mb-1" title="${escapeHtml(source.title)}">${source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title}</h6><p class="card-text small text-muted mb-2">${escapeHtml(source.author)}${source.year ? ` (${source.year})` : ''}</p>${isDeleted ? '<div class="alert alert-warning py-1 mb-2"><i class="fas fa-exclamation-triangle me-1"></i><small>Este título se ha eliminado de la plataforma</small></div>' : `<div class="d-flex justify-content-between align-items-center"><span class="badge bg-light text-dark">${escapeHtml(source.category)}</span><div class="rating-display small"><i class="fas fa-star text-warning"></i><span>${source.rating}</span></div></div>`}</div></div>
            </div>
          </div>
        </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function updateChart(categoriesDistribution) {
        const container = document.getElementById('categoriesChart');
        if (!container) return;

        // Si no hay categorías, mostrar mensaje y salir
        const categories = Object.entries(categoriesDistribution);
        if (!categories.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">No hay datos de categorías disponibles</p>';
            return;
        }

        // Limpiar contenedor y crear canvas
        container.innerHTML = '<canvas id="categoriesChartCanvas"></canvas>';
        const canvas = document.getElementById('categoriesChartCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const labels = categories.map(([c]) => c);
        const values = categories.map(([, p]) => p);

        const categoryColors = {
            'Ciencias Cognitivas': '#3498db', 'Ciencias Sociales': '#2ecc71', 'Ciencias Humanistas': '#9b59b6',
            'Disciplinas Creativas': '#e74c3c', 'Ciencias Computacionales': '#f39c12', 'Ciencias Exactas': '#1abc9c',
            'Ciencias Naturales': '#34495e', 'Ciencias Aplicadas': '#e67e22'
        };

        function getDefaultColor(categoryName) {
            let hash = 0;
            for (let i = 0; i < categoryName.length; i++) hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
            const colors = ['#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#34495e', '#e67e22', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#7f8c8d'];
            return colors[Math.abs(hash) % colors.length];
        }

        const backgroundColors = labels.map(label => categoryColors[label] || getDefaultColor(label));

        // Destruir gráfico anterior si existe
        if (window.chartInstance) window.chartInstance.destroy();

        window.chartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: '#f5f1e6',
                    borderWidth: 2,
                    hoverOffset: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` } }
                }
            }
        });
    }

    async function refreshListData() {
        try {
            const resp = await fetch(`/api/lists/${initialData.list.id}`);
            const json = await resp.json();
            if (!json.success) throw new Error(json.message || 'Error al cargar los datos');

            currentSources = json.list.sources || [];
            currentCategories = json.list.categoriesDistribution || {};

            // Actualizar la interfaz
            if (initialData.user.canEdit) {
                renderSourcesTable(currentSources);
            } else {
                renderPublicGrid(currentSources);
            }
            updateSourceCount();

            // Forzar actualización del gráfico (incluso si no hay canvas, se creará)
            updateChart(currentCategories);

            // Actualizar datos globales
            initialData.list = json.list;

            console.log('Datos refrescados. Categorías:', currentCategories); // para depuración
        } catch (err) {
            console.error('Error en refreshListData:', err);
            showNotification('Error al actualizar los datos', 'error');
        }
    }

    function attachRemoveEvents() {
        document.querySelectorAll('.remove-source-btn').forEach(btn => {
            btn.removeEventListener('click', handleRemove);
            btn.addEventListener('click', handleRemove);
        });
    }

    async function handleRemove(e) {
        const btn = e.currentTarget;
        const sourceId = btn.dataset.id;
        if (!sourceId) return;
        try {
            const resp = await fetch(`/api/remove-from-list/${initialData.list.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_id: parseInt(sourceId) })
            });
            const json = await resp.json();
            if (!json.success) throw new Error(json.message || 'Error al eliminar fuente');
            showNotification('Fuente eliminada de la lista', 'success');
            await refreshListData();
        } catch (err) {
            showNotification(err.message, 'error');
        }
    }

    function setupCoverModal() {
        const coverBtn = document.getElementById('editCoverBtn');
        if (!coverBtn) return;
        coverBtn.addEventListener('click', () => {
            const modalEl = document.getElementById('coverModal');
            if (!modalEl) return;
            const img = modalEl.querySelector('#coverModalImg');
            if (img) img.src = initialData.list.coverImage;
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        });
    }

    function setupEditMetadata() {
        const editBtn = document.getElementById('editListBtn');
        if (!editBtn) return;
        editBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('editListModal'));
            const form = document.getElementById('editListForm');
            const titleInput = document.getElementById('editListTitle');
            const descInput = document.getElementById('editListDescription');
            if (titleInput) titleInput.value = initialData.list.title;
            if (descInput) descInput.value = initialData.list.description || '';
            const publicRadio = document.getElementById('editVisibilityPublic');
            const privateRadio = document.getElementById('editVisibilityPrivate');
            if (publicRadio && privateRadio) {
                if (initialData.list.isPublic) publicRadio.checked = true;
                else privateRadio.checked = true;
            }
            const collabSwitch = document.getElementById('editCollaborativeSwitch');
            if (collabSwitch) collabSwitch.checked = initialData.list.isCollaborative;
            const collabSettings = document.getElementById('editCollaborativeSettings');
            if (collabSettings) collabSettings.style.display = collabSwitch?.checked ? 'block' : 'none';
            if (collabSwitch) collabSwitch.onchange = () => { if (collabSettings) collabSettings.style.display = collabSwitch.checked ? 'block' : 'none'; };
            form.onsubmit = async (e) => {
                e.preventDefault();
                const payload = {
                    title: titleInput.value.trim(),
                    description: descInput.value.trim(),
                    is_public: publicRadio ? publicRadio.checked : initialData.list.isPublic,
                    is_collaborative: collabSwitch ? collabSwitch.checked : initialData.list.isCollaborative
                };
                if (!payload.title) { showNotification('El título es obligatorio', 'error'); return; }
                try {
                    const resp = await fetch(`/api/lists/${initialData.list.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await resp.json();
                    if (!json.success) throw new Error(json.message || 'Error al actualizar');
                    document.getElementById('listTitleDisplay').textContent = json.list.title;
                    document.getElementById('listDescriptionDisplay').textContent = json.list.description || 'Sin descripción';
                    initialData.list.title = json.list.title;
                    initialData.list.description = json.list.description;
                    initialData.list.isPublic = json.list.isPublic;
                    initialData.list.isCollaborative = json.list.isCollaborative;
                    showNotification('Lista actualizada', 'success');
                    modal.hide();
                } catch (err) { showNotification(err.message, 'error'); }
            };
            modal.show();
        });
    }

    function setupDeleteList() {
        const deleteBtn = document.getElementById('deleteListBtn');
        if (!deleteBtn) return;
        deleteBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('deleteListModal'));
            const confirmCheck = document.getElementById('confirmDelete');
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            if (confirmCheck && confirmBtn) {
                confirmCheck.onchange = () => { confirmBtn.disabled = !confirmCheck.checked; };
                confirmBtn.onclick = async () => {
                    try {
                        const resp = await fetch(`/api/remove-list/${initialData.list.id}`, { method: 'POST' });
                        const json = await resp.json();
                        if (!json.success) throw new Error(json.message || 'Error al eliminar');
                        showNotification('Lista eliminada', 'success');
                        modal.hide();
                        setTimeout(() => window.location.href = '/lists', 1000);
                    } catch (err) { showNotification(err.message, 'error'); }
                };
            }
            modal.show();
        });
    }

    function setupExport() {
        const exportBtn = document.getElementById('exportListBtn');
        if (!exportBtn) return;
        exportBtn.addEventListener('click', () => {
            const exportData = { list: initialData.list, exportedAt: new Date().toISOString(), format: 'articora-v1' };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lista-${initialData.list.id}-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('Lista exportada', 'success');
        });
    }

    function setupShareModal() {
        const shareBtn = document.getElementById('shareListBtn');
        if (!shareBtn) return;
        shareBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('shareListModal'));
            const shareUrl = `${window.location.origin}/lists/${initialData.list.id}`;
            const linkInput = document.getElementById('shareLink');
            if (linkInput) linkInput.value = shareUrl;
            document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(shareUrl).then(() => showNotification('Enlace copiado', 'success')).catch(() => { if (linkInput) { linkInput.select(); document.execCommand('copy'); showNotification('Enlace copiado', 'success'); } });
                } else if (linkInput) { linkInput.select(); document.execCommand('copy'); showNotification('Enlace copiado', 'success'); }
            });
            const textEnc = encodeURIComponent(initialData.list.title);
            document.getElementById('shareTwitterBtn')?.addEventListener('click', () => window.open(`https://twitter.com/intent/tweet?text=${textEnc}&url=${encodeURIComponent(shareUrl)}`, '_blank'));
            document.getElementById('shareFacebookBtn')?.addEventListener('click', () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'));
            document.getElementById('shareLinkedinBtn')?.addEventListener('click', () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank'));
            modal.show();
        });
    }

    function setupEditModeSwitch() {
        const switchInput = document.getElementById('editModeSwitch');
        if (!switchInput) return;
        switchInput.addEventListener('change', (e) => {
            const isEditing = e.target.checked;
            document.querySelectorAll('.grip-handle').forEach(h => h.style.visibility = isEditing ? 'visible' : 'hidden');
            document.querySelectorAll('.remove-source-btn').forEach(btn => btn.style.visibility = isEditing ? 'visible' : 'hidden');
            document.querySelectorAll('.sortable-item').forEach(item => item.setAttribute('draggable', isEditing ? 'true' : 'false'));
        });
        switchInput.dispatchEvent(new Event('change'));
    }

    function setupDragDrop() {
        const list = document.getElementById('sourcesList');
        if (!list) return;
        let dragged = null;
        list.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.sortable-item');
            if (!item) return;
            dragged = item;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', dragged.innerHTML);
            setTimeout(() => dragged.classList.add('sortable-ghost'), 0);
        });
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const target = e.target.closest('.sortable-item');
            if (target && target !== dragged) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                list.insertBefore(dragged, next ? target.nextSibling : target);
                document.querySelectorAll('.item-number').forEach((span, idx) => span.textContent = idx + 1);
                document.getElementById('saveOrderBtn').style.display = 'inline-block';
            }
        });
        list.addEventListener('dragend', () => {
            if (dragged) dragged.classList.remove('sortable-ghost');
            dragged = null;
        });
        document.getElementById('saveOrderBtn')?.addEventListener('click', () => {
            const items = Array.from(document.querySelectorAll('.sortable-item'));
            const newOrder = items.map((item, idx) => ({ id: item.dataset.id, order: idx + 1 }));
            fetch(`/api/lists/${initialData.list.id}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newOrder })
            }).then(res => res.json()).then(json => {
                if (json.success) showNotification('Orden guardado', 'success');
                else showNotification('Error al guardar orden', 'error');
            }).catch(() => showNotification('Error de red', 'error'));
            document.getElementById('saveOrderBtn').style.display = 'none';
        });
    }

    function init() {
        if (initialData.user.canEdit) {
            renderSourcesTable(currentSources);
            setupEditModeSwitch();
            setupDragDrop();
            setupEditMetadata();
            setupDeleteList();
            setupExport();
            setupShareModal();
            setupCoverModal();
            attachRemoveEvents();
            updateChart(currentCategories);
            const addModal = document.getElementById('addSourcesModal');
            if (addModal) {
                addModal.addEventListener('hidden.bs.modal', () => {
                    refreshListData();
                });
            }
        } else {
            renderPublicGrid(currentSources);
            setupShareModal();
        }
        updateSourceCount();
        updateChart(currentCategories);
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const sortType = btn.dataset.sort;
                let sorted = [...currentSources];
                if (sortType === 'added') sorted.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
                else if (sortType === 'rating') sorted.sort((a, b) => b.rating - a.rating);
                else if (sortType === 'title-asc') sorted.sort((a, b) => a.title.localeCompare(b.title));
                else if (sortType === 'title-desc') sorted.sort((a, b) => b.title.localeCompare(a.title));
                renderSourcesTable(sorted);
            });
        });
    }

    init();
})();