import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import './config/db.js';

// Importacion de las rutas.
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import materiasRoutes from './routes/materias.routes.js';
import inscripcionesRoutes from './routes/inscripciones.routes.js';
import calificacionesRoutes from './routes/calificaciones.routes.js';
import comunicadosRoutes from './routes/comunicados.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

// ── RUTAS 
app.use('/api/auth',           authRoutes);
app.use('/api/usuarios',       usuariosRoutes);
app.use('/api/materias',       materiasRoutes);
app.use('/api/inscripciones',  inscripcionesRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/comunicados',    comunicadosRoutes);

// VER LA VIDA DEL SERVIDOR 
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'CECyTE API corriendo correctamente',
    timestamp: new Date().toISOString(),
  });
});

// RUTAS NO ENCONTRADAS.
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

// INICIO DE SERVIDOR
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor CECyTE corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Endpoints disponibles:`);
  console.log(`   **POST   /api/auth/login`);
  console.log(`   **POST   /api/auth/logout`);
  console.log(`   **GET    /api/auth/me`);
  console.log(`   **GET    /api/usuarios`);
  console.log(`   **POST   /api/usuarios`);
  console.log(`   **GET    /api/materias`);
  console.log(`   **POST   /api/materias`);
  console.log(`   **GET    /api/inscripciones/mis-materias`);
  console.log(`   **POST   /api/inscripciones`);
  console.log(`   **GET    /api/calificaciones/mis-calificaciones`);
  console.log(`   **GET    /api/calificaciones/materia/:id`);
  console.log(`   **POST   /api/calificaciones`);
  console.log(`   **GET    /api/comunicados`);
  console.log(`   **POST   /api/comunicados`);
  console.log(`   **GET    /api/health\n`);
});
