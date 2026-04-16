// Script específico para la página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('disabled');
            }

            const username = (document.getElementById('username') && document.getElementById('username').value) || '';
            const password = (document.getElementById('password') && document.getElementById('password').value) || '';

            if (window.console && console.log) console.log('login.js: submit handler started for', username);

            try {
                const resp = await fetch('/login', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await resp.json();
                if (!resp.ok) {
                    throw new Error(data.message || 'Credenciales inválidas');
                }

                if (window.console && console.log) console.log('login.js: login response', data);

                // Login OK. If the server returned key material in the login response, use it.
                try {
                    const keys = data.keys || null;
                    if (keys) {
                        if (window.console && console.log) console.log('login.js: keys present in login response', { hasPublic: !!keys.public_key, hasEncryptedPrivate: !!keys.encrypted_private_key });
                    } else {
                        if (window.console && console.log) console.log('login.js: no keys in login response, will try /api/keys fallback');
                    }

                    if (keys && keys.encrypted_private_key && keys.private_key_salt && keys.private_key_iv && keys.private_key_tag) {
                        if (window.console && console.log) console.log('login.js: attempting to decrypt private key from login response');
                        try {
                            const decryptedBase64 = await decryptPrivateKeyWithPassword(password, keys.private_key_salt, keys.private_key_iv, keys.encrypted_private_key, keys.private_key_tag);
                            // Guardar en localStorage para esta sesión/dispositivo
                            localStorage.setItem('articora_private_key', decryptedBase64);
                            if (keys.public_key) localStorage.setItem('articora_public_key', keys.public_key);
                            if (window.console && console.log) console.log('login.js: private key decrypted and stored in localStorage');
                        } catch (e) {
                            console.warn('login.js: failed to decrypt private key from login response:', e);
                        }
                    } else {
                        // Fallback: try fetching /api/keys (authenticated) if login response didn't include keys
                        try {
                            if (window.console && console.log) console.log('login.js: fetching /api/keys fallback');
                            const keysResp = await fetch('/api/keys', { credentials: 'same-origin' });
                            if (keysResp.ok) {
                                const k2 = await keysResp.json();
                                if (window.console && console.log) console.log('login.js: /api/keys response', k2);
                                if (k2 && k2.encrypted_private_key && k2.private_key_salt && k2.private_key_iv && k2.private_key_tag) {
                                    try {
                                        const decryptedBase64 = await decryptPrivateKeyWithPassword(password, k2.private_key_salt, k2.private_key_iv, k2.encrypted_private_key, k2.private_key_tag);
                                        localStorage.setItem('articora_private_key', decryptedBase64);
                                        if (k2.public_key) localStorage.setItem('articora_public_key', k2.public_key);
                                        if (window.console && console.log) console.log('login.js: private key decrypted and stored (fallback)');
                                    } catch (e) {
                                        console.warn('login.js: failed to decrypt private key (fallback):', e);
                                    }
                                }
                            } else {
                                if (window.console && console.warn) console.warn('login.js: /api/keys fallback returned non-ok status', keysResp.status);
                            }
                        } catch (e2) {
                            console.warn('login.js: could not fetch /api/keys (fallback):', e2);
                        }
                    }
                } catch (e) {
                    console.warn('login.js: error processing keys after login:', e);
                }

                // Redirigir al dashboard
                window.location.href = '/dashboard';
            } catch (err) {
                console.error('Error en login:', err);
                // Re-enable button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('disabled');
                }
                // Mostrar mensaje de error en la UI (fallback simple)
                const errEl = document.getElementById('loginError');
                if (errEl) {
                    errEl.textContent = err.message || 'Error de login';
                    errEl.classList.remove('d-none');
                } else {
                    alert(err.message || 'Error de login');
                }
            }
        });
    }
});