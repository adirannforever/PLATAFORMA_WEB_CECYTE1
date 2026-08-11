import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  obtenerServicioSocial,
  obtenerReportes,
  toggleReporte,
  registrarServicioSocial,
  actualizarServicioSocial,
  eliminarServicioSocial,
} from '../controllers/servicioSocial.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('administrador'), obtenerServicioSocial);
router.get('/:id/reportes', requireRole('administrador'), obtenerReportes);
router.patch('/reportes/:id', requireRole('administrador'), toggleReporte);
router.post('/', requireRole('administrador'), registrarServicioSocial);
router.put('/:id', requireRole('administrador'), actualizarServicioSocial);
router.delete('/:id', requireRole('administrador'), eliminarServicioSocial);

export default router;