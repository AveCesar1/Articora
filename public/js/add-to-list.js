(function(){
    let currentSourceId = null;
    let selectedListId = null;

    const modalEl = document.getElementById('addToListModal');
    if (!modalEl) return;
    const bsModal = new bootstrap.Modal(modalEl);
    const listsContainer = document.getElementById('addToListLists');
    const spinner = document.getElementById('addToListSpinner');
    const emptyEl = document.getElementById('addToListEmpty');
    const confirmBtn = document.getElementById('addToListConfirmBtn');

    function openModalForSource(sourceId) {
        currentSourceId = Number(sourceId) || null;
        selectedListId = null;
        listsContainer.innerHTML = '';
        spinner.style.display = 'block';
        listsContainer.style.display = 'none';
        emptyEl.style.display = 'none';
        confirmBtn.disabled = true;
        bsModal.show();

        fetch('/api/my-lists').then(r=>r.json()).then(j=>{
            spinner.style.display = 'none';
            if (!j || !j.success || !Array.isArray(j.lists) || j.lists.length === 0) {
                emptyEl.style.display = 'block';
                listsContainer.style.display = 'none';
                return;
            }
            listsContainer.style.display = 'block';
            listsContainer.innerHTML = '';
            j.lists.forEach(l => {
                const item = document.createElement('label');
                item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                item.innerHTML = `<div><strong>${escapeHtml(l.title)}</strong><br><small class="text-muted">${l.totalSources} fuentes</small></div><input type="radio" name="addToListRadio" value="${l.id}" class="ms-2">`;
                listsContainer.appendChild(item);
            });

            // attach radio listeners
            listsContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    selectedListId = Number(e.target.value);
                    confirmBtn.disabled = !selectedListId;
                });
            });
        }).catch(err=>{
            spinner.style.display = 'none';
            emptyEl.style.display = 'block';
            console.error('Error loading lists', err);
        });
    }

    function escapeHtml(s){ return String(s).replace(/[&<>"]+/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

    // delegate clicks for save buttons
    document.addEventListener('click', function(e){
        const saveBtn = e.target.closest('.save-to-list-btn');
        if (saveBtn) {
            const sid = saveBtn.dataset.sourceId || saveBtn.getAttribute('data-source-id');
            if (!sid) return;
            openModalForSource(sid);
            return;
        }
        // also support post page button with id saveBtn
        if (e.target && e.target.id === 'saveBtn') {
            const btn = e.target;
            const sid = btn.dataset.sourceId || btn.getAttribute('data-source-id');
            if (!sid) return;
            openModalForSource(sid);
            return;
        }
    });

    confirmBtn.addEventListener('click', async function(){
        if (!selectedListId || !currentSourceId) return;
        confirmBtn.disabled = true; confirmBtn.textContent = 'Añadiendo...';
        try {
            const resp = await fetch(`/api/lists/${selectedListId}/sources`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ source_ids: [currentSourceId] }) });
            const j = await resp.json();
            if (j && j.success) {
                // Visual feedback
                confirmBtn.textContent = 'Añadido';
                setTimeout(()=>{ bsModal.hide(); confirmBtn.textContent = 'Añadir'; }, 700);
                // Optionally update source count on list-detail if present and this is same list
            } else {
                alert('No se pudo añadir: ' + (j && j.message ? j.message : 'error'));
                confirmBtn.disabled = false; confirmBtn.textContent = 'Añadir';
            }
        } catch (e) { console.error(e); alert('Error de red'); confirmBtn.disabled = false; confirmBtn.textContent = 'Añadir'; }
    });

})();
