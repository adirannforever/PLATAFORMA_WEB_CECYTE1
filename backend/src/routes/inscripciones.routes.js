import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
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
router.get('/estatus-reinscripcion', requireRole('alumno', 'administrador'), getEstatusReinscripcion);
router.post('/cedula-reinscripcion', requireRole('alumno', 'administrador'), procesarCedulaReinscripcion);

// Dashboard de Control Escolar
router.get('/dashboard-control-escolar', requireRole('administrador'), getControlEscolarDashboard);

// Listas administrativas tradicionales
router.get('/alumnos-disponibles', requireRole('administrador'), getAlumnosDisponibles);
router.get('/grupos-disponibles', requireRole('administrador'), getGruposDisponibles);
router.get('/grupo/:grupo_id/alumnos', requireRole('administrador'), getAlumnosDeGrupo);

// Acciones manuales de inscripción/baja
router.post('/', requireRole('administrador'), inscribirAlumno);
router.delete('/:id', requireRole('administrador'), eliminarInscripcion);

export default router;