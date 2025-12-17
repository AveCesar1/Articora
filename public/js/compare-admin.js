// ========================================
// COMPARADOR ADMIN - Análisis y Comparación Masiva
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Helper: parse server-rendered list into JS objects if window.availableSources isn't present
    function parseServerRenderedSources() {
        const list = [];
        const container = document.getElementById('availableSourcesList');
        if (!container) return list;
        const items = container.querySelectorAll('.source-checkbox-item');
        items.forEach(item => {
            try {
                const id = parseInt(item.dataset.sourceId);
                const titleEl = item.querySelector('.source-preview');
                const detailsEl = item.querySelector('.source-details');
                const statusBadge = item.querySelector('.badge');
                const titleText = titleEl ? titleEl.textContent.replace(/^#\d+:\s*/, '').trim() : ('Fuente ' + id);
                const detailsText = detailsEl ? detailsEl.textContent.trim().split('|').map(s => s.trim()) : [];
                const authors = detailsText[0] ? detailsText[0].split(',').map(s => s.trim()) : [];
                const year = detailsText[1] ? parseInt(detailsText[1]) : null;
                const type = detailsText[2] || '';
                const verificationStatus = statusBadge ? statusBadge.textContent.trim() : 'desconocido';
                // Basic object shape expected by the admin script
                list.push({
                    id,
                    title: titleText,
                    authors,
                    year,
                    type,
                    verificationStatus,
                    reports: 0,
                    uploadDate: null
                });
            } catch (err) {
                console.warn('Error parsing source item', err);
            }
        });
        return list;
    }

    // Estado del comparador admin
    const state = {
        availableSources: (window.availableSources && window.availableSources.length) ? window.availableSources : parseServerRenderedSources(),
        selectedSources: [],
        maxSources: 10,
        minSources: 2,
        selectedForMerge: {
            base: null,
            others: []
        },
        highlightDifferences: true
    };

    // Elementos DOM
    const elements = {
        idSearchInput: document.getElementById('idSearchInput'),
        titleSearchInput: document.getElementById('titleSearchInput'),
        searchByIdBtn: document.getElementById('searchByIdBtn'),
        searchByTitleBtn: document.getElementById('searchByTitleBtn'),
        compareMetadata: document.getElementById('compareMetadata'),
        clearSelection: document.getElementById('clearSelection'),
        selectedCount: document.getElementById('selectedCount'),
        availableSourcesList: document.getElementById('availableSourcesList'),
        comparisonSection: document.getElementById('comparisonSection'),
        mergeSection: document.getElementById('mergeSection'),
        metadataComparisonTable: document.getElementById('metadataComparisonTable'),
        toggleHighlight: document.getElementById('toggleHighlight'),
        markOldestAsBase: document.getElementById('markOldestAsBase'),
        mergeSelected: document.getElementById('mergeSelected'),
        cancelMerge: document.getElementById('cancelMerge'),
        confirmMerge: document.getElementById('confirmMerge'),
        differencesCount: document.getElementById('differencesCount')
    };

    // Campos de metadatos para comparación
    const metadataFields = [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Título' },
        { key: 'authors', label: 'Autores', format: (val) => val.join(', ') },
        { key: 'year', label: 'Año' },
        { key: 'type', label: 'Tipo de fuente' },
        { key: 'category', label: 'Categoría' },
        { key: 'subcategory', label: 'Subcategoría' },
        { key: 'publisher', label: 'Editorial/Revista' },
        { key: 'volume', label: 'Volumen', format: (val) => val || '-' },
        { key: 'number', label: 'Número', format: (val) => val || '-' },
        { key: 'pages', label: 'Páginas' },
        { key: 'edition', label: 'Edición' },
        { key: 'doi', label: 'DOI', format: (val) => val || '-' },
        { key: 'keywords', label: 'Palabras clave', format: (val) => val.join(', ') },
        { key: 'url', label: 'URL' },
        { key: 'uploadDate', label: 'Fecha de subida' },
        { key: 'uploadedBy', label: 'Subido por' },
        { key: 'verificationStatus', label: 'Estado de verificación' },
        { key: 'reports', label: 'Reportes' },
        { key: 'lastModified', label: 'Última modificación' }
    ];

    // Inicialización
    function init() {
        renderAvailableSources(state.availableSources);
        setupEventListeners();
        updateUI();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Búsqueda por ID
        elements.searchByIdBtn.addEventListener('click', handleIdSearch);
        elements.idSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleIdSearch();
        });

        // Búsqueda por título
        elements.searchByTitleBtn.addEventListener('click', handleTitleSearch);
        elements.titleSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleTitleSearch();
        });

        // Comparar metadatos
        elements.compareMetadata.addEventListener('click', showComparison);

        // Limpiar selección
        elements.clearSelection.addEventListener('click', clearSelection);

        // Opciones de comparación
        elements.toggleHighlight.addEventListener('click', toggleHighlightDifferences);
        elements.markOldestAsBase.addEventListener('click', markOldestAsBase);
        elements.mergeSelected.addEventListener('click', showMergePanel);

        // Fusión
        elements.cancelMerge.addEventListener('click', cancelMerge);
        elements.confirmMerge.addEventListener('click', confirmMerge);

        // Delegación de eventos para checkboxes
        elements.availableSourcesList.addEventListener('change', function(e) {
            if (e.target.classList.contains('source-checkbox')) {
                handleSourceCheckbox(e.target);
            }
        });

        // Delegación para radios de fusión
        document.addEventListener('change', function(e) {
            if (e.target.name === 'mergeBase') {
                const sourceId = parseInt(e.target.value);
                state.selectedForMerge.base = sourceId;
                state.selectedForMerge.others = state.selectedSources
                    .filter(s => s.id !== sourceId)
                    .map(s => s.id);
                updatePreview(getSourceById(sourceId));
            }
        });
    }

    // Funciones de búsqueda
    function handleIdSearch() {
        const id = parseInt(elements.idSearchInput.value);
        
        if (!id || isNaN(id)) {
            renderAvailableSources(state.availableSources);
            return;
        }

        const results = state.availableSources.filter(source => source.id === id);
        renderAvailableSources(results.length ? results : []);
    }

    function handleTitleSearch() {
        const query = elements.titleSearchInput.value.trim().toLowerCase();
        
        if (!query) {
            renderAvailableSources(state.availableSources);
            return;
        }

        const results = state.availableSources.filter(source => 
            source.title.toLowerCase().includes(query) ||
            source.authors.some(author => author.toLowerCase().includes(query))
        );
        
        renderAvailableSources(results);
    }

    // Funciones de renderizado
    function renderAvailableSources(sources) {
        if (!elements.availableSourcesList) return;

        elements.availableSourcesList.innerHTML = sources.map(source => {
            const isSelected = state.selectedSources.some(s => s.id === source.id);
            const isDuplicate = source.isDuplicate || false;
            
            return `
                <div class="source-checkbox-item ${isDuplicate ? 'duplicate-detected' : ''}" data-source-id="${source.id}">
                    <div class="form-check">
                        <input class="form-check-input source-checkbox" 
                               type="checkbox" 
                               value="${source.id}" 
                               id="source-${source.id}"
                               ${isSelected ? 'checked' : ''}>
                        <label class="form-check-label" for="source-${source.id}">
                            <div class="d-flex align-items-center">
                                <div class="source-preview">
                                    <strong>#${source.id}:</strong> ${escapeHtml(source.title)}
                                    ${isDuplicate ? 
                                        `<span class="badge bg-warning text-dark ms-2">
                                            <i class="fas fa-exclamation-circle me-1"></i>Posible duplicado
                                        </span>` : ''
                                    }
                                </div>
                                <div class="ms-auto">
                                    <span class="badge ${getStatusBadgeClass(source.verificationStatus)}">
                                        ${source.verificationStatus}
                                    </span>
                                    ${source.reports > 0 ? 
                                        `<span class="badge bg-danger ms-1">
                                            <i class="fas fa-flag me-1"></i>${source.reports}
                                        </span>` : ''
                                    }
                                </div>
                            </div>
                            <div class="source-details small text-muted">
                                ${escapeHtml(source.authors.join(', '))} | ${source.year} | ${source.type}
                            </div>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getStatusBadgeClass(status) {
        switch(status) {
            case 'verificado': return 'bg-success';
            case 'pendiente': return 'bg-warning text-dark';
            case 'rechazado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    // Manejo de checkboxes
    function handleSourceCheckbox(checkbox) {
        const sourceId = parseInt(checkbox.value);
        const source = state.availableSources.find(s => s.id === sourceId);
        
        if (!source) return;

        if (checkbox.checked) {
            // Verificar límite máximo
            if (state.selectedSources.length >= state.maxSources) {
                checkbox.checked = false;
                showToast(`Máximo ${state.maxSources} publicaciones permitidas`, 'danger');
                return;
            }
            
            // Agregar fuente
            if (!state.selectedSources.some(s => s.id === sourceId)) {
                state.selectedSources.push(source);
            }
        } else {
            // Remover fuente
            const index = state.selectedSources.findIndex(s => s.id === sourceId);
            if (index !== -1) {
                state.selectedSources.splice(index, 1);
                
                // Si era la base para fusión, limpiar
                if (state.selectedForMerge.base === sourceId) {
                    state.selectedForMerge.base = null;
                }
                state.selectedForMerge.others = state.selectedForMerge.others.filter(id => id !== sourceId);
            }
        }
        
        updateUI();
    }

    // Comparación de metadatos
    function showComparison() {
        if (state.selectedSources.length < state.minSources) {
            showToast(`Selecciona al menos ${state.minSources} publicaciones`, 'warning');
            return;
        }

        if (state.selectedSources.length > state.maxSources) {
            showToast(`Máximo ${state.maxSources} publicaciones permitidas`, 'danger');
            return;
        }

        // Generar tabla comparativa
        generateComparisonTable();
        
        // Mostrar sección de comparación
        elements.comparisonSection.classList.remove('d-none');
        
        // Actualizar vista previa con la primera fuente
        if (state.selectedSources.length > 0) {
            updatePreview(state.selectedSources[0]);
        }
        
        // Ocultar panel de fusión si está visible
        elements.mergeSection.classList.add('d-none');
        
        // Resaltar diferencias automáticamente
        setTimeout(() => {
            highlightDifferences();
            countDifferences();
        }, 100);
    }

    function generateComparisonTable() {
        if (!elements.metadataComparisonTable) return;
        
        const tbody = elements.metadataComparisonTable.querySelector('tbody');
        const thead = elements.metadataComparisonTable.querySelector('thead tr');
        
        // Limpiar tabla
        tbody.innerHTML = '';
        
        // Crear encabezados de columnas
        thead.innerHTML = '<th class="bg-light sticky-header">Campo de Metadatos</th>';
        state.selectedSources.forEach((source, index) => {
            const uploadDate = new Date(source.uploadDate);
            const isOldest = state.selectedSources.every(s => 
                new Date(s.uploadDate) >= uploadDate
            );
            
            thead.innerHTML += `
                <th class="text-center ${isOldest ? 'bg-success text-light' : ''}">
                    <div><strong>#${source.id}</strong></div>
                    <small>${source.uploadDate}</small>
                    ${isOldest ? '<div class="small mt-1"><i class="fas fa-crown"></i> Más antigua</div>' : ''}
                </th>
            `;
        });
        
        // Agregar filas para cada campo de metadatos
        metadataFields.forEach(field => {
            const row = document.createElement('tr');
            
            // Celda del nombre del campo
            row.innerHTML = `<td>${field.label}</td>`;
            
            // Obtener valores para cada fuente
            const values = state.selectedSources.map(source => {
                const rawValue = source[field.key];
                const formattedValue = field.format ? field.format(rawValue) : rawValue;
                return formattedValue !== undefined && formattedValue !== null ? formattedValue : '-';
            });
            
            // Agregar celdas con valores
            values.forEach((value, index) => {
                const source = state.selectedSources[index];
                row.innerHTML += `
                    <td class="metadata-cell" 
                        data-field="${field.key}" 
                        data-source-id="${source.id}"
                        data-value="${escapeHtml(String(value))}">
                        ${escapeHtml(String(value))}
                    </td>
                `;
            });
            
            tbody.appendChild(row);
        });
    }

    function highlightDifferences() {
        if (!state.highlightDifferences) return;
        
        // Obtener todas las filas de datos
        const rows = document.querySelectorAll('#metadataComparisonTable tbody tr');
        let differenceCount = 0;
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td:not(:first-child)');
            const values = Array.from(cells).map(cell => cell.getAttribute('data-value'));
            
            // Verificar si hay diferencias
            const allEqual = values.every((val, i, arr) => val === arr[0]);
            
            if (!allEqual) {
                // Resaltar todas las celdas de esta fila
                cells.forEach(cell => {
                    cell.classList.add('highlight-difference');
                });
                differenceCount++;
            } else {
                // Remover resaltado si ya no hay diferencias
                cells.forEach(cell => {
                    cell.classList.remove('highlight-difference');
                });
            }
        });
        
        // Actualizar contador de diferencias
        if (elements.differencesCount) {
            elements.differencesCount.textContent = `${differenceCount} diferencia${differenceCount !== 1 ? 's' : ''}`;
        }
    }

    function countDifferences() {
        const rows = document.querySelectorAll('#metadataComparisonTable tbody tr');
        let differenceCount = 0;
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td:not(:first-child)');
            const values = Array.from(cells).map(cell => cell.getAttribute('data-value'));
            const allEqual = values.every((val, i, arr) => val === arr[0]);
            
            if (!allEqual) {
                differenceCount++;
            }
        });
        
        return differenceCount;
    }

    function toggleHighlightDifferences(e) {
        e.preventDefault();
        state.highlightDifferences = !state.highlightDifferences;
        
        if (state.highlightDifferences) {
            highlightDifferences();
            showToast('Diferencias resaltadas', 'success');
        } else {
            // Remover todos los resaltados
            const cells = document.querySelectorAll('.highlight-difference');
            cells.forEach(cell => {
                cell.classList.remove('highlight-difference');
            });
            showToast('Resaltado desactivado', 'info');
        }
    }

    // Funciones de vista previa
    function updatePreview(source) {
        if (!source) return;
        
        // Actualizar elementos de vista previa
        document.getElementById('previewTitle').textContent = source.title;
        document.getElementById('previewAuthors').textContent = source.authors.join(', ');
        document.getElementById('previewId').textContent = `#${source.id}`;
        document.getElementById('previewYear').textContent = source.year;
        document.getElementById('previewStatus').textContent = source.verificationStatus;
        document.getElementById('previewUploader').textContent = source.uploadedBy;
        document.getElementById('previewDate').textContent = source.uploadDate;
        document.getElementById('previewReports').textContent = `${source.reports} reporte${source.reports !== 1 ? 's' : ''}`;
        
        // Actualizar historial
        const historyList = document.getElementById('previewHistory');
        if (historyList && source.history) {
            historyList.innerHTML = source.history.map(item => `
                <div class="history-item">
                    <div class="history-date">${item.date}</div>
                    <div class="history-action">${item.action}</div>
                    <div class="history-user">por ${item.user}</div>
                </div>
            `).join('');
        }
        
        // Actualizar radio button
        const radio = document.querySelector('input[name="mergeBase"]');
        if (radio) {
            radio.value = source.id;
            radio.checked = (state.selectedForMerge.base === source.id);
            
            // Actualizar etiqueta del radio
            const label = document.querySelector('label[for="mergeBase"]');
            if (label) {
                const isOldest = state.selectedSources.every(s => 
                    new Date(s.uploadDate) >= new Date(source.uploadDate)
                );
                label.innerHTML = `<i class="fas fa-database me-1"></i>
                    Usar como base para fusión ${isOldest ? '(más antigua)' : ''}`;
            }
        }
    }

    function getSourceById(id) {
        return state.selectedSources.find(s => s.id === id) || 
               state.availableSources.find(s => s.id === id);
    }

    // Funciones de fusión
    function markOldestAsBase(e) {
        e.preventDefault();
        
        if (state.selectedSources.length === 0) {
            showToast('No hay publicaciones seleccionadas', 'warning');
            return;
        }
        
        // Encontrar la más antigua por fecha de subida
        const oldest = state.selectedSources.reduce((prev, current) => {
            return new Date(prev.uploadDate) < new Date(current.uploadDate) ? prev : current;
        });
        
        // Marcar como base
        state.selectedForMerge.base = oldest.id;
        state.selectedForMerge.others = state.selectedSources
            .filter(s => s.id !== oldest.id)
            .map(s => s.id);
        
        // Actualizar radio button
        const radio = document.querySelector(`input[name="mergeBase"][value="${oldest.id}"]`);
        if (radio) {
            radio.checked = true;
            updatePreview(oldest);
        }
        
        showToast(`Fuente #${oldest.id} marcada como base (más antigua)`, 'success');
    }

    function showMergePanel(e) {
        e.preventDefault();
        
        if (!state.selectedForMerge.base || state.selectedForMerge.others.length === 0) {
            showToast('Selecciona una fuente base y al menos una fuente para fusionar', 'warning');
            return;
        }
        
        // Obtener fuente base
        const baseSource = getSourceById(state.selectedForMerge.base);
        if (!baseSource) return;
        
        // Actualizar panel de fusión
        document.getElementById('baseTitle').textContent = baseSource.title;
        document.getElementById('baseDetails').textContent = 
            `#${baseSource.id} | ${baseSource.authors.join(', ')} | ${baseSource.year}`;
        
        // Actualizar lista de fusiones
        const fusionList = document.getElementById('fusionList');
        fusionList.innerHTML = state.selectedForMerge.others.map(id => {
            const source = getSourceById(id);
            if (!source) return '';
            
            return `
                <div class="fusion-item">
                    <div class="d-flex align-items-start">
                        <div class="flex-grow-1">
                            <h6>${source.title}</h6>
                            <p class="text-muted mb-2">
                                #${source.id} | ${source.authors.join(', ')} | ${source.year}
                            </p>
                            <div class="text-danger small">
                                <i class="fas fa-exclamation-triangle me-1"></i>
                                Será eliminada después de la fusión
                            </div>
                        </div>
                        <div class="ms-3">
                            <span class="badge bg-danger">Eliminar</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Mostrar panel de fusión
        elements.mergeSection.classList.remove('d-none');
        elements.comparisonSection.classList.add('d-none');
    }

    function cancelMerge() {
        // Ocultar panel de fusión
        elements.mergeSection.classList.add('d-none');
        elements.comparisonSection.classList.remove('d-none');
    }

    function confirmMerge() {
        if (!state.selectedForMerge.base || state.selectedForMerge.others.length === 0) {
            showToast('Error en la configuración de fusión', 'danger');
            return;
        }
        
        // Simular fusión
        showToast('Iniciando proceso de fusión...', 'info');
        
        // Simulación de proceso
        setTimeout(() => {
            // En un sistema real, aquí se haría una petición al servidor
            const baseSource = getSourceById(state.selectedForMerge.base);
            const othersCount = state.selectedForMerge.others.length;
            
            // Mostrar resultado simulado
            showToast(`Fusión completada: Fuente #${state.selectedForMerge.base} actualizada con datos de ${othersCount} fuente(s)`, 'success');
            
            // Notificación adicional (simulada)
            setTimeout(() => {
                showToast('Notificaciones enviadas a los usuarios afectados', 'info');
            }, 500);
            
            // Ocultar paneles
            elements.mergeSection.classList.add('d-none');
            elements.comparisonSection.classList.add('d-none');
            
            // Resetear selección
            const removedIds = [state.selectedForMerge.base, ...state.selectedForMerge.others];
            state.selectedSources = state.selectedSources.filter(s => !removedIds.includes(s.id));
            state.selectedForMerge = { base: null, others: [] };
            
            // Actualizar UI
            updateUI();
            renderAvailableSources(state.availableSources);
            
        }, 1500);
    }

    // Funciones de utilidad
    function clearSelection() {
        if (state.selectedSources.length === 0) return;
        
        if (confirm('¿Estás seguro de que quieres limpiar la selección?')) {
            state.selectedSources = [];
            state.selectedForMerge = { base: null, others: [] };
            updateUI();
            renderAvailableSources(state.availableSources);
            
            // Ocultar paneles de comparación y fusión
            elements.comparisonSection.classList.add('d-none');
            elements.mergeSection.classList.add('d-none');
        }
    }

    function updateUI() {
        // Actualizar contador
        elements.selectedCount.textContent = state.selectedSources.length;
        
        // Actualizar estado del botón de comparación
        elements.compareMetadata.disabled = state.selectedSources.length < state.minSources;
        
        // Actualizar contador del header
        const counterLabel = document.querySelector('.counter-label');
        if (counterLabel) {
            counterLabel.textContent = `/10 seleccionadas`;
        }
    }

    function showToast(message, type = 'info') {
        // Crear toast dinámico
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Agregar al contenedor de toasts
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        toastContainer.innerHTML += toastHtml;

        // Mostrar y eliminar después de 3 segundos
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();

        // Eliminar del DOM después de ocultarse
        toastElement.addEventListener('hidden.bs.toast', function () {
            toastElement.remove();
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Inicializar
    try {
        init();
    } catch (err) {
        console.error('compare-admin initialization error:', err);
    }
});