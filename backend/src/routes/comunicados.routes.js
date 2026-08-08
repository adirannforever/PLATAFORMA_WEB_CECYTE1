import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { getComunicados, getComunicadoById, createComunicado, updateComunicado, deleteComunicado } from '../controllers/comunicados.controller.js';

const router = Router();
router.use(verifyToken);

router.get('/', getComunicados);
router.get('/:id', getComunicadoById);
router.post('/', requireRole('administrador'), createComunicado);
router.patch('/:id', requireRole('administrador'), updateComunicado);
router.delete('/:id', requireRole('administrador'), deleteComunicado);

export default router;