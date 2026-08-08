import { Router } from 'express';
import { 
  obtenerServicioSocial, 
  registrarServicioSocial, 
  actualizarServicioSocial 
} from '../controllers/servicioSocial.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, obtenerServicioSocial);
router.post('/', verifyToken, requireRole(['administrador']), registrarServicioSocial);
router.put('/:id', verifyToken, requireRole(['administrador']), actualizarServicioSocial);

export default router;