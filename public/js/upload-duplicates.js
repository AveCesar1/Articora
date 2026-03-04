// upload-duplicates.js - Verificación de duplicados con endpoints reales y modales

// Estado global
let duplicateCheckState = 'pending'; // pending, checking, clear, duplicate
let titleCheckPassed = false;
let authorsCheckPassed = false;
let editionCheckPassed = false;
let currentDuplicateSource = null; // Para redirigir si el usuario confirma
let authorsDebounceTimer = null;
let lastAuthorsString = ''; // Para evitar llamadas repetidas con el mismo valor
let redirectInterval = null;
let titleBlurTimer = null;

let checkAuthorsTimeout = null; // Para debounce

function isElementActive(element){
    return document.activeElement === document.getElementById(element)
}

// Elementos del DOM (modales)
const duplicateModalEl = document.getElementById('duplicateModal');
const redirectModalEl = document.getElementById('redirectModal');
let duplicateModal, redirectModal;

if (duplicateModalEl) duplicateModal = new bootstrap.Modal(duplicateModalEl);
if (redirectModalEl) redirectModal = new bootstrap.Modal(redirectModalEl);

// ----------------------------------------------------------------------
// Verificación al salir del campo Título (RQF56)
// ----------------------------------------------------------------------
async function checkTitleDuplicates(title) {
    if (!title || title.length < 3) return;
    if (!isElementActive('title') && titleCheckPassed) return; // Ya verificada y sin duplicados confirmados
    if (isElementActive('title')){ // !title.isBlur()
        return;
    }

    try {
        const response = await fetch(`/api/check-duplicate-title?title=${encodeURIComponent(title)}`);
        const data = await response.json();

        if (data.duplicado && data.fuentes?.length > 0) {
            showDuplicateModal(
                '¿Es su fuente alguna de estas?',
                data.fuentes,
                (sourceId) => {
                    // Usuario confirma que SÍ es duplicado
                    duplicateCheckState = 'duplicate';
                    currentDuplicateSource = sourceId;
                    updateDuplicateStatus();
                    redirectToSource(sourceId, 'duplicado');
                },
                () => {
                    // Usuario dice que NO es duplicado
                    titleCheckPassed = true;
                    updateOverallState();
                }
            );
        } else {
            // No hay duplicados por título
            titleCheckPassed = true;
            updateOverallState();
        }
    } catch (error) {
        console.error('Error en checkTitleDuplicates:', error);
        titleCheckPassed = true; // Para no bloquear el flujo
        updateOverallState();
    }
}

// ----------------------------------------------------------------------
// Verificación al salir del campo Autores con debounce (RQF59)
// ----------------------------------------------------------------------
async function checkTitleAuthorDuplicatesWithString(authorsString) {
    const title = document.getElementById('title')?.value.trim();
    if (!title || !authorsString || titleCheckPassed === false) return;
    if (authorsCheckPassed) return;

    try {
        const response = await fetch(`/api/check-duplicate-title-authors?title=${encodeURIComponent(title)}&authors=${encodeURIComponent(authorsString)}`);
        const data = await response.json();

        if (data.duplicado && data.fuentes?.length > 0) {
            showDuplicateModal(
                data.mensaje || `Ya existen registros titulados "${title}" del autor(es) ${authorsString}. ¿Corresponde a alguna de estas ediciones?`,
                data.fuentes,
                (sourceId) => {
                    duplicateCheckState = 'duplicate';
                    currentDuplicateSource = sourceId;
                    updateDuplicateStatus();
                    redirectToSource(sourceId, 'duplicado');
                },
                () => {
                    authorsCheckPassed = true;
                    updateOverallState();
                }
            );
        } else {
            authorsCheckPassed = true;
            updateOverallState();
        }
    } catch (error) {
        console.error('Error en checkTitleAuthorDuplicates:', error);
        authorsCheckPassed = true;
        updateOverallState();
    }
}

// Verificación (sin parámetro) para compatibilidad con llamadas externas
async function checkTitleAuthorDuplicates() {
    const authors = getAuthorsString();
    await checkTitleAuthorDuplicatesWithString(authors);
}

