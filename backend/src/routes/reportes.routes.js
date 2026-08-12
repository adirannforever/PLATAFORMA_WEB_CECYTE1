import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import {
  generarBoleta,
  generarConstancia,
  generarListadoAlumnos,
  generarEstadisticas,
  generarExcelAsistenciasClase,
} from '../controllers/reportes.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/boleta', generarBoleta);
router.get('/constancia', generarConstancia);
router.get('/listado-alumnos', generarListadoAlumnos);
router.get('/estadisticas', generarEstadisticas);
router.get('/asistencias-excel', generarExcelAsistenciasClase);

export default router;