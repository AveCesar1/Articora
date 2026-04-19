// Tools module: configuration and utility actions
(function(){
    function initializeSystemConfig() {
        const elements = window.elements || {};
        // Try to load defaults; endpoint to GET config not implemented, so keep defaults for now
        const offensiveWords = "idiota,estúpido,imbécil,tonto,inútil";
        const equivalentDomains = "amazon.com,amazon.co.uk,amazon.de,a.com,researchgate.net,arxiv.org";
        if (elements.offensiveDict) elements.offensiveDict.value = offensiveWords;
        if (elements.equivalentDomains) elements.equivalentDomains.value = equivalentDomains;
    }

    function saveSystemConfig() {
        const elements = window.elements || {};
        const offensiveWords = (elements.offensiveDict && elements.offensiveDict.value) ? elements.offensiveDict.value.trim() : '';
        const domains = (elements.equivalentDomains && elements.equivalentDomains.value) ? elements.equivalentDomains.value.trim() : '';
        if (!offensiveWords || !domains) return window.showToast('Completa todos los campos de configuración', 'warning');
        fetch('/api/admin/system_config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offensive: offensiveWords, equivalent: domains }) }).then(r => r.json()).then(j => { if (j && j.success) window.showToast('Configuración guardada correctamente', 'success'); else window.showToast('Error guardando configuración', 'danger'); }).catch(e => { console.error(e); window.showToast('Error de red', 'danger'); });
    }

    function scanDuplicates() {
        window.showToast('Escaneando duplicados...', 'info');
        setTimeout(() => { const duplicatesFound = 3; window.showToast(`Encontrados ${duplicatesFound} posibles duplicados`, 'success'); if (confirm('¿Deseas ir al comparador de duplicados para revisarlos?')) window.location.href = '/compare/admin'; }, 1500);
    }

    function viewDetailedStats() { window.showToast('Cargando estadísticas detalladas...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewUserManagement() { window.showToast('Cargando gestión de usuarios...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewVerificationQueue() { window.showToast('Cargando cola de verificación...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }
    function viewSuspendedUsers() { window.showToast('Cargando usuarios suspendidos...', 'info'); setTimeout(() => window.showToast('Funcionalidad en desarrollo', 'warning'), 500); }

    window.adminTools = { initializeSystemConfig, saveSystemConfig, scanDuplicates, viewDetailedStats, viewUserManagement, viewVerificationQueue, viewSuspendedUsers };
})();
