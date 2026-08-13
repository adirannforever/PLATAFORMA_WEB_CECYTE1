import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
} from '../controllers/usuarios.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);
router.post('/', crearUsuario);
router.patch('/:id', actualizarUsuario);
router.delete('/:id', desactivarUsuario);

export default router;