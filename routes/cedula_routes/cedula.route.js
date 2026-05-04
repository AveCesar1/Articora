const express = require('express');
const rateLimit = require('express-rate-limit');
const { consultarCedula, cacheStats } = require('../../services/sepService');

const router = express.Router();

// Máximo 30 peticiones por minuto por IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas peticiones. Intenta en un minuto.' },
});
router.use(limiter);

// ── GET /api/cedula/:numero ──────────────────────────────────────────────────
router.get('/:numero', async (req, res) => {
  const { numero } = req.params;

  // Validar que sea numérico y tenga entre 5 y 8 dígitos
  if (!/^\d{5,8}$/.test(numero)) {
    return res.status(400).json({
      error: 'Número de cédula inválido. Debe ser numérico entre 5 y 8 dígitos.',
      ejemplo: '/api/cedula/1751611',
    });
  }

  try {
    const resultado = await consultarCedula(numero);

    if (!resultado) {
      return res.status(404).json({
        error: 'No se encontró ningún profesionista con esa cédula.',
        cedula: numero,
      });
    }

    return res.json({ cedula: numero, datos: resultado });

  } catch (error) {

    if (error.message === 'RECAPTCHA_REQUIRED') {
      return res.status(503).json({
        error: 'El servidor de la SEP requiere verificación reCAPTCHA. El Bearer Token puede haber expirado o el backend está validando el captcha.',
        solucion: 'Actualiza el BEARER_TOKEN en el archivo .env o cambia a la estrategia con Puppeteer.',
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'El portal de la SEP tardó demasiado. Intenta de nuevo.' });
    }

    console.error(`[error] /api/cedula/${numero}:`, error.message);
    return res.status(500).json({ error: 'Error interno al consultar la SEP.' });
  }
});

// ── GET /api/cedula/cache/stats ──────────────────────────────────────────────
router.get('/cache/stats', (req, res) => res.json(cacheStats()));

module.exports = router;
