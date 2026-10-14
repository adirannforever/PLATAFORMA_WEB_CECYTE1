import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';
import {
  getMateriasCatalogo,
  crearMateriaCatalogo,
  actualizarMateriaCatalogo,
  eliminarMateriaCatalogo,
} from '../controllers/materiasCatalogo.controller.js';

const importarMateriasCatalogoCsv = crearImportadorCsv(crearMateriaCatalogo, {
  allowedHeaders: [
    'nombre', 'clave', 'semestre', 'tipo', 'especialidad_id',
    'modulo_numero', 'submodulo_numero', 'horas_semana',
  ],
  requiredHeaders: ['nombre', 'semestre', 'tipo'],
});

const router = Router();
router.use(verifyToken);
router.use(requirePermiso('config_academica.gestionar'));

router.get('/', getMateriasCatalogo);
router.post('/importar', validate(importarRegistrosCsvSchema), importarMateriasCatalogoCsv);
router.post('/', crearMateriaCatalogo);
router.put('/:id', actualizarMateriaCatalogo);
router.delete('/:id', eliminarMateriaCatalogo);

export default router;