import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getConfiguracion,
  actualizarConfiguracion,
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

// Grupos
router.get('/grupos/:grupo_id', getHorarioGrupo);
router.post('/grupos/:grupo_id', guardarHorarioGrupo);

// Maestros
router.get('/maestros/:docente_id', getHorarioMaestro);

// Laboratorios
router.get('/laboratorios/:laboratorio_id', getHorarioLaboratorio);

// Regenerar automáticos
router.post('/regenerar/maestros', regenerarMaestros);
router.post('/regenerar/laboratorios', regenerarLaboratorios);

export default router;