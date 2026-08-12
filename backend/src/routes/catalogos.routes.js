import { Router } from 'express';
import { verifyToken, requireRole } from '../middlewares/auth.js';
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
router.get('/conceptos-pago',   requireRole('administrador'), getConceptosPago);
router.get('/documentos',       requireRole('administrador'), getCatalogoDocumentos);
router.get('/docentes',         requireRole('administrador', 'docente'), getDocentes);
router.get('/alumnos',          requireRole('administrador', 'docente'), getAlumnos);
router.get('/alumno/:usuarioId', getAlumnoByUsuario);

export default router;