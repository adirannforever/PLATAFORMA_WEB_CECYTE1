import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  descargarAdjuntoComunicado,
  getComunicados,
  getComunicadoById,
  createComunicado,
  solicitarUploadComunicado,
  updateComunicado,
  deleteComunicado,
} from '../controllers/comunicados.controller.js';

const router = Router();
router.use(verifyToken);

router.get('/', getComunicados);
router.post('/upload/solicitar', requirePermiso('comunicados.crear'), solicitarUploadComunicado);
router.get('/:id/archivos/:index', descargarAdjuntoComunicado);
router.get('/:id', getComunicadoById);
router.post('/', requirePermiso('comunicados.crear'), createComunicado);
router.patch('/:id', requirePermiso('comunicados.editar'), updateComunicado);
router.delete('/:id', requirePermiso('comunicados.eliminar'), deleteComunicado);

export default router;