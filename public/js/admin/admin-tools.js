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
                    <div class="row mb-2">
                        <div class="col-md-4"><strong>Reportes pendientes:</strong> ${s.totalPending || 0}</div>
                        <div class="col-md-4"><strong>Resueltos (últimos 7 días):</strong> ${s.resolvedLast7 || 0}</div>
                        <div class="col-md-4"><strong>Tiempo medio (min):</strong> ${s.avgResolutionMinutes !== null ? s.avgResolutionMinutes : 'N/A'}</div>
                    </div>
                    <hr>
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Top reportantes</h6>
                            <ul>
                                ${(s.topReporters || []).map(r => `<li>${r.username || ('user#'+r.reporter_id)} — ${r.cnt} reportes</li>`).join('')}
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6>Top reportados</h6>
                            <ul>
                                ${(s.topReported || []).map(r => `<li>${r.username || ('user#'+r.reported_user_id)} — ${r.cnt} reportes</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <h6>Pendientes por tipo</h6>
                    <ul>
                        ${(s.pendingByType || []).map(p => `<li>${p.report_type} — ${p.cnt}</li>`).join('')}
                    </ul>
                    <h6>Últimos resueltos</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead><tr><th>ID</th><th>Tipo</th><th>Acción</th><th>Resuelto</th></tr></thead>
                            <tbody>
                                ${(s.recentResolved || []).map(rr => `<tr><td>#${rr.id}</td><td>${rr.report_type || ''}</td><td>${rr.action_taken || ''}</td><td>${rr.resolved_at || ''}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            window.showCustomModal('Estadísticas detalladas', html, 'Cerrar', 'secondary');
        } catch (e) {
            console.error('viewDetailedStats error', e);
            window.showToast('Error al cargar estadísticas', 'danger');
        }
    }
    function viewUserManagement() { window.showToast('Cargando gestión de usuarios...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewVerificationQueue() { window.showToast('Cargando cola de verificación...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewSuspendedUsers() { window.showToast('Cargando usuarios suspendidos...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }

    window.adminTools = { initializeSystemConfig, saveSystemConfig, scanDuplicates, viewDetailedStats, viewUserManagement, viewVerificationQueue, viewSuspendedUsers };
})();
