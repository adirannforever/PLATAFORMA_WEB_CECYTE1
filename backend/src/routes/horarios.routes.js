import { Router } from 'express';
import { 
  getHorarioGrupo, 
  asignarHorario, 
  actualizarHorario, 
  eliminarHorario 
} from '../controllers/horarios.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/grupo', verifyToken, requireRole('administrador', 'docente'), getHorarioGrupo);

router.post('/', verifyToken, requireRole('administrador'), asignarHorario);
router.patch('/:id', verifyToken, requireRole('administrador'), actualizarHorario);
router.delete('/:id', verifyToken, requireRole('administrador'), eliminarHorario);

export default router;