import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
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

router.get('/', requireRole('administrador', 'docente'), getGrupos);
router.get('/:id', requireRole('administrador', 'docente'), getGrupoById);
router.get('/:id/materias', requireRole('administrador', 'docente'), getMaterias);
router.get('/:id/alumnos', requireRole('administrador', 'docente'), getAlumnosDeGrupo);
router.post('/', requireRole('administrador'), crearGrupo);
router.patch('/:id', requireRole('administrador'), actualizarGrupo);

router.post('/:id/materias', verifyToken, requireRole('administrador'), asignarMaterias);

export default router;