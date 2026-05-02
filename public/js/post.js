// post.js

document.addEventListener('DOMContentLoaded', function () {
    // Desglose de calificaciones
    const showRatingBreakdownBtn = document.getElementById('showRatingBreakdown');
    const ratingBreakdown = document.getElementById('ratingBreakdown');

    if (showRatingBreakdownBtn) {
        showRatingBreakdownBtn.addEventListener('click', function () {
            if (ratingBreakdown.style.display === 'none') {
                ratingBreakdown.style.display = 'block';
                showRatingBreakdownBtn.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Ocultar desglose';
            } else {
                ratingBreakdown.style.display = 'none';
                showRatingBreakdownBtn.innerHTML = '<i class="fas fa-chart-bar me-2"></i>Ver desglose';
            }
        });
    }

    // Slider de fuentes relacionadas - carga dinámica, render y controles
    (function () {
        const relatedSlider = document.getElementById('relatedSlider');
        const prevSliderBtn = document.querySelector('.prev-slider');
        const nextSliderBtn = document.querySelector('.next-slider');
        const sliderContainer = document.querySelector('.related-slider-container');
        const sliderControls = document.querySelector('.slider-controls');

        function safeTextNode(text) {
            return document.createTextNode(text || '');
        }

        function renderRelated(items) {
            if (!relatedSlider) return;
            relatedSlider.innerHTML = '';
            if (!items || items.length === 0) {
                relatedSlider.innerHTML = '<p class="text-muted text-center">No se encontraron fuentes relacionadas.</p>';
                return;
            }

            items.forEach(src => {
                const wrapper = document.createElement('div');
                wrapper.className = 'related-source-card';

                const card = document.createElement('div');
                card.className = 'card h-100';

                if (src.coverImage) {
                    const img = document.createElement('img');
                    img.className = 'card-img-top';
                    img.src = src.coverImage;
                    img.alt = src.title || '';
                    img.onerror = function () { this.onerror = null; this.src = `/portadas/fuente_${src.id}.png`; };
                    card.appendChild(img);
                }

                const body = document.createElement('div');
                body.className = 'card-body';

                const h6 = document.createElement('h6');
                h6.className = 'card-title';
                h6.appendChild(safeTextNode(src.title || ''));

                const p = document.createElement('p');
                p.className = 'card-text small text-muted';
                const icon = document.createElement('i');
                icon.className = 'fas fa-user-edit me-1';
                p.appendChild(icon);
                p.appendChild(safeTextNode((src.authors && src.authors.length) ? src.authors.join(', ') : ''));

                const footRow = document.createElement('div');
                footRow.className = 'd-flex justify-content-between align-items-center';
                
                spanType = document.createElement('span');
                spanType.className = 'badge bg-info text-dark ms-1';
                footRow.appendChild(spanType);
                const typeIcon = document.createElement('i');
                typeIcon.className = 'me-1 ';
                switch (src.type) {
                    case 'Libro':
                        typeIcon.className += 'fas fa-book';
                        spanType.classList.add('bg-primary'); // Blue
                        typeIcon.classList.add('text-white'); // White
                        typeIcon.appendChild(safeTextNode(' Libro'));
                        break;
                    case 'Artículo':
                        typeIcon.className += 'fas fa-newspaper';
                        spanType.classList.add('bg-success'); // Green
                        typeIcon.classList.add('text-white'); // White
                        typeIcon.appendChild(safeTextNode(' Artículo'));
                        break;
                    case 'Video':
                        typeIcon.className += 'fas fa-video';
                        spanType.classList.add('bg-danger'); // Red
                        typeIcon.classList.add('text-white'); // White
                        typeIcon.appendChild(safeTextNode(' Video'));
                        break;
                    default:
                        typeIcon.className += 'fas fa-file';
                        spanType.classList.add('bg-secondary'); // Gray
                        typeIcon.classList.add('text-white'); // White
                        typeIcon.appendChild(safeTextNode(' Otro'));
                }
                typeIcon.style.paddingRight = '0rem';
                typeIcon.style.marginRight = '0px';
                spanType.insertBefore(typeIcon, spanType.firstChild);

                const ratingDiv = document.createElement('div');
                ratingDiv.className = 'rating';
                if (typeof src.overall_rating !== 'undefined' && src.overall_rating !== null) {
                    const star = document.createElement('i');
                    star.className = 'fas fa-star text-warning';
                    ratingDiv.appendChild(star);
                    const spanVal = document.createElement('span');
                    spanVal.appendChild(safeTextNode(String(src.overall_rating)));
                    ratingDiv.appendChild(spanVal);
                }

                const typeYearDiv = document.createElement('div');
                typeYearDiv.className = 'd-flex flex-column';
                const yearBadge = document.createElement('span');
                yearBadge.className = 'badge bg-secondary';
                yearBadge.appendChild(safeTextNode(src.year || ''));
                yearBadge.style.marginTop = '0.1rem';
                yearBadge.style.marginLeft = '0.2rem';
                typeYearDiv.appendChild(spanType);
                typeYearDiv.appendChild(yearBadge);
                typeYearDiv.style.alignItems = 'flex-start';
                typeYearDiv.style.width = '100px';
                typeYearDiv.style.paddingLeft = '0.5rem';

                footRow.appendChild(typeYearDiv);
                footRow.appendChild(ratingDiv);

                body.appendChild(h6);
                body.appendChild(p);
                body.appendChild(footRow);

                const cardFooter = document.createElement('div');
                cardFooter.className = 'card-footer bg-transparent';
                const a = document.createElement('a');
                a.href = `/post/${src.id}`;
                a.className = 'btn btn-sm btn-outline-primary w-100';
                a.appendChild(safeTextNode('Ver detalles'));
                cardFooter.appendChild(a);

                card.appendChild(body);
                card.appendChild(cardFooter);
                wrapper.appendChild(card);
                relatedSlider.appendChild(wrapper);
            });

            // init controls with dynamic widths
            const firstCard = relatedSlider.querySelector('.related-source-card');
            const gap = 15; // matches CSS gap
            const scrollInc = firstCard ? (firstCard.offsetWidth + gap) : 250;

            function updateControls() {
                if (!prevSliderBtn || !nextSliderBtn) return;
                prevSliderBtn.disabled = relatedSlider.scrollLeft <= 0;
                nextSliderBtn.disabled = relatedSlider.scrollLeft >= relatedSlider.scrollWidth - relatedSlider.clientWidth - 1;
            }

            if (prevSliderBtn && nextSliderBtn) {
                prevSliderBtn.onclick = function () { relatedSlider.scrollBy({ left: -scrollInc, behavior: 'smooth' }); };
                nextSliderBtn.onclick = function () { relatedSlider.scrollBy({ left: scrollInc, behavior: 'smooth' }); };
                relatedSlider.addEventListener('scroll', updateControls);
                // initial
                setTimeout(updateControls, 50);
            }
        }

        async function loadRelated() {
            if (!relatedSlider) return;
            const container = document.querySelector('.container[data-source-id]');
            const sourceId = container ? container.dataset.sourceId : null;
            if (!sourceId) {
                relatedSlider.innerHTML = '<p class="text-muted text-center">Fuente no identificada.</p>';
                return;
            }

            try {
                const resp = await fetch(`/api/sources/${sourceId}/related`);
                if (!resp.ok) throw new Error('Network response not ok');
                const data = await resp.json();
                const items = (data && Array.isArray(data.results)) ? data.results : [];
                renderRelated(items.slice(0, 10));
            } catch (err) {
                console.error('Error loading related sources', err);
                relatedSlider.innerHTML = '<p class="text-muted text-center">No se pudieron cargar las fuentes relacionadas.</p>';
            }
        }

        // show/hide controls when hovering the slider area (we toggle class 'visible')
        if (sliderContainer && sliderControls) {
            sliderContainer.addEventListener('mouseenter', function () { sliderControls.classList.add('visible'); });
            sliderContainer.addEventListener('mouseleave', function () { sliderControls.classList.remove('visible'); });
        }

        // Start loading
        loadRelated();
    })();

    // Sistema de estrellas para calificación de comentarios
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingValue = document.getElementById('ratingValue');

    if (ratingStars.length > 0) {
        ratingStars.forEach(star => {
            star.addEventListener('mouseover', function () {
                const value = this.getAttribute('data-value');
                highlightStars(value);
            });

            star.addEventListener('click', function () {
                const value = this.getAttribute('data-value');
                ratingValue.value = value;
            });
        });

        // Restaurar al salir del contenedor
        const ratingInput = document.querySelector('.rating-input');
        if (ratingInput) {
            ratingInput.addEventListener('mouseleave', function () {
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
        citationFormat.addEventListener('change', function () {
            const format = this.value;
            citationText.value = citationFormats[format] || '';
        });
    }

    if (copyCitationBtn) {
        copyCitationBtn.addEventListener('click', function () {
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
        shareBtn.addEventListener('click', function () {
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
        saveBtn.addEventListener('click', function () {
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
    // Delete button for owners
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
            const ok = confirm('¿Eliminar esta publicación? Esta acción marcará la fuente como eliminada.');
            if (!ok) return;
            try {
                const sourceId = this.dataset.sourceId;
                const resp = await fetch(`/api/sources/${encodeURIComponent(sourceId)}/delete`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await resp.json();
                if (!resp.ok || !data.success) throw new Error(data && data.message ? data.message : 'error');
                alert('Publicación eliminada. Serás redirigido.');
                window.location.href = '/search';
            } catch (err) {
                console.error('Error deleting source', err);
                alert('No se pudo eliminar la publicación: ' + (err.message || 'error'));
            }
        });
    }
    // Note: comment form handling is implemented in post-rate.js
});