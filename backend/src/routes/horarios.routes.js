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

// Rutas públicas (autenticado)
router.get('/listar', listarHorarios);
router.post('/download/solicitar', solicitarDescarga);
router.get('/semestre-actual', getSemestreActual);

// Rutas de administrador
router.post('/upload/solicitar', requireRole('administrador'), solicitarUploadHorario);
router.put('/:id', requireRole('administrador'), actualizarHorario);
router.delete('/:id', requireRole('administrador'), eliminarHorario);
router.post('/upload/batch', requireRole('administrador'), uploadMultipleHorarios);
router.get('/contar-faltantes', requireRole('administrador'), contarHorariosFaltantes);
router.get('/configuracion', requireRole('administrador'), getConfiguracion);
router.put('/configuracion', requireRole('administrador'), actualizarConfiguracion);

export default router;