// profile-config.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar pestañas de Bootstrap
    const tabTriggers = document.querySelectorAll('.config-menu-item[data-bs-toggle="tab"]');
    tabTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            
            // Actualizar clases activas
            tabTriggers.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar pestaña objetivo
            const tabPane = document.querySelector(target);
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            tabPane.classList.add('show', 'active');
        });
    });

    // Contador de caracteres para biografía
    const bioTextarea = document.getElementById('bio');
    const bioCounter = document.getElementById('bioCounter');
    
    if (bioTextarea && bioCounter) {
        bioCounter.textContent = bioTextarea.value.length;
        
        bioTextarea.addEventListener('input', function() {
            bioCounter.textContent = this.value.length;
            
            if (this.value.length > 500) {
                this.value = this.value.substring(0, 500);
                bioCounter.textContent = 500;
            }
        });
    }

    // Gestión de intereses
    const newInterestInput = document.getElementById('newInterest');
    const addInterestBtn = document.getElementById('addInterestBtn');
    const interestsContainer = document.querySelector('.interests-edit-container');
    
    function addInterestTag(interestText) {
        if (!interestText.trim()) return;
        
        const tag = document.createElement('span');
        tag.className = 'interest-tag';
        tag.innerHTML = `
            ${interestText.trim()}
            <button type="button" class="btn-close btn-close-white" aria-label="Eliminar"></button>
        `;
        
        tag.querySelector('button').addEventListener('click', function() {
            tag.remove();
        });
        
        // Insertar antes del input group
        const inputGroup = interestsContainer.querySelector('.input-group');
        interestsContainer.insertBefore(tag, inputGroup);
        
        newInterestInput.value = '';
    }
    
    if (addInterestBtn && newInterestInput) {
        addInterestBtn.addEventListener('click', function() {
            addInterestTag(newInterestInput.value);
        });
        
        newInterestInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInterestTag(this.value);
            }
        });
    }
    
    // Eliminar etiquetas de interés existentes
    document.querySelectorAll('.interest-tag .btn-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.interest-tag').remove();
        });
    });

    // Verificación académica
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
        verificationFormContainer.style.display = 'block';
        verificationTypeInput.value = type;
        
        // Mostrar campos apropiados
        if (type === 'cedula') {
            cedulaFields.style.display = 'block';
            certificadosFields.style.display = 'none';
            verificationFormTitle.textContent = 'Verificación con Cédula Profesional';
        } else {
            cedulaFields.style.display = 'none';
            certificadosFields.style.display = 'block';
            verificationFormTitle.textContent = 'Verificación con Certificados Académicos';
        }
        
        // Desplazar a la vista
        verificationFormContainer.scrollIntoView({ behavior: 'smooth' });
    }

    if (cedulaBtn) {
        cedulaBtn.addEventListener('click', () => showVerificationForm('cedula'));
    }
    
    if (certificadosBtn) {
        certificadosBtn.addEventListener('click', () => showVerificationForm('certificados'));
    }

    if (cancelVerificationBtn) {
        cancelVerificationBtn.addEventListener('click', function() {
            verificationFormContainer.style.display = 'none';
            if (academicVerificationForm) {
                academicVerificationForm.reset();
            }
        });
    }

    // Validación de formulario de verificación
    if (academicVerificationForm) {
        academicVerificationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const verificationType = verificationTypeInput.value;
            const documentFile = document.getElementById('documentFile').files[0];
            const academicDocumentFile = document.getElementById('academicDocumentFile').files[0];
            const termsAccepted = document.getElementById('verificationTerms').checked;
            
            // Validaciones básicas
            if (!documentFile || !academicDocumentFile) {
                alert('Por favor, sube todos los documentos requeridos.');
                return;
            }
            
            if (!termsAccepted) {
                alert('Debes aceptar los términos de verificación.');
                return;
            }
            
            // Validación de tamaño de archivos (simulada)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (documentFile.size > maxSize || academicDocumentFile.size > maxSize) {
                alert('Los archivos no deben exceder los 5MB.');
                return;
            }
            
            // Simular envío
            alert(`Solicitud de verificación enviada. El proceso tomará ${verificationType === 'cedula' ? '72 horas' : '7 días'} máximo. Recibirás notificaciones en el canal oficial "Artícora".`);
            
            // Resetear formulario
            academicVerificationForm.reset();
            verificationFormContainer.style.display = 'none';
        });
    }

    // Cambio de contraseña
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    // Funciones para mostrar/ocultar contraseña
    function setupPasswordToggle(toggleBtnId, passwordInputId) {
        const toggleBtn = document.getElementById(toggleBtnId);
        const passwordInput = document.getElementById(passwordInputId);
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function() {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            });
        }
    }
    
    setupPasswordToggle('toggleCurrentPassword', 'currentPassword');
    setupPasswordToggle('toggleNewPassword', 'newPassword');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    // Validación de fortaleza de contraseña
    if (newPasswordInput && strengthBar && strengthText) {
        const requirements = {
            length: document.getElementById('reqLength'),
            uppercase: document.getElementById('reqUppercase'),
            lowercase: document.getElementById('reqLowercase'),
            number: document.getElementById('reqNumber'),
            special: document.getElementById('reqSpecial')
        };
        
        function checkPasswordStrength(password) {
            let score = 0;
            let strength = 0;
            
            // Longitud
            if (password.length >= 8) {
                score++;
                requirements.length.classList.add('met');
                requirements.length.classList.remove('unmet');
                requirements.length.querySelector('i').className = 'fas fa-check-circle text-success me-2';
            } else {
                requirements.length.classList.remove('met');
                requirements.length.classList.add('unmet');
                requirements.length.querySelector('i').className = 'fas fa-circle text-muted me-2';
            }
            
            // Mayúsculas
            if (/[A-Z]/.test(password)) {
                score++;
                requirements.uppercase.classList.add('met');
                requirements.uppercase.classList.remove('unmet');
                requirements.uppercase.querySelector('i').className = 'fas fa-check-circle text-success me-2';
            } else {
                requirements.uppercase.classList.remove('met');
                requirements.uppercase.classList.add('unmet');
                requirements.uppercase.querySelector('i').className = 'fas fa-circle text-muted me-2';
            }
            
            // Minúsculas
            if (/[a-z]/.test(password)) {
                score++;
                requirements.lowercase.classList.add('met');
                requirements.lowercase.classList.remove('unmet');
                requirements.lowercase.querySelector('i').className = 'fas fa-check-circle text-success me-2';
            } else {
                requirements.lowercase.classList.remove('met');
                requirements.lowercase.classList.add('unmet');
                requirements.lowercase.querySelector('i').className = 'fas fa-circle text-muted me-2';
            }
            
            // Números
            if (/[0-9]/.test(password)) {
                score++;
                requirements.number.classList.add('met');
                requirements.number.classList.remove('unmet');
                requirements.number.querySelector('i').className = 'fas fa-check-circle text-success me-2';
            } else {
                requirements.number.classList.remove('met');
                requirements.number.classList.add('unmet');
                requirements.number.querySelector('i').className = 'fas fa-circle text-muted me-2';
            }
            
            // Símbolos
            if (/[^A-Za-z0-9]/.test(password)) {
                score++;
                requirements.special.classList.add('met');
                requirements.special.classList.remove('unmet');
                requirements.special.querySelector('i').className = 'fas fa-check-circle text-success me-2';
            } else {
                requirements.special.classList.remove('met');
                requirements.special.classList.add('unmet');
                requirements.special.querySelector('i').className = 'fas fa-circle text-muted me-2';
            }
            
            // Calcular fortaleza
            strength = (score / 5) * 100;
            
            // Actualizar barra y texto
            strengthBar.style.width = `${strength}%`;
            
            if (strength < 40) {
                strengthBar.className = 'progress-bar bg-danger';
                strengthText.textContent = 'Débil';
            } else if (strength < 70) {
                strengthBar.className = 'progress-bar bg-warning';
                strengthText.textContent = 'Media';
            } else {
                strengthBar.className = 'progress-bar bg-success';
                strengthText.textContent = 'Fuerte';
            }
            
            return { score, strength };
        }
        
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }

    // Validación del formulario de cambio de contraseña
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validaciones
            if (!currentPassword) {
                alert('Por favor, ingresa tu contraseña actual.');
                return;
            }
            
            if (newPassword.length < 8) {
                alert('La nueva contraseña debe tener al menos 8 caracteres.');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('Las nuevas contraseñas no coinciden.');
                return;
            }
            
            // Simular cambio de contraseña
            alert('Contraseña cambiada exitosamente. En una implementación real, esto enviaría los datos al servidor.');
            
            // Resetear formulario
            changePasswordForm.reset();
            if (strengthBar) {
                strengthBar.style.width = '0%';
                strengthText.textContent = 'Débil';
            }
            
            // Resetear iconos de requisitos
            document.querySelectorAll('.requirement i').forEach(icon => {
                icon.className = 'fas fa-circle text-muted me-2';
            });
        });
    }

    // Manejo de otros formularios
    const forms = [
        'editProfileForm',
        'privacySettingsForm',
        'dashboardSettingsForm',
        'notificationSettingsForm'
    ];
    
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                alert('Configuración guardada (simulación). En una implementación real, los datos se enviarían al servidor.');
            });
        }
    });

    // Carga de imagen de perfil
    const profilePictureInput = document.getElementById('profilePicture');
    const removePictureBtn = document.getElementById('removePicture');
    const profileAvatar = document.querySelector('.profile-avatar-edit');
    
    if (profilePictureInput && profileAvatar) {
        profilePictureInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (file) {
                if (!file.type.match('image.*')) {
                    alert('Por favor, selecciona una imagen válida.');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileAvatar.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removePictureBtn && profileAvatar) {
        removePictureBtn.addEventListener('click', function() {
            profileAvatar.src = `https://placehold.co/200x200/2c1810/e0d6c2?text=${profileAvatar.alt.charAt(0)}`;
            if (profilePictureInput) {
                profilePictureInput.value = '';
            }
        });
    }
});