// profile.js
document.addEventListener('DOMContentLoaded', function() {
    const sendRequestBtn = document.querySelector('.send-contact-request');
    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', function() {
            const receiverId = this.dataset.userId;
            const message = prompt('Escribe un mensaje inicial (opcional):');
            if (message === null) return; // Cancelar

            fetch('/api/contacts/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId, initialMessage: message })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    alert('Solicitud enviada correctamente');
                    // Deshabilitar el botón y cambiar texto
                    const btn = document.querySelector('.send-contact-request');
                    btn.disabled = true;
                    btn.textContent = 'Solicitud enviada';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-secondary');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error al enviar solicitud');
            });
        });
    }

    // Inicializar la gráfica de radar
    const radarCanvas = document.getElementById('readingRadarChart');
    if (radarCanvas) {
        const cfg = (typeof radarConfig !== 'undefined') ? radarConfig : (window && window.radarConfig ? window.radarConfig : null);
        if (cfg) {
            try {
                const radarChart = new Chart(radarCanvas, cfg);
                window.addEventListener('resize', function() { radarChart.resize(); });
            } catch (e) {
                console.error('Could not initialize radar chart', e && e.message);
            }
        }
    }
    
    // Efectos de hover en tarjetas de listas
    const listCards = document.querySelectorAll('.list-card');
    listCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 12px 20px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = 'var(--shadow-medium)';
        });
    });
    
    // Efecto de hover en los badges de categoría
    const categoryBadges = document.querySelectorAll('.category-badge');
    categoryBadges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });
        
        badge.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
        
    // Mostrar tooltips para badges de estado
    const statusBadges = document.querySelectorAll('.status-badge');
    statusBadges.forEach(badge => {
        badge.title = badge.classList.contains('validated') 
            ? 'Usuario verificado académicamente' 
            : badge.classList.contains('pending') 
                ? 'Verificación pendiente' 
                : 'Usuario no verificado';
    });
    
    // Efecto de scroll suave para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animación de entrada para elementos del perfil
    const animateElements = () => {
        const elements = document.querySelectorAll('.profile-header-card, .card');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    };
    
    // Ejecutar animación al cargar la página
    setTimeout(animateElements, 300);
    
    // Cargar datos adicionales de forma dinámica (simulado)
    console.log('Perfil cargado correctamente');
    // console.log('Estadísticas de lectura:', readingStats);
    console.log('Actividad reciente:', recentActivity);
});