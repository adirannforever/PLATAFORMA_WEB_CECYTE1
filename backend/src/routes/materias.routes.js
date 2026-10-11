import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getMaterias,
  getMateriaById,
  crearMateria,
  actualizarMateria,
  getAlumnosDeMateria,
  getMateriasByGrupo,
} from '../controllers/materias.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('grupos.ver', 'calificaciones.ver'), getMaterias);
router.get('/grupo', requirePermiso('grupos.ver', 'calificaciones.ver'), getMateriasByGrupo);
router.get('/:id', requirePermiso('grupos.ver', 'calificaciones.ver'), getMateriaById);
router.get('/:id/alumnos', requirePermiso('grupos.ver', 'calificaciones.ver'), getAlumnosDeMateria);

router.post('/', requirePermiso('config_academica.gestionar'), crearMateria);
router.patch('/:id', requirePermiso('config_academica.gestionar'), actualizarMateria);

export default router;
