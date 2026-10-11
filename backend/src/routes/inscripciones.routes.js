import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
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

const router = Router();
router.use(verifyToken);

// Pipeline de Reinscripción Digital (Cédula)
router.get('/estatus-reinscripcion', requirePermiso('inscripciones.ver', 'inscripciones.reinscripcion_propia'), getEstatusReinscripcion);
router.post('/cedula-reinscripcion', requirePermiso('inscripciones.reinscripcion_propia', 'inscripciones.crear'), procesarCedulaReinscripcion);

// Dashboard de Control Escolar
router.get('/dashboard-control-escolar', requirePermiso('inscripciones.dashboard_control'), getControlEscolarDashboard);

// Listas administrativas tradicionales
router.get('/alumnos-disponibles', requirePermiso('inscripciones.ver'), getAlumnosDisponibles);
router.get('/grupos-disponibles', requirePermiso('inscripciones.ver'), getGruposDisponibles);
router.get('/grupo/:grupo_id/alumnos', requirePermiso('inscripciones.ver'), getAlumnosDeGrupo);

// Acciones manuales de inscripción/baja
router.post('/', requirePermiso('inscripciones.crear'), inscribirAlumno);
router.delete('/:id', requirePermiso('inscripciones.eliminar'), eliminarInscripcion);

export default router;