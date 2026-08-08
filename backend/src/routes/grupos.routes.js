import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getGrupos,
  crearGrupo,
  getGrupoById,
  getMateriasDeGrupo,
  getAlumnosDeGrupo,
  actualizarGrupo
} from '../controllers/grupos.controller.js';

const router = Router();

router.use(verifyToken);

// Rutas principales
router.get('/', getGrupos); // con filtros
router.get('/:id', getGrupoById);
router.get('/:id/materias', getMateriasDeGrupo);
router.get('/:id/alumnos', getAlumnosDeGrupo);
router.post('/', requireRole('administrador'), crearGrupo);
router.patch('/:id', requireRole('administrador'), actualizarGrupo);

// Solo administradores pueden crear/editar grupos (por ahora no implementado)
// router.post('/', requireRole('administrador'), crearGrupo);
// router.patch('/:id', requireRole('administrador'), actualizarGrupo);

export default router;

