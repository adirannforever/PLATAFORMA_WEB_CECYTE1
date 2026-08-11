import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getConfiguracion,
  actualizarConfiguracion,
  solicitarUploadHorario,
  listarHorarios,
  solicitarDescarga,
  eliminarHorario,
} from '../controllers/horarios.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('administrador'));

// Configuración
router.get('/configuracion', getConfiguracion);
router.put('/configuracion', actualizarConfiguracion);

// Subida y gestión de archivos
router.post('/upload/solicitar', solicitarUploadHorario);
router.get('/listar', listarHorarios);
router.post('/download/solicitar', solicitarDescarga);
router.delete('/:id', eliminarHorario);

export default router;