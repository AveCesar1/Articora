// forgot-password.js
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const steps = document.querySelectorAll('.recovery-step');
    const identifyForm = document.getElementById('identifyForm');
    const verifyRecoveryForm = document.getElementById('verifyRecoveryForm');
    const newPasswordForm = document.getElementById('newPasswordForm');
    const captchaCanvas = document.getElementById('captchaCanvas');
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
    const captchaInput = document.getElementById('captchaInput');
    const recoveryDigits = document.querySelectorAll('.recovery-digit');
    const recoveryCodeInput = document.getElementById('recoveryCode');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    const toggleNewPasswordBtn = document.getElementById('toggleNewPassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    const recoveryTimerCount = document.getElementById('recoveryTimerCount');
    const resendRecoveryBtn = document.getElementById('resendRecoveryBtn');
    const backToStep1Btn = document.getElementById('backToStep1');
    const backToStep2Btn = document.getElementById('backToStep2');
    
    // Variables de estado
    let currentStep = 1;
    let captchaText = '';
    let recoveryTimer;
    let recoveryTimeLeft = 15 * 60; // 15 minutos en segundos
    
    // Inicializar CAPTCHA
    function generateCaptcha() {
        const ctx = captchaCanvas.getContext('2d');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        captchaText = '';
        
        // Limpiar canvas
        ctx.fillStyle = '#f8f3e6';
        ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);
        
        // Generar texto aleatorio
        for (let i = 0; i < 6; i++) {
            captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Dibujar texto con distorsión
        ctx.font = 'bold 28px Arial';
        const rootStyles = getComputedStyle(document.documentElement);
        const primary = rootStyles.getPropertyValue('--primary-color').trim();
        ctx.fillStyle = primary;   // 👍 valid

        
        // Agregar distorsión
        for (let i = 0; i < captchaText.length; i++) {
            const x = 15 + i * 25;
            const y = 35 + Math.random() * 10 - 5;
            const rotation = Math.random() * 0.5 - 0.25;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }
        
        // Agregar líneas de ruido
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.lineTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
            ctx.strokeStyle = 'rgba(141, 110, 99, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    // Actualizar progreso de fortaleza de contraseña
    function updatePasswordStrength(password) {
        let strength = 0;
        
        // Longitud
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 10;
        
        // Complejidad
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;
        
        // Actualizar barra y texto
        passwordStrengthBar.style.width = `${strength}%`;
        
        if (strength < 50) {
            passwordStrengthBar.className = 'progress-bar bg-danger';
            passwordStrengthText.textContent = 'Fortaleza: Débil';
        } else if (strength < 75) {
            passwordStrengthBar.className = 'progress-bar bg-warning';
            passwordStrengthText.textContent = 'Fortaleza: Media';
        } else {
            passwordStrengthBar.className = 'progress-bar bg-success';
            passwordStrengthText.textContent = 'Fortaleza: Fuerte';
        }
    }
    
    // Cambiar entre pasos
    function goToStep(step) {
        steps.forEach(s => s.classList.remove('active'));
        document.getElementById(`step${step}`).classList.add('active');
        currentStep = step;
        
        // Iniciar temporizador en paso 2
        if (step === 2) {
            startRecoveryTimer();
        } else if (step === 3) {
            clearInterval(recoveryTimer);
        }
    }
    
    // Temporizador de recuperación
    function startRecoveryTimer() {
        recoveryTimeLeft = 15 * 60;
        
        recoveryTimer = setInterval(() => {
            recoveryTimeLeft--;
            
            const minutes = Math.floor(recoveryTimeLeft / 60);
            const seconds = recoveryTimeLeft % 60;
            
            recoveryTimerCount.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (recoveryTimeLeft <= 0) {
                clearInterval(recoveryTimer);
                recoveryTimerCount.textContent = '00:00';
                recoveryTimerCount.parentElement.innerHTML = '<span class="text-danger">El código ha expirado</span>';
                recoveryDigits.forEach(digit => {
                    digit.disabled = true;
                    digit.classList.add('bg-light');
                });
            }
        }, 1000);
    }
    
    // Mostrar alerta
    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Eliminar alertas anteriores
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        document.querySelector('.password-body').insertBefore(alertDiv, document.querySelector('.recovery-step.active'));
    }
    
    // Inicializar
    generateCaptcha();
    
    // Event Listeners
    
    // Refrescar CAPTCHA
    refreshCaptchaBtn.addEventListener('click', generateCaptcha);
    
    // Navegación entre dígitos del código de recuperación
    recoveryDigits.forEach((digit, index) => {
        digit.addEventListener('input', function() {
            // Actualizar valor oculto
            const code = Array.from(recoveryDigits).map(d => d.value).join('');
            recoveryCodeInput.value = code;
            
            // Mover al siguiente dígito
            if (this.value.length === 1 && index < recoveryDigits.length - 1) {
                recoveryDigits[index + 1].focus();
            }
        });
        
        digit.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' && index > 0) {
                recoveryDigits[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < recoveryDigits.length - 1) {
                recoveryDigits[index + 1].focus();
            } else if (e.key === 'Backspace' && !this.value && index > 0) {
                recoveryDigits[index - 1].focus();
            }
        });
    });

    const otpContainer = document.querySelector('.otp-input-container');
    if (otpContainer) {
        otpContainer.addEventListener('paste', function(e) {
            e.preventDefault();
            
            // Obtener el texto del portapapeles
            const pasteData = e.clipboardData.getData('text').trim();
            if (!pasteData) return;

            // Limpieza:
            const cleanCode = pasteData.replace(/\D/g, ''); 

            // Si el texto pegado tiene al menos 6 caracteres válidos
            if (cleanCode.length >= 6) {
                // Tomar solo los primeros 6 por seguridad
                const codeChars = cleanCode.substring(0, 6).split('');

                // Llenar cada uno de los 6 inputs con su carácter correspondiente
                recoveryDigits.forEach((input, index) => {
                    input.value = codeChars[index] || '';
                });

                // CTUALIZAR EL CAMPO OCULTO para el envío final del formulario
                const fullCode = Array.from(recoveryDigits).map(d => d.value).join('');
                recoveryCodeInput.value = fullCode;

                // Mover el foco al último input para mejor experiencia
                if (recoveryDigits.length > 0) {
                    recoveryDigits[recoveryDigits.length - 1].focus();
                }
            }
        });
    }
    
    // Mostrar/ocultar contraseñas
    toggleNewPasswordBtn.addEventListener('click', function() {
        const type = newPasswordInput.type === 'password' ? 'text' : 'password';
        newPasswordInput.type = type;
        this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
    
    toggleConfirmPasswordBtn.addEventListener('click', function() {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        this.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
    
    // Validar fortaleza de contraseña en tiempo real
    newPasswordInput.addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });
    
    // Paso 1: Identificación
    identifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userIdentifier = document.getElementById('userIdentifier').value.trim();
        const userCaptcha = captchaInput.value.trim();
        
        // Validaciones
        if (!userIdentifier) {
            showAlert('danger', 'Por favor, ingresa tu usuario o correo electrónico.');
            return;
        }
        
        if (!userCaptcha) {
            showAlert('danger', 'Por favor, ingresa el código CAPTCHA.');
            return;
        }
        
        if (userCaptcha !== captchaText) {
            showAlert('danger', 'El código CAPTCHA es incorrecto. Por favor, inténtalo de nuevo.');
            generateCaptcha();
            captchaInput.value = '';
            return;
        }
        
        // Enviar petición al servidor para generar código
        (async function() {
            try {
                const resp = await fetch('/forgot-password', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ identifier: userIdentifier })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data && data.message ? data.message : 'error');
                showAlert('info', 'Si existe una cuenta asociada, se ha enviado un código al correo.');
                setTimeout(() => { goToStep(2); }, 800);
            } catch (err) {
                console.error('forgot-password identify error', err);
                showAlert('danger', err.message || 'Error al solicitar código');
            }
        })();
    });
    
    // Paso 2: Verificación de código
    verifyRecoveryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const recoveryCode = recoveryCodeInput.value;
        
        if (recoveryCode.length !== 6) {
            showAlert('danger', 'Por favor, ingresa el código completo de 6 dígitos.');
            return;
        }
        
        if (recoveryTimeLeft <= 0) {
            showAlert('danger', 'El código ha expirado. Por favor, solicita uno nuevo.');
            return;
        }
        
        // Enviar código al servidor para verificar
        (async function() {
            try {
                const resp = await fetch('/forgot-password/verify', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ code: recoveryCode })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data && data.message ? data.message : 'invalid_code');
                showAlert('success', 'Código verificado correctamente.');
                setTimeout(() => { goToStep(3); }, 700);
            } catch (err) {
                console.error('forgot-password verify error', err);
                showAlert('danger', err.message || 'Código inválido');
            }
        })();
    });
    
    // Paso 3: Nueva contraseña
    newPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validaciones
        if (newPassword.length < 8) {
            showAlert('danger', 'La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showAlert('danger', 'Las contraseñas no coinciden. Por favor, verifica.');
            return;
        }
        
        // Enviar nueva contraseña al servidor (si existe clave privada desencriptada en localStorage, re-encriptarla primero)
        (async function() {
            try {
                const body = { newPassword };

                const localPriv = localStorage.getItem('articora_private_key');
                if (localPriv) {
                    try {
                        const enc = await encryptPrivateKeyWithPassword(localPriv, newPassword);
                        body.encryptedPrivateKey = enc.encryptedPrivateKey;
                        body.privateKeyIv = enc.iv;
                        body.privateKeySalt = enc.salt;
                        body.privateKeyTag = enc.tag;
                    } catch (encErr) {
                        console.error('Error re-encrypting local private key:', encErr);
                        showAlert('danger', 'No se pudo re-encriptar la clave privada local. Copia tu clave privada antes de continuar.');
                        return;
                    }
                }

                const resp = await fetch('/forgot-password/reset', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data && data.message ? data.message : 'error');
                showAlert('success', 'Contraseña actualizada exitosamente. Redirigiendo al inicio de sesión...');
                setTimeout(() => { window.location.href = '/login?passwordChanged=true'; }, 1000);
            } catch (err) {
                console.error('forgot-password reset error', err);
                showAlert('danger', err.message || 'No se pudo restablecer la contraseña');
            }
        })();
    });
    
    // Reenviar código de recuperación
    resendRecoveryBtn.addEventListener('click', function() {
        if (recoveryTimeLeft <= 0) {
            // Reiniciar temporizador si expiró
            startRecoveryTimer();
            recoveryDigits.forEach(digit => {
                digit.disabled = false;
                digit.classList.remove('bg-light');
                digit.value = '';
            });
            recoveryCodeInput.value = '';
        }
        // Llamar de nuevo al endpoint para solicitar reenvío
        (async () => {
            try {
                const resp = await fetch('/forgot-password', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ identifier: document.getElementById('userIdentifier').value.trim() })
                });
                await resp.json();
                showAlert('success', 'Se ha enviado un nuevo código a tu correo electrónico.');
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-clock me-1"></i> Código enviado';
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
                }, 30000);
            } catch (err) {
                console.error('resend recovery error', err);
                showAlert('danger', 'No se pudo reenviar el código. Intenta más tarde.');
            }
        })();
    });
    
    // Navegación hacia atrás
    backToStep1Btn.addEventListener('click', () => goToStep(1));
    backToStep2Btn.addEventListener('click', () => goToStep(2));
});