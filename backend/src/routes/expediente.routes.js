import { Router } from 'express';
import { getExpedienteAlumno, actualizarDocumentoExpediente } from '../controllers/expediente.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/:alumno_id', verifyToken, requireRole('administrador'), getExpedienteAlumno);
router.post('/documento', verifyToken, requireRole('administrador'), actualizarDocumentoExpediente);

export default router;