import { Router } from 'express';
import { activarCuentaAspirante, login, logout, me, refrescarPermisos } from '../controllers/auth.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { activateAccountSchema, loginSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/aspirantes/activar-cuenta', authLimiter, validate(activateAccountSchema), activarCuentaAspirante);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

// Refresca en caliente el cache de permisos desde la BD (solo admin).
router.post('/refrescar-permisos', verifyToken, requirePermiso('sistema.backup'), refrescarPermisos);

export default router;
