// socket-init.js - carga dinámica del cliente socket.io y establece la conexión con JWT
(function() {
  function loadSocketClient() {
    return new Promise((resolve, reject) => {
      if (window.io) return resolve(window.io);
      const s = document.createElement('script');
      s.src = '/socket.io/socket.io.js';
      s.onload = () => resolve(window.io);
      s.onerror = (e) => reject(new Error('No se pudo cargar /socket.io/socket.io.js'));
      document.head.appendChild(s);
    });
  }

  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  async function initSocket() {
    try {
      await loadSocketClient();
    } catch (e) {
      console.error('socket-init: no se pudo cargar cliente socket.io', e);
      return;
    }

    const token = getCookie('token');
    try {
      const socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
      window.socket = socket;

      socket.on('connect', () => {
        console.log('Socket conectado:', socket.id);
        window.dispatchEvent(new Event('socketReady'));
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket connect_error:', err && err.message);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket desconectado:', reason);
      });
    } catch (e) {
      console.error('socket-init: error creando socket', e && e.message);
    }
  }

  // Iniciar sin bloquear la carga del resto
  initSocket();
})();
