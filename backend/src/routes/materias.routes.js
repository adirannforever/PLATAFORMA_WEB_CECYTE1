// src/routes/materias.routes.js
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

// Admin y docente pueden ver materias (el controller filtra por rol)
router.get('/', requireRole('administrador', 'docente'), getMaterias);
router.get('/:id', requireRole('administrador', 'docente'), getMateriaById);
router.get('/:id/alumnos', requireRole('administrador', 'docente'), getAlumnosDeMateria);

// Solo admin gestiona materias
router.post('/', requireRole('administrador'), crearMateria);
router.patch('/:id', requireRole('administrador'), actualizarMateria);

export default router;
