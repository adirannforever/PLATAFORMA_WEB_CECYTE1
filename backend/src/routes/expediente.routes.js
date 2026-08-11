import { Router } from 'express';
import { 
  getExpedienteAlumno, 
  actualizarDocumentoExpediente,
  getAlumnosConExpediente
} from '../controllers/expediente.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/alumnos', verifyToken, requireRole('administrador'), getAlumnosConExpediente);

router.get('/:alumno_id', verifyToken, getExpedienteAlumno);

router.post('/documento', verifyToken, requireRole('administrador'), actualizarDocumentoExpediente);

export default router;