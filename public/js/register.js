// Script específico para la página de registro
document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

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
                confirmPassword: confirmPassword
            };

            // Deshabilitar el botón para evitar doble envío
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando cuenta...';

            try {
                console.log('Enviando datos de registro:', formData);

                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                console.log('Respuesta del servidor:', result);

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
});