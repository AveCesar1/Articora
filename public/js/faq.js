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
    
    // Búsqueda en FAQs (puro JS, local)
    const faqSearch = document.getElementById('faqSearch');

    function performFaqSearch(q) {
        const searchTerm = (q || '').toLowerCase().trim();
        const items = document.querySelectorAll('.accordion-item');

        items.forEach(item => {
            const button = item.querySelector('.accordion-button');
            const answerEl = item.querySelector('.accordion-body');
            const questionText = (button && button.textContent) ? button.textContent.toLowerCase() : '';
            const answerText = (answerEl && answerEl.textContent) ? answerEl.textContent.toLowerCase() : '';
            const matches = searchTerm === '' || questionText.includes(searchTerm) || answerText.includes(searchTerm);

            item.style.display = matches ? '' : 'none';

            // Mostrar / ocultar la colapsable usando la API de Bootstrap para evitar toggles inesperados
            const collapseEl = item.querySelector('.accordion-collapse');
            if (collapseEl) {
                const instance = bootstrap.Collapse.getOrCreateInstance(collapseEl);
                try {
                    if (matches) instance.show(); else instance.hide();
                } catch (e) {
                    // fallback: toggle via class
                    if (matches) collapseEl.classList.add('show'); else collapseEl.classList.remove('show');
                }
            }
        });
    }

    // Input y botón de búsqueda (hay un botón al lado del input en la plantilla)
    if (faqSearch) {
        faqSearch.addEventListener('input', function() {
            performFaqSearch(this.value);
        });

        // Buscar el botón dentro del mismo grupo de entrada
        const btn = faqSearch.closest('.input-group')?.querySelector('button[type="button"]');
        if (btn) {
            btn.addEventListener('click', function() {
                performFaqSearch(faqSearch.value);
            });
        }
    }
    
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