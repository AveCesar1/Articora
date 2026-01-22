// verify-email.js
document.addEventListener('DOMContentLoaded', function() {
    const otpDigits = document.querySelectorAll('.otp-digit');
    const otpCodeInput = document.getElementById('otpCode');
    const verifyForm = document.getElementById('verifyForm');
    const timerCount = document.getElementById('timerCount');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const resendLink = document.getElementById('resendLink');
    const emailInput = document.getElementById('email');
    
    // Auto-focus en el primer dígito
    if (otpDigits.length) otpDigits[0].focus();
    
    // Manejar navegación entre dígitos OTP
    otpDigits.forEach((digit, index) => {
        digit.addEventListener('input', function(e) {
            // Asegurar solo un carácter y solo dígitos
            this.value = this.value.replace(/\D/g, '').slice(0,1);

            // Actualizar el valor oculto
            updateOtpValue();
            
            // Mover al siguiente dígito si hay valor
            if (this.value.length === 1 && index < otpDigits.length - 1) {
                otpDigits[index + 1].focus();
            }
        });
        
        digit.addEventListener('keydown', function(e) {
            // Permitir navegación con flechas
            if (e.key === 'ArrowLeft' && index > 0) {
                otpDigits[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < otpDigits.length - 1) {
                otpDigits[index + 1].focus();
            } else if (e.key === 'Backspace' && !this.value && index > 0) {
                // Retroceder si está vacío y se presiona backspace
                otpDigits[index - 1].focus();
            }
        });

        // Manejar pegado (paste) para permitir pegar todo el código y que se distribuya
        digit.addEventListener('paste', function(e) {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
            const onlyDigits = pasteData.replace(/\D/g, '').split('');
            if (onlyDigits.length === 0) return;

            for (let i = 0; i < onlyDigits.length && (index + i) < otpDigits.length; i++) {
                otpDigits[index + i].value = onlyDigits[i];
            }

            // Actualizar valor oculto y enfocar el último campo llenado
            updateOtpValue();
            const lastFilled = Math.min(index + onlyDigits.length - 1, otpDigits.length - 1);
            otpDigits[lastFilled].focus();
        });
    });
    
    // Función para actualizar el valor OTP oculto
    function updateOtpValue() {
        const otp = Array.from(otpDigits).map(digit => digit.value).join('');
        if (otpCodeInput) otpCodeInput.value = otp;
    }
    
    // Temporizador OTP
    let timeLeft = 10 * 60; // 10 minutos en segundos
    const timerInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        if (timerCount) timerCount.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (timerCount) timerCount.textContent = '00:00';
            if (timerCount && timerCount.parentElement) timerCount.parentElement.innerHTML = '<span class="text-danger">El código ha expirado</span>';
            otpDigits.forEach(digit => {
                digit.disabled = true;
                digit.classList.add('bg-light');
            });
            if (resendOtpBtn) {
                resendOtpBtn.disabled = false;
                resendOtpBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
            }
        }
    }, 1000);
    
    // Manejar reenvío de OTP (botón)
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', function() {
            if (this.disabled) return;
            const email = emailInput ? emailInput.value : null;
            if (!email) {
                showAlert('danger', 'Email no disponible. Recarga la página.');
                return;
            }

            // Enviar petición al servidor para reenviar
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-clock me-1"></i> Enviando...';

            fetch('/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    // Resetear temporizador local
                    timeLeft = 10 * 60;
                    const minutes = Math.floor(timeLeft / 60);
                    const seconds = timeLeft % 60;
                    if (timerCount) timerCount.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                    otpDigits.forEach(digit => {
                        digit.disabled = false;
                        digit.classList.remove('bg-light');
                        digit.value = '';
                    });
                    updateOtpValue();

                    showAlert('success', 'Se ha enviado un nuevo código (revisa la terminal).');

                    // Volver a habilitar el botón después de 30s
                    setTimeout(() => {
                        resendOtpBtn.disabled = false;
                        resendOtpBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
                    }, 30000);
                } else {
                    showAlert('danger', data.message || 'No se pudo reenviar el código.');
                    resendOtpBtn.disabled = false;
                    resendOtpBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
                }
            })
            .catch(err => {
                console.error('Error al reenviar:', err);
                showAlert('danger', 'Error de conexión al reenviar.');
                resendOtpBtn.disabled = false;
                resendOtpBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
            });
        });
    }

    // Manejar reenvío desde el enlace
    if (resendLink) {
        resendLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (resendOtpBtn) resendOtpBtn.click();
        });
    }
    
    // Manejar envío del formulario -> enviar al servidor
    if (verifyForm) {
        verifyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateOtpValue();

            const otpCode = otpCodeInput ? otpCodeInput.value : '';
            const email = emailInput ? emailInput.value : null;

            if (otpCode.length !== 6) {
                showAlert('danger', 'Por favor, ingresa el código completo de 6 dígitos.');
                return;
            }
            
            if (timeLeft <= 0) {
                showAlert('danger', 'El código ha expirado. Por favor, solicita uno nuevo.');
                return;
            }
            
            showAlert('info', 'Verificando código...');

            fetch('/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otpCode })
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    clearInterval(timerInterval);
                    showAlert('success', data.message || '¡Cuenta verificada exitosamente!');
                    setTimeout(() => {
                        window.location.href = data.redirectTo || '/login';
                    }, 1200);
                } else {
                    showAlert('danger', data.message || 'Código incorrecto.');
                }
            })
            .catch(err => {
                console.error('Error en verificación:', err);
                showAlert('danger', 'Error de conexión con el servidor.');
            });
        });
    }
    
    // Función para mostrar alertas
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
        
        if (verifyForm && verifyForm.parentNode) verifyForm.parentNode.insertBefore(alertDiv, verifyForm.nextSibling);
    }
});