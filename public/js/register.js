// Script específico para la página de registro
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Validación de contraseñas
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden. Por favor, inténtalo de nuevo.');
                return;
            }
            // Aquí se manejaría el envío del formulario de registro
            console.log('Formulario de registro enviado');
            // Simulación de redirección después del registro (en el futuro será real)
            // window.location.href = '/verify-email';
        });
    }
});