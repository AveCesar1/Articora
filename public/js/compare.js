// ========================================
// COMPARADOR DE FUENTES - JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Estado del comparador
    const state = {
        // Use explicit window globals that will be injected by the EJS template
        selectedSources: JSON.parse(JSON.stringify(window.initialSources || [])),
        availableSources: window.availableSources || [],
        maxSources: 4,
        minSources: 2
    };

    // Elementos DOM
    const elements = {
        nameSearchInput: document.getElementById('nameSearchInput'),
        idSearchInput: document.getElementById('idSearchInput'),
        multipleIdsInput: document.getElementById('multipleIdsInput'),
        nameResultsList: document.getElementById('nameResultsList'),
        idResultsList: document.getElementById('idResultsList'),
        comparisonGrid: document.getElementById('comparisonGrid'),
        selectedCount: document.getElementById('selectedCount'),
        comparisonCount: document.getElementById('comparisonCount'),
        clearSelection: document.getElementById('clearSelection'),
        searchByNameBtn: document.getElementById('searchByNameBtn'),
        searchByIdBtn: document.getElementById('searchByIdBtn'),
        addMultipleBtn: document.getElementById('addMultipleBtn'),
        exactMatch: document.getElementById('exactMatch'),
        toggleCriteria: document.getElementById('toggleCriteria'),
        toggleStats: document.getElementById('toggleStats'),
        exportComparison: document.getElementById('exportComparison')
        // Removed searchSuggestions (no longer present)
    };

    // Inicialización
    function init() {
        updateUI();
        setupEventListeners();
        // setupSearchSuggestions removed
        showInitialExamples();
        // Apply bar widths if server rendered bars include data attributes
        applyBarWidths();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Búsqueda por nombre
        elements.nameSearchInput.addEventListener('input', debounce(handleNameSearch, 300));
        elements.searchByNameBtn.addEventListener('click', handleNameSearch);
        elements.nameSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleNameSearch();
        });

        // Búsqueda por ID
        elements.searchByIdBtn.addEventListener('click', handleIdSearch);
        elements.idSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleIdSearch();
        });

        // Agregar múltiples IDs
        elements.addMultipleBtn.addEventListener('click', handleMultipleIds);

        // Limpiar selección
        elements.clearSelection.addEventListener('click', clearSelection);

        // Toggle de opciones
        elements.toggleCriteria.addEventListener('click', toggleCriteriaVisibility);
        elements.toggleStats.addEventListener('click', toggleStatsVisibility);
        elements.exportComparison.addEventListener('click', exportComparison);

        // Delegación de eventos para elementos dinámicos
        document.addEventListener('click', function(e) {
            // Agregar fuente desde resultados
            if (e.target.closest('.add-source-btn')) {
                const sourceId = parseInt(e.target.closest('.add-source-btn').dataset.sourceId);
                addSourceById(sourceId);
            }

            // Eliminar fuente
            if (e.target.closest('.remove-source')) {
                const index = parseInt(e.target.closest('.remove-source').dataset.index);
                removeSource(index);
            }

            // Ejemplos de IDs
            if (e.target.closest('.id-example')) {
                const id = parseInt(e.target.closest('.id-example').dataset.id);
                elements.idSearchInput.value = id;
                handleIdSearch();
            }
        });
    }

    // Mostrar ejemplos iniciales
    function showInitialExamples() {
        // No mostramos resultados iniciales, solo el placeholder
        // Pero podríamos mostrar algunos ejemplos populares si quisiéramos
    }

    // ========================================
    // FUNCIONES DE BÚSQUEDA
    // ========================================

    function handleNameSearch() {
        const query = elements.nameSearchInput.value.trim().toLowerCase();
        const exactMatch = elements.exactMatch.checked;

        if (!query) {
            showPlaceholder('name');
            return;
        }

        const results = state.availableSources.filter(source => {
            const searchString = `
                ${source.title.toLowerCase()}
                ${source.authors.toLowerCase()}
                ${source.year}
                ${source.type.toLowerCase()}
                ${source.category.toLowerCase()}
                ${source.keywords.toLowerCase()}
            `.toLowerCase();

            if (exactMatch) {
                return source.title.toLowerCase() === query ||
                       source.authors.toLowerCase() === query;
            } else {
                return searchString.includes(query);
            }
        });

        displayResults(results, 'name');
    }

    function handleIdSearch() {
        const id = parseInt(elements.idSearchInput.value);
        
        if (!id || isNaN(id)) {
            showPlaceholder('id');
            return;
        }

        const result = state.availableSources.find(source => source.id === id);
        
        if (result) {
            displayResults([result], 'id');
        } else {
            elements.idResultsList.innerHTML = `
                <div class="list-group-item">
                    <div class="text-center py-3">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                        <h6 class="text-muted mb-2">Fuente no encontrada</h6>
                        <p class="small text-muted mb-0">
                            No se encontró ninguna fuente con el ID ${id}. 
                            Intenta con un ID entre 1 y ${state.availableSources.length}.
                        </p>
                    </div>
                </div>
            `;
        }
    }

    function handleMultipleIds() {
        const idsString = elements.multipleIdsInput.value.trim();
        
        if (!idsString) {
            showToast('Ingresa IDs separados por comas', 'warning');
            return;
        }

        const ids = idsString.split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id) && id > 0);

        if (ids.length === 0) {
            showToast('No se encontraron IDs válidos', 'warning');
            return;
        }

        // Verificar límite
        if (state.selectedSources.length + ids.length > state.maxSources) {
            showToast(`Solo puedes comparar máximo ${state.maxSources} fuentes`, 'danger');
            return;
        }

        // Agregar cada ID válido
        let addedCount = 0;
        const addedIds = [];
        
        ids.forEach(id => {
            const source = state.availableSources.find(s => s.id === id);
            if (source && !state.selectedSources.some(s => s.id === id)) {
                state.selectedSources.push(source);
                addedCount++;
                addedIds.push(id);
            }
        });

        if (addedCount > 0) {
            updateUI();
            showToast(`${addedCount} fuente(s) agregada(s): ${addedIds.join(', ')}`, 'success');
        } else {
            showToast('No se agregaron fuentes nuevas', 'info');
        }

        elements.multipleIdsInput.value = '';
    }

    // ========================================
    // FUNCIONES DE RENDERIZADO
    // ========================================

    function showPlaceholder(type) {
        const resultsList = type === 'name' ? elements.nameResultsList : elements.idResultsList;
        
        if (type === 'name') {
            resultsList.innerHTML = `
                <div class="list-group-item search-placeholder">
                    <div class="text-center py-4">
                        <i class="fas fa-search fa-2x text-muted mb-3"></i>
                        <h6 class="text-muted mb-2">Comienza a buscar fuentes</h6>
                        <p class="small text-muted mb-0">
                            Escribe en el campo de búsqueda o haz clic en una sugerencia para ver resultados
                        </p>
                    </div>
                </div>
            `;
        } else {
            resultsList.innerHTML = `
                <div class="list-group-item search-placeholder">
                    <div class="text-center py-4">
                        <i class="fas fa-hashtag fa-2x text-muted mb-3"></i>
                        <h6 class="text-muted mb-2">Busca por ID</h6>
                        <p class="small text-muted mb-0">
                            Ingresa un ID o haz clic en uno de los ejemplos
                        </p>
                    </div>
                </div>
            `;
        }
    }

    function displayResults(results, type) {
        const resultsList = type === 'name' ? elements.nameResultsList : elements.idResultsList;
        
        if (results.length === 0) {
            resultsList.innerHTML = `
                <div class="list-group-item">
                    <div class="text-center py-3">
                        <i class="fas fa-search fa-2x text-muted mb-3"></i>
                        <h6 class="text-muted mb-2">No se encontraron resultados</h6>
                        <p class="small text-muted mb-0">
                            Intenta con otros términos de búsqueda
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        resultsList.innerHTML = results.map(source => `
            <div class="list-group-item search-result-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${escapeHtml(source.title)}</h6>
                        <p class="small text-muted mb-1">
                            <i class="fas fa-user-edit me-1"></i>
                            ${escapeHtml(source.authors)}
                        </p>
                        <div class="d-flex align-items-center flex-wrap gap-1">
                            <span class="badge bg-brown">ID: ${source.id}</span>
                            <span class="badge bg-brown">${source.year}</span>
                            <span class="badge bg-accent">${source.type}</span>
                            <span class="badge bg-light text-brown border border-brown">${source.category}</span>
                        </div>
                    </div>
                    <div class="ms-3">
                        <button class="btn btn-sm ${state.selectedSources.some(s => s.id === source.id) ? 'btn-brown' : 'btn-outline-brown'} add-source-btn" 
                                data-source-id="${source.id}"
                                ${state.selectedSources.length >= state.maxSources && !state.selectedSources.some(s => s.id === source.id) ? 'disabled' : ''}>
                            <i class="fas fa-${state.selectedSources.some(s => s.id === source.id) ? 'check' : 'plus'} me-1"></i>
                            ${state.selectedSources.some(s => s.id === source.id) ? 'Agregado' : 'Agregar'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // FUNCIONES DE GESTIÓN DE FUENTES
    // ========================================

    function addSourceById(sourceId) {
        if (state.selectedSources.length >= state.maxSources) {
            showToast(`Máximo ${state.maxSources} fuentes permitidas`, 'danger');
            return;
        }

        const source = state.availableSources.find(s => s.id === sourceId);
        
        if (!source) {
            showToast('Fuente no encontrada', 'warning');
            return;
        }

        // Evitar duplicados
        if (state.selectedSources.some(s => s.id === sourceId)) {
            showToast('Esta fuente ya está en la comparación', 'info');
            return;
        }

        state.selectedSources.push(source);
        updateUI();
        showToast(`"${source.title}" agregada a la comparación`, 'success');
        
        // Actualizar resultados de búsqueda
        handleNameSearch();
    }

    function removeSource(index) {
        if (state.selectedSources.length <= state.minSources) {
            showToast(`Debes comparar mínimo ${state.minSources} fuentes`, 'warning');
            return;
        }

        const removed = state.selectedSources.splice(index, 1)[0];
        updateUI();
        showToast(`"${removed.title}" removida de la comparación`, 'info');
        
        // Actualizar resultados de búsqueda
        handleNameSearch();
    }

    function clearSelection() {
        if (state.selectedSources.length === 0) return;
        
        if (confirm('¿Estás seguro de que quieres eliminar todas las fuentes de la comparación?')) {
            state.selectedSources = [];
            updateUI();
            showToast('Comparación limpiada', 'info');
        }
    }

    // ========================================
    // FUNCIONES DE UTILIDAD
    // ========================================

    function updateUI() {
        // Actualizar contadores
        elements.selectedCount.textContent = state.selectedSources.length;
        elements.comparisonCount.textContent = `${state.selectedSources.length} fuente${state.selectedSources.length !== 1 ? 's' : ''}`;
        
        // Actualizar grid de comparación
        updateComparisonGrid();
        
        // Actualizar estado de botones
        updateButtonStates();
    }

    function updateButtonStates() {
        // Los botones en resultados se actualizan en displayResults
    }

    function toggleCriteriaVisibility(e) {
        e.preventDefault();
        const criteriaElements = document.querySelectorAll('.source-criteria');
        criteriaElements.forEach(el => {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        });
    }

    function toggleStatsVisibility(e) {
        e.preventDefault();
        const statsElements = document.querySelectorAll('.source-stats');
        statsElements.forEach(el => {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        });
    }

    function exportComparison(e) {
        e.preventDefault();
        
        if (state.selectedSources.length === 0) {
            showToast('No hay fuentes para exportar', 'warning');
            return;
        }

        // Simular exportación (en producción esto generaría un PDF/CSV)
        showToast('Exportación iniciada... (simulación)', 'info');
        
        setTimeout(() => {
            showToast('Comparación exportada exitosamente', 'success');
        }, 1500);
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

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Apply widths to any server-rendered .bar-fill[data-width]
    function applyBarWidths() {
        const fills = document.querySelectorAll('.bar-fill[data-width]');
        fills.forEach(el => {
            const w = el.dataset.width;
            if (w !== undefined && w !== null) {
                el.style.width = w + '%';
            }
        });
    }

    // Minimal stub so updateUI() doesn't blow up; we keep server-rendered grid unchanged but update widths
    function updateComparisonGrid() {
        // Server-side markup is used for initial rendering; re-apply widths on update
        applyBarWidths();
    }

    // Inicializar
    init();
});