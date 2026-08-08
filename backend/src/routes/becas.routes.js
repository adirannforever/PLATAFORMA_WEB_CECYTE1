import { Router } from 'express';
import { 
  obtenerBecas, 
  registrarBeca, 
  actualizarBeca 
} from '../controllers/becas.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, obtenerBecas);
router.post('/', verifyToken, requireRole(['administrador']), registrarBeca);
router.put('/:id', verifyToken, requireRole(['administrador']), actualizarBeca);

export default router;