// ----------------------------------------------------------------------
// Configurar debounce en los campos de autor
// ----------------------------------------------------------------------
function setupAuthorsDuplicateCheck() {
    const container = document.getElementById('authorsContainer');
    if (!container) return;

    // Escuchamos el evento blur en el contenedor, pero solo cuando el target es un campo de autor
    container.addEventListener('blur', (e) => {
        if (e.target.classList.contains('author-input')) {
            // Reiniciamos el timer cada vez que un campo pierde el foco
            if (authorsDebounceTimer) clearTimeout(authorsDebounceTimer);
            
            authorsDebounceTimer = setTimeout(() => {
                const authors = getAuthorsString();
                
                // Condiciones para evitar llamadas innecesarias:
                // 1. El string de autores debe tener al menos 3 caracteres (para evitar "V", "Ve")
                // 2. No debe ser igual al último string verificado
                if (authors.length < 3) return;
                if (authors === lastAuthorsString) return;
                
                lastAuthorsString = authors;
                
                const title = document.getElementById('title')?.value.trim();
                // Solo procedemos si el título ya fue verificado y no hay duplicado previo
                if (title && titleCheckPassed) {
                    checkTitleAuthorDuplicatesWithString(authors);
                }
            }, 1500); // 1.5 segundos de espera después del último blur
        }
    }, true); // Usamos captura para asegurar que el evento se capture antes de la burbuja
}

// ----------------------------------------------------------------------
// Verificación al salir del campo Edición (RQF60) – duplicado exacto
// ----------------------------------------------------------------------
async function checkExactDuplicate() {
    const title = document.getElementById('title')?.value.trim();
    const authors = getAuthorsString();
    const edition = document.getElementById('edition')?.value.trim();
    if (!title || !authors || !edition || titleCheckPassed === false || authorsCheckPassed === false) return;
    if (editionCheckPassed) return;

    try {
        const response = await fetch(`/api/check-exact-duplicate?title=${encodeURIComponent(title)}&authors=${encodeURIComponent(authors)}&edition=${encodeURIComponent(edition)}`);
        const data = await response.json();

        if (data.duplicado && data.exacto) {
            // Coincidencia exacta: se bloquea la creación y se redirige (RQF60)
            duplicateCheckState = 'duplicate';
            updateDuplicateStatus();
            redirectToSource(data.fuente.id, 'exacto');
        } else {
            editionCheckPassed = true;
            updateOverallState();
        }
    } catch (error) {
        console.error('Error en checkExactDuplicate:', error);
        editionCheckPassed = true;
        updateOverallState();
    }
}

// ----------------------------------------------------------------------
// Verificación manual con el botón "Verificar duplicados"
// ----------------------------------------------------------------------
async function performDuplicateCheck() {
    duplicateCheckState = 'checking';
    updateDuplicateStatus();

    // Reiniciamos estados para forzar una verificación completa
    titleCheckPassed = false;
    authorsCheckPassed = false;
    editionCheckPassed = false;

    const title = document.getElementById('title')?.value.trim();
    const authors = getAuthorsString();
    const edition = document.getElementById('edition')?.value.trim();

    if (title) await checkTitleDuplicates(title);
    if (title && authors) await checkTitleAuthorDuplicates();
    if (title && authors && edition) await checkExactDuplicate();

    updateOverallState();
}

// ----------------------------------------------------------------------
// Funciones auxiliares
// ----------------------------------------------------------------------
function getAuthorsString() {
    const authorInputs = document.querySelectorAll('.author-input');
    return Array.from(authorInputs)
        .map(input => input.value.trim())
        .filter(Boolean)
        .join('; ');
}

function updateDuplicateStatus() {
    const statusElement = document.getElementById('duplicateStatus');
    const summaryElement = document.getElementById('duplicateSummary');
    if (!statusElement || !summaryElement) return;

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

    if (typeof window.updateSubmitButtonFromDuplicate === 'function') {
        window.updateSubmitButtonFromDuplicate();
    }
}

function updateOverallState() {
    if (duplicateCheckState === 'duplicate') return;

    if (titleCheckPassed && authorsCheckPassed && editionCheckPassed) {
        duplicateCheckState = 'clear';
    } else {
        duplicateCheckState = 'pending';
    }
    updateDuplicateStatus();
}

