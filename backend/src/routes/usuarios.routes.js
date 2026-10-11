import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  actualizarPassword, 
} from '../controllers/usuarios.controller.js';

const router = Router();

router.use(verifyToken);

// Los docentes solo pueden consultar alumnos de sus propios grupos. La
// administración de cuentas es una responsabilidad exclusiva de coordinación.
router.get('/', requireRole('administrador', 'docente'), getUsuarios);
router.get('/:id', requireRole('administrador'), getUsuarioById);
router.post('/', requireRole('administrador'), crearUsuario);
router.patch('/:id', requireRole('administrador'), actualizarUsuario);
router.delete('/:id', requireRole('administrador'), desactivarUsuario);
router.patch('/:id/password', requireRole('administrador'), actualizarPassword);

export default router;
