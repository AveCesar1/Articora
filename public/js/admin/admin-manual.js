// Manual reports module
(function(){
    function findLocal(reportId) {
        return (window.state && window.state.manualReports) ? window.state.manualReports.find(r => Number(r.id) === Number(reportId)) : null;
    }

    async function fetchReport(reportId) {
        try {
            const resp = await fetch(`/api/admin/reports/${reportId}`);
            const j = await resp.json();
            if (j && j.success) return j.report;
        } catch (e) { console.error('fetchReport error', e); }
        return null;
    }

    async function resolveManualReport(reportId) {
        let report = findLocal(reportId);
        if (!report) {
            const r = await fetchReport(reportId);
            if (r) report = { id: r.id, type: r.report_type || (r.comment_id ? 'comment' : (r.reported_user_id ? 'user' : 'source')) };
        }
        if (!report) return window.showToast('Reporte no encontrado', 'warning');

        const actions = [];
        if (report.type === 'source') actions.push({ value: 'delete_source', label: 'Eliminar fuente' });
        if (report.type === 'user') actions.push({ value: 'suspend_user', label: 'Suspender usuario (7 días)' });
        if (report.type === 'comment') actions.push({ value: 'delete_comment', label: 'Eliminar comentario' });
        if (report.type === 'message') actions.push({ value: 'delete_message', label: 'Eliminar mensaje' });

        if (actions.length === 0) return window.showToast('No hay acciones configuradas para este tipo de reporte', 'warning');

        const optionsHtml = actions.map(a => `<option value="${a.value}">${a.label}</option>`).join('');
        const body = `
            <div class="mb-3"><label class="form-label">Acción</label>
                <select id="adminActionSelect" class="form-select form-select-sm">${optionsHtml}</select>
            </div>
            <div class="mb-3"><label class="form-label">Nota interna (opcional)</label>
                <textarea id="adminActionNote" class="form-control form-control-sm" rows="2"></textarea>
            </div>
            <div class="mb-3"><label class="form-label">Mensaje para el reportante (se publicará en Artícora)</label>
                <textarea id="adminResponseMessage" class="form-control form-control-sm" rows="3" placeholder="Mensaje que verá el usuario/reportante..."></textarea>
            </div>
        `;

        window.showFormModal('Resolver reporte #' + reportId, body, 'Aplicar acción', 'primary', async (modalEl, closeModal) => {
            const action = modalEl.querySelector('#adminActionSelect').value;
            const note = modalEl.querySelector('#adminActionNote').value || '';
            const adminMessage = modalEl.querySelector('#adminResponseMessage').value || '';
            try {
                const resp = await fetch(`/api/admin/reports/${reportId}/resolve`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note, adminMessage })
                });
                const j = await resp.json();
                if (j && j.success) {
                    const row = document.querySelector(`.report-row[data-report-id="${reportId}"]`);
                    if (row) row.remove();
                    window.updateReportCounts();
                    window.showToast('Acción aplicada correctamente', 'success');
                    closeModal();
                } else window.showToast('Error aplicando acción', 'danger');
            } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
        });
    }

    async function rejectManualReport(reportId) {
        const body = `<div class="mb-3"><label class="form-label">Mensaje para el reportante (opcional)</label><textarea id="adminRejectMessage" class="form-control form-control-sm" rows="4" placeholder="Explica por qué se rechaza el reporte..."></textarea></div>`;
        window.showFormModal('Rechazar reporte #' + reportId, body, 'Confirmar rechazo', 'danger', async (modalEl, closeModal) => {
            const adminMessage = modalEl.querySelector('#adminRejectMessage').value || '';
            try {
                const resp = await fetch(`/api/admin/reports/${reportId}/reject`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: adminMessage, adminMessage })
                });
                const j = await resp.json();
                if (j && j.success) {
                    const row = document.querySelector(`.report-row[data-report-id="${reportId}"]`);
                    if (row) row.remove();
                    window.updateReportCounts();
                    window.showToast(`Reporte #${reportId} rechazado y notificado`, 'info');
                    closeModal();
                } else window.showToast('Error rechazando reporte', 'danger');
            } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
        });
    }

    async function viewReport(reportId) {
        try {
            const resp = await fetch(`/api/admin/reports/${reportId}`);
            const j = await resp.json();
            if (!j || !j.success) return window.showToast('No se pudo obtener detalle', 'danger');
            const { report, reporter, reportedUser, source, comment, message } = j;
            let details = `<div class="small text-muted mb-2">Tipo: ${report.report_type || 'N/A'} | Motivo: ${report.reason || ''}</div>`;
            details += `<div class="mb-2"><strong>Descripción:</strong> ${report.description || ''}</div>`;
            if (reporter) details += `<div class="mb-2"><strong>Reportado por:</strong> ${reporter.username || reporter.full_name || reporter.email || 'N/A'}</div>`;
            if (reportedUser) details += `<div class="mb-2"><strong>Usuario reportado:</strong> ${reportedUser.username || reportedUser.full_name || 'N/A'}</div>`;
            if (source) details += `<div class="mb-2"><strong>Fuente:</strong> <a href="/post/${source.id}" class="text-brown">${source.title}</a></div>`;
            if (comment) details += `<div class="mb-2"><strong>Comentario:</strong> ${comment.comment || ''}</div>`;
            if (message) details += `<div class="mb-2"><strong>Mensaje (encrypted):</strong> Tipo: ${message.content_type || 'N/A'} | enviado: ${message.sent_at || ''}</div>`;
            window.showCustomModal('Detalle reporte #' + reportId, details, 'Cerrar', 'secondary');
        } catch (e) { console.error(e); window.showToast('Error obteniendo detalle', 'danger'); }
    }

    function exportManualReports() {
        if (!window.state || !window.state.manualReports || window.state.manualReports.length === 0) return window.showToast('No hay reportes para exportar', 'warning');
        try {
            const rows = window.state.manualReports.map(r => ({ id: r.id, type: r.type, title: r.title || '', reason: r.reason || '', reportedBy: r.reportedBy || '', reportDate: r.reportDate || '' }));
            const csv = [Object.keys(rows[0]).join(',')].concat(rows.map(r => Object.values(r).map(v => '"' + (String(v || '')).replace(/"/g, '""') + '"').join(','))).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `manual_reports_${Date.now()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            window.showToast('CSV generado', 'success');
        } catch (e) { console.error(e); window.showToast('Error generando CSV', 'danger'); }
    }

    window.adminManual = { resolveManualReport, rejectManualReport, viewReport, exportManualReports };
})();
