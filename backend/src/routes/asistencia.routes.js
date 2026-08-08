import { Router } from 'express';
import { 
  getAsistenciaDiaria, 
  registrarAsistenciaDiaria, 
  getAsistenciaClase, 
  registrarAsistenciaClase 
} from '../controllers/asistencia.controller.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.get('/diaria', verifyToken, getAsistenciaDiaria);
router.post('/diaria', verifyToken, registrarAsistenciaDiaria);
router.get('/clase', verifyToken, getAsistenciaClase);
router.post('/clase', verifyToken, registrarAsistenciaClase);

export default router;