import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getAlumnosDisponibles,
  getGruposDisponibles,
  inscribirAlumno,
  getAlumnosDeGrupo,
  eliminarInscripcion
} from '../controllers/inscripciones.controller.js';

const router = Router();

router.use(verifyToken);

// Obtener listas para formulario
router.get('/alumnos-disponibles', requireRole('administrador'), getAlumnosDisponibles);
router.get('/grupos-disponibles', requireRole('administrador'), getGruposDisponibles);
router.get('/grupo/:grupo_id/alumnos', requireRole('administrador'), getAlumnosDeGrupo);

// Acciones
router.post('/', requireRole('administrador'), inscribirAlumno);
router.delete('/:id', requireRole('administrador'), eliminarInscripcion);

export default router;