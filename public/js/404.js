// 404.js - Funcionalidad para la página 404

document.addEventListener('DOMContentLoaded', function() {
    // Contador de tiempo en la página
    let timeOnPage = 0;
    const timeCounter = setInterval(() => {
        timeOnPage++;
        if (timeOnPage >= 10) {
            // Mostrar sugerencia adicional después de 10 segundos
            showAdditionalHelp();
            clearInterval(timeCounter);
        }
    }, 1000);
    
    // Búsqueda rápida
    const searchForm = document.querySelector('form');
    const searchInput = searchForm.querySelector('input[name="q"]');
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        
        if (query.length < 2) {
            alert('Por favor, ingresa al menos 2 caracteres para buscar.');
            return;
        }
        
        // Redirigir a búsqueda
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    });
    
    // Efecto hover en sugerencias
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            this.style.transform = 'translateX(5px)';
            this.style.transition = 'all 0.3s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
            this.style.transform = '';
        });
    });
    
    // Botón de volver atrás con confirmación
    const backButton = document.querySelector('button[onclick="window.history.back()"]');
    backButton.addEventListener('click', function(e) {
        // Si no hay historial, redirigir al inicio
        if (window.history.length <= 1) {
            e.preventDefault();
            window.location.href = '/';
        }
    });
    
    // Mostrar URL actual en consola para debugging
    console.log('404 - Página no encontrada:', window.location.href);
    console.log('Referrer:', document.referrer);
    
    // Función para mostrar ayuda adicional
    function showAdditionalHelp() {
        const additionalHelp = document.createElement('div');
        additionalHelp.className = 'alert alert-info mt-4';
        additionalHelp.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <strong>¿Sigues teniendo problemas?</strong> 
            Puedes intentar limpiar la caché de tu navegador o contactar a nuestro 
            <a href="mailto:soporte@articora.com" class="alert-link">equipo de soporte</a>.
        `;
        
        const container = document.querySelector('.container');
        container.appendChild(additionalHelp);
        
        // Animación de entrada
        additionalHelp.style.opacity = '0';
        additionalHelp.style.transform = 'translateY(20px)';
        additionalHelp.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            additionalHelp.style.opacity = '1';
            additionalHelp.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // Efecto de escritura en el campo de búsqueda
    const placeholderTexts = [
        'Buscar fuentes académicas...',
        'Buscar por título, autor, palabras clave...',
        'Ejemplo: "aprendizaje automático"',
        'Ejemplo: "Smith, John 2020"'
    ];
    
    let currentPlaceholderIndex = 0;
    
    function rotatePlaceholder() {
        searchInput.placeholder = placeholderTexts[currentPlaceholderIndex];
        currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholderTexts.length;
    }
    
    // Rotar cada 3 segundos
    rotatePlaceholder();
    setInterval(rotatePlaceholder, 3000);
    
    // Efecto en el icono de error
    const errorIcon = document.querySelector('.error-icon');
    errorIcon.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1) rotate(10deg)';
        this.style.transition = 'transform 0.3s ease';
    });
    
    errorIcon.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});