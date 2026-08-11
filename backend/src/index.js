import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { query } from './config/db.js';
import { crearCiclosFuturos } from './utils/ciclos.js'; //  IMPORTACIÓN NOMBRADA

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Rutas
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

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
  try {
    await crearCiclosFuturos(); //  ahora funciona
    console.log(' Ciclos futuros verificados');
  } catch (err) {
    console.error(' Error al verificar ciclos:', err);
  }
});