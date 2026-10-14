import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getMaterias,
  getMateriaById,
  crearMateria,
  actualizarMateria,
  getAlumnosDeMateria,
  getMateriasByGrupo,
} from '../controllers/materias.controller.js';

const importarAsignacionesMateriaCsv = crearImportadorCsv(crearMateria, {
  allowedHeaders: ['materia_catalogo_id', 'grupo_id', 'ciclo_id', 'docente_id'],
  requiredHeaders: ['materia_catalogo_id', 'grupo_id', 'ciclo_id', 'docente_id'],
  uniqueBy: ['materia_catalogo_id', 'grupo_id', 'ciclo_id'],
});

const router = Router();

router.use(verifyToken);

router.get('/', requirePermiso('grupos.ver', 'calificaciones.ver'), getMaterias);
router.get('/grupo', requirePermiso('grupos.ver', 'calificaciones.ver'), getMateriasByGrupo);
router.get('/:id', requirePermiso('grupos.ver', 'calificaciones.ver'), getMateriaById);
router.get('/:id/alumnos', requirePermiso('grupos.ver', 'calificaciones.ver'), getAlumnosDeMateria);

router.post(
  '/importar',
  requirePermiso('config_academica.gestionar'),
  validate(importarRegistrosCsvSchema),
  importarAsignacionesMateriaCsv
);
router.post('/', requirePermiso('config_academica.gestionar'), crearMateria);
router.patch('/:id', requirePermiso('config_academica.gestionar'), actualizarMateria);

export default router;
