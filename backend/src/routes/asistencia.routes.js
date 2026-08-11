import { Router } from 'express';
import { 
  getAsistenciaDiaria, 
  registrarAsistenciaDiaria, 
  getAsistenciaClase, 
  registrarAsistenciaClase,
  guardarAsistenciasLote,
} from '../controllers/asistencia.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Asistencia diaria (entrada al plantel)
router.get('/diaria', getAsistenciaDiaria);
router.post('/diaria', registrarAsistenciaDiaria);

// Asistencia por clase (materia_grupo)
router.get('/clase', getAsistenciaClase);
router.post('/clase', registrarAsistenciaClase);
router.post('/clase/lote', guardarAsistenciasLote); // nuevo endpoint para guardar múltiples

export default router;