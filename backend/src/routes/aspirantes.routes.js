import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getAspirantes,
  getAspirante,          
  getMiAspirante,
  crearAspirante,
  actualizarEstatusAspirante,
  convertirAspiranteEnAlumno,  
  reenviarInvitacionAspirante,
} from '../controllers/aspirantes.controller.js';
import { validate } from '../middleware/validate.js';
import {
  actualizarAspiranteEstatusSchema,
  convertirAspiranteSchema,
  crearAspiranteSchema,
} from '../schemas/aspirantes.schema.js';

const router = Router();


router.get('/', verifyToken, requirePermiso('aspirantes.ver'), getAspirantes);
router.get('/me', verifyToken, requirePermiso('aspirantes.ver_propio'), getMiAspirante);
router.post(
  '/',
  verifyToken,
  requirePermiso('aspirantes.crear'),
  validate(crearAspiranteSchema),
  crearAspirante
);
router.post('/:id/invitacion', verifyToken, requirePermiso('aspirantes.editar'), reenviarInvitacionAspirante);
router.get('/:id', verifyToken, requirePermiso('aspirantes.ver'), getAspirante); 
router.patch(
  '/:id/estatus',
  verifyToken,
  requirePermiso('aspirantes.editar'),
  validate(actualizarAspiranteEstatusSchema),
  actualizarEstatusAspirante
);


router.post(
  '/convertir',
  verifyToken,
  requirePermiso('aspirantes.convertir'),
  validate(convertirAspiranteSchema),
  convertirAspiranteEnAlumno
);

export default router;