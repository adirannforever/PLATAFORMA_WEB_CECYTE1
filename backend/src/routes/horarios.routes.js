import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getConfiguracion,
  actualizarConfiguracion,
  solicitarUpload,
  confirmarUpload,
  listarHorarios,
  solicitarDescarga,
  eliminarHorario,
  getHorarioGrupo,
  guardarHorarioGrupo,
  getHorarioMaestro,
  getHorarioLaboratorio,
  regenerarMaestros,
  regenerarLaboratorios,
} from '../controllers/horarios.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('administrador'));

// Configuración
router.get('/configuracion', getConfiguracion);
router.put('/configuracion', actualizarConfiguracion);

// Upload y archivos
router.post('/upload/solicitar', solicitarUpload);
router.post('/upload/confirmar', confirmarUpload);
router.get('/listar', listarHorarios);
router.post('/download/solicitar', solicitarDescarga);
router.delete('/:id', eliminarHorario);

// Grupos (archivos asociados)
router.get('/grupos/:grupo_id', getHorarioGrupo);
router.post('/grupos/:grupo_id', guardarHorarioGrupo);

// Maestros y laboratorios (placeholder)
router.get('/maestros/:docente_id', getHorarioMaestro);
router.get('/laboratorios/:laboratorio_id', getHorarioLaboratorio);
router.post('/regenerar/maestros', regenerarMaestros);
router.post('/regenerar/laboratorios', regenerarLaboratorios);

export default router;