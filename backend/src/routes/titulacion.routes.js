import { Router } from 'express';
import { 
  obtenerTitulaciones, 
  registrarTitulacion, 
  actualizarTitulacion 
} from '../controllers/titulacion.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, obtenerTitulaciones);
router.post('/', verifyToken, requireRole(['administrador']), registrarTitulacion);
router.put('/:id', verifyToken, requireRole(['administrador']), actualizarTitulacion);

export default router;