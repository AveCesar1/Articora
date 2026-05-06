// admin-verification.js
// Enhanced admin UI logic to list verification requests, preview documents inline,
// call SEP verification for cedula numbers and perform accept/reject actions.
document.addEventListener('DOMContentLoaded', function() {
    const viewBtn = document.getElementById('viewVerificationQueue');
    const modalEl = document.getElementById('verificationQueueModal');
    if (!viewBtn || !modalEl) return;

    const tbody = document.querySelector('#verificationRequestsTable tbody');

    function normalizeString(s) {
        return String(s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim();
    }

    async function previewDocument(requestId, which, container) {
        try {
            const url = `/api/admin/verification_requests/${requestId}/download?which=${which}`;
            const resp = await fetch(url, { credentials: 'include' });
            if (!resp.ok) {
                const json = await resp.json().catch(() => ({}));
                container.innerHTML = `<div class="text-danger">Error descargando documento: ${json && json.message ? json.message : resp.status}</div>`;
                return;
            }
            const blob = await resp.blob();
            container.innerHTML = '';
            if (blob.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                container.appendChild(img);
            } else if (blob.type === 'application/pdf') {
                const obj = document.createElement('object');
                obj.data = URL.createObjectURL(blob);
                obj.type = 'application/pdf';
                obj.width = '100%';
                obj.height = '600px';
                container.appendChild(obj);
            } else {
                // Fallback: offer download
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `document_${requestId}`;
                a.textContent = 'Descargar documento';
                container.appendChild(a);
            }
        } catch (e) {
            console.error('previewDocument error', e);
            container.innerHTML = '<div class="text-danger">Error mostrando documento</div>';
        }
    }

    async function verifyCedula(requestId, cedula, userFullName, container) {
        try {
            const resp = await fetch('/verificacion/cedula', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula })
            });
            const data = await resp.json();
            if (!resp.ok) {
                container.innerHTML = `<div class="text-danger">Error consultando SEP: ${data && data.message ? data.message : resp.status}</div>`;
                return;
            }
            const apiData = data.apiData;
            // apiData might be array or object; normalize to array
            const candidates = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);
            const userNorm = normalizeString(userFullName || '');
            const rows = candidates.map(c => {
                const nombre = (c.nombre || c.nombres || '').trim();
                const ap1 = c.primerApellido || c.apellidoPaterno || '';
                const ap2 = c.segundoApellido || c.apellidoMaterno || '';
                const full = `${nombre} ${ap1} ${ap2}`.trim();
                const inst = c.institucion || c.institucionEducativa || c.institucion_emisora || '';
                const grado = c.grado || c.nivel || c.titulo || '';
                const match = userNorm && normalizeString(full) === userNorm;
                return { full, inst, grado, match };
            });

            // Render comparison table
            let html = '<div class="mt-2"><h6>Resultados SEP</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Nombre</th><th>Institución</th><th>Grado</th><th>Coincide con usuario</th></tr></thead><tbody>';
            if (!rows.length) html += '<tr><td colspan="4" class="text-muted">No hay resultados</td></tr>';
            rows.forEach(r => {
                html += `<tr><td>${r.full}</td><td>${r.inst}</td><td>${r.grado}</td><td>${r.match ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td></tr>`;
            });
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        } catch (e) {
            console.error('verifyCedula error', e);
            container.innerHTML = '<div class="text-danger">Error consultando SEP</div>';
        }
    }

    async function loadRequests() {
        try {
            const resp = await fetch('/api/admin/verification_requests', { credentials: 'include' });
            const data = await resp.json();
            if (!resp.ok) {
                console.error('Failed loading requests', data);
                alert('Error cargando solicitudes. Revisa la consola.');
                return;
            }

            const rows = data.requests || [];
            tbody.innerHTML = '';
            if (!rows.length) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="7" class="text-center text-muted">No hay solicitudes pendientes</td>';
                tbody.appendChild(tr);
                return;
            }

            rows.forEach(r => {
                const tr = document.createElement('tr');
                const idTd = document.createElement('td'); idTd.textContent = r.id;
                const userTd = document.createElement('td'); userTd.textContent = r.username || ('#' + r.user_id);
                const typeTd = document.createElement('td'); typeTd.textContent = r.validation_type || '';
                const numTd = document.createElement('td'); numTd.textContent = r.license_number || '';
                const sentTd = document.createElement('td'); sentTd.textContent = r.submitted_at || '';

                const docsTd = document.createElement('td');
                // Preview button (inline) instead of only download
                if (r.identity_document_path) {
                    const previewBtn = document.createElement('button');
                    previewBtn.className = 'btn btn-sm btn-outline-secondary me-1';
                    previewBtn.textContent = 'Ver identificación';
                    previewBtn.addEventListener('click', async () => {
                        // Toggle viewer row
                        const existing = document.getElementById('viewer-' + r.id);
                        if (existing) { existing.remove(); return; }
                        const viewerTr = document.createElement('tr');
                        viewerTr.id = 'viewer-' + r.id;
                        const viewerTd = document.createElement('td');
                        viewerTd.colSpan = 7;
                        viewerTd.innerHTML = '<div class="viewer-container p-2"><em>Cargando documento...</em></div>';
                        viewerTr.appendChild(viewerTd);
                        tr.parentNode.insertBefore(viewerTr, tr.nextSibling);
                        const container = viewerTd.querySelector('.viewer-container');
                        await previewDocument(r.id, 'identity', container);
                    });
                    docsTd.appendChild(previewBtn);
                }

                if (r.certificate_path) {
                    const previewCert = document.createElement('button');
                    previewCert.className = 'btn btn-sm btn-outline-secondary me-1';
                    previewCert.textContent = 'Ver certificado';
                    previewCert.addEventListener('click', async () => {
                        const existing = document.getElementById('viewer-' + r.id);
                        if (existing) { existing.remove(); return; }
                        const viewerTr = document.createElement('tr');
                        viewerTr.id = 'viewer-' + r.id;
                        const viewerTd = document.createElement('td');
                        viewerTd.colSpan = 7;
                        viewerTd.innerHTML = '<div class="viewer-container p-2"><em>Cargando documento...</em></div>';
                        viewerTr.appendChild(viewerTd);
                        tr.parentNode.insertBefore(viewerTr, tr.nextSibling);
                        const container = viewerTd.querySelector('.viewer-container');
                        await previewDocument(r.id, 'certificate', container);
                    });
                    docsTd.appendChild(previewCert);
                }

                const actionsTd = document.createElement('td');
                const verifyBtn = document.createElement('button');
                verifyBtn.className = 'btn btn-sm btn-outline-info me-1';
                verifyBtn.textContent = 'Verificar cédula (SEP)';
                verifyBtn.addEventListener('click', async () => {
                    // show result under row
                    const existing = document.getElementById('viewer-' + r.id);
                    if (existing) existing.remove();
                    const viewerTr = document.createElement('tr');
                    viewerTr.id = 'viewer-' + r.id;
                    const viewerTd = document.createElement('td');
                    viewerTd.colSpan = 7;
                    viewerTd.innerHTML = '<div class="viewer-container p-2"><em>Consultando SEP...</em></div>';
                    viewerTr.appendChild(viewerTd);
                    tr.parentNode.insertBefore(viewerTr, tr.nextSibling);
                    const container = viewerTd.querySelector('.viewer-container');
                    await verifyCedula(r.id, r.license_number, (r.full_name || (r.first_name && (r.first_name + ' ' + (r.last_name || '')).trim()) || ''), container);
                });

                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'btn btn-sm btn-success me-1';
                acceptBtn.textContent = 'Aceptar';
                acceptBtn.addEventListener('click', async () => {
                    const note = prompt('Nota para el usuario (opcional):', '');
                    if (!confirm('¿Confirmar aceptación de la solicitud #' + r.id + '?')) return;
                    try {
                        const resp = await fetch('/api/admin/verification_requests/' + r.id + '/accept', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ note })
                        });
                        const res = await resp.json();
                        if (!resp.ok) { console.error('accept error', res); alert('Error aceptando la solicitud'); return; }
                        alert('Solicitud aceptada. El usuario será notificado.');
                        loadRequests();
                    } catch (e) { console.error(e); alert('Error de red al aceptar.'); }
                });

                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn btn-sm btn-danger';
                rejectBtn.textContent = 'Rechazar';
                rejectBtn.addEventListener('click', async () => {
                    const note = prompt('Motivo del rechazo (opcional):', '');
                    if (!confirm('¿Confirmar rechazo de la solicitud #' + r.id + '?')) return;
                    try {
                        const resp = await fetch('/api/admin/verification_requests/' + r.id + '/reject', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ note })
                        });
                        const res = await resp.json();
                        if (!resp.ok) { console.error('reject error', res); alert('Error rechazando la solicitud'); return; }
                        alert('Solicitud rechazada. El usuario será notificado.');
                        loadRequests();
                    } catch (e) { console.error(e); alert('Error de red al rechazar.'); }
                });

                actionsTd.appendChild(verifyBtn);
                actionsTd.appendChild(acceptBtn);
                actionsTd.appendChild(rejectBtn);

                tr.appendChild(idTd);
                tr.appendChild(userTd);
                tr.appendChild(typeTd);
                tr.appendChild(numTd);
                tr.appendChild(sentTd);
                tr.appendChild(docsTd);
                tr.appendChild(actionsTd);

                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('loadRequests error', err);
            alert('Error cargando solicitudes. Revisa la consola.');
        }
    }

    viewBtn.addEventListener('click', async () => {
        await loadRequests();
        // Create modal instance on demand (bootstrap is loaded in footer)
        if (typeof bootstrap !== 'undefined' && modalEl) {
            const bsModal = new bootstrap.Modal(modalEl);
            bsModal.show();
        } else {
            // fallback: ensure element is visible
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
        }
    });
});