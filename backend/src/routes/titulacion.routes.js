import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  obtenerTitulaciones,
  registrarTitulacion,
  actualizarTitulacion,
  eliminarTitulacion,
} from '../controllers/titulacion.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('administrador'), obtenerTitulaciones);
router.post('/', requireRole('administrador'), registrarTitulacion);
router.put('/:id', requireRole('administrador'), actualizarTitulacion);
router.delete('/:id', requireRole('administrador'), eliminarTitulacion);

export default router;