import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import './config/db.js';

import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import materiasRoutes from './routes/materias.routes.js';
import inscripcionesRoutes from './routes/inscripciones.routes.js';
import calificacionesRoutes from './routes/calificaciones.routes.js';
import comunicadosRoutes from './routes/comunicados.routes.js';
import aspirantesRoutes from './routes/aspirantes.routes.js';
import asistenciaRoutes from './routes/asistencia.routes.js';
import expedienteRoutes from './routes/expediente.routes.js';
import pagosRoutes from './routes/pagos.routes.js';
import tutoriasRoutes from './routes/tutorias.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import horariosRoutes from './routes/horarios.routes.js';
import titulacionRoutes from './routes/titulacion.routes.js';
import becasRoutes from './routes/becas.routes.js';
import servicioSocialRoutes from './routes/servicioSocial.routes.js';
import catalogosRoutes from './routes/catalogos.routes.js';
import gruposRoutes from './routes/grupos.routes.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',        authRoutes);
app.use('/api/usuarios',    usuariosRoutes);
app.use('/api/materias',    materiasRoutes);
app.use('/api/inscripciones',inscripcionesRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/comunicados',    comunicadosRoutes);
app.use('/api/aspirantes',   aspirantesRoutes);
app.use('/api/asistencia',   asistenciaRoutes);
app.use('/api/expediente',   expedienteRoutes);
app.use('/api/pagos',        pagosRoutes);
app.use('/api/tutorias',    tutoriasRoutes);
app.use('/api/incidencias',  incidenciasRoutes);
app.use('/api/horarios',     horariosRoutes);
app.use('/api/titulacion',   titulacionRoutes);
app.use('/api/becas',        becasRoutes);
app.use('/api/servicio-social', servicioSocialRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/grupos', gruposRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'CECyTE API corriendo correctamente',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  });
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
});

app.listen(PORT, () => {
  console.log(`\n Servidor CECyTE corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});