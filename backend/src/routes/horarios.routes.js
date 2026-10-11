import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getConfiguracion,
  actualizarConfiguracion,
  listarHorarios,
  solicitarUploadHorario,
  solicitarDescarga,
  eliminarHorario,
  actualizarHorario,
  uploadMultipleHorarios,
  contarHorariosFaltantes,
  getSemestreActual,
  generarPlantillaHorario, 
} from '../controllers/horarios.controller.js';
 
const router = Router();
router.use(verifyToken);

// Rutas públicas (autenticado)
router.get('/listar', listarHorarios);
router.post('/download/solicitar', solicitarDescarga);
router.get('/semestre-actual', getSemestreActual);

// Rutas de administrador
router.post('/upload/solicitar', requirePermiso('horarios.subir'), solicitarUploadHorario);
router.put('/:id', requirePermiso('horarios.editar'), actualizarHorario);
router.delete('/:id', requirePermiso('horarios.eliminar'), eliminarHorario);
router.post('/upload/batch', requirePermiso('horarios.subir'), uploadMultipleHorarios);
router.get('/contar-faltantes', requirePermiso('horarios.ver'), contarHorariosFaltantes);
router.get('/configuracion', requirePermiso('config_academica.ver'), getConfiguracion);
router.put('/configuracion', requirePermiso('config_academica.gestionar'), actualizarConfiguracion);
router.get('/plantilla', generarPlantillaHorario);

export default router;