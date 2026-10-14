import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getGrupos,
  getGrupoById,
  getMaterias,
  getAlumnosDeGrupo,
  crearGrupo,
  actualizarGrupo,
  asignarMaterias, 
} from '../controllers/grupos.controller.js';

const importarGruposCsv = crearImportadorCsv(crearGrupo, {
  allowedHeaders: ['ciclo_id', 'especialidad_id', 'turno_id', 'semestre', 'letra', 'tutor_id'],
  requiredHeaders: ['ciclo_id', 'especialidad_id', 'turno_id', 'semestre', 'letra'],
  uniqueBy: ['ciclo_id', 'semestre', 'letra', 'turno_id'],
});

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('grupos.ver'), getGrupos);
router.get('/:id', requirePermiso('grupos.ver'), getGrupoById);
router.get('/:id/materias', verifyToken, getMaterias);
router.get('/:id/alumnos', requirePermiso('grupos.ver'), getAlumnosDeGrupo);
router.post(
  '/importar',
  requirePermiso('grupos.crear'),
  validate(importarRegistrosCsvSchema),
  importarGruposCsv
);
router.post('/', requirePermiso('grupos.crear'), crearGrupo);
router.patch('/:id', requirePermiso('grupos.editar'), actualizarGrupo);

router.post('/:id/materias', verifyToken, requirePermiso('grupos.asignar_materias'), asignarMaterias);

export default router;