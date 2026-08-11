import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  generarBoleta,
  generarConstancia,
  generarListadoAlumnos,
  generarEstadisticas,
} from '../controllers/reportes.controller.js';

const router = Router();

router.use(verifyToken);
router.use(requireRole('administrador'));

router.get('/boleta', generarBoleta);
router.get('/constancia', generarConstancia);
router.get('/listado-alumnos', generarListadoAlumnos);
router.get('/estadisticas', generarEstadisticas);

export default router;