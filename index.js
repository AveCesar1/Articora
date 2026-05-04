require('dotenv').config();
const express = require('express');
const cedulaRoute = require('./routes/cedula.route');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rutas
app.use('/api/cedula', cedulaRoute);

// Documentación básica en la raíz
app.get('/', (req, res) => res.json({
  nombre: 'API Cédulas Profesionales SEP',
  version: '2.0.0',
  endpoints: {
    consultarCedula: 'GET /api/cedula/:numero',
    cacheStats:      'GET /api/cedula/cache/stats',
    health:          'GET /health',
  },
  ejemplo: '/api/cedula/1751611',
}));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: `Ruta ${req.path} no encontrada.` }));

app.listen(PORT, () => {
  console.log(`\nAPI Cédulas SEP corriendo en http://localhost:${PORT}`);
  console.log(`Prueba: http://localhost:${PORT}/api/cedula/1751611\n`);
});
