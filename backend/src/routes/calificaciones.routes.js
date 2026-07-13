// src/routes/calificaciones.routes.js
import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  misCalificaciones,
  calificacionesPorMateria,
  registrarCalificacion,
  actualizarCalificacion,
} from '../controllers/calificaciones.controller.js';

const router = Router();

router.use(verifyToken);

// Alumno: sus propias calificaciones
router.get('/mis-calificaciones', requireRole('alumno'), misCalificaciones);

// Docente y Admin: calificaciones de una materia
router.get('/materia/:materia_id', requireRole('administrador', 'docente'), calificacionesPorMateria);

// Docente y Admin: registrar y actualizar
router.post('/', requireRole('administrador', 'docente'), registrarCalificacion);
router.put('/:id', requireRole('administrador', 'docente'), actualizarCalificacion);

export default router;
