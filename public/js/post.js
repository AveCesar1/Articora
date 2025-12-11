// post.js

document.addEventListener('DOMContentLoaded', function() {
    // Desglose de calificaciones
    const showRatingBreakdownBtn = document.getElementById('showRatingBreakdown');
    const ratingBreakdown = document.getElementById('ratingBreakdown');
    
    if (showRatingBreakdownBtn) {
        showRatingBreakdownBtn.addEventListener('click', function() {
            if (ratingBreakdown.style.display === 'none') {
                ratingBreakdown.style.display = 'block';
                showRatingBreakdownBtn.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Ocultar desglose';
            } else {
                ratingBreakdown.style.display = 'none';
                showRatingBreakdownBtn.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Ver desglose';
            }
        });
    }
    
    // Slider de fuentes relacionadas
    const relatedSlider = document.getElementById('relatedSlider');
    const prevSliderBtn = document.querySelector('.prev-slider');
    const nextSliderBtn = document.querySelector('.next-slider');
    
    if (relatedSlider && prevSliderBtn && nextSliderBtn) {
        const cardWidth = 250; // Ancho de cada tarjeta + gap
        let scrollPosition = 0;
        
        function updateSliderControls() {
            prevSliderBtn.disabled = scrollPosition <= 0;
            nextSliderBtn.disabled = scrollPosition >= relatedSlider.scrollWidth - relatedSlider.clientWidth;
        }
        
        prevSliderBtn.addEventListener('click', function() {
            scrollPosition -= cardWidth;
            if (scrollPosition < 0) scrollPosition = 0;
            relatedSlider.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
            updateSliderControls();
        });
        
        nextSliderBtn.addEventListener('click', function() {
            scrollPosition += cardWidth;
            const maxScroll = relatedSlider.scrollWidth - relatedSlider.clientWidth;
            if (scrollPosition > maxScroll) scrollPosition = maxScroll;
            relatedSlider.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
            updateSliderControls();
        });
        
        // Actualizar controles al hacer scroll manual
        relatedSlider.addEventListener('scroll', function() {
            scrollPosition = relatedSlider.scrollLeft;
            updateSliderControls();
        });
        
        // Inicializar controles
        updateSliderControls();
    }
    
    // Sistema de estrellas para calificación de comentarios
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingValue = document.getElementById('ratingValue');
    
    if (ratingStars.length > 0) {
        ratingStars.forEach(star => {
            star.addEventListener('mouseover', function() {
                const value = this.getAttribute('data-value');
                highlightStars(value);
            });
            
            star.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                ratingValue.value = value;
            });
        });
        
        // Restaurar al salir del contenedor
        const ratingInput = document.querySelector('.rating-input');
        if (ratingInput) {
            ratingInput.addEventListener('mouseleave', function() {
                const currentValue = ratingValue.value;
                highlightStars(currentValue);
            });
        }
        
        function highlightStars(value) {
            ratingStars.forEach(star => {
                const starValue = star.getAttribute('data-value');
                if (starValue <= value) {
                    star.classList.remove('far');
                    star.classList.add('fas');
                } else {
                    star.classList.remove('fas');
                    star.classList.add('far');
                }
            });
        }
        
        // Inicializar con valor por defecto
        highlightStars(ratingValue.value);
    }
    
    // Exportar citas
    const citationFormat = document.getElementById('citationFormat');
    const citationText = document.getElementById('citationText');
    const copyCitationBtn = document.getElementById('copyCitationBtn');
    
    // Datos de ejemplo (en una aplicación real, esto vendría del servidor)
    const citationFormats = {
        apa: `Russell, S., & Norvig, P. (2020). Inteligencia Artificial: Un Enfoque Moderno (4ta ed.). Pearson.`,
        chicago: `Russell, Stuart, and Peter Norvig. 2020. Inteligencia Artificial: Un Enfoque Moderno. 4th ed. Pearson.`,
        harvard: `Russell, S. & Norvig, P., 2020. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson.`,
        mla: `Russell, Stuart, and Peter Norvig. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed., Pearson, 2020.`,
        ieee: `S. Russell and P. Norvig, Inteligencia Artificial: Un Enfoque Moderno, 4ta ed. Pearson, 2020.`,
        vancouver: `Russell S, Norvig P. Inteligencia Artificial: Un Enfoque Moderno. 4ta ed. Pearson; 2020.`,
        bibtex: `@book{russell2020inteligencia,
    title={Inteligencia Artificial: Un Enfoque Moderno},
    author={Russell, Stuart and Norvig, Peter},
    year={2020},
    edition={4ta},
    publisher={Pearson}
}`
    };
    
    if (citationFormat && citationText) {
        citationFormat.addEventListener('change', function() {
            const format = this.value;
            citationText.value = citationFormats[format] || '';
        });
    }
    
    if (copyCitationBtn) {
        copyCitationBtn.addEventListener('click', function() {
            citationText.select();
            citationText.setSelectionRange(0, 99999); // Para móviles
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check me-2"></i>¡Copiado!';
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-success');
                    
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.classList.remove('btn-success');
                        this.classList.add('btn-primary');
                    }, 2000);
                }
            } catch (err) {
                console.error('Error al copiar: ', err);
            }
        });
    }
    
    // Botones de acción
    const shareBtn = document.getElementById('shareBtn');
    const saveBtn = document.getElementById('saveBtn');
    const reportBtn = document.getElementById('reportBtn');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    text: 'Echa un vistazo a este documento en Artícora',
                    url: window.location.href
                });
            } else {
                // Fallback: copiar URL al portapapeles
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('¡Enlace copiado al portapapeles!');
                });
            }
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-check me-2"></i>Guardado';
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-success');
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-bookmark me-2"></i>Guardar';
                this.classList.remove('btn-success');
                this.classList.add('btn-outline-primary');
            }, 2000);
        });
    }
    
    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            alert('Función de reporte no implementada en esta versión de demostración.');
        });
    }
    
    // Formulario de comentarios
    const newCommentForm = document.getElementById('newCommentForm');
    if (newCommentForm) {
        newCommentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Función de comentarios no implementada en esta versión de demostración. Esto enviaría el comentario al servidor en una aplicación real.');
        });
    }
});