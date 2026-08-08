import { Router } from 'express';
import { getTutoriasGrupo, crearTutoria } from '../controllers/tutorias.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, requireRole('administrador', 'docente'), getTutoriasGrupo);
router.post('/', verifyToken, requireRole('administrador', 'docente'), crearTutoria);

export default router;