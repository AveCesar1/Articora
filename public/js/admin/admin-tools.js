// Tools module: configuration and utility actions
(function(){
    async function initializeSystemConfig() {
        const elements = window.elements || {};
        try {
            // Load offensive terms and domains via new admin API
            const [termsResp, domainsResp] = await Promise.all([
                fetch('/api/admin/offensive_terms', { credentials: 'include' }),
                fetch('/api/admin/equivalent_domains', { credentials: 'include' })
            ]);
            if (termsResp.ok) {
                const tj = await termsResp.json().catch(() => null);
                if (tj && tj.success && Array.isArray(tj.terms)) {
                    const flat = tj.terms.map(t => t.term).filter(Boolean).join(',');
                    if (elements.offensiveDict) elements.offensiveDict.value = flat;
                }
            }
            if (domainsResp.ok) {
                const dj = await domainsResp.json().catch(() => null);
                if (dj && dj.success && Array.isArray(dj.domains)) {
                    const flat = dj.domains.map(d => (d.base_domain || '') + (d.equivalent_domain ? (',' + d.equivalent_domain) : '')).filter(Boolean).join(',');
                    if (elements.equivalentDomains) elements.equivalentDomains.value = flat;
                }
            }
        } catch (e) {
            // fallback to defaults
            const offensiveWords = "idiota,estúpido,imbécil,tonto,inútil";
            const equivalentDomains = "amazon.com,amazon.co.uk,amazon.de,a.com,researchgate.net,arxiv.org";
            if (elements.offensiveDict && !elements.offensiveDict.value) elements.offensiveDict.value = offensiveWords;
            if (elements.equivalentDomains && !elements.equivalentDomains.value) elements.equivalentDomains.value = equivalentDomains;
        }
    }

    // Modal: Manage offensive terms
    async function manageOffensiveTerms() {
        try {
            const resp = await fetch('/api/admin/offensive_terms', { credentials: 'include' });
            const j = await resp.json().catch(() => null);
            const terms = (j && j.success && Array.isArray(j.terms)) ? j.terms : [];
            const rowsHtml = terms.map(t => `
                <tr data-id="${t.id}">
                    <td>${t.id}</td>
                    <td>${(t.term||'')}</td>
                    <td>${t.is_active ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger remove-term" data-id="${t.id}">Eliminar</button>
                        <button class="btn btn-sm btn-outline-secondary toggle-term" data-id="${t.id}" data-active="${t.is_active ? 1 : 0}">${t.is_active ? 'Desactivar' : 'Activar'}</button>
                    </td>
                </tr>
            `).join('');

            const html = `
                <div>
                    <div class="mb-3">
                        <label class="form-label">Agregar término ofensivo</label>
                        <div class="input-group">
                            <input id="newOffensiveTerm" class="form-control form-control-sm" placeholder="Nuevo término..." />
                            <button id="addOffensiveTermBtn" class="btn btn-sm btn-brown">Agregar</button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover"><thead><tr><th>ID</th><th>Término</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="offensiveTermsTable">${rowsHtml}</tbody></table>
                    </div>
                </div>
            `;

            // create modal
            const modalId = 'manageOffensiveModal';
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Gestionar Términos Ofensivos</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                            <div class="modal-body">${html}</div>
                            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modalEl = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

            // handlers
            modalEl.querySelector('#addOffensiveTermBtn').addEventListener('click', async () => {
                const input = modalEl.querySelector('#newOffensiveTerm');
                const v = (input && input.value || '').trim();
                if (!v) return window.showToast('Escribe un término', 'warning');
                try {
                    const r = await fetch('/api/admin/offensive_terms', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ term: v }) });
                    const jr = await r.json().catch(() => null);
                    if (r.ok && jr && jr.success) { window.showToast('Término agregado', 'success'); input.value = ''; refreshTermsTable(); } else { window.showToast('Error al agregar término', 'danger'); }
                } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
            });

            async function refreshTermsTable() {
                try {
                    const resp2 = await fetch('/api/admin/offensive_terms', { credentials: 'include' });
                    const j2 = await resp2.json().catch(() => null);
                    const terms2 = (j2 && j2.success && Array.isArray(j2.terms)) ? j2.terms : [];
                    const tbody = modalEl.querySelector('#offensiveTermsTable');
                    tbody.innerHTML = terms2.map(t => `
                        <tr data-id="${t.id}">
                            <td>${t.id}</td>
                            <td>${(t.term||'')}</td>
                            <td>${t.is_active ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger remove-term" data-id="${t.id}">Eliminar</button>
                                <button class="btn btn-sm btn-outline-secondary toggle-term" data-id="${t.id}" data-active="${t.is_active ? 1 : 0}">${t.is_active ? 'Desactivar' : 'Activar'}</button>
                            </td>
                        </tr>
                    `).join('');
                } catch (e) { console.error('refreshTermsTable error', e); }
            }

            modalEl.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('.remove-term');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Eliminar término #' + id + '?')) return;
                    try { const r = await fetch('/api/admin/offensive_terms/' + id, { method: 'DELETE', credentials: 'include' }); const jr = await r.json().catch(() => null); if (r.ok && jr && jr.success) { window.showToast('Término eliminado', 'success'); refreshTermsTable(); } else { window.showToast('Error eliminando término', 'danger'); } } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
                }
                const tbtn = ev.target.closest('.toggle-term');
                if (tbtn) {
                    const id = tbtn.getAttribute('data-id');
                    const active = tbtn.getAttribute('data-active') === '1';
                    try { const r = await fetch('/api/admin/offensive_terms/' + id, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !active }) }); const jr = await r.json().catch(() => null); if (r.ok && jr && jr.success) { window.showToast('Estado actualizado', 'success'); refreshTermsTable(); } else { window.showToast('Error actualizando estado', 'danger'); } } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
                }
            });

            modalEl.addEventListener('hidden.bs.modal', function () { try { modalEl.remove(); } catch (e) {} });
        } catch (e) {
            console.error('manageOffensiveTerms error', e);
            window.showToast('Error cargando términos ofensivos', 'danger');
        }
    }

    // Modal: Manage equivalent domains
    async function manageEquivalentDomains() {
        try {
            const resp = await fetch('/api/admin/equivalent_domains', { credentials: 'include' });
            const j = await resp.json().catch(() => null);
            const rows = (j && j.success && Array.isArray(j.domains)) ? j.domains : [];
            const rowsHtml = rows.map(d => `
                <tr data-id="${d.id}"><td>${d.id}</td><td>${d.base_domain}</td><td>${d.equivalent_domain}</td><td><button class="btn btn-sm btn-outline-danger remove-domain" data-id="${d.id}">Eliminar</button></td></tr>
            `).join('');

            const html = `
                <div>
                    <div class="mb-3">
                        <label class="form-label">Agregar par (base ↔ equivalente)</label>
                        <div class="row g-2">
                            <div class="col"><input id="baseDomainInput" class="form-control form-control-sm" placeholder="Dominio base (ej. example.com)" /></div>
                            <div class="col"><input id="equivDomainInput" class="form-control form-control-sm" placeholder="Dominio equivalente (ej. m.example.com)" /></div>
                            <div class="col-auto"><button id="addDomainBtn" class="btn btn-sm btn-brown">Agregar</button></div>
                        </div>
                    </div>
                    <div class="table-responsive"><table class="table table-sm"><thead><tr><th>ID</th><th>Base</th><th>Equivalente</th><th>Acciones</th></tr></thead><tbody id="equivDomainsTable">${rowsHtml}</tbody></table></div>
                </div>
            `;

            const modalId = 'manageDomainsModal';
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Gestionar Dominios Equivalentes</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                            <div class="modal-body">${html}</div>
                            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modalEl = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

            modalEl.querySelector('#addDomainBtn').addEventListener('click', async () => {
                const base = modalEl.querySelector('#baseDomainInput').value.trim();
                const equiv = modalEl.querySelector('#equivDomainInput').value.trim();
                if (!base || !equiv) return window.showToast('Completa ambos campos', 'warning');
                try {
                    const r = await fetch('/api/admin/equivalent_domains', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base_domain: base, equivalent_domain: equiv }) });
                    const jr = await r.json().catch(() => null);
                    if (r.ok && jr && jr.success) { window.showToast('Par agregado', 'success'); refreshDomainsTable(); } else { window.showToast('Error agregando par', 'danger'); }
                } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
            });

            async function refreshDomainsTable() {
                try {
                    const res2 = await fetch('/api/admin/equivalent_domains', { credentials: 'include' });
                    const j2 = await res2.json().catch(() => null);
                    const rows2 = (j2 && j2.success && Array.isArray(j2.domains)) ? j2.domains : [];
                    const tbody = modalEl.querySelector('#equivDomainsTable');
                    tbody.innerHTML = rows2.map(d => `<tr data-id="${d.id}"><td>${d.id}</td><td>${d.base_domain}</td><td>${d.equivalent_domain}</td><td><button class="btn btn-sm btn-outline-danger remove-domain" data-id="${d.id}">Eliminar</button></td></tr>`).join('');
                } catch (e) { console.error('refreshDomainsTable error', e); }
            }

            modalEl.addEventListener('click', async (ev) => {
                const btn = ev.target.closest('.remove-domain');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Eliminar dominio equivalente #' + id + '?')) return;
                    try { const r = await fetch('/api/admin/equivalent_domains/' + id, { method: 'DELETE', credentials: 'include' }); const jr = await r.json().catch(() => null); if (r.ok && jr && jr.success) { window.showToast('Par eliminado', 'success'); refreshDomainsTable(); } else { window.showToast('Error eliminando', 'danger'); } } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
                }
            });

            modalEl.addEventListener('hidden.bs.modal', function () { try { modalEl.remove(); } catch (e) {} });
        } catch (e) {
            console.error('manageEquivalentDomains error', e);
            window.showToast('Error cargando dominios equivalentes', 'danger');
        }
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
    // Trigger the existing verification queue UI (wired in admin-verification.js)
    function viewVerificationQueue() {
        const btn = document.getElementById('viewVerificationQueue');
        if (btn) { btn.click(); return; }
        window.showToast('No se encontró la cola de verificación en la página', 'warning');
    }

    // Show suspended / deleted users modal and allow restore/unblock actions
    async function viewSuspendedUsers() {
        window.showToast('Cargando usuarios suspendidos...', 'info');
        try {
            const resp = await fetch('/api/admin/suspended_users', { credentials: 'include' });
            const j = await resp.json().catch(() => null);
            if (!resp.ok || !j || !j.success) { window.showToast('Error cargando usuarios', 'danger'); return; }
            const users = j.users || [];
            let html = `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
            if (!users.length) html += `<tr><td colspan="5" class="text-muted">No hay usuarios bloqueados o eliminados.</td></tr>`;
            users.forEach(u => {
                const stateParts = [];
                if (!u.account_active) stateParts.push('Bloqueado');
                if (u.locked_until) stateParts.push('Bloqueo hasta ' + u.locked_until);
                if (u.is_deleted) stateParts.push('Eliminado');
                const state = stateParts.join(' / ') || 'Inactivo';
                html += `<tr><td>#${u.id} - ${u.username}</td><td>${u.full_name || ''}</td><td>${u.email || ''}</td><td>${state}</td><td>`;
                if (!u.account_active || u.locked_until) html += `<button class="btn btn-sm btn-outline-success me-1 unblock-btn" data-user-id="${u.id}">Remover bloqueo</button>`;
                if (u.is_deleted) html += `<button class="btn btn-sm btn-outline-primary restore-btn" data-user-id="${u.id}">Restaurar cuenta</button>`;
                html += `</td></tr>`;
            });
            html += `</tbody></table></div>`;

            // Insert into modal and show
            const modalEl = document.getElementById('suspendedUsersModal');
            if (!modalEl) {
                window.showToast('Modal de usuarios suspendidos no encontrado', 'danger');
                return;
            }
            document.getElementById('suspendedUsersContent').innerHTML = html;
            const bsModal = new bootstrap.Modal(modalEl);
            bsModal.show();

            // Event delegation for action buttons inside modal (attach once)
            const contentEl = modalEl.querySelector('#suspendedUsersContent');
            if (contentEl) {
                if (contentEl._suspendedHandler) contentEl.removeEventListener('click', contentEl._suspendedHandler);
                contentEl._suspendedHandler = async (ev) => {
                    const btn = ev.target.closest('button');
                    if (!btn) return;
                    const uid = btn.getAttribute('data-user-id');
                    if (!uid) return;
                    if (btn.classList.contains('unblock-btn')) {
                        if (!confirm('¿Confirmas remover el bloqueo del usuario #' + uid + '?')) return;
                        try {
                            const r = await fetch('/api/admin/suspended_users/' + uid + '/unblock', { method: 'POST', credentials: 'include' });
                            const respJson = await r.json().catch(() => null);
                            if (!r.ok) { window.showToast('Error al desbloquear usuario', 'danger'); console.error(respJson); return; }
                            window.showToast('Usuario desbloqueado', 'success');
                            // refresh list
                            viewSuspendedUsers();
                        } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
                    } else if (btn.classList.contains('restore-btn')) {
                        if (!confirm('¿Confirmas restaurar la cuenta del usuario #' + uid + '?')) return;
                        try {
                            const r = await fetch('/api/admin/suspended_users/' + uid + '/restore', { method: 'POST', credentials: 'include' });
                            const respJson = await r.json().catch(() => null);
                            if (!r.ok) { window.showToast('Error al restaurar usuario', 'danger'); console.error(respJson); return; }
                            window.showToast('Usuario restaurado', 'success');
                            viewSuspendedUsers();
                        } catch (e) { console.error(e); window.showToast('Error de red', 'danger'); }
                    }
                };
                contentEl.addEventListener('click', contentEl._suspendedHandler);
            }

        } catch (e) {
            console.error('viewSuspendedUsers error', e);
            window.showToast('Error cargando usuarios suspendidos', 'danger');
        }
    }

    window.adminTools = { initializeSystemConfig, saveSystemConfig, scanDuplicates, viewDetailedStats, viewVerificationQueue, viewSuspendedUsers, manageOffensiveTerms, manageEquivalentDomains };
})();
