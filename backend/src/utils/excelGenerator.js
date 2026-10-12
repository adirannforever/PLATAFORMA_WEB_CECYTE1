// utils/excelGenerator.js — Exportaciones XLSX (motor Python / openpyxl).
// Contrato intacto: mismas firmas y Buffer de salida que la versión exceljs.
import { ejecutarGenerador } from './generadorPython.js';
import { INSTITUCION } from '../config/institucion.js';

/** Listado de alumnos (XLSX con encabezado institucional). */
export const generarListadoAlumnosExcel = async (alumnos) =>
  ejecutarGenerador('listado', { institucion: INSTITUCION, alumnos });

/** Estadísticas por materia (escala de color + barras de aprobación). */
export const generarEstadisticasExcel = async (stats) =>
  ejecutarGenerador('estadisticas', { institucion: INSTITUCION, stats });

/** Asistencias de clase de una fecha (estados coloreados). */
export const generarExcelAsistenciasClase = async (info, asistencias) =>
  ejecutarGenerador('asistencias', { institucion: INSTITUCION, info, asistencias });
