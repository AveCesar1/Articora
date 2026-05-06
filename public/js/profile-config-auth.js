// profile-config-auth.js
// Handles academic verification UI and submission (separate from main profile-config.js)
document.addEventListener('DOMContentLoaded', function() {
    const cedulaBtn = document.querySelector('[data-verification-type="cedula"]');
    const certificadosBtn = document.querySelector('[data-verification-type="certificados"]');
    const verificationFormContainer = document.getElementById('verificationFormContainer');
    const cancelVerificationBtn = document.getElementById('cancelVerification');
    const verificationTypeInput = document.getElementById('verificationType');
    const cedulaFields = document.getElementById('cedulaFields');
    const certificadosFields = document.getElementById('certificadosFields');
    const verificationFormTitle = document.getElementById('verificationFormTitle');
    const academicVerificationForm = document.getElementById('academicVerificationForm');

    function showVerificationForm(type) {
        if (!verificationFormContainer) return;
        verificationFormContainer.style.display = 'block';
        if (verificationTypeInput) verificationTypeInput.value = type;
        const acadInput = document.getElementById('academicDocumentFile');
        const docInput = document.getElementById('documentFile');

        if (type === 'cedula') {
            if (cedulaFields) cedulaFields.style.display = 'block';
            if (certificadosFields) certificadosFields.style.display = 'none';
            if (verificationFormTitle) verificationFormTitle.textContent = 'Verificación con Cédula Profesional';
            // For cedula flow only identity doc is required
            if (docInput) { docInput.disabled = false; docInput.required = true; }
            if (acadInput) { acadInput.disabled = true; acadInput.required = false; }
        } else {
            if (cedulaFields) cedulaFields.style.display = 'none';
            if (certificadosFields) certificadosFields.style.display = 'block';
            if (verificationFormTitle) verificationFormTitle.textContent = 'Verificación con Certificados Académicos';
            // For certificates both files are needed
            if (docInput) { docInput.disabled = false; docInput.required = true; }
            if (acadInput) { acadInput.disabled = false; acadInput.required = true; }
        }
        verificationFormContainer.scrollIntoView({ behavior: 'smooth' });
    }

    if (cedulaBtn) cedulaBtn.addEventListener('click', () => showVerificationForm('cedula'));
    if (certificadosBtn) certificadosBtn.addEventListener('click', () => showVerificationForm('certificados'));
    if (cancelVerificationBtn) cancelVerificationBtn.addEventListener('click', () => {
        if (verificationFormContainer) verificationFormContainer.style.display = 'none';
        if (academicVerificationForm) academicVerificationForm.reset();
    });

    // Submission: build FormData and POST with credentials, with verbose logging for debugging
    if (academicVerificationForm) {
        academicVerificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
                // Read inputs from the form scope to avoid duplicated IDs elsewhere
                const docInput = academicVerificationForm.querySelector('#documentFile');
                const acadInput = academicVerificationForm.querySelector('#academicDocumentFile');
                const verificationType = (verificationTypeInput && verificationTypeInput.value) || 'certificados';
                const documentFile = docInput && docInput.files && docInput.files[0] ? docInput.files[0] : null;
                const academicDocumentFile = acadInput && acadInput.files && acadInput.files[0] ? acadInput.files[0] : null;
                const termsAccepted = academicVerificationForm.querySelector('#verificationTerms') ? academicVerificationForm.querySelector('#verificationTerms').checked : false;

                // Extra debug: log counts and names
                console.debug('[profile-config-auth] submit pressed - form file counts', {
                    docFiles: docInput ? docInput.files.length : 0,
                    acadFiles: acadInput ? acadInput.files.length : 0
                });
                if (documentFile) console.debug('[profile-config-auth] documentFile', documentFile.name, documentFile.size, documentFile.type);
                if (academicDocumentFile) console.debug('[profile-config-auth] academicDocumentFile', academicDocumentFile.name, academicDocumentFile.size, academicDocumentFile.type);

                // Basic validations
                if (!termsAccepted) {
                    alert('Debes aceptar los términos de verificación.');
                    return;
                }

                const maxSize = 5 * 1024 * 1024; // 5MB
                if (documentFile && documentFile.size > maxSize) {
                    alert('El archivo de identificación no debe exceder los 5MB.');
                    return;
                }
                if (academicDocumentFile && academicDocumentFile.size > maxSize) {
                    alert('El archivo académico no debe exceder los 5MB.');
                    return;
                }

                // Visual hint: show selected file names near the form (if container present)
                try {
                    const hintContainer = academicVerificationForm.querySelector('.selected-files-hint');
                    const hintText = `Archivos: ${academicDocumentFile.name} , ${documentFile.name}`;
                    if (hintContainer) {
                        hintContainer.textContent = hintText;
                    } else {
                        const span = document.createElement('div');
                        span.className = 'selected-files-hint mb-2 text-muted small';
                        span.textContent = hintText;
                        academicVerificationForm.insertBefore(span, academicVerificationForm.firstChild);
                    }
                } catch (e) { /* non-fatal */ }

                // Decide required files per verification type
                if (verificationType === 'cedula') {
                    const cedulaInput = academicVerificationForm.querySelector('#cedulaNumber');
                    const cedulaValue = cedulaInput ? cedulaInput.value.trim() : '';
                    if (!/^[0-9]{5,8}$/.test(cedulaValue)) {
                        alert('Número de cédula inválido. Debe contener entre 5 y 8 dígitos.');
                        return;
                    }
                    if (!documentFile) {
                        alert('Por favor sube tu documento de identificación (INE/pasaporte).');
                        return;
                    }

                    // Prepare FormData and attach cedula + identification file
                    const fd = new FormData();
                    fd.append('documento', documentFile);
                    fd.append('tipo', 'ine');
                    fd.append('cedula', cedulaValue);

                    // Send request to create a verification request (admin will validate later)
                    try {
                        const resp = await fetch('/verificacion/subir', { method: 'POST', body: fd, credentials: 'include' });
                        let data = null;
                        try { data = await resp.json(); } catch (e) { }
                        if (!resp.ok) {
                            console.error('[profile-config-auth] upload error', resp.status, data);
                            alert((data && data.error) ? `Error: ${data.error}` : 'Error al enviar la solicitud de verificación.');
                            return;
                        }
                        alert('Solicitud de verificación enviada. Un administrador revisará tu cédula y te notificará.');
                        if (academicVerificationForm) { academicVerificationForm.reset(); if (verificationFormContainer) verificationFormContainer.style.display = 'none'; }
                        // refresh my requests list
                        if (typeof loadMyRequests === 'function') loadMyRequests();
                        return;
                    } catch (err) {
                        console.error('[profile-config-auth] fetch /verificacion/subir error', err);
                        alert('No se pudo enviar la solicitud. Intenta más tarde.');
                        return;
                    }
                }

                // For certificados (manual flow) require both files
                if (!documentFile || !academicDocumentFile) {
                    alert('Por favor, sube todos los documentos requeridos para la verificación por certificados.');
                    return;
                }

                const fd = new FormData();
                fd.append('documento', academicDocumentFile);
                fd.append('extra_document', documentFile);
                fd.append('tipo', verificationType);

                console.debug('[profile-config-auth] about to send fetch /verificacion/subir with formdata');
                try {
                    const resp = await fetch('/verificacion/subir', { method: 'POST', body: fd, credentials: 'include' });
                    let data = null;
                    try { data = await resp.json(); } catch (e) { }
                    if (!resp.ok) {
                        console.error('[profile-config-auth] server error response', resp.status, data);
                        alert((data && data.error) ? `Error: ${data.error}` : 'Error al subir los documentos.');
                        return;
                    }
                    alert('Solicitud de verificación enviada. Un administrador la revisará y te notificará.');
                    if (academicVerificationForm) { academicVerificationForm.reset(); if (verificationFormContainer) verificationFormContainer.style.display = 'none'; }
                    if (typeof loadMyRequests === 'function') loadMyRequests();
                } catch (fetchErr) {
                    console.error('[profile-config-auth] fetch failed', fetchErr);
                    alert('No se pudo enviar la petición al servidor. Revisa la consola y la pestaña Network.');
                }
            } catch (err) {
                console.error('[profile-config-auth] unexpected error during submission:', err);
                alert('Error inesperado al enviar la verificación. Revisa la consola del navegador.');
            }
        });
    }

    // Load current user's verification requests and render them
    async function loadMyRequests() {
        try {
            const resp = await fetch('/verificacion/my_requests', { credentials: 'include' });
            const data = await resp.json();
            const container = document.getElementById('myVerificationRequests');
            if (!container) return;
            if (!resp.ok) {
                container.innerHTML = '<div class="text-danger">Error cargando solicitudes</div>';
                return;
            }
            const rows = data.requests || [];
            if (!rows.length) { container.innerHTML = '<div class="text-muted">No tienes solicitudes pendientes.</div>'; return; }
            const list = document.createElement('div');
            list.className = 'list-group';
            rows.forEach(r => {
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-start';
                const left = document.createElement('div');
                left.innerHTML = `<div><strong>#${r.id}</strong> ${r.validation_type || ''} - ${r.license_number || ''}</div><div class="small text-muted">Enviado: ${r.submitted_at || ''} | Estado: ${r.status || ''}</div>`;
                const right = document.createElement('div');
                if (r.status === 'pending') {
                    const cancel = document.createElement('button');
                    cancel.className = 'btn btn-sm btn-outline-danger';
                    cancel.textContent = 'Cancelar solicitud';
                    cancel.addEventListener('click', async () => {
                        if (!confirm('¿Deseas cancelar la solicitud #' + r.id + '?')) return;
                        try {
                            const res = await fetch('/verificacion/cancel/' + r.id, { method: 'POST', credentials: 'include' });
                            const body = await res.json();
                            if (!res.ok) { alert('Error cancelando: ' + (body && body.message ? body.message : res.status)); return; }
                            alert('Solicitud cancelada.');
                            loadMyRequests();
                        } catch (e) { console.error('cancel error', e); alert('Error de red al cancelar.'); }
                    });
                    right.appendChild(cancel);
                }
                item.appendChild(left);
                item.appendChild(right);
                list.appendChild(item);
            });
            container.innerHTML = ''; container.appendChild(list);
        } catch (e) {
            console.error('loadMyRequests error', e);
        }
    }

    // Load on page load
    try { if (typeof loadMyRequests === 'function') loadMyRequests(); } catch (e) { /* ignore */ }

});