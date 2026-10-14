import { Router } from 'express';
import { 
  getAsistenciaDiaria, 
  registrarAsistenciaDiaria, 
  getAsistenciaClase, 
  registrarAsistenciaClase,
  guardarAsistenciasLote,
} from '../controllers/asistencia.controller.js';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { validate } from '../middleware/validate.js';
import { importarRegistrosCsvSchema } from '../schemas/csvRecordsImport.schema.js';
import { crearImportadorCsv } from '../services/csvRecordsImport.service.js';

const importarAsistenciaDiariaCsv = crearImportadorCsv(registrarAsistenciaDiaria, {
  allowedHeaders: ['alumno_id', 'fecha', 'llego', 'justificada', 'motivo_justificacion'],
  requiredHeaders: ['alumno_id', 'llego'],
  uniqueBy: ['alumno_id', 'fecha'],
});

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Asistencia diaria (entrada al plantel)
router.get('/diaria', requirePermiso('asistencia.registrar_diaria'), getAsistenciaDiaria);
router.post(
  '/diaria/importar',
  requirePermiso('asistencia.registrar_diaria'),
  validate(importarRegistrosCsvSchema),
  importarAsistenciaDiariaCsv
);
router.post('/diaria', requirePermiso('asistencia.registrar_diaria'), registrarAsistenciaDiaria);

// Asistencia por clase (materia_grupo)
router.get('/clase', getAsistenciaClase);
router.post('/clase', registrarAsistenciaClase);
router.post('/clase/lote', guardarAsistenciasLote); // nuevo endpoint para guardar múltiples

export default router;
