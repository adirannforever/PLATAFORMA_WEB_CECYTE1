import { Router } from 'express';
import { getAspirantes, crearAspirante, actualizarEstatusAspirante } from '../controllers/aspirantes.controller.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', verifyToken, getAspirantes);
router.post('/', crearAspirante); // Público para registro de nuevos aspirantes
router.patch('/:id/estatus', verifyToken, actualizarEstatusAspirante);

export default router;