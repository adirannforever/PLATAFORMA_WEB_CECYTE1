import { query } from '../config/db.js';
import { registrarAuditoria } from './auditoria.js';

const EXCLUIDAS = ['/auth/me', '/auth/login', '/auth/logout', '/health'];
const MUTACIONES = ['POST', 'PUT', 'PATCH', 'DELETE'];
// Endpoints que generan archivos descargables (Excel/PDF/DOCX) o reportes
const RUTA_EXPORT = /\/api\/reportes\/|excel|descargar|export/i;

// Snapshot de la fila ANTES de que el controlador la modifique.
// Si el recurso no corresponde a una tabla real, regresa null (sin romper nada).
async function obtenerFilaAnterior(req) {
  try {
    const url = (req.originalUrl || req.path || '').split('?')[0];
    const segmentos = url.split('/').filter(Boolean);
    const recurso = segmentos[1] || segmentos[0] || '';
    if (!/^[a-z_][a-z0-9_]*$/.test(recurso)) return null;

    const idMatch = url.match(/\/(\d+)\/?$/);
    const id = idMatch
      ? parseInt(idMatch[1], 10)
      : (req.body?.id && !isNaN(req.body.id) ? parseInt(req.body.id, 10) : null);
    if (!id) return null;

    const existe = await query('SELECT to_regclass($1) AS t', [recurso]);
    if (!existe.rows[0]?.t) return null;

    const fila = await query(`SELECT * FROM "${recurso}" WHERE id = $1`, [id]);
    return fila.rows[0] || null;
  } catch {
    return null; // la auditoría nunca debe romper la petición
  }
}

export async function auditoriaGlobal(req, res, next) {
  // Ignorar rutas excluidas
  if (EXCLUIDAS.some((r) => req.originalUrl?.includes(r) || req.path?.includes(r))) {
    return next();
  }

  const metodo = req.method.toUpperCase();

  const urlLimpia = (req.originalUrl || req.path || '').split('?')[0];
  // Exportaciones de reportes (GET) también se auditan
  const esExport = metodo === 'GET' && RUTA_EXPORT.test(urlLimpia);

  // Solo auditar mutaciones (POST, PUT, PATCH, DELETE) y exportaciones
  if (!MUTACIONES.includes(metodo) && !esExport) {
    return next();
  }

  // Capturar la fila ANTES de que el handler la modifique (PUT/PATCH/DELETE)
  let filaAnterior = null;
  if (['PUT', 'PATCH', 'DELETE'].includes(metodo)) {
    filaAnterior = await obtenerFilaAnterior(req);
  }

  // Escuchar el evento 'finish' de forma asíncrona y no bloqueante
  res.on('finish', () => {
    // Solo auditar si la respuesta fue exitosa (2xx o 3xx)
    if (res.statusCode >= 200 && res.statusCode < 400) {
      setImmediate(async () => {
        try {
          // Extraer nombre del recurso de la URL
          const segments = (req.originalUrl || req.path).split('?')[0].split('/').filter(Boolean);
          // Generalmente '/api/<recurso>/...' -> segments[1] es el recurso
          const tabla = segments[1] || segments[0] || 'general';

          if (esExport) {
            await registrarAuditoria({
              req,
              accion: 'EXPORT',
              tabla,
              status: res.statusCode,
            });
            return;
          }

          let accion = 'UPDATE';
          if (metodo === 'POST') accion = 'CREATE';
          else if (metodo === 'DELETE') accion = 'DELETE';

          const registroId = req.params?.id || req.body?.id || null;

          await registrarAuditoria({
            req,
            accion,
            tabla,
            registroId: registroId && !isNaN(registroId) ? parseInt(registroId, 10) : null,
            datosAnteriores: filaAnterior,
            datosNuevos: metodo !== 'DELETE' ? req.body : null,
            status: res.statusCode,
          });
        } catch (err) {
          // No romper nunca la ejecución por fallo en auditoría
          console.error('[Auditoría Global] Error registrando log:', err.message);
        }
      });
    }
  });

  next();
}