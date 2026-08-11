import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getIncidencias,
  getIncidenciasByAlumno,
  crearIncidencia,
  actualizarIncidencia,
  resolverIncidencia,
  eliminarIncidencia,
} from '../controllers/incidencias.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('administrador'), getIncidencias);
router.get('/alumno/:alumno_id', requireRole('administrador', 'docente'), getIncidenciasByAlumno);
router.post('/', requireRole('administrador'), crearIncidencia);
router.put('/:id', requireRole('administrador'), actualizarIncidencia);
router.patch('/:id/resolver', requireRole('administrador'), resolverIncidencia);
router.delete('/:id', requireRole('administrador'), eliminarIncidencia);

export default router;