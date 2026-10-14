import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getCiclos,
  crearCiclo,
  actualizarCiclo,
  eliminarCiclo,
} from '../controllers/ciclos.controller.js';

const importarCiclosCsv = crearImportadorCsv(crearCiclo, {
  allowedHeaders: ['nombre', 'fecha_inicio', 'fecha_fin', 'activo'],
  requiredHeaders: ['nombre', 'fecha_inicio', 'fecha_fin'],
});

const router = Router();
router.use(verifyToken);
router.use(requirePermiso('config_academica.gestionar'));

router.get('/', getCiclos);
router.post('/importar', validate(importarRegistrosCsvSchema), importarCiclosCsv);
router.post('/', crearCiclo);
router.put('/:id', actualizarCiclo);
router.delete('/:id', eliminarCiclo);

export default router;