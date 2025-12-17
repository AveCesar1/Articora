document.addEventListener('DOMContentLoaded', function() {
    // Estado del panel de administración
    const state = {
        manualReports: window.manualReports || [],
        systemReports: window.systemReports || [],
        selectedReports: new Set(),
        filters: {
            type: 'all',
            priority: 'all',
            status: 'pending'
        }
    };

    // Elementos DOM
    const elements = {
        filterReports: document.getElementById('filterReports'),
        refreshData: document.getElementById('refreshData'),
        bulkActions: document.getElementById('bulkActions'),
        exportManualReports: document.getElementById('exportManualReports'),
        exportSystemReports: document.getElementById('exportSystemReports'),
        runSystemChecks: document.getElementById('runSystemChecks'),
        saveSystemConfig: document.getElementById('saveSystemConfig'),
        viewDetailedStats: document.getElementById('viewDetailedStats'),
        scanDuplicates: document.getElementById('scanDuplicates'),
        viewUserManagement: document.getElementById('viewUserManagement'),
        viewVerificationQueue: document.getElementById('viewVerificationQueue'),
        viewSuspendedUsers: document.getElementById('viewSuspendedUsers'),
        offensiveDict: document.getElementById('offensiveDict'),
        equivalentDomains: document.getElementById('equivalentDomains')
    };

    // Inicialización
    function init() {
        setupEventListeners();
        initializeSystemConfig();
        updateReportCounts();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Botones principales
        elements.filterReports.addEventListener('click', showFilterModal);
        elements.refreshData.addEventListener('click', refreshData);
        elements.bulkActions.addEventListener('click', showBulkActionsModal);

        // Exportación
        elements.exportManualReports.addEventListener('click', exportManualReports);
        elements.exportSystemReports.addEventListener('click', exportSystemReports);

        // Verificaciones del sistema
        elements.runSystemChecks.addEventListener('click', runSystemChecks);
        elements.saveSystemConfig.addEventListener('click', saveSystemConfig);
        elements.viewDetailedStats.addEventListener('click', viewDetailedStats);

        // Herramientas
        elements.scanDuplicates.addEventListener('click', scanDuplicates);
        elements.viewUserManagement.addEventListener('click', viewUserManagement);
        elements.viewVerificationQueue.addEventListener('click', viewVerificationQueue);
        elements.viewSuspendedUsers.addEventListener('click', viewSuspendedUsers);

        // Delegación de eventos para reportes
        document.addEventListener('click', function(e) {
            // Resolver reporte manual
            if (e.target.closest('.resolve-report')) {
                const reportId = parseInt(e.target.closest('.resolve-report').dataset.reportId);
                resolveManualReport(reportId);
            }

            // Rechazar reporte manual
            if (e.target.closest('.reject-report')) {
                const reportId = parseInt(e.target.closest('.reject-report').dataset.reportId);
                rejectManualReport(reportId);
            }

            // Resolver reporte automático
            if (e.target.closest('.resolve-system-report')) {
                const reportId = parseInt(e.target.closest('.resolve-system-report').dataset.reportId);
                resolveSystemReport(reportId);
            }

            // Ignorar reporte automático
            if (e.target.closest('.ignore-system-report')) {
                const reportId = parseInt(e.target.closest('.ignore-system-report').dataset.reportId);
                ignoreSystemReport(reportId);
            }

            // Reparar URL
            if (e.target.closest('.fix-url')) {
                const reportId = parseInt(e.target.closest('.fix-url').dataset.reportId);
                fixBrokenUrl(reportId);
            }
        });
    }

    // Inicializar configuración del sistema
    function initializeSystemConfig() {
        // Cargar configuración existente (simulación)
        const offensiveWords = "idiota,estúpido,imbécil,tonto,inútil";
        const equivalentDomains = "amazon.com,amazon.co.uk,amazon.de,a.com,researchgate.net,arxiv.org";
        
        if (elements.offensiveDict) {
            elements.offensiveDict.value = offensiveWords;
        }
        
        if (elements.equivalentDomains) {
            elements.equivalentDomains.value = equivalentDomains;
        }
    }

    // Funciones para reportes manuales
    function resolveManualReport(reportId) {
        const report = state.manualReports.find(r => r.id === reportId);
        if (!report) return;

        if (confirm(`¿Marcar el reporte #${reportId} como resuelto?`)) {
            // En un sistema real, aquí se haría una petición al servidor
            report.status = 'resuelto';
            
            // Actualizar UI
            const row = document.querySelector(`.report-row[data-report-id="${reportId}"]`);
            if (row) {
                row.remove();
                updateReportCounts();
                showToast(`Reporte #${reportId} marcado como resuelto`, 'success');
            }
        }
    }

    function rejectManualReport(reportId) {
        const report = state.manualReports.find(r => r.id === reportId);
        if (!report) return;

        if (confirm(`¿Rechazar el reporte #${reportId}?`)) {
            // En un sistema real, aquí se haría una petición al servidor
            report.status = 'rechazado';
            
            // Actualizar UI
            const row = document.querySelector(`.report-row[data-report-id="${reportId}"]`);
            if (row) {
                row.remove();
                updateReportCounts();
                showToast(`Reporte #${reportId} rechazado`, 'info');
            }
        }
    }

    // Funciones para reportes automáticos
    function resolveSystemReport(reportId) {
        const report = state.systemReports.find(r => r.id === reportId);
        if (!report) return;

        if (confirm(`¿Marcar el reporte automático #${reportId} como resuelto?`)) {
            report.status = 'resuelto';
            
            const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
            if (row) {
                row.remove();
                updateReportCounts();
                showToast(`Reporte automático #${reportId} resuelto`, 'success');
            }
        }
    }

    function ignoreSystemReport(reportId) {
        const report = state.systemReports.find(r => r.id === reportId);
        if (!report) return;

        if (confirm(`¿Ignorar el reporte automático #${reportId}?`)) {
            report.status = 'ignorado';
            
            const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
            if (row) {
                row.remove();
                updateReportCounts();
                showToast(`Reporte automático #${reportId} ignorado`, 'warning');
            }
        }
    }

    function fixBrokenUrl(reportId) {
        const report = state.systemReports.find(r => r.id === reportId);
        if (!report || report.type !== 'broken-url') return;

        if (confirm(`¿Marcar la URL como reparada para el reporte #${reportId}?`)) {
            // En un sistema real, aquí se verificaría si la URL ya funciona
            report.status = 'reparado';
            
            const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
            if (row) {
                row.remove();
                updateReportCounts();
                showToast(`URL marcada como reparada para el reporte #${reportId}`, 'success');
            }
        }
    }

    // Funciones de herramientas del sistema
    function showFilterModal() {
        // Simulación de modal de filtros
        const filterOptions = `
            <div class="row">
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Tipo de reporte</label>
                    <select class="form-select form-select-sm">
                        <option value="all">Todos los tipos</option>
                        <option value="source">Fuentes</option>
                        <option value="user">Usuarios</option>
                        <option value="comment">Comentarios</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Prioridad</label>
                    <select class="form-select form-select-sm">
                        <option value="all">Todas</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">Estado</label>
                    <select class="form-select form-select-sm">
                        <option value="pending">Pendientes</option>
                        <option value="all">Todos</option>
                        <option value="resolved">Resueltos</option>
                    </select>
                </div>
            </div>
        `;

        showCustomModal('Filtrar Reportes', filterOptions, 'Aplicar Filtros', 'secondary', () => {
            showToast('Filtros aplicados', 'success');
        });
    }

    function refreshData() {
        showToast('Actualizando datos...', 'info');
        
        // Simulación de actualización
        setTimeout(() => {
            showToast('Datos actualizados correctamente', 'success');
            updateReportCounts();
        }, 1000);
    }

    function showBulkActionsModal() {
        const selectedCount = state.selectedReports.size;
        
        if (selectedCount === 0) {
            showToast('Selecciona al menos un reporte para acciones masivas', 'warning');
            return;
        }

        const actions = `
            <div class="mb-3">
                <p class="small text-muted">${selectedCount} reporte(s) seleccionado(s)</p>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-outline-success" id="bulkResolve">
                    <i class="fas fa-check me-1"></i> Marcar como resueltos
                </button>
                <button class="btn btn-outline-danger" id="bulkReject">
                    <i class="fas fa-times me-1"></i> Rechazar seleccionados
                </button>
                <button class="btn btn-outline-warning" id="bulkAssign">
                    <i class="fas fa-user-tag me-1"></i> Asignar a moderador
                </button>
            </div>
        `;

        showCustomModal('Acciones Masivas', actions, 'Cancelar', 'secondary');
    }

    function exportManualReports() {
        showToast('Exportando reportes manuales...', 'info');
        
        // Simulación de exportación
        setTimeout(() => {
            showToast('Reportes exportados como CSV', 'success');
        }, 1500);
    }

    function exportSystemReports() {
        showToast('Exportando reportes automáticos...', 'info');
        
        // Simulación de exportación
        setTimeout(() => {
            showToast('Reportes exportados como JSON', 'success');
        }, 1500);
    }

    function runSystemChecks() {
        showToast('Ejecutando verificaciones del sistema...', 'info');
        
        // Simulación de ejecución
        setTimeout(() => {
            const newReports = 2;
            showToast(`Verificaciones completadas. ${newReports} nuevo(s) reporte(s) encontrado(s)`, 'success');
        }, 2000);
    }

    function saveSystemConfig() {
        const offensiveWords = elements.offensiveDict.value.trim();
        const domains = elements.equivalentDomains.value.trim();
        
        if (!offensiveWords || !domains) {
            showToast('Completa todos los campos de configuración', 'warning');
            return;
        }

        // En un sistema real, aquí se enviaría al servidor
        showToast('Guardando configuración...', 'info');
        
        setTimeout(() => {
            showToast('Configuración guardada correctamente', 'success');
        }, 1000);
    }

    function viewDetailedStats() {
        // Redirección a estadísticas detalladas (simulación)
        showToast('Cargando estadísticas detalladas...', 'info');
        setTimeout(() => {
            // En un sistema real, aquí se abriría una nueva vista
            showToast('Funcionalidad en desarrollo', 'warning');
        }, 500);
    }

    function scanDuplicates() {
        showToast('Escaneando duplicados...', 'info');
        
        setTimeout(() => {
            const duplicatesFound = 3;
            showToast(`Encontrados ${duplicatesFound} posibles duplicados`, 'success');
            
            // Ofrecer ir al comparador
            setTimeout(() => {
                if (confirm('¿Deseas ir al comparador de duplicados para revisarlos?')) {
                    window.location.href = '/compare/admin';
                }
            }, 500);
        }, 1500);
    }

    function viewUserManagement() {
        showToast('Cargando gestión de usuarios...', 'info');
        setTimeout(() => {
            showToast('Funcionalidad en desarrollo', 'warning');
        }, 500);
    }

    function viewVerificationQueue() {
        showToast('Cargando cola de verificación...', 'info');
        setTimeout(() => {
            showToast('Funcionalidad en desarrollo', 'warning');
        }, 500);
    }

    function viewSuspendedUsers() {
        showToast('Cargando usuarios suspendidos...', 'info');
        setTimeout(() => {
            showToast('Funcionalidad en desarrollo', 'warning');
        }, 500);
    }

    // Funciones de utilidad
    function updateReportCounts() {
        // Actualizar contadores en las pestañas
        const manualCount = document.querySelectorAll('.report-row').length;
        const systemCount = document.querySelectorAll('.system-report-row').length;
        
        const manualBadge = document.querySelector('#manual-tab .badge');
        const systemBadge = document.querySelector('#system-tab .badge');
        
        if (manualBadge) manualBadge.textContent = manualCount;
        if (systemBadge) systemBadge.textContent = systemCount;
    }

    function showCustomModal(title, content, closeText = 'Cerrar', closeBtnClass = 'secondary', onClose = null) {
        // Crear modal dinámico
        const modalId = 'custom-modal-' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-${closeBtnClass}" data-bs-dismiss="modal">${closeText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar al body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
        
        // Configurar cierre
        document.getElementById(modalId).addEventListener('hidden.bs.modal', function () {
            if (onClose) onClose();
            this.remove();
        });
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

    // Inicializar
    init();
});