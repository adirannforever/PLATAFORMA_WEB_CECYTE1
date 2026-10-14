import { Router } from 'express';
import { 
  getExpedienteAlumno, 
  actualizarDocumentoExpediente,
  getAlumnosConExpediente
} from '../controllers/expediente.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';

const router = Router();

router.get('/alumnos', verifyToken, requirePermiso('expediente.ver_todos'), getAlumnosConExpediente);

router.get(
  '/:alumno_id',
  verifyToken,
  requirePermiso('expediente.ver', 'expediente.ver_todos', 'expediente.ver_mi_expediente'),
  getExpedienteAlumno
);

router.post('/documento', verifyToken, requirePermiso('expediente.crear', 'expediente.editar'), actualizarDocumentoExpediente);

export default router;