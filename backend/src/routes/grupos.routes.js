import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getGrupos,
  getGrupoById,
  getMaterias,
  getAlumnosDeGrupo,
  crearGrupo,
  actualizarGrupo,
  asignarMaterias, 
} from '../controllers/grupos.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('grupos.ver'), getGrupos);
router.get('/:id', requirePermiso('grupos.ver'), getGrupoById);
router.get('/:id/materias', verifyToken, getMaterias);
router.get('/:id/alumnos', requirePermiso('grupos.ver'), getAlumnosDeGrupo);
router.post('/', requirePermiso('grupos.crear'), crearGrupo);
router.patch('/:id', requirePermiso('grupos.editar'), actualizarGrupo);

router.post('/:id/materias', verifyToken, requirePermiso('grupos.asignar_materias'), asignarMaterias);

export default router;