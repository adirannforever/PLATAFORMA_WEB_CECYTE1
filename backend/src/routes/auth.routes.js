// src/routes/auth.routes.js
import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);  // El frontend llama esto al cargar la app

export default router;
