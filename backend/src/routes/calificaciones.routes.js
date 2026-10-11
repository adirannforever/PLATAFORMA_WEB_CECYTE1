import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
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
router.get('/mis-calificaciones', requirePermiso('calificaciones.ver_mis_calificaciones'), misCalificaciones);

// Consulta de condición académica del alumno (regular / irregular con adeudo / no promovido)
router.get('/condicion-academica/:alumno_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), getCondicionAcademica);

// Docente/Admin ven calificaciones de una materia_grupo específica
router.get('/materia/:materia_grupo_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), calificacionesPorMateria);

// Registrar/actualizar calificaciones ordinarias
router.post('/', requirePermiso('calificaciones.crear'), registrarCalificacion);
router.put('/:id', requirePermiso('calificaciones.editar'), actualizarCalificacion);

// Registrar extraordinario o recuperación
router.post('/regularizacion', requirePermiso('calificaciones.regularizar'), registrarRegularizacion);

// Fechas y periodos de evaluación de la materia
router.get('/periodos/:materia_grupo_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), getPeriodosEvaluacion);

export default router;