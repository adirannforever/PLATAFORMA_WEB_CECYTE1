import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
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
router.get('/', requirePermiso('usuarios.ver'), getUsuarios);
router.get('/:id', requirePermiso('usuarios.ver'), getUsuarioById);
router.post('/', requirePermiso('usuarios.crear'), crearUsuario);
router.patch('/:id', requirePermiso('usuarios.editar'), actualizarUsuario);
router.delete('/:id', requirePermiso('usuarios.eliminar'), desactivarUsuario);
router.patch('/:id/password', requirePermiso('usuarios.cambiar_password'), actualizarPassword);

export default router;
