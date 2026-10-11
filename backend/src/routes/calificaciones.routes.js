import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  misCalificaciones,
  calificacionesPorMateria,
  registrarCalificacion,
  actualizarCalificacion,
  registrarRegularizacion,
  getCondicionAcademica,
  getPeriodosEvaluacion,
} from '../controllers/calificaciones.controller.js';

const router = Router();
router.use(verifyToken);

// Alumno ve sus calificaciones y resumen académico
router.get('/mis-calificaciones', requireRole('alumno'), misCalificaciones);

// Consulta de condición académica del alumno (regular / irregular con adeudo / no promovido)
router.get('/condicion-academica/:alumno_id', requireRole('administrador', 'docente'), getCondicionAcademica);

// Docente/Admin ven calificaciones de una materia_grupo específica
router.get('/materia/:materia_grupo_id', requireRole('administrador', 'docente'), calificacionesPorMateria);

// Registrar/actualizar calificaciones ordinarias
router.post('/', requireRole('administrador', 'docente'), registrarCalificacion);
router.put('/:id', requireRole('administrador', 'docente'), actualizarCalificacion);

// Registrar extraordinario o recuperación
router.post('/regularizacion', requireRole('administrador', 'docente'), registrarRegularizacion);

// Fechas y periodos de evaluación de la materia
router.get('/periodos/:materia_grupo_id', requireRole('administrador', 'docente'), getPeriodosEvaluacion);

export default router;