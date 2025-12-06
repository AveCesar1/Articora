// Funciones generales para toda la aplicación

// Función para inicializar componentes comunes
document.addEventListener('DOMContentLoaded', function() {
    // Aquí se pueden inicializar componentes que sean comunes a todas las páginas
    console.log('Document loaded');
});

// Función para mostrar u ocultar contraseña
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Función para formatear fecha
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}