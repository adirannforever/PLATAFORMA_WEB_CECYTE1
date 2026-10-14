import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getIncidencias,
  getIncidenciasByAlumno,
  crearIncidencia,
  actualizarIncidencia,
  resolverIncidencia,
  eliminarIncidencia,
} from '../controllers/incidencias.controller.js';

const importarIncidenciasCsv = crearImportadorCsv(crearIncidencia, {
  allowedHeaders: ['alumno_id', 'ciclo_id', 'tipo', 'subtipo', 'descripcion', 'fecha'],
  requiredHeaders: ['alumno_id', 'tipo', 'descripcion'],
});

const router = Router();


router.use(verifyToken);
router.get('/', getIncidencias);
router.get('/alumno/:alumno_id', getIncidenciasByAlumno);
router.post('/importar', validate(importarRegistrosCsvSchema), importarIncidenciasCsv);
router.post('/', crearIncidencia);
router.put('/:id', actualizarIncidencia);
router.patch('/:id/resolver', resolverIncidencia);
router.delete('/:id', eliminarIncidencia);

export default router;