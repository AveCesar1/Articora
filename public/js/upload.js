// upload.js - Lógica completa de subida de fuentes

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const form = document.getElementById('uploadForm');
    const validateBtn = document.getElementById('validateBtn');
    const submitBtn = document.getElementById('submitBtn');
    const formProgress = document.getElementById('formProgress');
    const sourceType = document.getElementById('sourceType');
    
    // Contadores
    const titleCounter = document.getElementById('titleCounter');
    const publisherCounter = document.getElementById('publisherCounter');
    
    // Estados
    let isTitleChecked = false;
    let isAuthorsChecked = false;
    let isEditionChecked = false;
    let duplicateCheckState = 'pending'; // pending, checking, clear, duplicate
    
    // Diccionarios para autocompletado (simulados)
    const dictionaries = {
        title: [
            "Cognitive Science and Artificial Intelligence",
            "The Future of Human-Computer Interaction",
            "Machine Learning: A Probabilistic Perspective",
            "Deep Learning for Natural Language Processing",
            "The Society of Mind",
            "Thinking, Fast and Slow",
            "The Structure of Scientific Revolutions"
        ],
        author: [
            "Smith, John",
            "Johnson, Emily",
            "Brown, Michael",
            "Davis, Sarah",
            "Wilson, David",
            "Taylor, Jennifer",
            "Anderson, Robert"
        ],
        publisher: [
            "Nature Publishing Group",
            "Elsevier",
            "Springer",
            "Wiley",
            "ACM",
            "IEEE",
            "MIT Press"
        ],
        keywords: [
            "cognitive science",
            "artificial intelligence",
            "machine learning",
            "neuroscience",
            "psychology",
            "linguistics",
            "philosophy"
        ]
    };

    // Inicialización
    initForm();

    // ==================== FUNCIONES DE INICIALIZACIÓN ====================

    function initForm() {
        // Contadores de caracteres
        document.getElementById('title').addEventListener('input', updateTitleCounter);
        document.getElementById('publisher').addEventListener('input', updatePublisherCounter);
        
        // Validación en tiempo real
        setupRealTimeValidation();
        
        // Autocompletado
        setupAutocomplete();
        
        // Manejo de campos dependientes
        sourceType.addEventListener('change', handleSourceTypeChange);
        
        // Botones
        validateBtn.addEventListener('click', performDuplicateCheck);
        form.addEventListener('submit', handleFormSubmit);
        
        // Inicializar con tipo por defecto
        handleSourceTypeChange();
        
        // Categorías
        setupCategorySelection();
        
        // Actualizar progreso inicial
        updateFormProgress();
    }

    // ==================== CONTADORES DE CARACTERES ====================

    function updateTitleCounter() {
        const title = document.getElementById('title');
        const count = title.value.length;
        titleCounter.textContent = count;
        
        if (count > 500) {
            title.value = title.value.substring(0, 500);
            titleCounter.textContent = 500;
        }
    }

    function updatePublisherCounter() {
        const publisher = document.getElementById('publisher');
        const count = publisher.value.length;
        publisherCounter.textContent = count;
        
        if (count > 300) {
            publisher.value = publisher.value.substring(0, 300);
            publisherCounter.textContent = 300;
        }
    }

    // ==================== VALIDACIÓN EN TIEMPO REAL ====================

    function setupRealTimeValidation() {
        // Título
        const titleInput = document.getElementById('title');
        titleInput.addEventListener('blur', validateTitle);
        titleInput.addEventListener('input', function() {
            isTitleChecked = false;
            updateDuplicateStatus();
        });
        
        // Autores
        setupAuthorsValidation();
        
        // Año
        document.getElementById('year').addEventListener('blur', validateYear);
        
        // Edición
        document.getElementById('edition').addEventListener('blur', validateEdition);
        
        // Páginas
        document.getElementById('pages').addEventListener('blur', validatePages);
        
        // DOI
        document.getElementById('doi').addEventListener('blur', validateDOI);
        
        // URLs
        setupUrlsValidation();
        
        // Palabras clave
        document.getElementById('keywords').addEventListener('blur', validateKeywords);
    }

    function validateTitle() {
        const titleInput = document.getElementById('title');
        const errorElement = document.getElementById('titleError');
        const value = titleInput.value.trim();
        
        if (!value) {
            showError(titleInput, errorElement, 'El título es obligatorio.');
            return false;
        }
        
        if (value.length > 500) {
            showError(titleInput, errorElement, 'El título no puede exceder 500 caracteres.');
            return false;
        }
        
        showSuccess(titleInput, errorElement);
        isTitleChecked = true;
        updateFormProgress();
        
        // Verificación de duplicados por título
        if (isTitleChecked && value.length > 3) {
            checkTitleDuplicates(value);
        }
        
        return true;
    }

    function validateYear() {
        const yearInput = document.getElementById('year');
        const errorElement = document.getElementById('yearError');
        const value = parseInt(yearInput.value);
        const currentYear = new Date().getFullYear();
        
        if (!yearInput.value || isNaN(value)) {
            showError(yearInput, errorElement, 'El año es obligatorio.');
            return false;
        }
        
        if (value < 1 || value > currentYear + 100) {
            showError(yearInput, errorElement, `El año debe estar entre 1 y ${currentYear + 100}.`);
            return false;
        }
        
        showSuccess(yearInput, errorElement);
        updateFormProgress();
        return true;
    }

    function validateEdition() {
        const editionInput = document.getElementById('edition');
        const errorElement = document.getElementById('editionError');
        const value = editionInput.value.trim();
        
        // Solo validar si hay valor
        if (value) {
            const numValue = parseInt(value);
            
            if (isNaN(numValue) || numValue < 1) {
                showError(editionInput, errorElement, 'La edición debe ser un número entero positivo.');
                return false;
            }
            
            // Verificar duplicados exactos si ya tenemos título y autores
            if (isTitleChecked && isAuthorsChecked && value) {
                checkExactDuplicate();
            }
            
            showSuccess(editionInput, errorElement);
            isEditionChecked = true;
        } else {
            clearValidation(editionInput, errorElement);
        }
        
        updateFormProgress();
        return true;
    }

    function validatePages() {
        const pagesInput = document.getElementById('pages');
        const errorElement = document.getElementById('pagesError');
        const value = pagesInput.value.trim();
        
        if (!value) {
            clearValidation(pagesInput, errorElement);
            return true;
        }
        
        // Validar formato: número o número-número
        const pageRegex = /^(\d+)(-\d+)?$/;
        
        if (!pageRegex.test(value)) {
            showError(pagesInput, errorElement, 'Formato inválido. Use "10-25" para rangos o "10" para página única.');
            return false;
        }
        
        // Validar que el segundo número sea mayor si hay rango
        if (value.includes('-')) {
            const [start, end] = value.split('-').map(Number);
            if (start >= end) {
                showError(pagesInput, errorElement, 'El número de página final debe ser mayor al inicial.');
                return false;
            }
        }
        
        showSuccess(pagesInput, errorElement);
        return true;
    }

    function validateDOI() {
        const doiInput = document.getElementById('doi');
        const errorElement = document.getElementById('doiError');
        const value = doiInput.value.trim();
        
        if (!value) {
            clearValidation(doiInput, errorElement);
            return true;
        }
        
        // Validar formato DOI básico
        const doiRegex = /^10\.\d{4,9}\/[-._;()\/:A-Z0-9]+$/i;
        
        if (!doiRegex.test(value)) {
            showError(doiInput, errorElement, 'Formato DOI inválido. Use: 10.xxxx/xxxx');
            return false;
        }
        
        showSuccess(doiInput, errorElement);
        return true;
    }

    function validateKeywords() {
        const keywordsInput = document.getElementById('keywords');
        const errorElement = document.getElementById('keywordsError');
        const value = keywordsInput.value.trim();
        
        // Solo validar para tipos que requieren palabras clave
        const type = sourceType.value;
        const requiresKeywords = ['paper', 'preprint', 'proceedings'].includes(type);
        
        if (!requiresKeywords) {
            clearValidation(keywordsInput, errorElement);
            return true;
        }
        
        if (!value) {
            showError(keywordsInput, errorElement, 'Se requieren palabras clave para este tipo de fuente.');
            return false;
        }
        
        const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
        
        if (keywords.length < 3) {
            showError(keywordsInput, errorElement, 'Mínimo 3 palabras clave requeridas.');
            return false;
        }
        
        if (keywords.length > 10) {
            showError(keywordsInput, errorElement, 'Máximo 10 palabras clave permitidas.');
            return false;
        }
        
        showSuccess(keywordsInput, errorElement);
        return true;
    }

    // ==================== AUTORES DINÁMICOS ====================

    window.addAuthorField = function() {
        const container = document.getElementById('authorsContainer');
        const authorFields = container.querySelectorAll('.author-field');
        
        if (authorFields.length >= 10) {
            alert('Máximo 10 autores permitidos.');
            return;
        }
        
        const index = authorFields.length;
        const newField = document.createElement('div');
        newField.className = 'input-group mb-2 author-field';
        newField.innerHTML = `
            <input type="text" class="form-control author-input" 
                   maxlength="150" placeholder="Apellido, Nombre"
                   data-index="${index}">
            <button type="button" class="btn btn-outline-danger" onclick="removeAuthorField(this)">
                <i class="fas fa-minus"></i>
            </button>
        `;
        
        container.appendChild(newField);
        
        // Configurar autocompletado para el nuevo campo
        setupAuthorAutocomplete(newField.querySelector('.author-input'));
        
        // Configurar validación
        newField.querySelector('.author-input').addEventListener('blur', validateAuthors);
        
        updateFormProgress();
    }

    window.removeAuthorField = function(button) {
        const field = button.closest('.author-field');
        const container = document.getElementById('authorsContainer');
        const fields = container.querySelectorAll('.author-field');
        
        if (fields.length > 1) {
            field.remove();
            
            // Re-indexar campos restantes
            container.querySelectorAll('.author-field').forEach((field, index) => {
                field.querySelector('.author-input').dataset.index = index;
            });
            
            validateAuthors();
            updateFormProgress();
        }
    }

    function setupAuthorsValidation() {
        document.getElementById('authorsContainer').addEventListener('input', function() {
            isAuthorsChecked = false;
            updateDuplicateStatus();
        });
        
        // Validar al salir de cualquier campo de autor
        document.addEventListener('blur', function(e) {
            if (e.target.classList.contains('author-input')) {
                validateAuthors();
            }
        }, true);
    }

    function validateAuthors() {
        const authorInputs = document.querySelectorAll('.author-input');
        const errorElement = document.getElementById('authorsError');
        let isValid = true;
        let hasAtLeastOne = false;
        
        authorInputs.forEach(input => {
            const value = input.value.trim();
            
            if (value) {
                hasAtLeastOne = true;
                
                if (value.length > 150) {
                    showError(input, '');
                    isValid = false;
                } else {
                    showSuccess(input, '');
                }
            } else {
                clearValidation(input, '');
            }
        });
        
        if (!hasAtLeastOne) {
            showError(document.querySelector('.author-input'), errorElement, 'Debe ingresar al menos un autor.');
            return false;
        }
        
        if (!isValid) {
            showError(document.querySelector('.author-input'), errorElement, 'Cada autor debe tener máximo 150 caracteres.');
            return false;
        }
        
        showSuccess(document.querySelector('.author-input'), errorElement);
        isAuthorsChecked = true;
        updateFormProgress();
        
        // Verificar duplicados por título y autores
        if (isTitleChecked && isAuthorsChecked) {
            checkTitleAuthorDuplicates();
        }
        
        return true;
    }

    // ==================== URLs DINÁMICAS ====================

    window.addUrlField = function() {
        const container = document.getElementById('urlsContainer');
        const urlFields = container.querySelectorAll('.url-field');
        
        const newField = document.createElement('div');
        newField.className = 'input-group mb-2 url-field';
        newField.innerHTML = `
            <span class="input-group-text">Secundaria</span>
            <input type="url" class="form-control url-input" 
                   placeholder="https://alternativo.com/articulo" data-type="secondary">
            <button type="button" class="btn btn-outline-danger" onclick="removeUrlField(this)">
                <i class="fas fa-minus"></i>
            </button>
        `;
        
        container.appendChild(newField);
        
        // Configurar validación
        newField.querySelector('.url-input').addEventListener('blur', validateUrls);
        
        updateFormProgress();
    }

    window.removeUrlField = function(button) {
        const field = button.closest('.url-field');
        if (field.querySelector('.input-group-text').textContent !== 'Primaria') {
            field.remove();
            validateUrls();
            updateFormProgress();
        }
    }

    function setupUrlsValidation() {
        document.getElementById('urlsContainer').addEventListener('input', function() {
            validateUrls();
        });
    }

    function validateUrls() {
        const urlInputs = document.querySelectorAll('.url-input');
        const errorElement = document.getElementById('urlsError');
        let hasValidUrl = false;
        const urls = [];
        
        urlInputs.forEach(input => {
            const value = input.value.trim();
            
            if (value) {
                try {
                    new URL(value);
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                        showSuccess(input, '');
                        hasValidUrl = true;
                        urls.push(value);
                    } else {
                        showError(input, '');
                    }
                } catch {
                    showError(input, '');
                }
            } else {
                clearValidation(input, '');
            }
        });
        
        // Verificar URLs duplicadas
        const uniqueUrls = [...new Set(urls)];
        if (uniqueUrls.length !== urls.length) {
            showError(document.querySelector('.url-input'), errorElement, 'Las URLs deben ser únicas.');
            return false;
        }
        
        if (!hasValidUrl && urlInputs[0].value.trim()) {
            showError(document.querySelector('.url-input'), errorElement, 'La URL debe ser válida (http:// o https://).');
            return false;
        }
        
        clearValidation(document.querySelector('.url-input'), errorElement);
        return true;
    }

    // ==================== CATEGORÍAS ====================

    function setupCategorySelection() {
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
        
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const categoryId = this.value;
                const subcatContainer = document.getElementById(`subcat_${categoryId}`);
                
                if (this.checked) {
                    subcatContainer.style.display = 'block';
                } else {
                    // Desmarcar todas las subcategorías
                    subcatContainer.querySelectorAll('.subcategory-checkbox').forEach(sub => {
                        sub.checked = false;
                    });
                    subcatContainer.style.display = 'none';
                }
                
                validateCategories();
                updateFormProgress();
            });
        });
        
        // Subcategorías
        document.querySelectorAll('.subcategory-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                validateCategories();
                updateFormProgress();
            });
        });
    }

    function validateCategories() {
        const errorElement = document.getElementById('categoriesError');
        const selectedCategories = document.querySelectorAll('.category-checkbox:checked');
        const selectedSubcategories = document.querySelectorAll('.subcategory-checkbox:checked');
        
        if (selectedCategories.length === 0) {
            showError(document.querySelector('.categories-container'), errorElement, 'Seleccione al menos una categoría.');
            updateValidationSummary('categories', false, 'Sin categorías');
            return false;
        }
        
        if (selectedSubcategories.length === 0) {
            showError(document.querySelector('.categories-container'), errorElement, 'Seleccione al menos una subcategoría.');
            updateValidationSummary('categories', false, 'Sin subcategorías');
            return false;
        }
        
        showSuccess(document.querySelector('.categories-container'), errorElement);
        updateValidationSummary('categories', true, `${selectedCategories.length} categorías, ${selectedSubcategories.length} subcategorías`);
        return true;
    }

    // ==================== AUTCOMPLETADO ====================

    function setupAutocomplete() {
        // Título
        setupFieldAutocomplete('title', 'titleAutocomplete');
        
        // Autores (primer campo)
        const firstAuthor = document.querySelector('.author-input');
        if (firstAuthor) {
            setupAuthorAutocomplete(firstAuthor);
        }
        
        // Revista/Editorial
        setupFieldAutocomplete('publisher', 'publisherAutocomplete');
        
        // Palabras clave
        setupKeywordsAutocomplete();
    }

    function setupFieldAutocomplete(fieldId, hintId) {
        const field = document.getElementById(fieldId);
        const hint = document.getElementById(hintId);
        
        if (!field || !hint) return;
        
        field.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const suggestions = dictionaries[fieldId];
            
            if (value.length < 2 || !suggestions) {
                hint.classList.remove('active');
                return;
            }
            
            const match = suggestions.find(s => s.toLowerCase().startsWith(value));
            
            if (match) {
                const remaining = match.substring(value.length);
                hint.textContent = remaining;
                hint.classList.add('active');
            } else {
                hint.classList.remove('active');
            }
        });
        
        field.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && hint.classList.contains('active')) {
                e.preventDefault();
                const fullSuggestion = this.value + hint.textContent;
                this.value = fullSuggestion;
                hint.classList.remove('active');
                
                if (fieldId === 'title') {
                    updateTitleCounter();
                    validateTitle();
                } else if (fieldId === 'publisher') {
                    updatePublisherCounter();
                }
            }
        });
        
        field.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 200);
        });
    }

    function setupAuthorAutocomplete(input) {
        const hint = document.getElementById('authorAutocomplete');
        
        input.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const suggestions = dictionaries.author;
            
            if (value.length < 2) {
                hint.classList.remove('active');
                return;
            }
            
            const match = suggestions.find(s => s.toLowerCase().startsWith(value));
            
            if (match) {
                const remaining = match.substring(value.length);
                hint.textContent = remaining;
                hint.style.top = `${this.offsetTop + this.offsetHeight}px`;
                hint.style.left = `${this.offsetLeft}px`;
                hint.classList.add('active');
            } else {
                hint.classList.remove('active');
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && hint.classList.contains('active')) {
                e.preventDefault();
                const fullSuggestion = this.value + hint.textContent;
                this.value = fullSuggestion;
                hint.classList.remove('active');
            }
        });
        
        input.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 200);
        });
    }

    function setupKeywordsAutocomplete() {
        const field = document.getElementById('keywords');
        const hint = document.getElementById('keywordsAutocomplete');
        
        field.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const lastComma = value.lastIndexOf(',');
            const currentWord = lastComma === -1 ? value.trim() : value.substring(lastComma + 1).trim();
            
            if (currentWord.length < 2) {
                hint.classList.remove('active');
                return;
            }
            
            const match = dictionaries.keywords.find(k => k.toLowerCase().startsWith(currentWord));
            
            if (match) {
                const remaining = match.substring(currentWord.length);
                hint.textContent = remaining;
                hint.classList.add('active');
            } else {
                hint.classList.remove('active');
            }
        });
        
        field.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && hint.classList.contains('active')) {
                e.preventDefault();
                const value = this.value;
                const lastComma = value.lastIndexOf(',');
                
                if (lastComma === -1) {
                    this.value = hint.textContent ? value + hint.textContent : value;
                } else {
                    const before = value.substring(0, lastComma + 1);
                    const after = value.substring(lastComma + 1);
                    const newWord = after.trim() + hint.textContent;
                    this.value = before + ' ' + newWord;
                }
                
                hint.classList.remove('active');
            }
        });
        
        field.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 200);
        });
    }

    // ==================== CAMPOS DEPENDIENTES ====================

    function handleSourceTypeChange() {
        const type = sourceType.value;
        const publisherRequired = document.getElementById('publisherRequired');
        const editionRequired = document.getElementById('editionRequired');
        const keywordsRequired = document.getElementById('keywordsRequired');
        const publisherHelp = document.getElementById('publisherHelp');
        
        // Revista/Editorial: obligatorio para libros y artículos
        const needsPublisher = ['book', 'chapter', 'paper'].includes(type);
        publisherRequired.classList.toggle('d-none', !needsPublisher);
        
        // Edición: obligatorio para libros
        const needsEdition = type === 'book';
        editionRequired.classList.toggle('d-none', !needsEdition);
        
        // Palabras clave: obligatorio para artículos, preprint y actas
        const needsKeywords = ['paper', 'preprint', 'proceedings'].includes(type);
        keywordsRequired.classList.toggle('d-none', !needsKeywords);
        
        // Actualizar texto de ayuda
        if (type === 'book') {
            publisherHelp.textContent = 'Nombre de la editorial (obligatorio para libros).';
        } else if (type === 'paper' || type === 'chapter') {
            publisherHelp.textContent = 'Nombre de la revista o editorial (obligatorio).';
        } else {
            publisherHelp.textContent = 'Nombre de la revista o editorial (opcional).';
        }
        
        // Validar campos afectados
        validateKeywords();
        updateFormProgress();
    }

    // ==================== VERIFICACIÓN DE DUPLICADOS ====================

    function checkTitleDuplicates(title) {
        // Simular verificación TF-IDF
        setTimeout(() => {
            // En un caso real, aquí se haría la petición al servidor
            const hasDuplicates = Math.random() > 0.7; // 30% de chance de encontrar duplicados
            
            if (hasDuplicates) {
                showDuplicateModal('title', title);
            }
        }, 1000);
    }

    function checkTitleAuthorDuplicates() {
        if (!isTitleChecked || !isAuthorsChecked) return;
        
        const title = document.getElementById('title').value.trim();
        const authors = Array.from(document.querySelectorAll('.author-input'))
            .map(input => input.value.trim())
            .filter(a => a);
        
        // Simular verificación
        setTimeout(() => {
            const hasDuplicates = Math.random() > 0.8; // 20% de chance
            
            if (hasDuplicates) {
                showDuplicateModal('title-author', { title, authors });
            }
        }, 1500);
    }

    function checkExactDuplicate() {
        if (!isTitleChecked || !isAuthorsChecked || !isEditionChecked) return;
        
        const title = document.getElementById('title').value.trim();
        const authors = Array.from(document.querySelectorAll('.author-input'))
            .map(input => input.value.trim())
            .filter(a => a);
        const edition = document.getElementById('edition').value.trim();
        
        // Simular verificación exacta
        setTimeout(() => {
            const isExactDuplicate = Math.random() > 0.9; // 10% de chance
            
            if (isExactDuplicate) {
                showRedirectMessage('Esta fuente ya existe. Será redirigido a la ficha existente en 5 segundos.', '/post/123');
            }
        }, 2000);
    }

    function performDuplicateCheck() {
        if (!validateAllFields()) {
            alert('Por favor, complete todos los campos obligatorios correctamente.');
            return;
        }
        
        duplicateCheckState = 'checking';
        updateDuplicateStatus();
        
        validateBtn.disabled = true;
        validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Verificando...';
        
        // Simular verificación final
        setTimeout(() => {
            const isDuplicate = Math.random() > 0.85; // 15% de chance
            
            if (isDuplicate) {
                duplicateCheckState = 'duplicate';
                showRedirectMessage('Esta fuente ya existe. Será redirigido a la ficha existente en 5 segundos.', '/post/123');
            } else {
                duplicateCheckState = 'clear';
                showSuccessAlert();
            }
            
            updateDuplicateStatus();
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-search me-2"></i> Verificar duplicados';
            updateSubmitButton();
        }, 3000);
    }

    function showDuplicateModal(type, data) {
        const modal = new bootstrap.Modal(document.getElementById('duplicateModal'));
        const content = document.getElementById('duplicateModalContent');
        
        let html = '';
        
        if (type === 'title') {
            html = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>¿Es su fuente alguna de estas?</strong>
                    <p class="mb-0 mt-2">Se encontraron fuentes con títulos similares:</p>
                </div>
                <div class="list-group mt-3">
                    <a href="#" class="list-group-item list-group-item-action">
                        <strong>"${data}" y sus implicaciones en la ciencia cognitiva</strong><br>
                        <small class="text-muted">Autor: Smith, John | Año: 2020</small>
                    </a>
                    <a href="#" class="list-group-item list-group-item-action">
                        <strong>"${data}" en el siglo XXI: Una revisión</strong><br>
                        <small class="text-muted">Autores: Johnson, Emily; Brown, Michael | Año: 2022</small>
                    </a>
                </div>
                <p class="mt-3">Si su fuente corresponde a alguna de estas, seleccione "Sí, es la misma fuente".</p>
            `;
        } else if (type === 'title-author') {
            html = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>¿Ya existen registros titulados "${data.title}" del autor(es) ${data.authors.join(', ')}?</strong>
                </div>
                <div class="list-group mt-3">
                    <a href="#" class="list-group-item list-group-item-action">
                        <strong>"${data.title}"</strong><br>
                        <small class="text-muted">Autores: ${data.authors.join('; ')} | Edición: 1 | Año: 2021</small>
                    </a>
                </div>
                <p class="mt-3">Si su fuente corresponde a esta edición, seleccione "Sí, es la misma fuente".</p>
            `;
        }
        
        content.innerHTML = html;
        
        // Configurar botones del modal
        document.getElementById('confirmDuplicate').onclick = function() {
            modal.hide();
            showRedirectMessage('Esta fuente ya existe. Será redirigido a la ficha existente en 5 segundos.', '/post/456');
        };
        
        document.getElementById('confirmNotDuplicate').onclick = function() {
            modal.hide();
            duplicateCheckState = 'clear';
            updateDuplicateStatus();
            updateSubmitButton();
        };
        
        modal.show();
    }

    // ==================== MANEJO DEL ENVÍO ====================

    function handleFormSubmit(e) {
        e.preventDefault();
        
        if (!validateAllFields()) {
            alert('Por favor, corrija los errores en el formulario.');
            return;
        }
        
        if (duplicateCheckState !== 'clear') {
            alert('Debe verificar los duplicados antes de enviar.');
            return;
        }
        
        // Simular envío
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Subiendo...';
        
        setTimeout(() => {
            alert('¡Fuente subida exitosamente! En un entorno real, se guardaría en la base de datos y se generaría la portada con LaTeX.');
            // Redirigir al detalle de la fuente
            window.location.href = '/post/789';
        }, 2000);
    }

    // ==================== UTILIDADES ====================

    function validateAllFields() {
        let isValid = true;
        
        if (!validateTitle()) isValid = false;
        if (!validateAuthors()) isValid = false;
        if (!validateYear()) isValid = false;
        if (!validateEdition()) isValid = false;
        if (!validatePages()) isValid = false;
        if (!validateDOI()) isValid = false;
        if (!validateKeywords()) isValid = false;
        if (!validateUrls()) isValid = false;
        if (!validateCategories()) isValid = false;
        
        return isValid;
    }

    function updateFormProgress() {
        let progress = 0;
        const fields = [
            { checked: sourceType.value, weight: 5 },
            { checked: isTitleChecked, weight: 15 },
            { checked: isAuthorsChecked, weight: 15 },
            { checked: document.getElementById('year').value, weight: 5 },
            { checked: validateCategories(), weight: 10 },
            { checked: duplicateCheckState === 'clear', weight: 20 }
        ];
        
        fields.forEach(field => {
            if (field.checked) progress += field.weight;
        });
        
        formProgress.style.width = `${progress}%`;
    }

    function updateDuplicateStatus() {
        const statusElement = document.getElementById('duplicateStatus');
        const summaryElement = document.getElementById('duplicateSummary');
        
        switch (duplicateCheckState) {
            case 'pending':
                statusElement.className = 'fas fa-question-circle text-secondary me-2';
                summaryElement.textContent = 'No verificado';
                break;
            case 'checking':
                statusElement.className = 'fas fa-spinner fa-spin text-warning me-2';
                summaryElement.textContent = 'Verificando...';
                break;
            case 'clear':
                statusElement.className = 'fas fa-check-circle text-success me-2';
                summaryElement.textContent = 'Sin duplicados';
                break;
            case 'duplicate':
                statusElement.className = 'fas fa-times-circle text-danger me-2';
                summaryElement.textContent = 'Duplicado detectado';
                break;
        }
        
        updateSubmitButton();
    }

    function updateSubmitButton() {
        const allValid = validateAllFields();
        submitBtn.disabled = !(allValid && duplicateCheckState === 'clear');
    }

    function updateValidationSummary(field, isValid, message) {
        const statusElement = document.getElementById(`${field}Status`);
        const summaryElement = document.getElementById(`${field}Summary`);
        
        statusElement.className = isValid ? 
            'fas fa-check-circle text-success me-2' : 
            'fas fa-times-circle text-danger me-2';
        
        summaryElement.textContent = message;
    }

    function showError(element, errorElement, message) {
        element.classList.remove('is-valid');
        element.classList.add('is-invalid');
        
        if (errorElement && message) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function showSuccess(element, errorElement) {
        element.classList.remove('is-invalid');
        element.classList.add('is-valid');
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    function clearValidation(element, errorElement) {
        element.classList.remove('is-valid', 'is-invalid');
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    function showRedirectMessage(message, redirectUrl) {
        const modal = new bootstrap.Modal(document.getElementById('redirectModal'));
        const messageElement = document.getElementById('redirectMessage');
        const countdownElement = document.getElementById('redirectCountdown');
        
        messageElement.textContent = message;
        
        let countdown = 5;
        countdownElement.textContent = countdown;
        
        const interval = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(interval);
                modal.hide();
                window.location.href = redirectUrl;
            }
        }, 1000);
        
        const progressBar = document.getElementById('redirectProgress');
        let progress = 100;
        
        const progressInterval = setInterval(() => {
            progress -= 20;
            progressBar.style.width = `${progress}%`;
            
            if (progress <= 0) {
                clearInterval(progressInterval);
            }
        }, 1000);
        
        modal.show();
    }

    function showSuccessAlert() {
        const alert = document.getElementById('successAlert');
        alert.classList.remove('d-none');
        
        setTimeout(() => {
            alert.classList.add('d-none');
        }, 5000);
    }

    // Actualizar resumen inicial
    updateValidationSummary('title', false, 'No validado');
    updateValidationSummary('authors', false, 'No validado');
    updateValidationSummary('categories', false, 'No validado');
    updateDuplicateStatus();
});