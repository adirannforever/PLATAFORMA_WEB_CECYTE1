import { Router } from 'express';
import { getConceptosPago, getMisPagos, getPagosAlumno, registrarPago } from '../controllers/pagos.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';

const router = Router();

router.get('/conceptos', verifyToken, requirePermiso('pagos.ver'), getConceptosPago);
router.get('/mis-pagos', verifyToken, requirePermiso('pagos.ver_mis_pagos'), getMisPagos);
router.get('/alumno/:alumno_id', verifyToken, requirePermiso('pagos.ver'), getPagosAlumno);
router.post('/', verifyToken, requirePermiso('pagos.registrar'), registrarPago);

export default router;