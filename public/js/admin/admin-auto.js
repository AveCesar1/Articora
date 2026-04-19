// Automatic reports module
(function () {
    function findLocal(reportId) {
        if (!window.state || !Array.isArray(window.state.systemReports)) return null;
        return window.state.systemReports.find(r => Number(r.id) === Number(reportId)) || null;
    }

    async function resolveSystemReport(reportId) {
        const report = findLocal(reportId);
        if (!report) return window.showToast('Reporte no encontrado', 'warning');

        if (report.type === 'offensive-language') {
            const body = [
                '<div class="mb-3">',
                '<label class="form-label">Acción</label>',
                '<select id="sysActionSelect" class="form-select form-select-sm">',
                '<option value="delete">Eliminar comentario/mensaje</option>',
                '<option value="warn">Solo advertir al usuario</option>',
                '</select>',
                '</div>',
                '<div class="mb-3">',
                '<label class="form-label">Mensaje para el usuario (opcional)</label>',
                '<textarea id="sysAdminMsg" class="form-control form-control-sm" rows="3" placeholder="Mensaje que verá el usuario..."></textarea>',
                '</div>'
            ].join('\n');

            window.showFormModal('Resolver reporte automático #' + reportId, body, 'Aplicar', 'primary', async (modalEl, closeModal) => {
                const action = modalEl.querySelector('#sysActionSelect').value;
                const adminMessage = modalEl.querySelector('#sysAdminMsg').value || '';
                try {
                    const resp = await fetch(`/api/admin/system_alerts/${reportId}/resolve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action, adminMessage })
                    });
                    const j = await resp.json();
                    if (j && j.success) {
                        const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                        if (row) row.remove();
                        window.updateReportCounts();
                        window.showToast('Reporte resuelto y usuario notificado (si aplica)', 'success');
                        closeModal();
                        return;
                    }
                    window.showToast('Error al resolver reporte', 'danger');
                } catch (err) {
                    console.error(err);
                    window.showToast('Error de red', 'danger');
                }
            });
            return;
        }

        if (report.type === 'broken-url') {
            const body = [
                '<div class="mb-3">',
                '<p class="small text-muted">La URL reportada ha mostrado errores persistentes.</p>',
                '<div class="form-check"><input class="form-check-input" type="radio" name="repairOption" id="repairNow" value="repair" checked><label class="form-check-label" for="repairNow">Marcar como reparada (re-habilitar URL)</label></div>',
                '<div class="form-check"><input class="form-check-input" type="radio" name="repairOption" id="notifyOnly" value="notify"><label class="form-check-label" for="notifyOnly">Notificar al uploader y marcar resuelto</label></div>',
                '</div>',
                '<div class="mb-3"><label class="form-label">Mensaje para el uploader (opcional)</label><textarea id="sysAdminMsg" class="form-control form-control-sm" rows="3" placeholder="Mensaje que verá el uploader..."></textarea></div>'
            ].join('\n');

            window.showFormModal('Resolver reporte de URL rota #' + reportId, body, 'Aplicar', 'primary', async (modalEl, closeModal) => {
                const optionEl = modalEl.querySelector('input[name="repairOption"]:checked');
                const option = optionEl ? optionEl.value : 'repair';
                const adminMessage = modalEl.querySelector('#sysAdminMsg').value || '';
                try {
                    if (option === 'repair') {
                        const resp = await fetch(`/api/admin/system_alerts/${reportId}/repair`, { method: 'POST' });
                        const j = await resp.json();
                        if (j && j.success) {
                            const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                            if (row) row.remove();
                            window.updateReportCounts();
                            window.showToast('URL marcada como reparada', 'success');
                            closeModal();
                            return;
                        }
                    } else {
                        const resp = await fetch(`/api/admin/system_alerts/${reportId}/resolve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'notify', adminMessage })
                        });
                        const j = await resp.json();
                        if (j && j.success) {
                            const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                            if (row) row.remove();
                            window.updateReportCounts();
                            window.showToast('Uploader notificado y reporte resuelto', 'success');
                            closeModal();
                            return;
                        }
                    }
                    window.showToast('Error aplicando la acción', 'danger');
                } catch (err) {
                    console.error(err);
                    window.showToast('Error de red', 'danger');
                }
            });
            return;
        }

        if (report.type === 'duplicate-detection') {
            if (report.sourceIds && report.sourceIds.length >= 2) {
                window.location.href = '/compare/admin?ids=' + encodeURIComponent(report.sourceIds.join(','));
            } else {
                window.showToast('No hay suficientes fuentes para comparar', 'warning');
            }
            return;
        }

        if (confirm('¿Marcar el reporte automático #' + reportId + ' como resuelto?')) {
            try {
                const resp = await fetch(`/api/admin/system_alerts/${reportId}/resolve`, { method: 'POST' });
                const j = await resp.json();
                if (j && j.success) {
                    const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                    if (row) row.remove();
                    window.updateReportCounts();
                    window.showToast('Reporte automático #' + reportId + ' resuelto', 'success');
                } else {
                    window.showToast('Error al resolver reporte', 'danger');
                }
            } catch (err) {
                console.error(err);
                window.showToast('Error de red', 'danger');
            }
        }
    }

    function ignoreSystemReport(reportId) {
        if (!confirm('¿Ignorar el reporte automático #' + reportId + '?')) return;
        fetch(`/api/admin/system_alerts/${reportId}/ignore`, { method: 'POST' })
            .then(r => r.json())
            .then(j => {
                if (j && j.success) {
                    const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                    if (row) row.remove();
                    window.updateReportCounts();
                    window.showToast('Reporte automático #' + reportId + ' ignorado', 'warning');
                } else {
                    window.showToast('Error ignorando reporte', 'danger');
                }
            })
            .catch(err => { console.error(err); window.showToast('Error de red', 'danger'); });
    }

    function fixBrokenUrl(reportId) {
        if (!confirm('¿Marcar la URL como reparada para el reporte #' + reportId + '?')) return;
        fetch(`/api/admin/system_alerts/${reportId}/repair`, { method: 'POST' })
            .then(r => r.json())
            .then(j => {
                if (j && j.success) {
                    const row = document.querySelector(`.system-report-row[data-report-id="${reportId}"]`);
                    if (row) row.remove();
                    window.updateReportCounts();
                    window.showToast('URL marcada como reparada para el reporte #' + reportId, 'success');
                } else {
                    window.showToast('Error marcando la URL como reparada', 'danger');
                }
            })
            .catch(err => { console.error(err); window.showToast('Error de red', 'danger'); });
    }

    function exportSystemReports() {
        if (!window.state || !Array.isArray(window.state.systemReports) || window.state.systemReports.length === 0) return window.showToast('No hay reportes para exportar', 'warning');
        try {
            const rows = window.state.systemReports.map(r => ({
                id: r.id,
                type: r.type,
                details: r.type === 'offensive-language' ? (r.detectedText || '') : r.type === 'broken-url' ? (r.url || '') : (Array.isArray(r.sourceIds) ? r.sourceIds.join('|') : ''),
                detectedDate: r.detectedDate || ''
            }));

            const header = Object.keys(rows[0]).join(',');
            const body = rows.map(row => Object.values(row).map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
            const csv = header + '\n' + body;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system_reports_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            window.showToast('CSV generado', 'success');
        } catch (err) {
            console.error(err);
            window.showToast('Error generando CSV', 'danger');
        }
    }

    async function runSystemChecks() {
        window.showToast('Ejecutando verificaciones del sistema...', 'info');
        try {
            const resp = await fetch('/api/admin/run_system_checks', { method: 'POST' });
            const j = await resp.json();
            if (j && j.success) {
                window.showToast('Verificaciones completadas', 'success');
                setTimeout(() => window.location.reload(), 800);
            } else {
                window.showToast('Error ejecutando verificaciones', 'danger');
            }
        } catch (err) {
            console.error(err);
            window.showToast('Error de red', 'danger');
        }
    }

    window.adminAuto = { resolveSystemReport, ignoreSystemReport, fixBrokenUrl, exportSystemReports, runSystemChecks };
})();