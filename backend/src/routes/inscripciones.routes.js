import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { reinscripcionSchema } from '../schemas/inscripciones.schema.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getAlumnosDisponibles,
  getGruposDisponibles,
  inscribirAlumno,
  getAlumnosDeGrupo,
  eliminarInscripcion,
  getEstatusReinscripcion,
  procesarCedulaReinscripcion,
  getControlEscolarDashboard
} from '../controllers/inscripciones.controller.js';

const importarInscripcionesCsv = crearImportadorCsv(inscribirAlumno, {
  allowedHeaders: ['alumno_id', 'grupo_id'],
  requiredHeaders: ['alumno_id', 'grupo_id'],
  uniqueBy: ['alumno_id'],
});

const router = Router();
router.use(verifyToken);

// Pipeline de Reinscripción Digital (Cédula)
router.get('/estatus-reinscripcion', requirePermiso('inscripciones.ver', 'inscripciones.reinscripcion_propia'), getEstatusReinscripcion);
router.post(
  '/cedula-reinscripcion',
  requirePermiso('inscripciones.reinscripcion_propia', 'inscripciones.crear'),
  validate(reinscripcionSchema),
  procesarCedulaReinscripcion
);

// Dashboard de Control Escolar
router.get('/dashboard-control-escolar', requirePermiso('inscripciones.dashboard_control'), getControlEscolarDashboard);

// Listas administrativas tradicionales
router.get('/alumnos-disponibles', requirePermiso('inscripciones.ver'), getAlumnosDisponibles);
router.get('/grupos-disponibles', requirePermiso('inscripciones.ver'), getGruposDisponibles);
router.get('/grupo/:grupo_id/alumnos', requirePermiso('inscripciones.ver'), getAlumnosDeGrupo);

// Acciones manuales de inscripción/baja
router.post(
  '/importar',
  requirePermiso('inscripciones.crear'),
  validate(importarRegistrosCsvSchema),
  importarInscripcionesCsv
);
router.post('/', requirePermiso('inscripciones.crear'), inscribirAlumno);
router.delete('/:id', requirePermiso('inscripciones.eliminar'), eliminarInscripcion);

export default router;