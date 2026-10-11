import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getAspirantes,
  getAspirante,          
  crearAspirante,
  actualizarEstatusAspirante,
  convertirAspiranteEnAlumno,  
} from '../controllers/aspirantes.controller.js';

const router = Router();


router.get('/', verifyToken, requirePermiso('aspirantes.ver'), getAspirantes);
router.get('/:id', verifyToken, requirePermiso('aspirantes.ver'), getAspirante); 
router.post('/', verifyToken, requirePermiso('aspirantes.crear'), crearAspirante);
router.patch('/:id/estatus', verifyToken, requirePermiso('aspirantes.editar'), actualizarEstatusAspirante);


router.post('/convertir', verifyToken, requirePermiso('aspirantes.convertir'), convertirAspiranteEnAlumno);

export default router;