document.addEventListener('DOMContentLoaded', function() {
    // Estado del comparador
    const state = {
        // Use explicit window globals that will be injected by the EJS template
        selectedSources: JSON.parse(JSON.stringify(window.initialSources || [])),
        availableSources: window.availableSources || [],
        maxSources: 4,
        minSources: 2
    };

    // Caching helper to avoid refetching same set repeatedly
    let lastFetchedIds = '';

    // Elementos DOM
    const elements = {
        nameSearchInput: document.getElementById('nameSearchInput'),
        idSearchInput: document.getElementById('idSearchInput'),
        multipleIdsInput: document.getElementById('multipleIdsInput'),
        nameResultsList: document.getElementById('nameResultsList'),
        idResultsList: document.getElementById('idResultsList'),
        comparisonContainer: document.getElementById('comparisonContainer'),
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

        // Confirm modal actions
        const confirmClearBtn = document.getElementById('confirmClearBtn');
        if (confirmClearBtn) {
            confirmClearBtn.addEventListener('click', function() {
                const modalEl = document.getElementById('confirmClearModal');
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                state.selectedSources = [];
                updateUI();
                showToast('Comparación limpiada', 'info');
                modal.hide();
            });
        }
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
        // If removing would leave fewer than allowed, ask to clear the whole comparison
        if (state.selectedSources.length <= state.minSources) {
            const modalEl = document.getElementById('confirmClearModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
            return;
        }

        const removed = state.selectedSources.splice(index, 1)[0];
        updateUI();
        showToast(`"${removed.title || removed.title || 'Fuente'}" removida de la comparación`, 'info');
        // Actualizar resultados de búsqueda
        handleNameSearch();
    }

    function clearSelection() {
        if (state.selectedSources.length === 0) return;
        const modalEl = document.getElementById('confirmClearModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
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

    // Ensure we have rating/criteria/readCount for selected sources.
    // For 2-4 sources we call /api/compare/sources; for a single source we call /api/sources/:id/ratings
    async function ensureSelectedMetadata() {
        try {
            const sel = state.selectedSources || [];
            if (!sel.length) return;

            const ids = sel.map(s => s.id).filter(Boolean);
            if (ids.length >= 2) {
                const idsKey = ids.join(',');
                const needFetch = sel.some(s => !s.criteria || typeof s.rating === 'undefined' || typeof s.readCount === 'undefined');
                if (!needFetch && lastFetchedIds === idsKey) return;

                // fetch aggregated metadata
                const resp = await fetch(`/api/compare/sources?ids=${encodeURIComponent(idsKey)}`, { credentials: 'same-origin' });
                if (!resp.ok) {
                    console.warn('compare metadata fetch failed', resp.status);
                    return;
                }
                const data = await resp.json();
                if (!data || !Array.isArray(data.sources)) return;

                // Merge returned fields into state.selectedSources
                data.sources.forEach(rs => {
                    const idx = state.selectedSources.findIndex(s => s.id === rs.id);
                    if (idx === -1) return;
                    const local = state.selectedSources[idx];
                    local.rating = (typeof rs.rating !== 'undefined') ? rs.rating : (local.rating || 0);
                    local.criteria = rs.criteria || local.criteria || {};
                    local.readCount = (typeof rs.readCount !== 'undefined') ? rs.readCount : (local.readCount || 0);
                    local.cover = rs.cover || local.cover;
                    local.authors = rs.authors || local.authors;
                    local.keywords = rs.keywords || local.keywords;
                });

                lastFetchedIds = idsKey;
                return;
            }

            // Single source: fetch its aggregated ratings (no readCount available via this endpoint)
            if (ids.length === 1) {
                const id = ids[0];
                const s = state.selectedSources.find(x => x.id === id);
                if (!s) return;
                if (s.criteria && typeof s.rating !== 'undefined') return;

                const r = await fetch(`/api/sources/${id}/ratings`, { credentials: 'same-origin' });
                if (!r.ok) return;
                const j = await r.json();
                if (!j || !j.success) return;
                const avg = j.averages || {};
                s.criteria = {
                    extension: avg.readability || 0,
                    completeness: avg.completeness || 0,
                    detail: avg.detail_level || 0,
                    veracity: avg.veracity || 0,
                    difficulty: avg.technical_difficulty || 0
                };
                s.rating = (typeof j.overall !== 'undefined') ? j.overall : (s.rating || 0);
                // readCount unknown here; leave as-is or 0
                if (typeof s.readCount === 'undefined') s.readCount = s.readCount || 0;
            }
        } catch (err) {
            console.warn('Error fetching compare metadata:', err);
        }
    }

    // Minimal stub so updateUI() doesn't blow up; we keep server-rendered grid unchanged but update widths
    async function updateComparisonGrid() {
        const container = elements.comparisonContainer || document.getElementById('comparisonContainer');
        if (!container) return;

        if (!state.selectedSources || state.selectedSources.length === 0) {
            container.innerHTML = `
                <div class="empty-comparison text-center py-5">
                    <i class="fas fa-balance-scale fa-4x text-muted mb-3"></i>
                    <h4 class="text-muted mb-3">No hay fuentes para comparar</h4>
                    <p class="text-muted">Usa el buscador para agregar fuentes a la comparación</p>
                </div>
            `;
            return;
        }

        // Ensure we have up-to-date metadata (ratings, criteria, read counts) before rendering
        await ensureSelectedMetadata();

        const cols = state.selectedSources.map((source, index) => {
            const title = escapeHtml(source.title || 'Sin título');
            const authors = Array.isArray(source.authors) ? escapeHtml(source.authors.join(', ')) : escapeHtml(source.authors || 'N/A');
            const type = escapeHtml(source.type || 'N/A');
            const category = escapeHtml(source.category || 'Desconocida');
            const rating = (source.rating !== undefined && source.rating !== null) ? Number(source.rating) : 0;

            const starsHtml = (() => {
                let s = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= Math.floor(rating)) s += '<i class="fas fa-star text-warning"></i>';
                    else if (i === Math.ceil(rating) && rating % 1 !== 0) s += '<i class="fas fa-star-half-alt text-warning"></i>';
                    else s += '<i class="far fa-star text-warning"></i>';
                }
                return s;
            })();

            const criteria = source.criteria || {};
            const criteriaKeys = [
                { key: 'extension', label: 'Extensión' },
                { key: 'completeness', label: 'Completitud' },
                { key: 'detail', label: 'Detalle' },
                { key: 'veracity', label: 'Veracidad' },
                { key: 'difficulty', label: 'Dificultad' }
            ];

            const criteriaHtml = criteriaKeys.map(c => {
                const value = (criteria && criteria[c.key]) ? Number(criteria[c.key]) : 0;
                const pct = Math.round((value / 5) * 100);
                return `
                    <div class="criterion">
                        <span class="criterion-name">${c.label}:</span>
                        <div class="criterion-bar">
                            <div class="bar-fill" data-width="${pct}"></div>
                        </div>
                        <div class="criterion-value">${value}</div>
                    </div>
                `;
            }).join('');

            const readCount = source.readCount || 0;
            const trendHtml = source.trend === 'increasing' ? '<i class="fas fa-arrow-up text-success"></i> ↑' : (source.trend === 'decreasing' ? '<i class="fas fa-arrow-down text-danger"></i> ↓' : '<i class="fas fa-minus text-warning"></i> →');

            const keywords = Array.isArray(source.keywords) ? source.keywords : (typeof source.keywords === 'string' ? source.keywords.split(',').map(k=>k.trim()) : []);
            const keywordsHtml = (keywords || []).map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join(' ');

            return `
                <div class="source-column" data-source-id="${source.id}">
                    <div class="source-header">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-accent fs-6">#${source.id}</span>
                            <button class="btn btn-sm btn-outline-danger remove-source" data-index="${index}" title="Eliminar fuente">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <h4 class="source-title mt-2 mb-2"><a href="/post/${source.id}" class="text-brown">${title}</a></h4>
                        <p class="source-authors mb-3 text-muted"><i class="fas fa-user-edit me-1"></i><a href="/post/${source.id}" class="text-decoration-none">${authors}</a></p>
                        <div class="source-type-badge mb-3"><span class="badge bg-light text-brown border border-brown"><i class="fas fa-${type === 'Libro' ? 'book' : 'file-alt'} me-1"></i>${type} • ${category}</span></div>
                    </div>
                    <div class="source-rating mt-3">
                        <div class="rating-header">
                            <h6 class="mb-2 text-brown"><i class="fas fa-star text-warning me-1"></i>Calificación promedio</h6>
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="average-rating"><span class="rating-number">${rating.toFixed(1)}</span><span class="rating-max">/5.0</span></div>
                                <div class="stars">${starsHtml}</div>
                            </div>
                        </div>
                    </div>
                    <div class="source-criteria mt-4"><h6 class="mb-3 text-brown"><i class="fas fa-chart-pie me-1"></i>Desglose por criterios</h6><div class="criteria-list">${criteriaHtml}</div></div>
                    <div class="source-stats mt-4"><h6 class="mb-3 text-brown"><i class="fas fa-chart-line me-1"></i>Estadísticas de lectura</h6><div class="stats-grid"><div class="stat-item"><div class="stat-value">${Number(readCount).toLocaleString()}</div><div class="stat-label">Veces leída</div></div><div class="stat-item"><div class="stat-value">${trendHtml}</div><div class="stat-label">Tendencia</div></div></div></div>
                    <div class="source-keywords mt-4"><h6 class="mb-2 text-brown"><i class="fas fa-tags me-1"></i>Palabras clave</h6><div class="keyword-tags">${keywordsHtml}</div></div>
                    <div class="source-actions mt-4 pt-3 border-top"><a href="/post/${source.id}" class="btn btn-sm btn-brown w-100"><i class="fas fa-external-link-alt me-1"></i>Ver fuente completa</a></div>
                </div>
            `;
        });

        container.innerHTML = `<div class="comparison-grid" id="comparisonGrid">${cols.join('')}</div>`;
        applyBarWidths();
    }

    // Inicializar
    init();
});