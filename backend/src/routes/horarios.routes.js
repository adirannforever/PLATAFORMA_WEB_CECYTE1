import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getConfiguracion,
  actualizarConfiguracion,
  getSemestreActual,
  listarHorarios,
  contarHorariosFaltantes,
  solicitarUploadHorario,
  actualizarHorario,
  uploadMultipleHorarios,
  solicitarDescarga,
  eliminarHorario,
} from '../controllers/horarios.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('administrador'));

// Configuración
router.get('/configuracion', getConfiguracion);
router.put('/configuracion', actualizarConfiguracion);

// Semestre actual
router.get('/semestre-actual', getSemestreActual);

// Listar y contar
router.get('/listar', listarHorarios);
router.get('/contar-faltantes', contarHorariosFaltantes);

// Subida y gestión
router.post('/upload/solicitar', solicitarUploadHorario);
router.post('/upload/batch', uploadMultipleHorarios);
router.put('/:id', actualizarHorario);
router.post('/download/solicitar', solicitarDescarga);
router.delete('/:id', eliminarHorario);

export default router;