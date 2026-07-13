// legal.js — Animaciones y microinteracciones solo para páginas legales

document.addEventListener('DOMContentLoaded', () => {

    // Solo si existe el contenedor .legal-page
    const legalContainer = document.querySelector('.legal-page');
    if (!legalContainer) return;

    // 1. Navegación suave con resaltado (dentro del contenedor)
    const navLinks = legalContainer.querySelectorAll('.d-flex.flex-wrap.gap-2 .btn, .list-group-item');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href?.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    window.scrollTo({ top: target.offsetTop - 20, behavior: 'smooth' });
                    target.style.animation = 'none';
                    requestAnimationFrame(() => target.style.animation = 'highlight 1s ease');
                    history.pushState(null, null, href);
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            }
        });
    });

    // 2. Botón volver arriba (global, pero solo aparece en páginas legales)
    const backBtn = document.createElement('button');
    backBtn.className = 'back-to-top';
    backBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backBtn.setAttribute('aria-label', 'Subir');
    document.body.appendChild(backBtn);

    window.addEventListener('scroll', () => {
        backBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // 3. Animación de secciones al hacer scroll (dentro del contenedor)
    const sections = legalContainer.querySelectorAll('.mb-5');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

    sections.forEach(section => {
        section.classList.add('fade-section');
        observer.observe(section);
    });

    // 4. Resaltar sección si hay hash al cargar
    const hash = window.location.hash;
    if (hash) {
        const target = document.querySelector(hash);
        if (target) {
            setTimeout(() => {
                target.style.animation = 'highlight 1s ease';
                window.scrollTo({ top: target.offsetTop - 20, behavior: 'smooth' });
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === hash) link.classList.add('active');
                });
            }, 400);
        }
    }

    // 5. Actualizar navegación activa al hacer scroll
    const navItems = legalContainer.querySelectorAll('.d-flex.flex-wrap.gap-2 .btn');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 100;
            if (window.scrollY >= top) {
                current = '#' + section.id;
            }
        });
        navItems.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === current);
        });
    });

    // 6. Efecto parallax en el título (dentro del contenedor)
    const title = legalContainer.querySelector('.page-title');
    if (title) {
        window.addEventListener('scroll', () => {
            const offset = window.scrollY;
            title.style.transform = `translateY(${offset * 0.05}px)`;
            title.style.opacity = 1 - (offset / 800);
        });
    }
});