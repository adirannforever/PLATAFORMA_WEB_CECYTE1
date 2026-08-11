import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getCiclos,
  crearCiclo,
  actualizarCiclo,
  eliminarCiclo,
} from '../controllers/ciclos.controller.js';

const router = Router();
router.use(verifyToken);
router.use(requireRole('administrador'));

router.get('/', getCiclos);
router.post('/', crearCiclo);
router.put('/:id', actualizarCiclo);
router.delete('/:id', eliminarCiclo);

export default router;