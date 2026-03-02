// upload.js - Lógica principal del formulario de subida (validación, autocompletado, categorías, etc.)

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
    
    // Estados de validación (los flags de duplicados están en upload-duplicates.js)
    let isTitleChecked = false;
    let isAuthorsChecked = false;
    let isEditionChecked = false;
    
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
        document.getElementById('title').addEventListener('input', updateTitleCounter);
        document.getElementById('publisher').addEventListener('input', updatePublisherCounter);
        
        setupRealTimeValidation();
        setupAutocomplete();
        
        sourceType.addEventListener('change', handleSourceTypeChange);
        
        validateBtn.addEventListener('click', performDuplicateCheck); // función global desde upload-duplicates.js
        form.addEventListener('submit', handleFormSubmit);
        
        handleSourceTypeChange();
        setupCategorySelection();
        
        updateFormProgress();
    }

    // ==================== MANEJO DE CAMPOS DEPENDIENTES DEL TIPO ====================
    function handleSourceTypeChange() {
        // (código idéntico al original, sin cambios)
        const type = sourceType.value;
        const editionRequiredSpan = document.getElementById('editionRequired');
        const publisherRequiredSpan = document.getElementById('publisherRequired');
        const keywordsRequiredSpan = document.getElementById('keywordsRequired');
        const publisherHelp = document.getElementById('publisherHelp');
        const editionInput = document.getElementById('edition');
        const publisherInput = document.getElementById('publisher');
        const keywordsInput = document.getElementById('keywords');

        editionRequiredSpan.classList.add('d-none');
        publisherRequiredSpan.classList.add('d-none');
        keywordsRequiredSpan.classList.add('d-none');

        publisherHelp.innerHTML = 'Nombre de la revista (para artículos) o editorial (para libros). <div class="autocomplete-hint" id="publisherAutocomplete"></div>';
        editionInput.placeholder = 'Ej: 1';
        publisherInput.placeholder = 'Nombre de la revista o editorial';
        keywordsInput.placeholder = 'Separadas por comas, ej: cognición, memoria, aprendizaje';

        if (type === 'book') {
            editionRequiredSpan.classList.remove('d-none');
            publisherRequiredSpan.classList.remove('d-none');
            publisherHelp.innerHTML = 'Editorial (obligatorio para libros). <div class="autocomplete-hint" id="publisherAutocomplete"></div>';
            editionInput.placeholder = 'Obligatorio';
            publisherInput.placeholder = 'Obligatorio';
        } else if (type === 'paper' || type === 'preprint' || type === 'proceedings') {
            publisherRequiredSpan.classList.remove('d-none');
            keywordsRequiredSpan.classList.remove('d-none');
            publisherHelp.innerHTML = 'Revista (obligatorio para artículos). <div class="autocomplete-hint" id="publisherAutocomplete"></div>';
            publisherInput.placeholder = 'Obligatorio';
            keywordsInput.placeholder = 'Mínimo 3 palabras clave';
        }

        if (type) {
            validatePublisher();
            validateEdition();
            validateKeywords();
        }
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
        const titleInput = document.getElementById('title');
        titleInput.addEventListener('blur', validateTitle);
        titleInput.addEventListener('input', function() {
            isTitleChecked = false;
            // Reiniciar estado de duplicados al modificar el título
            duplicateCheckState = 'pending';
            updateDuplicateStatus();
        });
        
        setupAuthorsValidation();
        
        document.getElementById('year').addEventListener('blur', validateYear);
        document.getElementById('publisher').addEventListener('blur', validatePublisher);
        document.getElementById('edition').addEventListener('blur', validateEdition);
        document.getElementById('pages').addEventListener('blur', validatePages);
        document.getElementById('doi').addEventListener('blur', validateDOI);
        setupUrlsValidation();
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
        
        if (isTitleChecked && value.length > 3) {
            checkTitleDuplicates(value); // función global desde upload-duplicates.js
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

    function validatePublisher() {
        const publisherInput = document.getElementById('publisher');
        const errorElement = document.getElementById('publisherError');
        const value = publisherInput.value.trim();
        const type = sourceType.value;
        
        const required = (type === 'book' || type === 'paper' || type === 'preprint' || type === 'proceedings');
        
        if (required && !value) {
            showError(publisherInput, errorElement, 'Este campo es obligatorio para el tipo de fuente seleccionado.');
            return false;
        }
        if (value && value.length > 300) {
            showError(publisherInput, errorElement, 'Máximo 300 caracteres.');
            return false;
        }
        showSuccess(publisherInput, errorElement);
        return true;
    }

    function validateEdition() {
        const editionInput = document.getElementById('edition');
        const errorElement = document.getElementById('editionError');
        const value = editionInput.value.trim();
        const type = sourceType.value;
        
        const required = (type === 'book');
        
        if (required && !value) {
            showError(editionInput, errorElement, 'La edición es obligatoria para libros.');
            return false;
        }
        if (value) {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 1) {
                showError(editionInput, errorElement, 'La edición debe ser un número entero positivo.');
                return false;
            }
            
            if (isTitleChecked && isAuthorsChecked && value) {
                checkExactDuplicate(isTitleChecked, isAuthorsChecked); // función global con flags
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
        const pageRegex = /^(\d+)(-\d+)?$/;
        if (!pageRegex.test(value)) {
            showError(pagesInput, errorElement, 'Formato inválido. Use "10-25" para rangos o "10" para página única.');
            return false;
        }
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
        const type = sourceType.value;
        
        const requiresKeywords = ['paper', 'preprint', 'proceedings'].includes(type);
        
        if (requiresKeywords) {
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
        } else {
            if (value) {
                const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
                if (keywords.length > 10) {
                    showError(keywordsInput, errorElement, 'Máximo 10 palabras clave permitidas.');
                    return false;
                }
            }
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
        setupAuthorAutocomplete(newField.querySelector('.author-input'));
        newField.querySelector('.author-input').addEventListener('blur', validateAuthors);
        updateFormProgress();
    };

    window.removeAuthorField = function(button) {
        const field = button.closest('.author-field');
        const container = document.getElementById('authorsContainer');
        const fields = container.querySelectorAll('.author-field');
        if (fields.length > 1) {
            field.remove();
            container.querySelectorAll('.author-field').forEach((field, index) => {
                field.querySelector('.author-input').dataset.index = index;
            });
            validateAuthors();
            updateFormProgress();
        }
    };

    function setupAuthorsValidation() {
        document.getElementById('authorsContainer').addEventListener('input', function() {
            isAuthorsChecked = false;
            duplicateCheckState = 'pending';
            updateDuplicateStatus();
        });
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
        
        // if (isTitleChecked && isAuthorsChecked) {
            // checkTitleAuthorDuplicates(); // función global desde upload-duplicates.js
        // }
        return true;
    }

    // ==================== URLs DINÁMICAS ====================
    window.addUrlField = function() {
        const container = document.getElementById('urlsContainer');
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
        newField.querySelector('.url-input').addEventListener('blur', validateUrls);
        updateFormProgress();
    };

    window.removeUrlField = function(button) {
        const field = button.closest('.url-field');
        if (field.querySelector('.input-group-text').textContent !== 'Primaria') {
            field.remove();
            validateUrls();
            updateFormProgress();
        }
    };

    function setupUrlsValidation() {
        document.getElementById('urlsContainer').addEventListener('input', validateUrls);
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
                    subcatContainer.querySelectorAll('.subcategory-checkbox').forEach(sub => {
                        sub.checked = false;
                    });
                    subcatContainer.style.display = 'none';
                }
                validateCategories();
                updateFormProgress();
            });
        });
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

    // ==================== AUTOCOMPLETADO ====================
    function setupAutocomplete() {
        setupFieldAutocomplete('title', 'titleAutocomplete');
        const firstAuthor = document.querySelector('.author-input');
        if (firstAuthor) {
            setupAuthorAutocomplete(firstAuthor);
        }
        setupFieldAutocomplete('publisher', 'publisherAutocomplete');
        setupKeywordsAutocomplete();
    }

    function setupFieldAutocomplete(fieldId, hintId) {
        const field = document.getElementById(fieldId);
        const hint = document.getElementById(hintId);
        if (!field || !hint) return;
        let currentSuggestion = '';
        field.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const suggestions = dictionaries[fieldId];
            if (value.length < 2 || !suggestions) {
                currentSuggestion = '';
                hint.classList.remove('active');
                return;
            }
            const match = suggestions.find(s => s.toLowerCase().startsWith(value));
            if (match) {
                hint.textContent = match;
                hint.classList.add('active');
                currentSuggestion = match;
            } else {
                currentSuggestion = '';
                hint.classList.remove('active');
            }
        });
        field.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && currentSuggestion) {
                e.preventDefault();
                this.value = currentSuggestion;
                hint.classList.remove('active');
                currentSuggestion = '';
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        field.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 150);
        });
    }

    function setupAuthorAutocomplete(input) {
        const hint = document.getElementById('authorAutocomplete');
        if (!input || !hint) return;
        let currentSuggestion = '';
        input.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const suggestions = dictionaries.author;
            if (value.length < 2) {
                currentSuggestion = '';
                hint.classList.remove('active');
                return;
            }
            const match = suggestions.find(s => s.toLowerCase().startsWith(value));
            if (match) {
                hint.textContent = match;
                hint.classList.add('active');
                currentSuggestion = match;
                hint.dataset.targetInput = this.dataset.index || '';
            } else {
                currentSuggestion = '';
                hint.classList.remove('active');
            }
        });
        input.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && currentSuggestion) {
                e.preventDefault();
                this.value = currentSuggestion;
                hint.classList.remove('active');
                currentSuggestion = '';
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        input.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 150);
        });
    }

    function setupKeywordsAutocomplete() {
        const field = document.getElementById('keywords');
        const hint = document.getElementById('keywordsAutocomplete');
        if (!field || !hint) return;
        let currentSuggestion = '';
        field.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            const lastComma = value.lastIndexOf(',');
            const currentWord = lastComma === -1 ? value.trim() : value.substring(lastComma + 1).trim();
            if (currentWord.length < 2) {
                currentSuggestion = '';
                hint.classList.remove('active');
                return;
            }
            const match = dictionaries.keywords.find(k => k.toLowerCase().startsWith(currentWord));
            if (match) {
                hint.textContent = match;
                hint.classList.add('active');
                currentSuggestion = match;
            } else {
                currentSuggestion = '';
                hint.classList.remove('active');
            }
        });
        field.addEventListener('keydown', function(e) {
            if ((e.key === 'Tab' || e.key === 'Enter') && currentSuggestion) {
                e.preventDefault();
                const value = this.value;
                const lastComma = value.lastIndexOf(',');
                if (lastComma === -1) {
                    this.value = matchCaseAppend(value, currentSuggestion);
                } else {
                    this.value = value.substring(0, lastComma + 1) + ' ' + currentSuggestion;
                }
                hint.classList.remove('active');
                currentSuggestion = '';
                this.dispatchEvent(new Event('input'));
            }
        });
        field.addEventListener('blur', function() {
            setTimeout(() => hint.classList.remove('active'), 150);
        });
        function matchCaseAppend(current, suggestion) {
            if (!current) return suggestion;
            const firstChar = current[0];
            if (firstChar === firstChar.toUpperCase()) {
                return suggestion.replace(/^./, c => c.toUpperCase());
            }
            return suggestion;
        }
    }

    // ==================== MANEJO DEL ENVÍO ====================
    async function handleFormSubmit(e) {
        e.preventDefault();

        if (!validateAllFields()) {
            alert('Por favor, corrija los errores en el formulario.');
            return;
        }

        if (duplicateCheckState !== 'clear') {
            alert('Debe verificar los duplicados antes de enviar.');
            return;
        }

        const payload = {};
        payload.title = sanitizeForSend(document.getElementById('title').value);
        payload.sourceType = document.getElementById('sourceType').value;
        payload.year = document.getElementById('year').value;
        payload.publisher = document.getElementById('publisher').value;
        payload.edition = document.getElementById('edition').value;
        payload.pages = document.getElementById('pages').value;
        payload.doi = document.getElementById('doi').value;
        payload.volume = document.getElementById('volume').value;
        payload.number = document.getElementById('number').value;

        payload.authors = Array.from(document.querySelectorAll('.author-input'))
            .map(i => i.value.trim())
            .filter(Boolean);

        payload.keywords = document.getElementById('keywords').value.split(',').map(k => k.trim()).filter(Boolean);

        const urlInputs = Array.from(document.querySelectorAll('.url-input'));
        const primaryUrlInput = urlInputs.find(i => i.dataset.type === 'primary') || urlInputs[0];
        payload.primary_url = primaryUrlInput ? primaryUrlInput.value.trim() : '';

        const selectedCategory = document.querySelector('.category-checkbox:checked');
        const selectedSubcategory = document.querySelector('.subcategory-checkbox:checked');
        payload.category_id = selectedCategory ? parseInt(selectedCategory.value, 10) : null;
        payload.subcategory_id = selectedSubcategory ? parseInt(selectedSubcategory.value, 10) : null;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Subiendo...';

        try {
            const res = await fetch('/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });

            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }

            const data = await res.json();

            // Si el servidor indica que debe redirigir (duplicado o URL nueva)
            if (data.redirect) {
                if (typeof window.redirectToSource === 'function') {
                    window.redirectToSource(data.sourceId, data.messageType || 'duplicado');
                }
                return;
            }

            if (!data || !data.success) {
                const msg = data && data.message ? data.message : 'Error al subir la fuente.';
                alert(msg);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt me-2"></i> Subir fuente';
                return;
            }

            // Éxito: mostrar alerta y redirigir (como ya tenías)
            showSuccessAlert();
            setTimeout(() => {
                window.location.href = `/post/${data.sourceId}`;
            }, 1000);
        } catch (err) {
            console.error('Upload error', err);
            alert('Ocurrió un error al comunicarse con el servidor. Intente nuevamente.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt me-2"></i> Subir fuente';
        }
    }

    function sanitizeForSend(s) {
        return (s || '').replace(/\u0000/g, '').trim();
    }

    // ==================== UTILIDADES ====================
    function validateAllFields() {
        let isValid = true;
        if (!validateTitle()) isValid = false;
        if (!validateAuthors()) isValid = false;
        if (!validateYear()) isValid = false;
        if (!validatePublisher()) isValid = false;
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

    function updateSubmitButton() {
        const allValid = validateAllFields();
        submitBtn.disabled = !(allValid && duplicateCheckState === 'clear');
    }

    // Exponer función para que el gestor de duplicados pueda actualizar el botón
    window.updateSubmitButtonFromDuplicate = function() {
        updateSubmitButton();
    };

    // También exponer updateFormProgress para que el gestor pueda llamarlo si es necesario
    window.updateFormProgress = updateFormProgress;

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
    updateDuplicateStatus(); // función global desde upload-duplicates.js
});