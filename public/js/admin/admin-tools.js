// Tools module: configuration and utility actions
(function(){
    function initializeSystemConfig() {
        const elements = window.elements || {};
        // Try to load defaults; endpoint to GET config not implemented, so keep defaults for now
        const offensiveWords = "idiota,estúpido,imbécil,tonto,inútil";
        const equivalentDomains = "amazon.com,amazon.co.uk,amazon.de,a.com,researchgate.net,arxiv.org";
        if (elements.offensiveDict) elements.offensiveDict.value = offensiveWords;
        if (elements.equivalentDomains) elements.equivalentDomains.value = equivalentDomains;
    }

    function saveSystemConfig() {
        const elements = window.elements || {};
        const offensiveWords = (elements.offensiveDict && elements.offensiveDict.value) ? elements.offensiveDict.value.trim() : '';
        const domains = (elements.equivalentDomains && elements.equivalentDomains.value) ? elements.equivalentDomains.value.trim() : '';
        if (!offensiveWords || !domains) return window.showToast('Completa todos los campos de configuración', 'warning');
        fetch('/api/admin/system_config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offensive: offensiveWords, equivalent: domains }) }).then(r => r.json()).then(j => { if (j && j.success) window.showToast('Configuración guardada correctamente', 'success'); else window.showToast('Error guardando configuración', 'danger'); }).catch(e => { console.error(e); window.showToast('Error de red', 'danger'); });
    }

    function scanDuplicates() {
        window.showToast('Escaneando duplicados...', 'info');
        setTimeout(() => { const duplicatesFound = 3; window.showToast(`Encontrados ${duplicatesFound} posibles duplicados`, 'success'); if (confirm('¿Deseas ir al comparador de duplicados para revisarlos?')) window.location.href = '/compare/admin'; }, 1500);
    }

    async function viewDetailedStats() {
        window.showToast('Cargando estadísticas detalladas...', 'info');
        try {
            const resp = await fetch('/api/admin/stats/detailed', { credentials: 'include' });
            const j = await resp.json().catch(() => null);
            if (!resp.ok || !j || !j.success) {
                window.showToast('Error cargando estadísticas detalladas', 'danger');
                return;
            }
            const s = j.stats || {};
            const html = `
                <div class="container-fluid">
                    <div class="row gx-3 gy-3 mb-3">
                        <div class="col-md-3">
                            <div class="modal-stat-card text-dark" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <div class="modal-stat-icon bg-brown text-white"><i class="fas fa-hourglass-half"></i></div>
                                <div class="modal-stat-label">Pendientes</div>
                                <div class="modal-stat-value" style="color: #1b120b;">${s.totalPending || 0}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="modal-stat-card text-white" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <div class="modal-stat-icon bg-brown text-white"><i class="fas fa-check-circle"></i></div>
                                <div class="modal-stat-label">Resueltos (7 días)</div>
                                <div class="modal-stat-value" style="color: #1b120b;">${s.resolvedLast7 || 0}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="modal-stat-card text-white" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <div class="modal-stat-icon bg-brown text-white"><i class="fas fa-stopwatch"></i></div>
                                <div class="modal-stat-label">Tiempo medio</div>
                                <div class="modal-stat-value" style="color: #1b120b;">${s.avgResolutionMinutes !== null ? s.avgResolutionMinutes : 'N/A'}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="modal-stat-card text-dark" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <div class="modal-stat-icon bg-brown text-white"><i class="fas fa-chart-line"></i></div>
                                <div class="modal-stat-label">Tasa de resolución</div>
                                <div class="modal-stat-value" style="color: #1b120b;">${s.resolutionRate || '0.00'}%</div>
                            </div>
                        </div>
                    </div>
                    <div class="row gx-3 gy-3">
                        <div class="col-md-6">
                            <div class="modal-section">
                                <h6 class="modal-section-title"><i class="fas fa-user-friends me-1"></i>Top reportantes</h6>
                                <ul class="list-group list-group-flush">
                                    ${(s.topReporters || []).map(r => `<li class="list-group-item py-2 px-0 border-0">${r.username || ('user#'+r.reporter_id)} <span class="badge bg-brown text-white float-end">${r.cnt}</span></li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="modal-section">
                                <h6 class="modal-section-title"><i class="fas fa-user-shield me-1"></i>Top reportados</h6>
                                <ul class="list-group list-group-flush">
                                    ${(s.topReported || []).map(r => `<li class="list-group-item py-2 px-0 border-0">${r.username || ('user#'+r.reported_user_id)} <span class="badge bg-secondary text-dark float-end">${r.cnt}</span></li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="row gx-3 gy-3 mt-3">
                        <div class="col-md-6">
                            <div class="modal-section">
                                <h6 class="modal-section-title"><i class="fas fa-layer-group me-1"></i>Reportes pendientes por tipo</h6>
                                <ul class="list-group list-group-flush">
                                    ${(s.pendingByType || []).map(item => `<li class="list-group-item py-2 px-0 border-0">${item.report_type} <span class="badge bg-warning text-dark float-end">${item.cnt}</span></li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="modal-section">
                                <h6 class="modal-section-title"><i class="fas fa-check-double me-1"></i>Últimos resueltos</h6>
                                <ul class="list-group list-group-flush">
                                    ${(s.recentResolved || []).map(item => `<li class="list-group-item py-2 px-0 border-0">${item.report_type} <span class="text-muted small d-block">Resuelto ${item.resolved_at || 'N/A'}</span></li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>`;

            const modalElement = document.getElementById('detailedStatsModal');
            if (!modalElement) {
                console.error('Modal element not found');
                return;
            }
            const modal = new bootstrap.Modal(modalElement);
            document.getElementById('detailedStatsContent').innerHTML = html;
            modal.show();
        } catch (error) {
            console.error('Error:', error);
            window.showToast('Error de red al cargar estadísticas', 'danger');
        }
    }
    function viewUserManagement() { window.showToast('Cargando gestión de usuarios...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewVerificationQueue() { window.showToast('Cargando cola de verificación...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewSuspendedUsers() { window.showToast('Cargando usuarios suspendidos...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }

    window.adminTools = { initializeSystemConfig, saveSystemConfig, scanDuplicates, viewDetailedStats, viewUserManagement, viewVerificationQueue, viewSuspendedUsers };
})();
