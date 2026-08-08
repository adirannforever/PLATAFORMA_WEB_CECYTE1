import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getMaterias,
  getMateriaById,
  crearMateria,
  actualizarMateria,
  getAlumnosDeMateria,
} from '../controllers/materias.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('administrador', 'docente'), getMaterias);
router.get('/:id', requireRole('administrador', 'docente'), getMateriaById);
router.get('/:id/alumnos', requireRole('administrador', 'docente'), getAlumnosDeMateria);

router.post('/', requireRole('administrador'), crearMateria);
router.patch('/:id', requireRole('administrador'), actualizarMateria);

export default router;
