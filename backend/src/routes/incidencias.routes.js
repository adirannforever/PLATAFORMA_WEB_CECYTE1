import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
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
router.get('/', getIncidencias);
router.get('/alumno/:alumno_id', getIncidenciasByAlumno);
router.post('/', crearIncidencia);
router.put('/:id', actualizarIncidencia);
router.patch('/:id/resolver', resolverIncidencia);
router.delete('/:id', eliminarIncidencia);

export default router;