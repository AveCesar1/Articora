// chat-run: ejecución final, panel de información, envíos de reportes y estilo

initChat();

// Setup: offcanvas info panel and report submission handlers
(function setupInfoAndReports() {
    const infoOffcanvasEl = document.getElementById('chatInfoOffcanvas');
    const infoBody = document.getElementById('chatInfoBody');
    if (infoOffcanvasEl && infoBody) {
        infoOffcanvasEl.addEventListener('show.bs.offcanvas', async function () {
            infoBody.innerHTML = '<div class="text-center text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando...</div>';
            const chatId = currentChat && (currentChat.chatId || currentChat.id) ? (currentChat.chatId || currentChat.id) : 0;
            try {
                const resp = await fetch(`/api/chats/${chatId}/info`, { credentials: 'same-origin' });
                if (!resp.ok) throw new Error('No se pudo obtener la información');
                const body = await resp.json();
                if (body.type === 'individual') {
                    const u = body.user || {};
                    infoBody.innerHTML = `
                            <div class="text-center mb-3">
                                <img src="${u.avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(u.full_name || u.username) + '&background=8d6e63&color=fff')}" class="rounded-circle mb-2" width="80" height="80">
                                <h5 class="mb-0">${escapeHtml(u.full_name || u.username)}</h5>
                                <small class="text-muted">@${escapeHtml(u.username || '')}</small>
                            </div>
                            <div class="mb-3">
                                <strong>Correo (AES-256 cifrado):</strong>
                                <div class="small text-break">${escapeHtml(u.encryptedEmail || 'No disponible')}</div>
                            </div>
                            
                            <div class="mb-2">
                                <strong>Acciones:</strong>
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-primary me-2" id="startContactBtn">Enviar solicitud</button>
                                    <button class="btn btn-sm btn-outline-danger" id="reportUserFromInfo">Reportar</button>
                                </div>
                            </div>
                        `;

                    const reportBtn = document.getElementById('reportUserFromInfo');
                    if (reportBtn) {
                        reportBtn.addEventListener('click', () => {
                            const modalEl = document.getElementById('reportModal');
                            // Set hidden inputs
                            const ttype = document.getElementById('report_target_type');
                            const tid = document.getElementById('report_target_id');
                            if (ttype && tid) {
                                ttype.value = 'user';
                                tid.value = u.id || '';
                            }
                            const modal = new bootstrap.Modal(modalEl);
                            modal.show();
                        });
                    }

                } else if (body.type === 'group') {
                    const parts = body.participants || [];
                    let html = `<h5 class='mb-3'>${escapeHtml(body.name || 'Grupo')}</h5>`;
                    html += '<div class="list-group list-group-flush">';
                    for (const p of parts) {
                        html += `
                                <div class="list-group-item d-flex align-items-center">
                                    <img src="${p.profile_picture || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(p.full_name || p.username) + '&background=8d6e63&color=fff')}" width="40" height="40" class="rounded-circle me-3">
                                    <div>
                                        <div class="fw-bold">${escapeHtml(p.full_name || p.username)}</div>
                                        <small class="text-muted">@${escapeHtml(p.username || '')}</small>
                                    </div>
                                </div>
                            `;
                    }
                    html += '</div>';
                    infoBody.innerHTML = html;
                } else if (body.type === 'channel') {
                    infoBody.innerHTML = `<h5>Canal Artícora</h5><p class="text-muted">${escapeHtml(body.description || '')}</p>`;
                } else {
                    infoBody.innerHTML = '<div class="text-muted">Información no disponible</div>';
                }
            } catch (err) {
                console.error('Error cargando info del chat:', err);
                infoBody.innerHTML = `<div class="alert alert-danger">Error al obtener la información</div>`;
            }
        });
    }

    // Report modal: set target when opened (based on currentChat)
    const reportModalEl = document.getElementById('reportModal');
    if (reportModalEl) {
        reportModalEl.addEventListener('show.bs.modal', function () {
            const ttype = document.getElementById('report_target_type');
            const tid = document.getElementById('report_target_id');
            if (ttype && tid) {
                if (currentChat.type === 'individual') {
                    ttype.value = 'user';
                    tid.value = currentChat.id || '';
                } else if (currentChat.type === 'group') {
                    ttype.value = 'post';
                    tid.value = currentChat.id || currentChat.chatId || '';
                } else {
                    ttype.value = 'post';
                    tid.value = currentChat.chatId || currentChat.id || 0;
                }
            }
        });
    }

    // Handle report form submit
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const reason = (document.getElementById('reportReasonSelect') || {}).value || '';
            const description = (document.getElementById('reportDescription') || {}).value || '';
            const ttype = (document.getElementById('report_target_type') || {}).value || '';
            const tid = (document.getElementById('report_target_id') || {}).value || '';

            let body = { type: 'user', source_id: null, reported_user_id: null, comment_id: null, reason, description };
            if (ttype === 'user') {
                body.type = 'user';
                body.reported_user_id = Number(tid) || null;
            } else if (ttype === 'post') {
                body.type = 'post';
                body.source_id = Number(tid) || null;
            } else {
                body.type = 'user';
                body.reported_user_id = Number(tid) || null;
            }

            try {
                const resp = await fetch('/api/reports', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await resp.json();
                if (resp.ok && data && data.success) {
                    showNotification('Reporte enviado. Gracias por colaborar.', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
                    if (modal) modal.hide();
                } else {
                    throw new Error((data && data.message) || (data && data.error) || resp.statusText || 'Error');
                }
            } catch (err) {
                console.error('Error enviando reporte:', err);
                showNotification('Error al enviar el reporte: ' + (err.message || ''), 'error');
            }
        });
    }
})();

// Agregar CSS para animaciones
const style = document.createElement('style');
style.textContent = `
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
document.head.appendChild(style);