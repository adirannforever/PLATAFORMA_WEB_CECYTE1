import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import {
  getAspirantes,
  getAspirante,          
  crearAspirante,
  actualizarEstatusAspirante,
  convertirAspiranteEnAlumno,  
} from '../controllers/aspirantes.controller.js';

const router = Router();


router.get('/', verifyToken, requireRole('administrador'), getAspirantes);
router.get('/:id', verifyToken, requireRole('administrador'), getAspirante); 
router.post('/', verifyToken, requireRole('administrador'), crearAspirante);
router.patch('/:id/estatus', verifyToken, requireRole('administrador'), actualizarEstatusAspirante);


router.post('/convertir', verifyToken, requireRole('administrador'), convertirAspiranteEnAlumno);

export default router;