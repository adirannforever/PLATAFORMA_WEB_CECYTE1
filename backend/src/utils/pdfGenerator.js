// utils/pdfGenerator.js — Boletas y constancias (motor Python / ReportLab).
// Contrato intacto: mismas firmas y Buffer de salida que la versión pdfkit.
import { ejecutarGenerador } from './generadorPython.js';
import { INSTITUCION } from '../config/institucion.js';

/**
 * Boleta de calificaciones (PDF A4, estilo institucional).
 * @param {Object} alumnoData - fila del alumno (nombre, apellidos, matrícula…)
 * @param {Array} materias - [{ nombre, parciales, promedio }]
 * @param {number|null} promedioGeneral
 * @param {Object} promediosParciales - { p1Prom, p2Prom, p3Prom }
 * @returns {Promise<Buffer>}
 */
export const generarBoletaPDF = async (
  alumnoData,
  materias,
  promedioGeneral,
  promediosParciales = {},
) => ejecutarGenerador('boleta', {
  institucion: INSTITUCION,
  alumno: alumnoData,
  materias,
  promedioGeneral,
  promediosParciales,
});

/**
 * Constancia institucional (estudios, conducta, beca, trabajo,
 * servicio_social, prácticas).
 * @returns {Promise<Buffer>}
 */
export const generarConstanciaPDF = async (alumnoData, tipo, becaData = null) =>
  ejecutarGenerador('constancia', {
    institucion: INSTITUCION,
    alumno: alumnoData,
    tipo,
    becaData,
  });
