function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

onReady(function () {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    let publicKeyBase64 = null;
    let privateKeyBase64 = null;

    async function initCrypto() {
        try {
            // Verificar disponibilidad de Web Crypto
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API no disponible. Usa localhost o HTTPS.');
            }
            // Generar par RSA
            const keyPair = await generateRSAKeyPair();
            const privateKey = keyPair.privateKey;
            const publicKey = keyPair.publicKey;

            // Exportar
            publicKeyBase64 = await exportPublicKey(publicKey);
            privateKeyBase64 = await exportPrivateKey(privateKey);

            document.getElementById('publicKey').value = publicKeyBase64;

            // Guardar en localStorage
            localStorage.setItem('articora_private_key', privateKeyBase64);
            localStorage.setItem('articora_public_key', publicKeyBase64);

            // Asignar al campo oculto del formulario
            const publicKeyInput = document.getElementById('publicKey');
            if (publicKeyInput) {
                publicKeyInput.value = publicKeyBase64;
            }
        } catch (err) {
            console.error('Error generando claves RSA:', err);
            alert('No se pudo generar la clave de cifrado. Asegúrate de usar localhost o HTTPS.');
            // Deshabilitar el botón de registro para evitar envío sin claves
            const submitBtn = registerForm?.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
        }
    }

    // Iniciar generación de claves
    initCrypto();

    // Función para mostrar/ocultar contraseña
    window.togglePasswordVisibility = function (fieldId) {
        const field = document.getElementById(fieldId);
        const icon = field.nextElementSibling.querySelector('i');

        if (field.type === 'password') {
            field.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            field.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    if (registerForm) {
        registerForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            // Ocultar mensajes anteriores
            errorMessage.classList.add('d-none');
            successMessage.classList.add('d-none');

            // Validación de contraseñas en el cliente
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const publicKey = document.getElementById('publicKey').value;

            if (password !== confirmPassword) {
                showError('Las contraseñas no coinciden. Por favor, inténtalo de nuevo.');
                return;
            }

            // Validar términos y condiciones
            const termsCheckbox = document.getElementById('terms');
            if (!termsCheckbox.checked) {
                showError('Debes aceptar los Términos de servicio y la Política de privacidad.');
                return;
            }

            // Recolectar datos del formulario
            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: password,
                confirmPassword: confirmPassword,
                publicKey: publicKey
            };

            // Deshabilitar el botón para evitar doble envío
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando cuenta...';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                // Restaurar botón
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

                // En la parte donde manejas el éxito:
                if (result.success) {
                    // Mostrar mensaje de éxito
                    showSuccess(result.message);
                    
                    // Redirigir a página de verificación después de 2 segundos
                    setTimeout(() => {
                        if (result.redirectTo) {
                            window.location.href = result.redirectTo;
                        } else {
                            window.location.href = `/verify-email?email=${encodeURIComponent(formData.email)}`;
                        }
                    }, 2000);
                } else {
                    // Mostrar mensaje de error
                    showError(result.message);
                }

            } catch (error) {
                console.error('Error en la solicitud:', error);

                // Restaurar botón
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

                showError('Error de conexión. Por favor, verifica tu internet e inténtalo de nuevo.');
            }
        });
    }

    function showError(message) {
        const errorText = document.getElementById('error-text') || document.querySelector('#error-message span');
        if (errorText) errorText.textContent = message;
        errorMessage.classList.remove('d-none');
        successMessage.classList.add('d-none');
    }

    function showSuccess(message) {
        const successText = document.getElementById('success-text') || document.querySelector('#success-message span');
        if (successText) successText.textContent = message;
        successMessage.classList.remove('d-none');
        errorMessage.classList.add('d-none');
    }

    // --- Completar registro modal logic ---
    (function initCompleteModal() {
        const completeModalEl = document.getElementById('completeRegistrationModal');
        const completeForm = document.getElementById('completeRegistrationForm');
        const completeError = document.getElementById('complete-error');
        const completeSuccess = document.getElementById('complete-success');
        const completeSubmitBtn = document.getElementById('complete-submit-btn');

        // Interests UI elements
        const interestInput = document.getElementById('interestInput');
        const addInterestBtn = document.getElementById('addInterestBtn');
        const interestsList = document.getElementById('interestsList');
        let interestsArr = [];

        function renderInterests() {
            if (!interestsList) return;
            interestsList.innerHTML = '';
            interestsArr.forEach((it, idx) => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-light border rounded-pill me-1 mb-1 d-inline-flex align-items-center';
                badge.style.padding = '0.35rem 0.6rem';
                const text = document.createElement('span');
                text.textContent = it;
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'btn btn-sm btn-link text-danger ms-2';
                removeBtn.style.padding = '0';
                removeBtn.textContent = '×';
                removeBtn.setAttribute('aria-label', 'Quitar');
                removeBtn.addEventListener('click', () => { removeInterest(idx); });
                badge.appendChild(text);
                badge.appendChild(removeBtn);
                interestsList.appendChild(badge);
            });
        }

        function addInterestFromInput() {
            if (!interestInput) return;
            const v = interestInput.value.trim();
            if (!v) {
                showModalError('Ingresa un interés antes de agregar.');
                return;
            }
            if (v.length > 100) {
                showModalError('Interés demasiado largo (máx. 100 caracteres).');
                return;
            }
            if (interestsArr.includes(v)) {
                showModalError('Ya añadiste ese interés.');
                return;
            }
            interestsArr.push(v);
            interestInput.value = '';
            renderInterests();
        }

        function removeInterest(idx) {
            interestsArr.splice(idx, 1);
            renderInterests();
        }

        if (addInterestBtn) addInterestBtn.addEventListener('click', addInterestFromInput);
        if (interestInput) interestInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInterestFromInput();
            }
        });

        function showModalError(message) {
            if (!completeError) return;
            completeError.textContent = message;
            completeError.classList.remove('d-none');
            if (completeSuccess) completeSuccess.classList.add('d-none');
        }

        function showModalSuccess(message) {
            if (!completeSuccess) return;
            completeSuccess.textContent = message;
            completeSuccess.classList.remove('d-none');
            if (completeError) completeError.classList.add('d-none');
        }

        async function submitCompleteForm(ev) {
            ev.preventDefault();
            if (completeError) completeError.classList.add('d-none');
            if (completeSuccess) completeSuccess.classList.add('d-none');

            const firstName = (document.getElementById('firstName')?.value || '').trim();
            const lastName = (document.getElementById('lastName')?.value || '').trim();
            const academicLevel = (document.getElementById('academicLevel')?.value || '').trim();
            const institution = (document.getElementById('institution')?.value || '').trim();
            const department = (document.getElementById('department')?.value || '').trim();
            const availableForMessages = !!document.getElementById('availableForMessages')?.checked;
            const bio = (document.getElementById('bio')?.value || '').trim();

            if (firstName.length > 50 || lastName.length > 50) {
                showModalError('Nombre o apellido demasiado largo (máx. 50 caracteres).');
                return;
            }
            if (bio.length > 1000) {
                showModalError('Biografía demasiado larga (máx. 1000 caracteres).');
                return;
            }

            // Validate interests (min 3)
            if (!Array.isArray(interestsArr) || interestsArr.length < 3) {
                showModalError('Por favor añade al menos 3 intereses.');
                return;
            }

            const origText = completeSubmitBtn ? completeSubmitBtn.innerHTML : null;
            if (completeSubmitBtn) {
                completeSubmitBtn.disabled = true;
                completeSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            }

            try {
                const response = await fetch('/complete-registration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, academicLevel, institution, department, availableForMessages, bio, interests: interestsArr })
                });

                const result = await response.json();
                if (completeSubmitBtn) {
                    completeSubmitBtn.disabled = false;
                    completeSubmitBtn.innerHTML = origText;
                }

                if (result.success) {
                    showModalSuccess(result.message || 'Registro completado.');
                    setTimeout(() => {
                        if (result.redirectTo) window.location.href = result.redirectTo;
                        else window.location.href = '/login';
                    }, 900);
                } else {
                    showModalError(result.message || 'Error del servidor.');
                }
            } catch (err) {
                console.error('Error en complete-registration:', err);
                if (completeSubmitBtn) {
                    completeSubmitBtn.disabled = false;
                    completeSubmitBtn.innerHTML = origText;
                }
                showModalError('Error de conexión. Por favor intenta de nuevo.');
            }
        }

        // Show modal if URL has postVerify=1
        try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('postVerify')) {
                if (completeModalEl) {
                    const show = () => {
                        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
                            setTimeout(show, 100);
                            return;
                        }
                        const bsModal = new bootstrap.Modal(completeModalEl);
                        bsModal.show();
                    };
                    show();
                }
            }
        } catch (err) {
            console.debug('No se pudo procesar URLSearchParams', err);
        }

        if (completeForm) completeForm.addEventListener('submit', submitCompleteForm);
    })();
});