import { Router } from 'express';
import { getTutoriasGrupo, crearTutoria } from '../controllers/tutorias.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, requirePermiso('tutorias.ver'), getTutoriasGrupo);
router.post('/', verifyToken, requirePermiso('tutorias.crear'), crearTutoria);

export default router;