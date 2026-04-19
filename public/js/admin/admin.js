// Loader and common helpers for admin UI (manual/auto/tools modules)
document.addEventListener('DOMContentLoaded', async function() {
    const adminContainer = document.querySelector('[data-admin-data]');
    let adminData = { manualReports: [], systemReports: [], stats: {} };
    if (adminContainer) {
        try { adminData = JSON.parse(adminContainer.getAttribute('data-admin-data')) || adminData; } catch (e) { console.warn('Failed to parse admin data attribute', e); }
    }

    // Expose shared state and element refs globally for modules
    window.state = {
        manualReports: adminData.manualReports || [],
        systemReports: adminData.systemReports || [],
        stats: adminData.stats || {},
        selectedReports: new Set(),
        filters: { type: 'all', priority: 'all', status: 'pending' }
    };

    window.elements = {
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

    // Common helpers
    window.showCustomModal = function(title, content, closeText = 'Cerrar', closeBtnClass = 'secondary', onClose = null) {
        const modalId = 'custom-modal-' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${content}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-${closeBtnClass}" data-bs-dismiss="modal">${closeText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        modalEl.addEventListener('hidden.bs.modal', function () { if (onClose) onClose(); this.remove(); });
    };

    window.showFormModal = function(title, content, primaryText = 'Enviar', primaryClass = 'primary', onPrimary) {
        const modalId = 'form-modal-' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${content}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-${primaryClass}" id="${modalId}-primary">${primaryText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        const primaryBtn = modalEl.querySelector(`#${modalId}-primary`);
        primaryBtn.addEventListener('click', () => onPrimary(modalEl, () => { modal.hide(); }));
        modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); });
    };

    window.showToast = function(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) { toastContainer = document.createElement('div'); toastContainer.id = 'toastContainer'; toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3'; document.body.appendChild(toastContainer); }
        toastContainer.innerHTML += toastHtml;
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        toastElement.addEventListener('hidden.bs.toast', function () { toastElement.remove(); });
    };

    window.updateReportCounts = function() {
        const manualCount = document.querySelectorAll('.report-row').length;
        const systemCount = document.querySelectorAll('.system-report-row').length;
        const manualBadge = document.querySelector('#manual-tab .badge');
        const systemBadge = document.querySelector('#system-tab .badge');
        if (manualBadge) manualBadge.textContent = manualCount;
        if (systemBadge) systemBadge.textContent = systemCount;
    };

    function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = () => resolve(); s.onerror = (e) => reject(e); document.head.appendChild(s); }); }

    // Load module scripts then initialize UI
    try {
        await Promise.all([
            loadScript('/js/admin/admin-manual.js'),
            loadScript('/js/admin/admin-auto.js'),
            loadScript('/js/admin/admin-tools.js')
        ]);
    } catch (e) {
        console.error('Error cargando módulos admin:', e);
    }

    // Attach event listeners (use wrappers that call module methods)
    function setupEventListeners() {
        const el = window.elements;
        if (el.filterReports) el.filterReports.addEventListener('click', () => { if (window.adminTools && window.adminTools.showFilterModal) window.adminTools.showFilterModal(); else window.showToast('Filtros no disponibles', 'warning'); });
        if (el.refreshData) el.refreshData.addEventListener('click', () => { if (window.adminTools && window.adminTools.refreshData) window.adminTools.refreshData(); else window.showToast('Actualizando datos...', 'info'); });
        if (el.bulkActions) el.bulkActions.addEventListener('click', () => { if (window.adminTools && window.adminTools.showBulkActionsModal) window.adminTools.showBulkActionsModal(); else window.showToast('Acciones masivas no disponibles', 'warning'); });
        if (el.exportManualReports) el.exportManualReports.addEventListener('click', () => { if (window.adminManual && window.adminManual.exportManualReports) window.adminManual.exportManualReports(); });
        if (el.exportSystemReports) el.exportSystemReports.addEventListener('click', () => { if (window.adminAuto && window.adminAuto.exportSystemReports) window.adminAuto.exportSystemReports(); });
        if (el.runSystemChecks) el.runSystemChecks.addEventListener('click', () => { if (window.adminAuto && window.adminAuto.runSystemChecks) window.adminAuto.runSystemChecks(); });
        if (el.saveSystemConfig) el.saveSystemConfig.addEventListener('click', () => { if (window.adminTools && window.adminTools.saveSystemConfig) window.adminTools.saveSystemConfig(); });
        if (el.viewDetailedStats) el.viewDetailedStats.addEventListener('click', () => { if (window.adminTools && window.adminTools.viewDetailedStats) window.adminTools.viewDetailedStats(); });
        if (el.scanDuplicates) el.scanDuplicates.addEventListener('click', () => { if (window.adminTools && window.adminTools.scanDuplicates) window.adminTools.scanDuplicates(); });
        if (el.viewUserManagement) el.viewUserManagement.addEventListener('click', () => { if (window.adminTools && window.adminTools.viewUserManagement) window.adminTools.viewUserManagement(); });
        if (el.viewVerificationQueue) el.viewVerificationQueue.addEventListener('click', () => { if (window.adminTools && window.adminTools.viewVerificationQueue) window.adminTools.viewVerificationQueue(); });
        if (el.viewSuspendedUsers) el.viewSuspendedUsers.addEventListener('click', () => { if (window.adminTools && window.adminTools.viewSuspendedUsers) window.adminTools.viewSuspendedUsers(); });

        // Delegated clicks for report actions
        document.addEventListener('click', function(e) {
            const v = e.target.closest('.view-report'); if (v) { const id = Number(v.dataset.reportId); if (window.adminManual && window.adminManual.viewReport) window.adminManual.viewReport(id); return; }
            const r = e.target.closest('.resolve-report'); if (r) { const id = Number(r.dataset.reportId); if (window.adminManual && window.adminManual.resolveManualReport) window.adminManual.resolveManualReport(id); return; }
            const x = e.target.closest('.reject-report'); if (x) { const id = Number(x.dataset.reportId); if (window.adminManual && window.adminManual.rejectManualReport) window.adminManual.rejectManualReport(id); return; }
            const rs = e.target.closest('.resolve-system-report'); if (rs) { const id = Number(rs.dataset.reportId); if (window.adminAuto && window.adminAuto.resolveSystemReport) window.adminAuto.resolveSystemReport(id); return; }
            const ig = e.target.closest('.ignore-system-report'); if (ig) { const id = Number(ig.dataset.reportId); if (window.adminAuto && window.adminAuto.ignoreSystemReport) window.adminAuto.ignoreSystemReport(id); return; }
            const fu = e.target.closest('.fix-url'); if (fu) { const id = Number(fu.dataset.reportId); if (window.adminAuto && window.adminAuto.fixBrokenUrl) window.adminAuto.fixBrokenUrl(id); return; }
        });
    }

    // Run init that calls module initializers if present
    if (window.adminTools && window.adminTools.initializeSystemConfig) {
        try { window.adminTools.initializeSystemConfig(); } catch (e) { console.warn('initializeSystemConfig error', e); }
    }
    setupEventListeners();
    window.updateReportCounts();
});
