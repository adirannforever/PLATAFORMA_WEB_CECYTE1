import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { getLogs } from '../controllers/auditoria.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requirePermiso('auditoria.ver'));

router.get('/', getLogs);

export default router;