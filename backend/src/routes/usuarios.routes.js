// src/routes/usuarios.routes.js
import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
} from '../controllers/usuarios.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Solo administrador
router.get('/', requireRole('administrador'), getUsuarios);
router.get('/:id', requireRole('administrador'), getUsuarioById);
router.post('/', requireRole('administrador'), crearUsuario);
router.patch('/:id', requireRole('administrador'), actualizarUsuario);
router.delete('/:id', requireRole('administrador'), desactivarUsuario);

export default router;
