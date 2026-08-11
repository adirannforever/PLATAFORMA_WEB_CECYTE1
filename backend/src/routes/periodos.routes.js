import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getEstadoAlumno,
  getPeriodosEscolares,
  getPeriodosEvaluacion,
  actualizarPeriodoEscolar,
  actualizarPeriodoEvaluacion,
  regenerarPeriodos,
  crearPeriodoEscolar,
  crearPeriodoEvaluacion,
  crearPeriodosEscolaresBatch,
} from '../controllers/periodos.controller.js';

const router = Router();

router.get('/estado/:alumno_id', verifyToken, requireRole('administrador'), getEstadoAlumno);

router.get('/escolares', verifyToken, requireRole('administrador'), getPeriodosEscolares);
router.get('/evaluacion', verifyToken, requireRole('administrador'), getPeriodosEvaluacion);
router.put('/escolar/:id', verifyToken, requireRole('administrador'), actualizarPeriodoEscolar);
router.put('/evaluacion/:id', verifyToken, requireRole('administrador'), actualizarPeriodoEvaluacion);
router.post('/regenerar', verifyToken, requireRole('administrador'), regenerarPeriodos);

router.post('/escolar', verifyToken, requireRole('administrador'), crearPeriodoEscolar);
router.post('/evaluacion', verifyToken, requireRole('administrador'), crearPeriodoEvaluacion);
router.post('/escolares/batch', verifyToken, requireRole('administrador'), crearPeriodosEscolaresBatch);

export default router;