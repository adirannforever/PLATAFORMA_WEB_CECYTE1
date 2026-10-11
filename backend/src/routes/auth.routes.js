import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

export default router;
