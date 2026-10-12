// utils/docxGenerator.js — Plantillas de horario (motor Python / python-docx).
// Contrato intacto: misma firma y Buffer de salida que la versión docx.
import { ejecutarGenerador } from './generadorPython.js';
import { INSTITUCION } from '../config/institucion.js';

/**
 * Plantilla DOCX de horario con membrete institucional.
 * @param {Object} data - { tipo, nombre, semestre, ciclo, especialidad,
 *                          turno, letra, dias, periodos, hora_inicio,
 *                          hora_fin, duracion_bloque }
 * @returns {Promise<Buffer>}
 */
export const generarPlantillaHorarioDOCX = async (data) =>
  ejecutarGenerador('horario', { institucion: INSTITUCION, data });
