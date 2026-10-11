import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  obtenerBecas,
  obtenerDetalleBeca,
  registrarBeca,
  actualizarBeca,
  eliminarBeca,
  asignarBecaAlumno,
  actualizarEstatusPago,
} from '../controllers/becas.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('becas.ver'), obtenerBecas);
router.get('/detalle/:nombre_beca', requirePermiso('becas.ver'), obtenerDetalleBeca);

router.post('/', requirePermiso('becas.crear'), registrarBeca);
router.post('/asignar', requirePermiso('becas.asignar'), asignarBecaAlumno);
router.put('/:id', requirePermiso('becas.editar'), actualizarBeca);
router.patch('/:id/estatus-pago', requirePermiso('becas.editar'), actualizarEstatusPago);
router.delete('/:id', requirePermiso('becas.eliminar'), eliminarBeca);

// depuracion
// console.log(' Archivo becas.routes.js cargado');
// console.log(' Rutas definidas:', router.stack.map(r => r.route?.path).filter(Boolean));

export default router;
