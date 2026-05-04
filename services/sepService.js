const axios = require('axios');
const NodeCache = require('node-cache');

// ─── Constantes ──────────────────────────────────────────────────────────────

const ENDPOINT = 'https://cedulaprofesional.sep.gob.mx/api/solr/profesionista/consultar/byDetalle';

// Bearer Token extraído de DevTools → Network → byDetalle → Headers → Authorization
// Este token es del cliente Angular del portal (no de un usuario individual).
// Cámbialo en .env cuando expire.
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJMdTM5Nk43RGVHS1Y2RnYwM0pDY0RqVXMwak94ZHVVMWxESTd2X3BYamVnIn0.eyJleHAiOjE4MDkxMTE5MTAsImlhdCI6MTc3NzU3NTkxMCwianRpIjoiMTc5Y2UxZWEtNDJmNi00OTExLTk3NTUtN2E0MTFhM2I1MTIwIiwiaXNzIjoiaHR0cHM6Ly9kZ3RpY2tleWNsb2FrLnNlcC5nb2IubXgvcmVhbG1zL3JucCIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiI1MzI4YjRjYi04YTM2LTQ4YTgtODIzMi1jNTg4NTQ2ZGY4OTYiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJybnAtYW5ndWxhci1hcHAtcHJvZCIsImFjciI6IjEiLCJhbGxvd2VkLW9yaWdpbnMiOlsiaHR0cHM6Ly9jZWR1bGFwcm9mZXNpb25hbC5zZXAuZ29iLm14Il0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJkZWZhdWx0LXJvbGVzLXJucCIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwgREdUSUNfQVBQTElDQVRJT04iLCJjbGllbnRIb3N0IjoiMTY4LjI1NS4xMDEuNTQiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInByZWZlcnJlZF91c2VybmFtZSI6InNlcnZpY2UtYWNjb3VudC1ybnAtYW5ndWxhci1hcHAtcHJvZCIsImNsaWVudEFkZHJlc3MiOiIxNjguMjU1LjEwMS41NCIsImNsaWVudF9pZCI6InJucC1hbmd1bGFyLWFwcC1wcm9kIn0.GHPiJaCh5EevzglNozDzL8P6lF-BrA9tAkksCIEmGzOxEu82fV0cM4w9oIRXhvd7NeZOMHaqQ7eHJMw8A_y4rweLpzg_CKOP9bkoEqZdQEK09PihFLlX0DwGYF7iKgK5t4s2zvDbLntVwcB4OMQoLQHU-Xde0e-t9fNBWUU6nj0TvKt_HC4MgFYIKjH9e5vNzEzQr46hLozrQE8k_VWRQ8tgM4jTWAfDHs3_32KDHe6X2nQQPEtP_8_X4mljMvt7JZDKyzJ7jelEoPEorYm1UAJ08Y5LR-gpegD8TjrvaGGRzdCtYB1ouvDsAi8ykBnJqsvtVc0gbc0LNK1DcjH5ZQ';

// ─── Caché ───────────────────────────────────────────────────────────────────
// TTL 1 hora — los datos de cédulas cambian muy poco
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// ─── Cliente axios ───────────────────────────────────────────────────────────
const client = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type':   'application/json',
    'Accept':         'application/json, text/plain, */*',
    'Accept-Language':'es-ES,es;q=0.9',
    'Authorization':  `Bearer ${BEARER_TOKEN}`,
    'Origin':         'https://cedulaprofesional.sep.gob.mx',
    'Referer':        'https://cedulaprofesional.sep.gob.mx/',
    'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  },
});

// ─── Función principal ───────────────────────────────────────────────────────

/**
 * Consulta una cédula profesional en el portal de la SEP.
 * Primero revisa caché; si no está, llama al endpoint.
 *
 * @param {string} numCedula  Número de cédula (6-8 dígitos)
 * @returns {Promise<Object|null>} Datos del profesionista o null si no existe
 */
async function consultarCedula(numCedula) {
  const cacheKey = `cedula:${numCedula}`;

  // 1. Revisar caché
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[cache HIT] ${numCedula}`);
    return cached;
  }

  console.log(`[sep] Consultando cédula ${numCedula}…`);

  try {
    const { data } = await client.post(ENDPOINT, { numCedula });

    // Guardar en caché (incluso null para evitar repetir búsquedas fallidas)
    cache.set(cacheKey, data ?? null);
    return data ?? null;

  } catch (error) {

    // Si el servidor rechaza por reCAPTCHA devolverá 401 o 403
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('RECAPTCHA_REQUIRED');
    }

    if (error.response?.status === 404) {
      cache.set(cacheKey, null);
      return null;
    }

    throw error;
  }
}

function cacheStats() {
  return cache.getStats();
}

module.exports = { consultarCedula, cacheStats };
