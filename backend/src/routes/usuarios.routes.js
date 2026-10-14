import { Router } from 'express';
import { verifyToken, requirePermiso, requireRole } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarUsuariosSchema } from '../schemas/usuarios.schema.js';
import {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  importarUsuarios,
  descargarPlantillaImportacionUsuarios,
  actualizarUsuario,
  desactivarUsuario,
  actualizarPassword, 
} from '../controllers/usuarios.controller.js';

const router = Router();

router.use(verifyToken);

// Los docentes solo pueden consultar alumnos de sus propios grupos. La
// administración de cuentas es una responsabilidad exclusiva de coordinación.
router.get('/', requirePermiso('usuarios.ver'), getUsuarios);
router.get(
  '/importar/plantilla',
  requireRole('administrador'),
  descargarPlantillaImportacionUsuarios
);
router.get('/:id', requirePermiso('usuarios.ver'), getUsuarioById);
router.post(
  '/importar',
  requireRole('administrador'),
  validate(importarUsuariosSchema),
  importarUsuarios
);
router.post('/', requirePermiso('usuarios.crear'), crearUsuario);
router.patch('/:id', requirePermiso('usuarios.editar'), actualizarUsuario);
router.delete('/:id', requirePermiso('usuarios.eliminar'), desactivarUsuario);
router.patch('/:id/password', requirePermiso('usuarios.cambiar_password'), actualizarPassword);

export default router;
