import { Router } from 'express';
import { getConceptosPago, getPagosAlumno, registrarPago } from '../controllers/pagos.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/conceptos', verifyToken, requireRole('administrador'), getConceptosPago);
router.get('/alumno/:alumno_id', verifyToken, requireRole('administrador'), getPagosAlumno);
router.post('/', verifyToken, requireRole('administrador'), registrarPago);

export default router;