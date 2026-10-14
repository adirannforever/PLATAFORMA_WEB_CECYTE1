import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  misCalificaciones,
  calificacionesPorMateria,
  registrarCalificacion,
  actualizarCalificacion,
  registrarRegularizacion,
  getCondicionAcademica,
  getPeriodosEvaluacion,
} from '../controllers/calificaciones.controller.js';

const importarCalificacionesCsv = crearImportadorCsv(registrarCalificacion, {
  allowedHeaders: ['alumno_id', 'materia_grupo_id', 'parcial', 'calificacion', 'tipo_evaluacion'],
  requiredHeaders: ['alumno_id', 'materia_grupo_id', 'parcial', 'calificacion'],
  uniqueBy: ['alumno_id', 'materia_grupo_id', 'parcial'],
});

const router = Router();
router.use(verifyToken);

// Alumno ve sus calificaciones y resumen académico
router.get('/mis-calificaciones', requirePermiso('calificaciones.ver_mis_calificaciones'), misCalificaciones);

// Consulta de condición académica del alumno (regular / irregular con adeudo / no promovido)
router.get('/condicion-academica/:alumno_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), getCondicionAcademica);

// Docente/Admin ven calificaciones de una materia_grupo específica
router.get('/materia/:materia_grupo_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), calificacionesPorMateria);

// Registrar/actualizar calificaciones ordinarias
router.post(
  '/importar',
  requirePermiso('calificaciones.crear'),
  validate(importarRegistrosCsvSchema),
  importarCalificacionesCsv
);
router.post('/', requirePermiso('calificaciones.crear'), registrarCalificacion);
router.put('/:id', requirePermiso('calificaciones.editar'), actualizarCalificacion);

// Registrar extraordinario o recuperación
router.post('/regularizacion', requirePermiso('calificaciones.regularizar'), registrarRegularizacion);

// Fechas y periodos de evaluación de la materia
router.get('/periodos/:materia_grupo_id', requirePermiso('calificaciones.ver', 'calificaciones.ver_mis_materias'), getPeriodosEvaluacion);

export default router;