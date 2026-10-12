import { Router } from 'express';
import { login, logout, me, refrescarPermisos } from '../controllers/auth.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

// Refresca en caliente el cache de permisos desde la BD (solo admin).
router.post('/refrescar-permisos', verifyToken, requirePermiso('sistema.backup'), refrescarPermisos);

export default router;
