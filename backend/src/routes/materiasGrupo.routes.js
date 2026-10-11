import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { getMateriasByGrupo } from '../controllers/materiasGrupo.controller.js';

const router = Router();

router.get('/grupo/:grupo_id', verifyToken, requirePermiso('grupos.ver'), getMateriasByGrupo);

export default router;