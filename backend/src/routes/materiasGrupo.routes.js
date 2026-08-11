import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import { getMateriasByGrupo } from '../controllers/materiasGrupo.controller.js';

const router = Router();

router.get('/grupo/:grupo_id', verifyToken, requireRole('administrador'), getMateriasByGrupo);

export default router;