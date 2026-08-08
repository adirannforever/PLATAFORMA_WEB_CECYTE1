import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  misCalificaciones,
  calificacionesPorMateria,
  registrarCalificacion,
  actualizarCalificacion
} from '../controllers/calificaciones.controller.js';

const router = Router();
router.use(verifyToken);

// Alumno ve sus calificaciones
router.get('/mis-calificaciones', requireRole('alumno'), misCalificaciones);

// Docente/Admin ven calificaciones de una materia_grupo específica
router.get('/materia/:materia_grupo_id', requireRole('administrador', 'docente'), calificacionesPorMateria);

// Registrar/actualizar calificaciones (docente/admin)
router.post('/', requireRole('administrador', 'docente'), registrarCalificacion);
router.put('/:id', requireRole('administrador', 'docente'), actualizarCalificacion);

export default router;