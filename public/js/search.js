// search.js - Funcionalidad para búsqueda avanzada
document.addEventListener('DOMContentLoaded', function() {
    // Referencias a elementos del DOM
    const mainSearchForm = document.getElementById('searchMainForm');
    const mainSearchInput = document.getElementById('mainSearchInput');
    const advancedFiltersForm = document.getElementById('advancedFiltersForm');
    const filtersCollapse = document.getElementById('filtersCollapse');
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const subcategoriesContainer = document.getElementById('subcategoriesContainer');
    const ratingSlider = document.getElementById('minRatingSlider');
    const ratingValue = document.getElementById('minRatingValue');
    const criterionSliders = document.querySelectorAll('.criterion-slider');
    const viewToggleButtons = document.querySelectorAll('[data-view]');
    const sortSelect = document.getElementById('sortResults');
    const clearAllFiltersBtn = document.getElementById('clearAllFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const resetSearchBtn = document.getElementById('resetSearchBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const addToListButtons = document.querySelectorAll('.add-to-list-btn');
    const removeFilterButtons = document.querySelectorAll('.remove-filter');
    
    // Estado de la búsqueda
    let searchState = window.searchState || {};
    let currentView = 'list';
    
    // Inicialización
    function initializePage() {
        // Configurar el slider de calificación
        if (ratingSlider && ratingValue) {
            ratingSlider.addEventListener('input', function() {
                updateRatingDisplay(this.value);
            });
            
            // Inicializar valor
            updateRatingDisplay(ratingSlider.value);
        }
        
        // Configurar sliders de criterios individuales
        criterionSliders.forEach(slider => {
            const valueDisplay = document.getElementById(`${slider.id.replace('Slider', '')}Value`);
            
            if (valueDisplay) {
                // Mostrar valor inicial
                valueDisplay.textContent = `${slider.value} estrellas`;
                
                // Actualizar en tiempo real
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = `${this.value} estrellas`;
                });
            }
        });
        
        // Cargar subcategorías para categorías seleccionadas
        loadSubcategories();
    }
    
    // Actualizar visualización de calificación
    function updateRatingDisplay(value) {
        if (ratingValue) {
            ratingValue.textContent = value;
        }
        
        // Actualizar estrellas de visualización
        const stars = document.querySelectorAll('.rating-stars-display .fa-star');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('text-warning');
                star.classList.remove('text-muted');
            } else {
                star.classList.remove('text-warning');
                star.classList.add('text-muted');
            }
        });
    }
    
    // Cargar subcategorías basadas en categorías seleccionadas
    function loadSubcategories() {
        const selectedCategories = Array.from(categoryCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        if (selectedCategories.length === 0) {
            subcategoriesContainer.innerHTML = `
                <p class="text-muted small">
                    Selecciona una categoría primero para ver las subcategorías.
                </p>
            `;
            return;
        }
        
        // Obtener todas las subcategorías de las categorías seleccionadas
        let allSubcategories = [];
        selectedCategories.forEach(categoryId => {
            const category = filterData.categories.find(c => c.id === categoryId);
            if (category && filterData.subcategoriesByCategory[categoryId]) {
                allSubcategories = allSubcategories.concat(
                    filterData.subcategoriesByCategory[categoryId].map(sub => ({
                        ...sub,
                        categoryName: category.name
                    }))
                );
            }
        });
        
        if (allSubcategories.length === 0) {
            subcategoriesContainer.innerHTML = `
                <p class="text-muted small">
                    No hay subcategorías disponibles para las categorías seleccionadas.
                </p>
            `;
            return;
        }
        
        // Crear checkboxes para subcategorías
        let html = '';
        allSubcategories.forEach((subcategory, index) => {
            const isChecked = filterData.filters.subcategories && 
                             filterData.filters.subcategories.includes(subcategory.id);
            
            html += `
                <div class="form-check mb-2">
                    <input class="form-check-input subcategory-checkbox" 
                           type="checkbox" 
                           id="sub_${subcategory.id}"
                           value="${subcategory.id}"
                           ${isChecked ? 'checked' : ''}>
                    <label class="form-check-label" for="sub_${subcategory.id}">
                        <small class="text-muted">${subcategory.categoryName}:</small> ${subcategory.name}
                    </label>
                </div>
            `;
        });
        
        subcategoriesContainer.innerHTML = html;
        
        // Añadir event listeners a los nuevos checkboxes
        document.querySelectorAll('.subcategory-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Actualizar contador o marcar visualmente
                const label = this.nextElementSibling;
                if (this.checked) {
                    label.classList.add('fw-bold');
                } else {
                    label.classList.remove('fw-bold');
                }
            });
        });
    }
    
    // Cambiar vista (lista/grid)
    function setupViewToggle() {
        viewToggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const view = this.getAttribute('data-view');
                
                // Actualizar botones activos
                viewToggleButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                
                // Cambiar vista
                currentView = view;
                resultsContainer.className = `results-container ${view}-view`;
                
                if (view === 'grid') {
                    convertToGridView();
                } else {
                    convertToListView();
                }
            });
        });
    }
    
    function convertToGridView() {
        const sourceCards = document.querySelectorAll('.source-card');
        sourceCards.forEach(card => {
            card.classList.add('grid-card');
            // Aquí podrías modificar el contenido para la vista de cuadrícula
        });
    }
    
    function convertToListView() {
        const sourceCards = document.querySelectorAll('.source-card');
        sourceCards.forEach(card => {
            card.classList.remove('grid-card');
        });
    }
    
    // Manejar ordenamiento
    function setupSorting() {
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                // En una implementación real, esto recargaría la página o haría una petición AJAX
                const url = new URL(window.location);
                url.searchParams.set('sort', this.value);
                url.searchParams.delete('page'); // Volver a primera página
                
                // Simular recarga (en producción sería window.location.href = url.toString())
                console.log('Ordenando por:', this.value);
                // showLoadingState();
                // setTimeout(() => hideLoadingState(), 500);
            });
        }
    }
    
    // Manejar formulario principal de búsqueda
    function setupMainSearch() {
        if (mainSearchForm) {
            mainSearchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const query = mainSearchInput.value.trim();
                if (!query) {
                    mainSearchInput.focus();
                    return;
                }
                
                // En producción, esto enviaría el formulario
                console.log('Buscando:', query);
                
                // Mostrar estado de carga
                showLoadingState();
                
                // Simular búsqueda
                setTimeout(() => {
                    hideLoadingState();
                    // Aquí se actualizarían los resultados
                }, 1000);
            });
        }
    }
    
    // Manejar formulario de filtros avanzados
    function setupAdvancedFilters() {
        if (advancedFiltersForm) {
            advancedFiltersForm.addEventListener('submit', function(e) {
                e.preventDefault();
                applyFilters();
            });
            
            // Actualizar subcategorías cuando cambien las categorías
            categoryCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', loadSubcategories);
            });
        }
    }
    
    function applyFilters() {
        // Recopilar todos los filtros
        const filters = {
            // Categorías
            categories: Array.from(categoryCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value),
            
            // Subcategorías
            subcategories: Array.from(document.querySelectorAll('.subcategory-checkbox'))
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value),
            
            // Calificación mínima
            minRating: ratingSlider ? parseFloat(ratingSlider.value) : 0,
            
            // Criterios específicos
            criteria: {}
        };
        
        // Añadir criterios individuales
        criterionSliders.forEach(slider => {
            const criterionId = slider.id.replace('Slider', '');
            const value = parseFloat(slider.value);
            if (value > 0) {
                filters.criteria[criterionId] = value;
            }
        });
        
        // Añadir años
        const minYear = document.getElementById('minYear');
        const maxYear = document.getElementById('maxYear');
        if (minYear && minYear.value) filters.minYear = parseInt(minYear.value);
        if (maxYear && maxYear.value) filters.maxYear = parseInt(maxYear.value);
        
        // Añadir tipos de fuente
        filters.sourceTypes = Array.from(document.querySelectorAll('.source-type-checkbox'))
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        console.log('Aplicando filtros:', filters);
        showLoadingState();
        
        // Simular aplicación de filtros
        setTimeout(() => {
            hideLoadingState();
            // En producción, aquí se haría una petición AJAX para actualizar resultados
        }, 800);
    }
    
    // Botones de limpieza
    function setupClearButtons() {
        if (clearAllFiltersBtn) {
            clearAllFiltersBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearAllFilters();
            });
        }
        
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function(e) {
                e.preventDefault();
                resetFiltersForm();
            });
        }
        
        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = '/search'; // Reiniciar búsqueda
            });
        }
        
        // Botones para eliminar filtros individuales
        removeFilterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filterKey = this.getAttribute('data-filter');
                removeFilter(filterKey);
            });
        });
    }
    
    function clearAllFilters() {
        // Limpiar formulario de filtros
        if (advancedFiltersForm) {
            advancedFiltersForm.reset();
        }
        
        // Limpiar búsqueda principal
        if (mainSearchInput) {
            mainSearchInput.value = '';
        }
        
        // Restablecer sliders
        if (ratingSlider) {
            ratingSlider.value = 0;
            updateRatingDisplay(0);
        }
        
        criterionSliders.forEach(slider => {
            slider.value = 0;
            const valueDisplay = document.getElementById(`${slider.id.replace('Slider', '')}Value`);
            if (valueDisplay) {
                valueDisplay.textContent = '0 estrellas';
            }
        });
        
        // Recargar página (en producción sería una petición AJAX)
        window.location.href = '/search';
    }
    
    function resetFiltersForm() {
        if (advancedFiltersForm) {
            advancedFiltersForm.reset();
            
            // Restablecer valores específicos
            if (ratingSlider) {
                ratingSlider.value = 0;
                updateRatingDisplay(0);
            }
            
            criterionSliders.forEach(slider => {
                slider.value = 0;
                const valueDisplay = document.getElementById(`${slider.id.replace('Slider', '')}Value`);
                if (valueDisplay) {
                    valueDisplay.textContent = '0 estrellas';
                }
            });
            
            // Recargar subcategorías
            loadSubcategories();
        }
    }
    
    function removeFilter(filterKey) {
        // En producción, esto eliminaría un filtro específico
        console.log('Eliminando filtro:', filterKey);
        
        // Simular actualización
        showLoadingState();
        setTimeout(hideLoadingState, 500);
    }
    
    // Botones "Añadir a lista"
    function setupAddToListButtons() {
        addToListButtons.forEach(button => {
            button.addEventListener('click', function() {
                const sourceId = this.getAttribute('data-source-id');
                addSourceToList(sourceId, this);
            });
        });
    }
    
    function addSourceToList(sourceId, button) {
        // Simular añadir a lista
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check me-1"></i> Añadido';
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-success');
        button.disabled = true;
        
        console.log(`Añadiendo fuente ${sourceId} a lista`);
        
        // Restaurar después de 2 segundos
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-secondary');
            button.disabled = false;
        }, 2000);
    }
    
    // Estados de carga
    function showLoadingState() {
        // Crear overlay de carga
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-3">Aplicando filtros...</p>
        `;
        
        document.body.appendChild(loadingOverlay);
    }
    
    function hideLoadingState() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    // Sugerencias de búsqueda (simuladas)
    function setupSearchSuggestions() {
        if (mainSearchInput) {
            let debounceTimer;
            
            mainSearchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                
                if (this.value.length < 2) return;
                
                debounceTimer = setTimeout(() => {
                    showSearchSuggestions(this.value);
                }, 300);
            });
            
            mainSearchInput.addEventListener('blur', function() {
                setTimeout(() => {
                    hideSearchSuggestions();
                }, 200);
            });
        }
    }
    
    function showSearchSuggestions(query) {
        // En producción, esto haría una petición al servidor
        const suggestions = [
            'Inteligencia artificial',
            'Machine learning',
            'Procesamiento de lenguaje natural',
            'Deep learning',
            'Redes neuronales'
        ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
        
        if (suggestions.length === 0) return;
        
        // Crear o actualizar contenedor de sugerencias
        let suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'searchSuggestions';
            suggestionsContainer.className = 'search-suggestions';
            mainSearchInput.parentNode.appendChild(suggestionsContainer);
        }
        
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item">
                <i class="fas fa-search me-2"></i>${suggestion}
            </div>
        `).join('');
        
        suggestionsContainer.style.display = 'block';
    }
    
    function hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    // Inicializar todo
    initializePage();
    setupViewToggle();
    setupSorting();
    setupMainSearch();
    setupAdvancedFilters();
    setupClearButtons();
    setupAddToListButtons();
    setupSearchSuggestions();
    
    console.log('Página de búsqueda inicializada');
});