import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
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

router.get('/', obtenerBecas);
router.get('/detalle/:nombre_beca', obtenerDetalleBeca);

router.post('/', requireRole('administrador'), registrarBeca);
router.post('/asignar', requireRole('administrador'), asignarBecaAlumno);
router.put('/:id', requireRole('administrador'), actualizarBeca);
router.patch('/:id/estatus-pago', requireRole('administrador'), actualizarEstatusPago);
router.delete('/:id', requireRole('administrador'), eliminarBeca);

// depuracion
// console.log(' Archivo becas.routes.js cargado');
// console.log(' Rutas definidas:', router.stack.map(r => r.route?.path).filter(Boolean));

export default router;