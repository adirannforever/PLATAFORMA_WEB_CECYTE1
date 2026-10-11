import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { query } from './config/db.js';
import { INSTITUCION } from './config/institucion.js';
import { crearCiclosFuturos } from './utils/ciclos.js';
import '../scripts/scheduler.js';

import { logger } from './config/logger.js';
import redisClient from './config/redis.js';

import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import materiasRoutes from './routes/materias.routes.js';
import inscripcionesRoutes from './routes/inscripciones.routes.js';
import calificacionesRoutes from './routes/calificaciones.routes.js';
import comunicadosRoutes from './routes/comunicados.routes.js';
import asistenciaRoutes from './routes/asistencia.routes.js';
import aspirantesRoutes from './routes/aspirantes.routes.js';
import becasRoutes from './routes/becas.routes.js';
import catalogosRoutes from './routes/catalogos.routes.js';
import expedienteRoutes from './routes/expediente.routes.js';
import horariosRoutes from './routes/horarios.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import pagosRoutes from './routes/pagos.routes.js';
import servicioSocialRoutes from './routes/servicioSocial.routes.js';
import titulacionRoutes from './routes/titulacion.routes.js';
import gruposRoutes from './routes/grupos.routes.js';
import tutoriasRoutes from './routes/tutorias.routes.js';
import periodosRoutes from './routes/periodos.routes.js';
import ciclosRoutes from './routes/ciclos.routes.js';
import materiasCatalogoRoutes from './routes/materiasCatalogo.routes.js';
import auditoriaRoutes from './routes/auditoria.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import materiasGrupoRoutes from './routes/materiasGrupo.routes.js';
import { auditoriaGlobal } from './middlewares/auditoriaGlobal.js';
import { apiLimiter } from './middlewares/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Health Check (sin rate limit)
app.get('/health', async (req, res) => {
  try {
    const dbOk = await query('SELECT 1');
    const redisOk = await redisClient.ping();
    res.json({
      status: 'OK',
      version: '3.0.0',
      platform: INSTITUCION.nombre,
      timestamp: new Date().toISOString(),
      database: 'ok',
      redis: redisOk === 'PONG' ? 'ok' : 'error',
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      message: 'No se pudo conectar a los servicios de infraestructura',
      error: err.message,
    });
  }
});

// Readiness (si el proceso puede seguir activo)
app.get('/ready', async (req, res) => {
  try {
    const dbOk = await query('SELECT 1');
    const redisOk = await redisClient.ping();
    if (dbOk && redisOk === 'PONG') {
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

// Metrics de la instancia (sin dependencias extra)
let requestCount = 0;
app.use((req, res, next) => {
  requestCount += 1;
  next();
});

app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    requestCount,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    },
    nodeVersion: process.version,
  });
});

// Middleware de auditoría global y rate limiting general
app.use(auditoriaGlobal);
app.use('/api', apiLimiter);

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/materias', materiasRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/comunicados', comunicadosRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/aspirantes', aspirantesRoutes);
app.use('/api/becas', becasRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/expediente', expedienteRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/servicio-social', servicioSocialRoutes);
app.use('/api/titulacion', titulacionRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/tutorias', tutoriasRoutes);
app.use('/api/periodos', periodosRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/materias-catalogo', materiasCatalogoRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/materias-grupo', materiasGrupoRoutes);

// Manejador 404 para rutas de API no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Ruta de API no encontrada.' });
});

// Manejador centralizado de errores
app.use((err, req, res, next) => {
  console.error('[Error No Manejado]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR',
  });
});

app.listen(PORT, async () => {
  console.log(`[CECyTE v3.0.0] Servidor corriendo en http://localhost:${PORT}`);
  try {
    await crearCiclosFuturos();
    console.log('[CECyTE v3.0.0] Ciclos futuros verificados');
  } catch (err) {
    console.error('[CECyTE v3.0.0] Error al verificar ciclos:', err.message);
  }
});
