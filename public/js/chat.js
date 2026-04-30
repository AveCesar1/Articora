// chat.js
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

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  (async function loadAndRun() {
    try {
      for (const fragment of fragments) {
        await loadScript(fragment);
      }
    } catch (err) {
      console.error('Error loading chat modules:', err);
    }
  })();
})();
