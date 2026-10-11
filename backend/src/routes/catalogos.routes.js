import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import {
  getCiclos,
  getCicloActivo,
  getGrupos,
  getEspecialidades,
  getTurnos,
  getEdificios,
  getAulas,
  getPeriodos,
  getMateriasCatalogo,
  getConceptosPago,
  getCatalogoDocumentos,
  getDocentes,
  getAlumnos,
  getAlumnoByUsuario,
} from '../controllers/catalogos.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/ciclos',           getCiclos);
router.get('/ciclos/activo',    getCicloActivo);
router.get('/grupos',           getGrupos);
router.get('/especialidades',   getEspecialidades);
router.get('/turnos',           getTurnos);
router.get('/edificios',        getEdificios);
router.get('/aulas',            getAulas);
router.get('/periodos',         getPeriodos);
router.get('/materias',         getMateriasCatalogo);
router.get('/conceptos-pago',   requirePermiso('pagos.ver'), getConceptosPago);
router.get('/documentos',       requirePermiso('expediente.ver'), getCatalogoDocumentos);
router.get('/docentes',         requirePermiso('grupos.ver', 'calificaciones.ver'), getDocentes);
router.get('/alumnos',          requirePermiso('grupos.ver', 'calificaciones.ver'), getAlumnos);
router.get('/alumno/:usuarioId', getAlumnoByUsuario);

export default router;