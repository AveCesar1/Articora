// faq.js - Funcionalidad para la página de FAQs

document.addEventListener('DOMContentLoaded', function() {
    // Navegación suave entre secciones
    const navLinks = document.querySelectorAll('.list-group-item');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Actualizar estado activo
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Desplazamiento suave a la sección
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 20,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Búsqueda en FAQs
    const faqSearch = document.getElementById('faqSearch');
    const allAccordionButtons = document.querySelectorAll('.accordion-button');
    
    faqSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            // Mostrar todas las preguntas
            allAccordionButtons.forEach(button => {
                const accordionItem = button.closest('.accordion-item');
                accordionItem.style.display = 'block';
            });
            return;
        }
        
        // Filtrar preguntas
        allAccordionButtons.forEach(button => {
            const questionText = button.textContent.toLowerCase();
            const answerText = button.nextElementSibling.textContent.toLowerCase();
            const accordionItem = button.closest('.accordion-item');
            
            if (questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
                accordionItem.style.display = 'block';
                
                // Expandir si está colapsado
                if (button.classList.contains('collapsed')) {
                    button.click();
                }
            } else {
                accordionItem.style.display = 'none';
            }
        });
    });
    
    // Expansión automática al hacer clic en enlaces de navegación
    const hash = window.location.hash;
    if (hash) {
        const targetSection = document.querySelector(hash);
        if (targetSection) {
            // Expandir el primer acordeón de la sección
            const firstAccordion = targetSection.querySelector('.accordion-button');
            if (firstAccordion && firstAccordion.classList.contains('collapsed')) {
                setTimeout(() => {
                    firstAccordion.click();
                }, 300);
            }
        }
    }
    
    // Efecto hover en tarjetas
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});