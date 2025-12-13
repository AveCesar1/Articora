// search.js
document.addEventListener('DOMContentLoaded', function() {
    // Elementos principales
    const filtersCollapse = document.getElementById('filtersCollapse');
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const subcategoryCheckboxes = document.querySelectorAll('.subcategory-checkbox');
    const academicAdjustment = document.getElementById('academicAdjustment');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const resetFiltersEmptyBtn = document.getElementById('resetFiltersEmptyBtn');
    const viewListBtn = document.getElementById('viewListBtn');
    const viewGridBtn = document.getElementById('viewGridBtn');
    const searchResults = document.getElementById('searchResults');
    const sourceTypeFilter = document.getElementById('sourceTypeFilter');
    const sortBy = document.getElementById('sortBy');
    const yearFrom = document.getElementById('yearFrom');
    const yearTo = document.getElementById('yearTo');
    
    // Inicializar sliders de rango (simulados)
    const rangeSliders = document.querySelectorAll('.range-slider');
    rangeSliders.forEach(slider => {
        initializeRangeSlider(slider);
    });
    
    // Manejar colapso de filtros en móvil
    if (filtersCollapse) {
        // En pantallas grandes, asegurar que esté expandido
        if (window.innerWidth >= 992) {
            filtersCollapse.classList.add('show');
        }
        
        // Detectar cambios de tamaño de ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 992) {
                filtersCollapse.classList.add('show');
            }
        });
    }
    
    // Manejar categorías y subcategorías
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const categoryId = this.value;
            const subcatContainer = document.getElementById(`subcat_${categoryId}`);
            
            if (this.checked && subcatContainer) {
                subcatContainer.style.display = 'block';
            } else if (subcatContainer) {
                subcatContainer.style.display = 'none';
                // Desmarcar subcategorías cuando se desmarca la categoría
                subcatContainer.querySelectorAll('.subcategory-checkbox').forEach(subcat => {
                    subcat.checked = false;
                });
            }
        });
        
        // Inicializar estado de subcategorías
        const categoryId = checkbox.value;
        const subcatContainer = document.getElementById(`subcat_${categoryId}`);
        if (checkbox.checked && subcatContainer) {
            subcatContainer.style.display = 'block';
        }
    });
    
    // Manejar vista de resultados (lista vs cuadrícula)
    if (viewListBtn && viewGridBtn) {
        viewListBtn.addEventListener('click', function() {
            this.classList.add('active');
            viewGridBtn.classList.remove('active');
            searchResults.querySelector('.results-list').classList.remove('results-grid');
        });
        
        viewGridBtn.addEventListener('click', function() {
            this.classList.add('active');
            viewListBtn.classList.remove('active');
            searchResults.querySelector('.results-list').classList.add('results-grid');
        });
    }
    
    // Aplicar filtros
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            const filters = collectFilters();
            console.log('Filtros aplicados:', filters);
            
            // Simular aplicación de filtros
            showLoadingState();
            
            // En una implementación real, aquí se haría una petición AJAX
            setTimeout(() => {
                hideLoadingState();
                showAlert('success', 'Filtros aplicados correctamente.');
                
                // Actualizar contadores (simulación)
                updateResultsCount(filters);
            }, 1000);
        });
    }
    
    // Restablecer filtros
    const resetButtons = [resetFiltersBtn, resetFiltersEmptyBtn].filter(Boolean);
    resetButtons.forEach(button => {
        button.addEventListener('click', function() {
            resetAllFilters();
            showAlert('info', 'Todos los filtros han sido restablecidos.');
        });
    });
    
    // Cambios en tiempo real para algunos filtros
    if (sourceTypeFilter) {
        sourceTypeFilter.addEventListener('change', function() {
            applyFiltersDebounced();
        });
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            applyFiltersDebounced();
        });
    }
    
    if (yearFrom || yearTo) {
        [yearFrom, yearTo].forEach(input => {
            if (input) {
                input.addEventListener('input', function() {
                    applyFiltersDebounced();
                });
            }
        });
    }
    
    if (academicAdjustment) {
        academicAdjustment.addEventListener('change', function() {
            applyFiltersDebounced();
        });
    }
    
    // Funciones auxiliares
    function initializeRangeSlider(slider) {
        // Crear controles visuales para el slider
        const minHandle = document.createElement('div');
        minHandle.className = 'range-handle min';
        slider.appendChild(minHandle);
        
        const maxHandle = document.createElement('div');
        maxHandle.className = 'range-handle max';
        slider.appendChild(maxHandle);
        
        // Configurar eventos para los handles (simulación)
        setupHandleEvents(minHandle, slider);
        setupHandleEvents(maxHandle, slider);
    }
    
    function setupHandleEvents(handle, slider) {
        let isDragging = false;
        
        handle.addEventListener('mousedown', function(e) {
            isDragging = true;
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
        
        function mouseMoveHandler(e) {
            if (!isDragging) return;
            
            const sliderRect = slider.getBoundingClientRect();
            let x = e.clientX - sliderRect.left;
            x = Math.max(0, Math.min(x, sliderRect.width));
            
            const percentage = (x / sliderRect.width) * 100;
            handle.style.left = `${percentage}%`;
            
            // Actualizar valor mostrado
            updateSliderValue(slider, handle);
            applyFiltersDebounced();
        }
        
        function mouseUpHandler() {
            isDragging = false;
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        }
    }
    
    function updateSliderValue(slider, handle) {
        const sliderId = slider.id.replace('Slider', '');
        const valueElement = document.getElementById(`${sliderId}Value`);
        
        if (valueElement) {
            const minHandle = slider.querySelector('.min');
            const maxHandle = slider.querySelector('.max');
            
            const minPercent = parseFloat(minHandle.style.left || '25');
            const maxPercent = parseFloat(maxHandle.style.left || '75');
            
            const minValue = (minPercent / 100 * 5).toFixed(1);
            const maxValue = (maxPercent / 100 * 5).toFixed(1);
            
            valueElement.textContent = `${minValue} - ${maxValue}`;
        }
    }
    
    function collectFilters() {
        const filters = {};
        
        // Categorías seleccionadas
        const selectedCategories = Array.from(categoryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        if (selectedCategories.length > 0) {
            filters.categories = selectedCategories;
        }
        
        // Subcategorías seleccionadas
        const selectedSubcategories = Array.from(subcategoryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        if (selectedSubcategories.length > 0) {
            filters.subcategories = selectedSubcategories;
        }
        
        // Tipo de fuente
        if (sourceTypeFilter && sourceTypeFilter.value) {
            filters.sourceType = sourceTypeFilter.value;
        }
        
        // Año de publicación
        if (yearFrom && yearFrom.value) {
            filters.yearFrom = yearFrom.value;
        }
        
        if (yearTo && yearTo.value) {
            filters.yearTo = yearTo.value;
        }
        
        // Ordenamiento
        if (sortBy && sortBy.value) {
            filters.sortBy = sortBy.value;
        }
        
        // Ajuste académico
        if (academicAdjustment) {
            filters.academicAdjustment = academicAdjustment.checked;
        }
        
        return filters;
    }
    
    function resetAllFilters() {
        // Desmarcar todas las categorías
        categoryCheckboxes.forEach(cb => {
            cb.checked = false;
            const subcatContainer = document.getElementById(`subcat_${cb.value}`);
            if (subcatContainer) {
                subcatContainer.style.display = 'none';
            }
        });
        
        // Desmarcar todas las subcategorías
        subcategoryCheckboxes.forEach(cb => {
            cb.checked = false;
        });
        
        // Resetear sliders
        document.querySelectorAll('.range-slider').forEach(slider => {
            const minHandle = slider.querySelector('.min');
            const maxHandle = slider.querySelector('.max');
            
            if (minHandle) minHandle.style.left = '25%';
            if (maxHandle) maxHandle.style.left = '75%';
            
            updateSliderValue(slider, minHandle);
        });
        
        // Resetear otros filtros
        if (sourceTypeFilter) sourceTypeFilter.value = '';
        if (sortBy) sortBy.value = 'relevance';
        if (yearFrom) yearFrom.value = '';
        if (yearTo) yearTo.value = '';
        if (academicAdjustment) academicAdjustment.checked = false;
        
        // Aplicar filtros después de resetear
        applyFiltersDebounced();
    }
    
    function applyFiltersDebounced() {
        // Debounce para evitar muchas llamadas
        clearTimeout(window.applyFiltersTimeout);
        window.applyFiltersTimeout = setTimeout(() => {
            const filters = collectFilters();
            console.log('Filtros actualizados:', filters);
            
            // Aquí iría la lógica real de actualización
            // Por ahora solo actualizamos el contador simulado
            updateResultsCount(filters);
        }, 300);
    }
    
    function updateResultsCount(filters) {
        // Simular actualización de conteo
        const resultsCount = Math.floor(Math.random() * 50) + 10;
        const resultsElement = document.querySelector('h5.mb-0');
        
        if (resultsElement) {
            const query = new URLSearchParams(window.location.search).get('q') || '';
            let text = `${resultsCount} resultados`;
            
            if (query) {
                text += ` para "<strong>${query}</strong>"`;
            }
            
            resultsElement.innerHTML = text;
        }
    }
    
    function showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'searchLoading';
        loadingOverlay.className = 'search-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-3">Aplicando filtros...</p>
        `;
        
        searchResults.appendChild(loadingOverlay);
    }
    
    function hideLoadingState() {
        const loadingOverlay = document.getElementById('searchLoading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    function showAlert(type, message) {
        // Crear alerta temporal
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.style.zIndex = '1050';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Inicializar popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});