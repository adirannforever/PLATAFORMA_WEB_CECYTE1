import { Router } from 'express';
import { getTutoriasGrupo, crearTutoria } from '../controllers/tutorias.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';

const router = Router();

const importarTutoriasCsv = crearImportadorCsv(crearTutoria, {
  allowedHeaders: ['grupo_id', 'ciclo_id', 'fecha', 'tema', 'observaciones'],
  requiredHeaders: ['grupo_id', 'ciclo_id', 'fecha', 'tema'],
});

router.get('/', verifyToken, requirePermiso('tutorias.ver'), getTutoriasGrupo);
router.post(
  '/importar',
  verifyToken,
  requirePermiso('tutorias.crear'),
  validate(importarRegistrosCsvSchema),
  importarTutoriasCsv
);
router.post('/', verifyToken, requirePermiso('tutorias.crear'), crearTutoria);

export default router;