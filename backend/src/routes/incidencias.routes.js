import { Router } from 'express';
import { getIncidenciasAlumno, crearIncidencia, resolverIncidencia } from '../controllers/incidencias.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/alumno/:alumno_id', verifyToken, requireRole('administrador', 'docente'), getIncidenciasAlumno);
router.post('/', verifyToken, requireRole('administrador', 'docente'), crearIncidencia);

router.patch('/:id/resolver', verifyToken, requireRole('administrador'), resolverIncidencia);

export default router;