// chat.js (loader) — carga los fragmentos en public/js/chat/ y los concatena para ejecutar
(function() {
  const fragments = [
    '/js/chat/chat-setup.js',
    '/js/chat/chat-crypto.js',
    '/js/chat/chat-init.js',
    '/js/chat/chat-messages.js',
    '/js/chat/chat-ui.js',
    '/js/chat/chat-files.js',
    '/js/chat/chat-run.js'
  ];

  (async function loadAndRun() {
    try {
      let code = '';
      for (const f of fragments) {
        const res = await fetch(f, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to load ' + f + ' (' + res.status + ')');
        code += await res.text() + '\n';
      }
      // Ejecutar el código concatenado en el scope global
      new Function(code)();
    } catch (err) {
      console.error('Error loading chat modules:', err);
    }
  })();
})();