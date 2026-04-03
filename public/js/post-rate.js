// post-rate.js

function initPostRate() {
  try {
    console.log('[post-rate] init');
    const container = document.querySelector('.container[data-source-id]');
    const sourceId = container ? container.getAttribute('data-source-id') : null;
    if (!sourceId) { console.warn('[post-rate] no source id found'); return; }

    const criteria = ['readability','completeness','detail_level','veracity','technical_difficulty'];

    function $id(id) { return document.getElementById(id); }

    // Fetch current aggregated ratings and user rating (if any)
    let userHasRating = false;
    let userRating = null;
    fetch(`/api/sources/${sourceId}/ratings`).then(r => r.json()).then(data => {
      if (!data || !data.success) return;

      // update top summary numeric and count if present
      const ratingValueEl = document.querySelector('.rating-value');
      if (ratingValueEl && typeof data.overall !== 'undefined') {
        ratingValueEl.textContent = (data.overall || 0).toFixed(1);
      }
      const countEl = document.querySelector('.rating-summary small.d-block.text-muted');
      if (countEl) countEl.textContent = `${data.total || 0} calificaciones`;

      // update stars visual (replace contents of first .rating-stars)
      const starsContainer = document.querySelector('.rating-summary .rating-stars');
      if (starsContainer && typeof data.overall !== 'undefined') {
        const overall = data.overall || 0;
        let html = '';
        const full = Math.floor(overall);
        const half = overall % 1 >= 0.5;
        for (let i = 0; i < full; i++) html += '<i class="fas fa-star text-warning fa-2x"></i>';
        if (half) html += '<i class="fas fa-star-half-alt text-warning fa-2x"></i>';
        const empty = 5 - full - (half ? 1 : 0);
        for (let i = 0; i < empty; i++) html += '<i class="far fa-star text-muted fa-2x"></i>';
        starsContainer.innerHTML = html;
      }

      // store user rating state and prefill card inputs if user has a rating
      if (data.userRating) {
        userHasRating = true;
        userRating = data.userRating;
        criteria.forEach(c => {
          const el = $id(`rating_${c}`);
          const lbl = $id(`label_${c}`);
          if (el) {
            el.value = data.userRating[c] || 0;
          }
          const container = document.querySelector(`.star-rating[data-criterion="${c}"]`);
          const val = (data.userRating[c] !== undefined) ? parseFloat(data.userRating[c]) : (el ? parseFloat(el.value) : 0);
          if (lbl) lbl.textContent = val;
          if (container) setStarValueOnContainer(container, val);
        });
      }
    }).catch(err => { console.warn('[post-rate] ratings fetch failed', err); });

    // Star widget helpers
    function renderStarContainer(container, value) {
      const children = Array.from(container.querySelectorAll('.star'));
      for (let i = 0; i < children.length; i++) {
        const starIndex = i + 1;
        const child = children[i];
        if (value >= starIndex) {
          child.className = 'fas fa-star star text-warning';
        } else if (value >= (starIndex - 0.5)) {
          child.className = 'fas fa-star-half-alt star text-warning';
        } else {
          child.className = 'far fa-star star text-muted';
        }
      }
    }

    function setStarValueOnContainer(container, value) {
      // If a specific target input id is provided, use it
      const targetId = container.getAttribute('data-target-id');
      if (targetId) {
        const hid = $id(targetId);
        if (hid) hid.value = value;
      } else {
        const criterion = container.getAttribute('data-criterion');
        if (criterion) {
          const hidden = $id(`rating_${criterion}`);
          const lbl = $id(`label_${criterion}`);
          if (hidden) hidden.value = value;
          if (lbl) lbl.textContent = value;
        }
      }
      renderStarContainer(container, value);
    }

    function attachStarHandlers(container) {
      // click: determine half/full based on click position
      container.addEventListener('click', function(e) {
        const rect = container.getBoundingClientRect();
        const totalWidth = rect.width;
        const x = e.clientX - rect.left;
        const starWidth = totalWidth / 5;
        let rawIndex = Math.floor(x / starWidth) + 1; // 1..5
        if (rawIndex < 1) rawIndex = 1;
        if (rawIndex > 5) rawIndex = 5;
        const localX = x - (rawIndex - 1) * starWidth;
        const value = (localX < starWidth / 2) ? (rawIndex - 1 + 0.5) : rawIndex;
        setStarValueOnContainer(container, value);
      });
    }

    // Initialize star-rating widgets (rating card and edit modal)
    const starContainers = document.querySelectorAll('.star-rating');
    starContainers.forEach(cn => {
      // determine initial value from either explicit target input or rating hidden
      const targetId = cn.getAttribute('data-target-id');
      let val = 5;
      if (targetId && $id(targetId)) {
        val = parseFloat($id(targetId).value || '5');
      } else {
        const crit = cn.getAttribute('data-criterion');
        const hid = crit ? $id(`rating_${crit}`) : null;
        val = hid ? parseFloat(hid.value || '5') : 5;
      }
      renderStarContainer(cn, val);
      attachStarHandlers(cn);
    });

    // Submit rating (and optional comment included)
    const submitBtn = $id('submitRatingBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[post-rate] submit clicked');
        const payload = {};
        let ok = true;
        criteria.forEach(c => {
          const el = $id(`rating_${c}`);
          const v = el ? parseFloat(el.value) : NaN;
          if (Number.isNaN(v) || v < 0 || v > 5 || Math.round(v * 2) !== v * 2) ok = false;
          payload[c] = v;
        });
        if (!ok) return alert('Valores inválidos. Use 0–5 en pasos de 0.5');

        const commentEl = $id('commentText');
        if (commentEl && commentEl.value && commentEl.value.trim().length > 0) payload.comment = commentEl.value.trim();

        // Show confirmation modal with different message for first-time vs update
        const modalEl = document.getElementById('ratingConfirmModal');
        const modalBody = document.getElementById('ratingConfirmBody');
        const confirmBtn = document.getElementById('ratingConfirmBtn');
        if (!modalEl || !confirmBtn) {
          // fallback: submit immediately
          doSubmitRating(payload, submitBtn);
          return;
        }

        if (userHasRating) {
          modalBody.textContent = 'Ya tienes una calificación previa para esta fuente. ¿Seguro que quieres modificarla?';
        } else {
          modalBody.textContent = 'Vas a enviar esta calificación por primera vez. ¿Deseas continuar?';
        }

        // If bootstrap modal available, use it; otherwise fallback to window.confirm
        if (typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Modal === 'function') {
          const bsModal = new bootstrap.Modal(modalEl);
          confirmBtn.disabled = false;
          // one-time handler
          const handler = function() {
            confirmBtn.disabled = true;
            confirmBtn.onclick = null;
            doSubmitRating(payload, submitBtn, bsModal);
          };
          confirmBtn.onclick = handler;
          bsModal.show();
        } else {
          // fallback simple confirm
          if (window.confirm(modalBody.textContent)) {
            doSubmitRating(payload, submitBtn, null);
          }
        }
      });
    }

    function doSubmitRating(payload, submitBtnRef, bsModal) {
      console.log('[post-rate] doSubmitRating');
      if (submitBtnRef) submitBtnRef.disabled = true;
      fetch(`/api/sources/${sourceId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).then(res => {
        if (res && res.success) {
          if (bsModal && typeof bsModal.hide === 'function') bsModal.hide();
          const orig = submitBtnRef ? submitBtnRef.innerHTML : null;
          if (submitBtnRef) submitBtnRef.innerHTML = '<i class="fas fa-check me-2"></i>Guardado';
          setTimeout(() => { if (submitBtnRef) { submitBtnRef.innerHTML = orig; submitBtnRef.disabled = false; } window.location.reload(); }, 900);
        } else {
          if (submitBtnRef) submitBtnRef.disabled = false;
          if (bsModal && typeof bsModal.hide === 'function') bsModal.hide();
          alert('Error: ' + (res && res.message ? res.message : 'No se pudo guardar la calificación'));
        }
      }).catch(err => {
        if (submitBtnRef) submitBtnRef.disabled = false;
        if (bsModal && typeof bsModal.hide === 'function') bsModal.hide();
        console.error(err);
        alert('Error al comunicarse con el servidor');
      });
    }

    // Hook comment submission: require an existing rating or allow comment included in rating
    const newCommentForm = document.getElementById('newCommentForm');
    if (newCommentForm) {
      newCommentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const commentEl = $id('commentText');
        const text = commentEl ? commentEl.value.trim() : '';
        if (!text) return alert('Escribe un comentario antes de enviar');

        // Require existing rating before commenting
        if (!userHasRating) return alert('Debes calificar la fuente antes de publicar un comentario.');

        // Show confirmation modal before posting
        const modalEl = document.getElementById('commentConfirmModal');
        const modalBody = document.getElementById('commentConfirmBody');
        const confirmBtn = document.getElementById('commentConfirmBtn');
        if (!modalEl || !confirmBtn) {
          // fallback: submit immediately
          submitComment(text);
          return;
        }

        modalBody.textContent = 'Vas a publicar este comentario. ¿Deseas continuar?';

        if (typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Modal === 'function') {
          const bsModal = new bootstrap.Modal(modalEl);
          confirmBtn.disabled = false;
          const handler = async function() {
            confirmBtn.disabled = true;
            confirmBtn.onclick = null;
            try {
              await submitComment(text);
            } finally {
              try { bsModal.hide(); } catch(_) {}
            }
          };
          confirmBtn.onclick = handler;
          bsModal.show();
        } else {
          if (window.confirm(modalBody.textContent)) submitComment(text);
        }
      });
    }

    async function submitComment(text) {
      try {
        const res = await fetch(`/api/sources/${sourceId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: text })
        });
        const payload = await res.json();
        if (payload && payload.success) {
          alert('Comentario guardado');
          window.location.reload();
        } else {
          alert('No se pudo guardar el comentario');
        }
      } catch (err) {
        console.error(err);
        alert('Error al enviar comentario');
      }
    }

    // Edit comment flow: open modal, prefill values per-criterion, and PUT to update
    const editButtons = document.querySelectorAll('.edit-comment-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', async function(e) {
        const ratingId = btn.getAttribute('data-rating-id');
        if (!ratingId) return;
        // find the closest comment container and extract text
        const commentCard = btn.closest('.comment');
        const textEl = commentCard ? commentCard.querySelector('.comment-text') : null;
        const fallbackText = textEl ? textEl.innerText.trim() : '';

        // determine rating data: try cached userRating first
        let ratingData = null;
        if (userRating && String(userRating.id) === String(ratingId)) {
          ratingData = userRating;
        } else {
          try {
            const resp = await fetch(`/api/sources/${sourceId}/ratings`);
            const d = await resp.json();
            if (d && d.userRating && String(d.userRating.id) === String(ratingId)) ratingData = d.userRating;
          } catch (e) { /* ignore */ }
        }

        const editModalEl = document.getElementById('editCommentModal');
        const editTextarea = document.getElementById('editCommentText');
        if (!editModalEl || !editTextarea) return;

        // Prefill comment text (prefer ratingData.comment, fallback to visible text)
        editTextarea.value = (ratingData && ratingData.comment) ? ratingData.comment : fallbackText;

        // Prefill per-criterion values into edit hidden inputs and star containers
        criteria.forEach(c => {
          const hidId = `edit_rating_${c}`;
          const hid = $id(hidId);
          const cont = document.querySelector(`.star-rating[data-target-id="${hidId}"]`);
          const v = (ratingData && typeof ratingData[c] !== 'undefined') ? parseFloat(ratingData[c]) : (hid ? parseFloat(hid.value || '5') : 5);
          if (hid) hid.value = v;
          if (cont) setStarValueOnContainer(cont, v);
        });

        // attach save handler
        const saveBtn = document.getElementById('saveEditCommentBtn');
        const bsModal = (typeof bootstrap !== 'undefined' && bootstrap && typeof bootstrap.Modal === 'function') ? new bootstrap.Modal(editModalEl) : null;
        if (bsModal) bsModal.show();

        saveBtn.onclick = async function() {
          const newText = (editTextarea.value || '').trim();
          if (newText.length === 0) return alert('Escribe un comentario antes de guardar');
          if (newText.length > 1000) return alert('Comentario demasiado largo (máx 1000 caracteres)');

          const payload = { comment: newText };
          criteria.forEach(c => {
            const hid = $id(`edit_rating_${c}`);
            payload[c] = hid ? parseFloat(hid.value || '5') : 5;
          });

          try {
            const res = await fetch(`/api/ratings/${ratingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data && data.success) {
              if (bsModal && typeof bsModal.hide === 'function') bsModal.hide();
              window.location.reload();
            } else {
              alert('No se pudo actualizar el comentario');
            }
          } catch (err) {
            console.error(err);
            alert('Error al actualizar comentario');
          }
        };
      });
    });

    // (edit modal star widgets are initialized above with the common star-rating initializer)

  } catch (err) {
    console.error('[post-rate] init error', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPostRate);
} else {
  initPostRate();
}

