// readingList.js
(function() {
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function getSourceIdFromPage() {
    const c = document.querySelector('[data-source-id]');
    return c ? parseInt(c.getAttribute('data-source-id'), 10) : null;
  }

  // Show mark-read modal for a given sourceId (if provided), otherwise open for manual input
  function openMarkReadModal(sourceId) {
    const btn = document.getElementById('confirmMarkReadBtn');
    if (btn) btn.dataset.sourceId = sourceId || '';
    const modalEl = document.getElementById('markReadModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  async function postMarkRead(sourceId, readDate) {
    try {
      const body = { sourceId };
      if (readDate) body.read_date = readDate;
      const res = await fetch('/api/user/reads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      const j = await res.json();
      if (!res.ok) throw j;
      return j;
    } catch (e) { throw e; }
  }

  async function postAddToList(sourceId) {
    try {
      const res = await fetch('/api/user/reading-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId }), credentials: 'same-origin' });
      const j = await res.json();
      if (!res.ok) throw j;
      return j;
    } catch (e) { throw e; }
  }

  async function fetchReadingList() {
    const res = await fetch('/api/user/reading-list', { credentials: 'same-origin' });
    if (!res.ok) throw await res.json();
    return res.json();
  }

  function renderToReadList(items) {
    const container = document.getElementById('toReadList');
    container.innerHTML = '';
    items.forEach((it, idx) => {
      const el = document.createElement('div');
      el.className = 'list-group-item d-flex justify-content-between align-items-start';
      el.dataset.sourceId = it.source_id || it.sourceId || it.sourceId;
      el.innerHTML = `
        <div class="flex-grow-1">
          <div><strong>${escapeHtml(it.title || 'Sin título')}</strong></div>
          <div class="small text-muted">${escapeHtml(it.publisher || '')} ${it.year ? ('· ' + it.year) : ''}</div>
        </div>
        <div class="ms-2 btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary btn-move-up" title="Mover arriba">↑</button>
          <button class="btn btn-sm btn-outline-secondary btn-move-down" title="Mover abajo">↓</button>
          <button class="btn btn-sm btn-outline-primary btn-move-to-read">Mover a leídas</button>
          <button class="btn btn-sm btn-outline-danger btn-remove">Quitar</button>
        </div>
      `;
      container.appendChild(el);
    });

    // Attach handlers
    $all('.btn-move-up', container).forEach(b => b.addEventListener('click', onMoveUp));
    $all('.btn-move-down', container).forEach(b => b.addEventListener('click', onMoveDown));
    $all('.btn-move-to-read', container).forEach(b => b.addEventListener('click', onMoveToRead));
    $all('.btn-remove', container).forEach(b => b.addEventListener('click', onRemoveFromList));
  }

  function escapeHtml(s) { return String(s || '').replace(/[&<>\"]+/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function onMoveUp(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    if (!item) return;
    const prev = item.previousElementSibling;
    if (prev) item.parentNode.insertBefore(item, prev);
    scheduleReorder();
  }

  function onMoveDown(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    if (!item) return;
    const next = item.nextElementSibling;
    if (next) item.parentNode.insertBefore(next, item);
    scheduleReorder();
  }

  let reorderTimer = null;
  function scheduleReorder() {
    if (reorderTimer) clearTimeout(reorderTimer);
    reorderTimer = setTimeout(doReorder, 300);
  }

  async function doReorder() {
    const ids = $all('#toReadList [data-source-id]').map(el => parseInt(el.dataset.sourceId, 10));
    try {
      await fetch('/api/user/reading-list/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: ids }), credentials: 'same-origin' });
    } catch (e) {
      console.error('Reorder failed', e);
      alert('No se pudo reordenar la lista');
    }
  }

  async function onMoveToRead(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    const sourceId = parseInt(item.dataset.sourceId, 10);
    try {
      await postMarkRead(sourceId, null);
      await refreshModalLists();
    } catch (e) {
      console.error('moveToRead failed', e);
      alert('No se pudo mover a leídas');
    }
  }

  async function onRemoveFromList(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    const sourceId = parseInt(item.dataset.sourceId, 10);
    if (!confirm('Quitar esta fuente de la lista de pendientes?')) return;
    try {
      const res = await fetch('/api/user/reading-list/' + sourceId, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw await res.json();
      await refreshModalLists();
    } catch (e) {
      console.error('remove failed', e);
      alert('No se pudo quitar la entrada');
    }
  }

  async function renderReadHistory(items) {
    const container = document.getElementById('readHistoryList');
    container.innerHTML = '';
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'list-group-item d-flex justify-content-between align-items-start';
      el.dataset.sourceId = it.source_id || it.sourceId || '';
      el.innerHTML = `
        <div class="flex-grow-1">
          <div><strong>${escapeHtml(it.title || ('Fuente ' + (it.source_id || '')))}</strong></div>
          <div class="small text-muted">Leída el <span class="read-date">${escapeHtml(it.read_date || '')}</span></div>
        </div>
        <div class="ms-2 btn-group" role="group">
          <button class="btn btn-sm btn-outline-secondary btn-edit-date">Editar fecha</button>
          <button class="btn btn-sm btn-outline-danger btn-delete-read">Eliminar</button>
        </div>
      `;
      container.appendChild(el);
    });

    $all('.btn-edit-date', container).forEach(b => b.addEventListener('click', onEditReadDate));
    $all('.btn-delete-read', container).forEach(b => b.addEventListener('click', onDeleteRead));
  }

  function onEditReadDate(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    const sourceId = parseInt(item.dataset.sourceId, 10);
    const dateSpan = item.querySelector('.read-date');
    const current = dateSpan ? dateSpan.textContent.trim() : '';
    // replace span with input type=month
    const input = document.createElement('input');
    input.type = 'date';
    if (current) {
      // assume current is YYYY-MM-DD or similar
      input.value = current;
    }
    dateSpan.parentNode.replaceChild(input, dateSpan);
    ev.currentTarget.textContent = 'Guardar';
    ev.currentTarget.classList.remove('btn-outline-secondary');
    ev.currentTarget.classList.add('btn-primary');
    ev.currentTarget.removeEventListener('click', onEditReadDate);
    ev.currentTarget.addEventListener('click', async function saveDate() {
      const val = input.value || null;
      try {
        const body = { read_date: val };
        const res = await fetch('/api/user/reads/' + sourceId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
        if (!res.ok) throw await res.json();
        await refreshModalLists();
      } catch (e) {
        console.error('saveDate failed', e);
        alert('No se pudo guardar la fecha');
      }
    });
  }

  async function onDeleteRead(ev) {
    const item = ev.currentTarget.closest('[data-source-id]');
    const sourceId = parseInt(item.dataset.sourceId, 10);
    if (!confirm('Eliminar registro de lectura?')) return;
    try {
      const res = await fetch('/api/user/reads/' + sourceId, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw await res.json();
      await refreshModalLists();
    } catch (e) {
      console.error('delete read failed', e);
      alert('No se pudo eliminar el registro');
    }
  }

  async function refreshModalLists() {
    try {
      const data = await fetchReadingList();
      document.getElementById('toReadLimitText').textContent = (data.limits && typeof data.limits.used !== 'undefined') ? `${data.limits.used} de ${data.limits.max}` : '';
      renderToReadList(data.to_read || []);
      // For reads we'll try to fetch titles for ids if server didn't include titles
      // Assume server includes reads as objects with source_id and read_date
      // Enrich reads by joining with sources via a server-side improvement later; for now show ids
      const readsWithTitles = [];
      if (data.reads && data.reads.length) {
        // try to fetch basic info for each source id
        for (const r of data.reads) {
          // attempt to get title from DOM (if on post page) else use placeholder
          readsWithTitles.push(Object.assign({ title: '' }, r));
        }
      }
      renderReadHistory(readsWithTitles.concat([]));
    } catch (e) {
      console.error('refreshModalLists error', e);
    }
  }

  // Wire UI after full load to ensure bootstrap is available
  window.addEventListener('load', function() {
    const openBtn = document.getElementById('openReadingListBtn');
    const openBtnDash = document.getElementById('openReadingListBtnDashboard');
    const markAsReadOpt = document.getElementById('markAsReadOption');
    const markAsToReadOpt = document.getElementById('markAsToReadOption');
    const readActionBtn = document.getElementById('readActionBtn');
    const confirmMarkBtn = document.getElementById('confirmMarkReadBtn');

    if (openBtn) openBtn.addEventListener('click', async function(e) { e.preventDefault(); await refreshModalLists(); new bootstrap.Modal(document.getElementById('readingListModal')).show(); });
    if (openBtnDash) openBtnDash.addEventListener('click', async function(e) { e.preventDefault(); await refreshModalLists(); new bootstrap.Modal(document.getElementById('readingListModal')).show(); });

    // Ensure modal refreshes its contents whenever it's shown
    const readingListModalEl = document.getElementById('readingListModal');
    if (readingListModalEl) {
      readingListModalEl.addEventListener('show.bs.modal', function() { try { refreshModalLists(); } catch (e) { console.error('refresh on show failed', e); } });
    }

    if (markAsReadOpt) markAsReadOpt.addEventListener('click', function(e) { e.preventDefault(); const src = getSourceIdFromPage(); openMarkReadModal(src); });
    if (markAsToReadOpt) markAsToReadOpt.addEventListener('click', async function(e) {
      e.preventDefault(); const src = getSourceIdFromPage(); if (!src) return alert('No hay fuente seleccionada.');
      try { await postAddToList(src); alert('Añadido a "Para leer después"'); } catch (err) { console.error(err); alert((err && err.message) || 'Error al añadir'); }
    });

    if (readActionBtn) readActionBtn.addEventListener('click', async function(e) { 
      e.preventDefault();
      const src = getSourceIdFromPage();
      const isRead = String(readActionBtn.dataset.isRead || '0') === '1';
      if (isRead) {
        await refreshModalLists();
        new bootstrap.Modal(document.getElementById('readingListModal')).show();
      } else {
        openMarkReadModal(src);
      }
    });

    if (confirmMarkBtn) confirmMarkBtn.addEventListener('click', async function(e) {
      const src = this.dataset.sourceId || getSourceIdFromPage();
      const val = document.getElementById('markReadDate').value || null;
      try {
        await postMarkRead(parseInt(src, 10), val);
        const modalEl = document.getElementById('markReadModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        alert('Fuente marcada como leída');
        // If on post page, reload to update UI; otherwise refresh modal lists
        if (getSourceIdFromPage()) window.location.reload(); else await refreshModalLists();
      } catch (err) {
        console.error('confirmMarkRead failed', err);
        alert((err && err.message) || 'No se pudo marcar como leída');
      }
    });

    // Ensure markReadDate max is today as a fallback
    try {
      const mr = document.getElementById('markReadDate');
      if (mr && !mr.max) mr.max = new Date().toISOString().slice(0,10);
    } catch (e) { }
  });
})();
