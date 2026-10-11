import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getMateriasCatalogo,
  crearMateriaCatalogo,
  actualizarMateriaCatalogo,
  eliminarMateriaCatalogo,
} from '../controllers/materiasCatalogo.controller.js';

const router = Router();
router.use(verifyToken);
router.use(requirePermiso('config_academica.gestionar'));

router.get('/', getMateriasCatalogo);
router.post('/', crearMateriaCatalogo);
router.put('/:id', actualizarMateriaCatalogo);
router.delete('/:id', eliminarMateriaCatalogo);

export default router;