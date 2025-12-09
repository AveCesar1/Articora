// verify-email.js
document.addEventListener('DOMContentLoaded', function() {
    const otpDigits = document.querySelectorAll('.otp-digit');
    const otpCodeInput = document.getElementById('otpCode');
    const verifyForm = document.getElementById('verifyForm');
    const timerCount = document.getElementById('timerCount');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    
    // Auto-focus en el primer dígito
    otpDigits[0].focus();
    
    // Manejar navegación entre dígitos OTP
    otpDigits.forEach((digit, index) => {
        digit.addEventListener('input', function(e) {
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
    });
    
    // Función para actualizar el valor OTP oculto
    function updateOtpValue() {
        const otp = Array.from(otpDigits).map(digit => digit.value).join('');
        otpCodeInput.value = otp;
    }
    
    // Temporizador OTP
    let timeLeft = 10 * 60; // 10 minutos en segundos
    const timerInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerCount.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerCount.textContent = '00:00';
            timerCount.parentElement.innerHTML = '<span class="text-danger">El código ha expirado</span>';
            otpDigits.forEach(digit => {
                digit.disabled = true;
                digit.classList.add('bg-light');
            });
            resendOtpBtn.disabled = false;
            resendOtpBtn.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
        }
    }, 1000);
    
    // Manejar reenvío de OTP
    resendOtpBtn.addEventListener('click', function() {
        if (!this.disabled) {
            // Resetear temporizador
            timeLeft = 10 * 60;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerCount.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Habilitar campos
            otpDigits.forEach(digit => {
                digit.disabled = false;
                digit.classList.remove('bg-light');
                digit.value = '';
            });
            
            // Actualizar valor
            updateOtpValue();
            
            // Deshabilitar botón de reenvío
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-clock me-1"></i> Código enviado';
            
            // Mostrar mensaje
            showAlert('success', 'Se ha enviado un nuevo código a tu correo electrónico.');
            
            // Restablecer después de 30 segundos
            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-redo me-1"></i> Reenviar código';
            }, 30000);
        }
    });
    
    // Manejar envío del formulario
    verifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const otpCode = otpCodeInput.value;
        
        if (otpCode.length !== 6) {
            showAlert('danger', 'Por favor, ingresa el código completo de 6 dígitos.');
            return;
        }
        
        if (timeLeft <= 0) {
            showAlert('danger', 'El código ha expirado. Por favor, solicita uno nuevo.');
            return;
        }
        
        // Simular verificación (en producción sería una llamada AJAX)
        showAlert('info', 'Verificando código...');
        
        setTimeout(() => {
            // Simulación de éxito
            clearInterval(timerInterval);
            showAlert('success', '¡Cuenta verificada exitosamente!');
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
                window.location.href = '/profile?verified=true';
            }, 2000);
        }, 1500);
    });
    
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
        
        verifyForm.parentNode.insertBefore(alertDiv, verifyForm.nextSibling);
    }
});