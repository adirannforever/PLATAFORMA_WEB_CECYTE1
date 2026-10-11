import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
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

router.get('/', requirePermiso('servicio_social.ver'), obtenerServicioSocial);
router.get('/:id/reportes', requirePermiso('servicio_social.ver'), obtenerReportes);
router.patch('/reportes/:id', requirePermiso('servicio_social.editar'), toggleReporte);
router.post('/', requirePermiso('servicio_social.crear'), registrarServicioSocial);
router.put('/:id', requirePermiso('servicio_social.editar'), actualizarServicioSocial);
router.delete('/:id', requirePermiso('servicio_social.eliminar'), eliminarServicioSocial);

export default router;