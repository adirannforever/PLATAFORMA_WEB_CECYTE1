// src/routes/inscripciones.routes.js
import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  misMaterias,
  inscribirAlumno,
  eliminarInscripcion,
} from '../controllers/inscripciones.controller.js';

const router = Router();

router.use(verifyToken);

// Alumno consulta sus materias inscritas
router.get('/mis-materias', requireRole('alumno'), misMaterias);

// Solo admin gestiona inscripciones
router.post('/', requireRole('administrador'), inscribirAlumno);
router.delete('/:id', requireRole('administrador'), eliminarInscripcion);

export default router;