// ----------------------------------------------------------------------
// Mostrar modal de duplicados con lista de fuentes
// ----------------------------------------------------------------------
function showDuplicateModal(message, fuentes, onConfirm, onDeny) {
    const modalTitle = document.getElementById('duplicateModalTitle');
    const modalContent = document.getElementById('duplicateModalContent');
    if (!modalTitle || !modalContent) return;

    modalTitle.innerHTML = `<i class="fas fa-exclamation-triangle me-2 text-warning"></i> ${message}`;

    let html = '<ul class="list-group">';
    fuentes.forEach(f => {
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${f.titulo || f.title}</strong><br> 
                        <small>Autores: ${f.autores || f.authors || 'Desconocido'}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary select-duplicate" data-id="${f.id}">Seleccionar</button>
                </li>`;
    });
    html += '</ul><p class="mt-3 mb-0 text-muted">Si ninguna coincide, haga clic en "No, es una fuente diferente".</p>';

    modalContent.innerHTML = html;

    const confirmBtn = document.getElementById('confirmNotDuplicate');
    const duplicateBtn = document.getElementById('confirmDuplicate');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newDuplicateBtn = duplicateBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    duplicateBtn.parentNode.replaceChild(newDuplicateBtn, duplicateBtn);

    newConfirmBtn.addEventListener('click', () => {
        duplicateModal.hide();
        onDeny();
    });

    newDuplicateBtn.addEventListener('click', () => {
        const firstSourceId = fuentes[0]?.id;
        if (firstSourceId) {
            duplicateModal.hide();
            onConfirm(firstSourceId);
        } else {
            duplicateModal.hide();
        }
    });

    modalContent.querySelectorAll('.select-duplicate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sourceId = e.target.getAttribute('data-id');
            duplicateModal.hide();
            onConfirm(sourceId);
        });
    });

    duplicateModal.show();
}

// ----------------------------------------------------------------------
// Mostrar modal de redirección con cuenta regresiva (RQF64-66)
// ----------------------------------------------------------------------
function redirectToSource(sourceId, tipo) {
    // Limpiar intervalo anterior si existe
    if (redirectInterval) {
        clearInterval(redirectInterval);
        redirectInterval = null;
    }

    const messageElement = document.getElementById('redirectMessage');
    const countdownElement = document.getElementById('redirectCountdown');
    const progressBar = document.getElementById('redirectProgress');

    let mensaje = '';
    if (tipo === 'duplicado') {
        mensaje = 'Esta fuente ya existe. Será redirigido a la ficha existente en 5 segundos.';
    } else if (tipo === 'exacto') {
        mensaje = 'Coincidencia exacta. Será redirigido a la fuente existente en 5 segundos.';
    } else if (tipo === 'url_nueva') {
        mensaje = 'Se ha añadido un nuevo enlace a esta fuente. Será redirigido en 5 segundos.';
    }
    messageElement.textContent = mensaje;

    let countdown = 5;
    countdownElement.textContent = countdown;
    progressBar.style.width = '100%';
    progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger'); // opcional

    // Mostrar modal
    redirectModal.show();

    const startTime = Date.now();
    const duration = 5000; // 5 segundos

    redirectInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const secondsRemaining = Math.ceil(remaining / 1000);
        countdownElement.textContent = secondsRemaining;

        const percent = (remaining / duration) * 100;
        progressBar.style.width = percent + '%';

        if (remaining <= 0) {
            clearInterval(redirectInterval);
            redirectInterval = null;
            redirectModal.hide();
            window.location.href = `/post/${sourceId}`;
        }
    }, 100);
}

// ----------------------------------------------------------------------
// Inicialización cuando el DOM está listo
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // Configurar debounce para autores
    setupAuthorsDuplicateCheck();

    const editionInput = document.getElementById('edition');
    if (editionInput) {
        editionInput.addEventListener('blur', function() {
            if (this.value.trim()) {
                checkExactDuplicate();
            }
        });
    }

    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn) {
        validateBtn.addEventListener('click', performDuplicateCheck);
    }
});

// Exponer funciones globales
window.checkTitleDuplicates = checkTitleDuplicates;
window.checkTitleAuthorDuplicates = checkTitleAuthorDuplicates; // la versión sin parámetro
window.checkExactDuplicate = checkExactDuplicate;
window.performDuplicateCheck = performDuplicateCheck;
window.updateDuplicateStatus = updateDuplicateStatus;
window.redirectToSource = redirectToSource;