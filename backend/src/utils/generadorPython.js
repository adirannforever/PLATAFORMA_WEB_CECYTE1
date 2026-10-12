// ============================================================
// utils/generadorPython.js — Puente Node → motor de documentos
// en Python (backend/python). Mantiene el mismo contrato:
// funciones async que resuelven Buffer con el archivo final.
//
// Requiere Python 3.10+ con: pip install -r backend/python/requirements.txt
// Binario configurable con la variable de entorno PYTHON_BIN.
// ============================================================
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DIR_MOTOR_PYTHON = path.resolve(__dirname, '../../python');

const BIN_PYTHON = process.env.PYTHON_BIN
  || (process.platform === 'win32' ? 'python' : 'python3');

/**
 * Ejecuta el motor Python y devuelve los bytes del documento.
 * @param {string} documento - boleta | constancia | horario | listado |
 *                             estadisticas | asistencias
 * @param {Object} payload   - datos JSON del documento
 * @param {{ timeoutMs?: number }} [opciones]
 * @returns {Promise<Buffer>}
 */
export const ejecutarGenerador = (documento, payload, { timeoutMs = 60000 } = {}) =>
  new Promise((resolve, reject) => {
    const hijo = spawn(BIN_PYTHON, ['-u', 'generador.py', documento], {
      cwd: DIR_MOTOR_PYTHON,
      windowsHide: true,
    });

    const chunks = [];
    let stderr = '';

    const temporizador = setTimeout(() => {
      hijo.kill('SIGKILL');
      reject(new Error(
        `El generador de "${documento}" excedió el tiempo límite (${timeoutMs} ms).`,
      ));
    }, timeoutMs);

    hijo.stdout.on('data', (dato) => chunks.push(dato));
    hijo.stderr.on('data', (dato) => { stderr += dato.toString('utf-8'); });

    hijo.on('error', (err) => {
      clearTimeout(temporizador);
      reject(new Error(
        `No se pudo ejecutar "${BIN_PYTHON}". Instala Python 3.10+ y ejecuta `
        + '`pip install -r backend/python/requirements.txt`. '
        + `Detalle: ${err.message}`,
      ));
    });

    hijo.on('close', (codigo) => {
      clearTimeout(temporizador);
      if (codigo === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const detalle = stderr.trim().slice(-800) || 'sin salida de error';
        reject(new Error(`Generador "${documento}" falló (código ${codigo}): ${detalle}`));
      }
    });

    // EPIPE si el proceso muere antes de leer todo stdin:
    hijo.stdin.on('error', () => {});
    hijo.stdin.end(JSON.stringify(payload), 'utf-8');
  });

export default ejecutarGenerador;
