import { Router } from 'express';
import { 
  getExpedienteAlumno, 
  actualizarDocumentoExpediente,
  getAlumnosConExpediente
} from '../controllers/expediente.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';

const router = Router();

router.get('/alumnos', verifyToken, requirePermiso('expediente.ver', 'expediente.ver_todos'), getAlumnosConExpediente);

router.get('/:alumno_id', verifyToken, getExpedienteAlumno);

router.post('/documento', verifyToken, requirePermiso('expediente.crear', 'expediente.editar'), actualizarDocumentoExpediente);

export default router;