// dashboard.js - Funcionalidad para el dashboard

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const refreshBtn = document.getElementById('refreshDashboard');
    const lastUpdateElement = document.getElementById('lastUpdate');
    const viewActivityBtn = document.getElementById('viewActivity');
    
    // Contador de tiempo desde la última actualización
    let secondsSinceUpdate = 0;
    const updateInterval = setInterval(() => {
        secondsSinceUpdate++;
        updateLastUpdateText();
    }, 1000);
    
    // Función para actualizar el texto de última actualización
    function updateLastUpdateText() {
        if (secondsSinceUpdate < 60) {
            lastUpdateElement.textContent = `Hace ${secondsSinceUpdate} segundos`;
        } else if (secondsSinceUpdate < 3600) {
            const minutes = Math.floor(secondsSinceUpdate / 60);
            lastUpdateElement.textContent = `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        } else {
            const hours = Math.floor(secondsSinceUpdate / 3600);
            lastUpdateElement.textContent = `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
    }
    
    // Botón de actualizar dashboard
    refreshBtn.addEventListener('click', function() {
        // Mostrar estado de actualización
        const originalText = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Actualizando...';
        
        // Agregar clase de actualización a todo el dashboard
        const container = document.querySelector('.container');
        container.classList.add('updating');
        
        // Simular actualización de estadísticas (en un caso real, sería una petición al servidor)
        setTimeout(() => {
            // Actualizar el tiempo
            secondsSinceUpdate = 0;
            updateLastUpdateText();
            
            // Restaurar estado del botón
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalText;
            container.classList.remove('updating');
            
            // Mostrar notificación de éxito
            showNotification('Dashboard actualizado correctamente', 'success');
            
            // Simular recálculo de estadísticas
            simulateStatsUpdate();
        }, 2000);
    });
    
    // Botón para ver actividad completa
    if (viewActivityBtn) {
        viewActivityBtn.addEventListener('click', function() {
            // Redirigir a una página de estadísticas completas (simulado)
            alert('En una implementación completa, esto mostraría estadísticas detalladas y gráficos históricos.');
            
            // Simular navegación
            viewActivityBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Cargando...';
            viewActivityBtn.disabled = true;
            
            setTimeout(() => {
                viewActivityBtn.innerHTML = '<i class="fas fa-chart-line me-1"></i> Ver estadísticas completas';
                viewActivityBtn.disabled = false;
            }, 1500);
        });
    }
    
    // Función para simular actualización de estadísticas
    function simulateStatsUpdate() {
        // Simular aumento en lecturas totales
        const totalReadingsElement = document.querySelector('.stat-card:first-child .stat-number');
        const currentTotal = parseInt(totalReadingsElement.textContent);
        totalReadingsElement.textContent = currentTotal + 1;
        
        // Simular aumento en días activos (con probabilidad del 20%)
        if (Math.random() < 0.2) {
            const activeDaysElement = document.querySelectorAll('.stat-number')[3];
            const currentDays = parseInt(activeDaysElement.textContent);
            activeDaysElement.textContent = currentDays + 1;
        }
        
        // Simular cambio en tendencias
        simulateTrendsUpdate();
    }
    
    // Función para simular actualización de tendencias
    function simulateTrendsUpdate() {
        const trendItems = document.querySelectorAll('.trend-item');
        
        trendItems.forEach((item, index) => {
            // Solo actualizar algunos elementos aleatoriamente
            if (Math.random() < 0.3) {
                const readsElement = item.querySelector('.trend-reads');
                const currentReads = parseInt(readsElement.textContent.replace(/,/g, ''));
                const increase = Math.floor(Math.random() * 10) + 1;
                readsElement.textContent = (currentReads + increase).toLocaleString();
                
                // Actualizar badge de tendencia
                const trendBadge = item.querySelector('.badge.bg-success, .badge.bg-danger, .badge.bg-secondary');
                if (trendBadge) {
                    // Cambiar aleatoriamente la tendencia
                    const trends = ['up', 'down', 'stable'];
                    const newTrend = trends[Math.floor(Math.random() * trends.length)];
                    
                    let newClass, newIcon;
                    if (newTrend === 'up') {
                        newClass = 'bg-success';
                        newIcon = 'arrow-up';
                    } else if (newTrend === 'down') {
                        newClass = 'bg-danger';
                        newIcon = 'arrow-down';
                    } else {
                        newClass = 'bg-secondary';
                        newIcon = 'minus';
                    }
                    
                    // Actualizar clase e icono
                    trendBadge.className = `badge ${newClass}`;
                    trendBadge.innerHTML = `<i class="fas fa-${newIcon}"></i>`;
                }
            }
        });
    }
    
    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1050;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Agregar al documento
        document.body.appendChild(notification);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Efectos hover en elementos de tendencias
    const trendItems = document.querySelectorAll('.trend-item');
    trendItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Resaltar filas de la tabla al pasar el mouse
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(141, 110, 99, 0.05)';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
    
    // Inicializar texto de última actualización
    updateLastUpdateText();
    
    // Mostrar mensaje informativo sobre actualizaciones
    console.log('Dashboard cargado. Las estadísticas se actualizan automáticamente después de cada lectura.');
    
    // Simular actualización periódica (cada 30 segundos) para demostración
    setInterval(() => {
        if (Math.random() < 0.5) { // 50% de probabilidad cada 30 segundos
            simulateStatsUpdate();
            showNotification('Estadísticas actualizadas automáticamente', 'info');
        }
    }, 30000);
});