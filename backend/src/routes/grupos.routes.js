import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getGrupos,
  getGrupoById,
  getMaterias, // ← agregar esta importación
  getAlumnosDeGrupo,
  crearGrupo,
  actualizarGrupo,
} from '../controllers/grupos.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('administrador', 'docente'), getGrupos);
router.get('/:id', requireRole('administrador', 'docente'), getGrupoById);
router.get('/:id/materias', requireRole('administrador', 'docente'), getMaterias); // ← agregar
router.get('/:id/alumnos', requireRole('administrador', 'docente'), getAlumnosDeGrupo);
router.post('/', requireRole('administrador'), crearGrupo);
router.patch('/:id', requireRole('administrador'), actualizarGrupo);

export default router;
