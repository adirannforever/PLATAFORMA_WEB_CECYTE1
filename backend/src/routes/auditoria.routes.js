import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { getLogs } from '../controllers/auditoria.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('administrador'));

router.get('/', getLogs);

export default router;