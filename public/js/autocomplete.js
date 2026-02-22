// Client-side autocomplete for upload form
// Loads /spanish_words.json (local file) and enables inline suffix suggestions

class TrieNode { constructor(){ this.children = Object.create(null); this.isEnd = false; } }
class AutocompleteTrie {
  constructor(){ this.root = new TrieNode(); }
  insert(word){ let node = this.root; for (const ch of word.toLowerCase()){ if(!node.children[ch]) node.children[ch] = new TrieNode(); node = node.children[ch]; } node.isEnd = true; }
  _nodeForPrefix(prefix){ let node = this.root; for (const ch of prefix.toLowerCase()){ if(!node.children[ch]) return null; node = node.children[ch]; } return node; }
  bestSuggestion(prefix){ const node = this._nodeForPrefix(prefix); if(!node) return null; let found = null; const walk = (n, cur) => { if(found) return; if(n.isEnd){ found = cur; return; } const keys = Object.keys(n.children).sort(); for(const k of keys){ walk(n.children[k], cur + k); if(found) return; } }; walk(node, prefix.toLowerCase()); return found; }
}

// minimal helpers
function debounce(fn, wait=80){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

// determine current word under caret
function getWordAtCaret(value, caretPos){ caretPos = Math.max(0, Math.min(value.length, caretPos)); let start = caretPos - 1; while(start >=0 && value[start] !== ' ') start--; start++; let end = caretPos; while(end < value.length && value[end] !== ' ') end++; const before = value.slice(0, start); const word = value.slice(start, caretPos); const after = value.slice(caretPos); return { before, word, after, start, end, caretPos }; }

// UI: create hint element attached to document body and position it above input
function createHintElement(){ const el = document.createElement('div'); el.className = 'ac-hint'; el.style.position = 'absolute'; el.style.pointerEvents = 'none'; el.style.zIndex = 1500; el.innerHTML = '<span class="ac-hidden"></span><span class="ac-suffix"></span>'; document.body.appendChild(el); return el; }

// sync style from input to hint for alignment
function syncHintStyle(input, hint){
  const cs = window.getComputedStyle(input);
  const props = ['font-family','font-size','font-weight','line-height','letter-spacing','padding-top','padding-right','padding-bottom','padding-left','box-sizing','text-transform'];
  props.forEach(p=>{ hint.style.setProperty(p, cs.getPropertyValue(p)); });
  // Use bounding rect to match exact rendered size (includes borders)
  const r = input.getBoundingClientRect();
  hint.style.width = r.width + 'px';
  hint.style.height = r.height + 'px';
  hint.style.display = 'flex';
  hint.style.alignItems = 'center';
  // Copy padding explicitly to align text inside
  hint.style.paddingTop = cs.paddingTop;
  hint.style.paddingRight = cs.paddingRight;
  hint.style.paddingBottom = cs.paddingBottom;
  hint.style.paddingLeft = cs.paddingLeft;
}

(async function initUploadAutocomplete(){
  const form = document.getElementById('uploadForm');
  if(!form) return;

  const trie = new AutocompleteTrie();
  let wordsLoaded = false;

  async function loadWords(){
    try{
      // Load local file placed at project root public/spanish_words.json -> served at /spanish_words.json
      const r = await fetch('/spanish_words.json'); if(!r.ok) throw new Error('http ' + r.status);
      const arr = await r.json(); if(!Array.isArray(arr)) throw new Error('invalid format');
      for(const w of arr){ if(typeof w === 'string' && w.trim()) trie.insert(w.trim().toLowerCase()); }
      wordsLoaded = true;
    }catch(err){ console.warn('autocomplete: could not load /spanish_words.json', err); }
  }

  await loadWords();

  // Attach to all text-like controls inside the form
  const selector = 'input[type="text"], input[type="url"], textarea, .author-input';
  const inputs = Array.from(form.querySelectorAll(selector));
  const hintMap = new WeakMap();

  function computeAndShow(input){ if(!wordsLoaded) return hideHintFor(input); const val = input.value || ''; const caret = input.selectionStart || 0; const info = getWordAtCaret(val, caret); if(!info.word || info.word.length < 2){ hideHintFor(input); return; } const best = trie.bestSuggestion(info.word); if(!best || best.length <= info.word.length){ hideHintFor(input); return; } // show
    let hint = hintMap.get(input); if(!hint){ hint = createHintElement(); hintMap.set(input, hint); }
    syncHintStyle(input, hint);
    // position near input
    const r = input.getBoundingClientRect(); hint.style.left = (window.scrollX + r.left) + 'px'; hint.style.top = (window.scrollY + r.top) + 'px'; hint.style.minWidth = r.width + 'px';
    const beforeEsc = escapeHtml(info.before + info.word);
    const suffixEsc = escapeHtml(best.slice(info.word.length));
    hint.querySelector('.ac-hidden').innerHTML = beforeEsc;
    hint.querySelector('.ac-suffix').innerHTML = suffixEsc;
    hint.style.display = 'flex';
  }

  function hideHintFor(input){ const h = hintMap.get(input); if(h) h.style.display = 'none'; }

  function acceptSuggestion(input){ const h = hintMap.get(input); if(!h || h.style.display === 'none') return; // Reconstruct using caret
    const val = input.value || ''; const caret = input.selectionStart || 0; const info = getWordAtCaret(val, caret);
    const before = info.before;
    const afterFromEnd = val.slice(info.end);
    const typed = info.word || '';
    const suffix = h.querySelector('.ac-suffix').textContent || '';
    const suggestionWord = typed + suffix; // only replace the typed word
    const newVal = before + suggestionWord + (afterFromEnd ? ' ' + afterFromEnd : '');
    input.value = newVal;
    const newCaret = (before + suggestionWord + ' ').length;
    input.setSelectionRange(newCaret, newCaret);
    hideHintFor(input);
    input.dispatchEvent(new Event('input',{ bubbles:true })); }

  // events
  for(const inp of inputs){ inp.addEventListener('input', debounce(()=> computeAndShow(inp), 80)); inp.addEventListener('keyup', debounce(()=> computeAndShow(inp),80)); inp.addEventListener('blur', ()=> setTimeout(()=> hideHintFor(inp), 150)); inp.addEventListener('keydown', (e)=>{ if(e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowRight'){ // accept suggestion if present
        const h = hintMap.get(inp); if(h && h.style.display !== 'none'){ e.preventDefault(); acceptSuggestion(inp); }
      }
      if(e.key === 'Escape'){ hideHintFor(inp); }
    }); // ensure hint removed on form submit
  }

  // recompute on scroll/resize so hints stay aligned
  window.addEventListener('scroll', debounce(()=> inputs.forEach(i=> computeAndShow(i)), 120), true);
  window.addEventListener('resize', debounce(()=> inputs.forEach(i=> computeAndShow(i)), 120));
})();
