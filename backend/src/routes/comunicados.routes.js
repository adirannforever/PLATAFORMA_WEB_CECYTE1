// src/routes/comunicados.routes.js
import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getComunicados,
  getComunicadoById,
  crearComunicado,
  actualizarComunicado,
} from '../controllers/comunicados.controller.js';

const router = Router();

router.use(verifyToken);

// Todos los usuarios autenticados pueden leer comunicados
router.get('/', getComunicados);
router.get('/:id', getComunicadoById);

// Solo admin puede crear y modificar
router.post('/', requireRole('administrador'), crearComunicado);
router.patch('/:id', requireRole('administrador'), actualizarComunicado);

export default router;
