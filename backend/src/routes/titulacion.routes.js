import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  obtenerTitulaciones,
  registrarTitulacion,
  actualizarTitulacion,
  eliminarTitulacion,
} from '../controllers/titulacion.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('titulacion.ver'), obtenerTitulaciones);
router.post('/', requirePermiso('titulacion.crear'), registrarTitulacion);
router.put('/:id', requirePermiso('titulacion.editar'), actualizarTitulacion);
router.delete('/:id', requirePermiso('titulacion.eliminar'), eliminarTitulacion);

export default router;