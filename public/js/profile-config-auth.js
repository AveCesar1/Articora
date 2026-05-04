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

        if (type === 'cedula') {
            if (cedulaFields) cedulaFields.style.display = 'block';
            if (certificadosFields) certificadosFields.style.display = 'none';
            if (verificationFormTitle) verificationFormTitle.textContent = 'Verificación con Cédula Profesional';
        } else {
            if (cedulaFields) cedulaFields.style.display = 'none';
            if (certificadosFields) certificadosFields.style.display = 'block';
            if (verificationFormTitle) verificationFormTitle.textContent = 'Verificación con Certificados Académicos';
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
                if (!documentFile || !academicDocumentFile) {
                    alert('Por favor, sube todos los documentos requeridos. (Debug: revisa consola y pestaña Network)');
                    return;
                }

                if (!termsAccepted) {
                    alert('Debes aceptar los términos de verificación.');
                    return;
                }

                const maxSize = 5 * 1024 * 1024; // 5MB
                if (documentFile.size > maxSize || academicDocumentFile.size > maxSize) {
                    alert('Los archivos no deben exceder los 5MB.');
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

                // If verification type is 'cedula' and a cedula number was provided, use the automatic API
                if (verificationType === 'cedula') {
                    const cedulaInput = academicVerificationForm.querySelector('#cedulaNumber');
                    const cedulaValue = cedulaInput ? cedulaInput.value.trim() : '';
                    if (!/^[0-9]{5,8}$/.test(cedulaValue)) {
                        alert('Número de cédula inválido. Debe contener entre 5 y 8 dígitos.');
                        return;
                    }

                    console.debug('[profile-config-auth] usando verificación automática por cédula:', cedulaValue);
                    try {
                        const resp = await fetch('/verificacion/cedula', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cedula: cedulaValue })
                        });

                        let data;
                        try { data = await resp.json(); } catch (e) { data = null; }

                        if (!resp.ok) {
                            console.error('[profile-config-auth] verificacion cedula fallo', resp.status, data);
                            if (data && data.message) alert(`Error: ${data.message}`);
                            else alert('No fue posible verificar la cédula. Intenta más tarde.');
                            return;
                        }

                        if (data && data.validated) {
                            alert('Tu cédula ha sido verificada con éxito. Tu cuenta ha sido validada.');
                            if (academicVerificationForm) {
                                academicVerificationForm.reset();
                                if (verificationFormContainer) verificationFormContainer.style.display = 'none';
                            }
                        } else {
                            alert('Los datos no coinciden. Si crees que esto es un error, intenta la verificación manual.');
                        }
                        return;
                    } catch (err) {
                        console.error('[profile-config-auth] fetch /verificacion/cedula error', err);
                        alert('No se pudo conectar con el servidor de verificación. Intenta más tarde.');
                        return;
                    }
                }

                // Build FormData and ensure only one fetch call
                const fd = new FormData();
                fd.append('documento', academicDocumentFile);
                // Also include the other file under a different field name for reference
                fd.append('extra_document', documentFile);
                fd.append('tipo', verificationType);

                // Debug before sending
                console.debug('[profile-config-auth] about to send fetch /verificacion/subir with formdata');

                // Send request with credentials so cookie session (if any) is included
                let didSend = false;
                try {
                    const resp = await fetch('/verificacion/subir', {
                        method: 'POST',
                        body: fd,
                        credentials: 'include'
                    });
                    didSend = true;
                    console.debug('[profile-config-auth] fetch returned status', resp.status);

                    let data;
                    try { data = await resp.json(); } catch (e) { data = null; }

                    if (!resp.ok) {
                        console.error('[profile-config-auth] server error response', resp.status, data);
                        alert((data && data.error) ? `Error: ${data.error}` : 'Error al subir los documentos. Revisa la consola.');
                        return;
                    }

                    console.log('[profile-config-auth] upload success', data);
                    alert(`Solicitud de verificación enviada. El proceso tomará ${verificationType === 'cedula' ? '72 horas' : '7 días'} máximo.`);

                    if (academicVerificationForm) {
                        academicVerificationForm.reset();
                        if (verificationFormContainer) verificationFormContainer.style.display = 'none';
                    }
                } catch (fetchErr) {
                    console.error('[profile-config-auth] fetch failed', fetchErr);
                    if (!didSend) {
                        alert('No se pudo enviar la petición al servidor. Revisa la consola y la pestaña Network.');
                    }
                }
            } catch (err) {
                console.error('[profile-config-auth] unexpected error during submission:', err);
                alert('Error inesperado al enviar la verificación. Revisa la consola del navegador.');
            }
        });
    }

});