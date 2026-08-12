import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import {
  generarBoleta,
  generarConstancia,
  generarListadoAlumnos,
  generarEstadisticas,
  generarExcelCalificacionesMateria,
} from '../controllers/reportes.controller.js';

const router = Router();

router.use(verifyToken);

// Las rutas ahora tienen la lógica de permisos en el controlador
router.get('/boleta', generarBoleta);
router.get('/constancia', generarConstancia);
router.get('/listado-alumnos', generarListadoAlumnos);
router.get('/estadisticas', generarEstadisticas);
router.get('/calificaciones-excel', generarExcelCalificacionesMateria);

export default router;