import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
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

router.get('/estado/:alumno_id', verifyToken, requirePermiso('config_academica.ver'), getEstadoAlumno);

router.get('/escolares', verifyToken, requirePermiso('config_academica.ver'), getPeriodosEscolares);
router.get('/evaluacion', verifyToken, requirePermiso('config_academica.ver'), getPeriodosEvaluacion);
router.put('/escolar/:id', verifyToken, requirePermiso('config_academica.gestionar'), actualizarPeriodoEscolar);
router.put('/evaluacion/:id', verifyToken, requirePermiso('config_academica.gestionar'), actualizarPeriodoEvaluacion);
router.post('/regenerar', verifyToken, requirePermiso('config_academica.gestionar'), regenerarPeriodos);

router.post('/escolar', verifyToken, requirePermiso('config_academica.gestionar'), crearPeriodoEscolar);
router.post('/evaluacion', verifyToken, requirePermiso('config_academica.gestionar'), crearPeriodoEvaluacion);
router.post('/escolares/batch', verifyToken, requirePermiso('config_academica.gestionar'), crearPeriodosEscolaresBatch);

export default router;