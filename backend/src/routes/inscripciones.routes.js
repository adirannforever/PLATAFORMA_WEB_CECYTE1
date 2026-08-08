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

router.get('/mis-materias', requireRole('alumno'), misMaterias);

router.post('/', requireRole('administrador'), inscribirAlumno);
router.delete('/:id', requireRole('administrador'), eliminarInscripcion);

export default router;
