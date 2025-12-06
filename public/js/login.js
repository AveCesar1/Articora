// Script específico para la página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Aquí se manejaría el envío del formulario de login
            console.log('Formulario de login enviado');
            // Simulación de redirección después del login (en el futuro será real)
            // window.location.href = '/dashboard';
        });
    }
});