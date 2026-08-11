import { query } from '../config/db.js';

/**
 * @param {Object} req - Request de Express
 * @param {string} accion - CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
 * @param {string} tabla - Nombre de la tabla afectada
 * @param {number} registroId - ID del registro afectado
 * @param {Object} datosAnteriores - Datos antes del cambio (para UPDATE/DELETE)
 * @param {Object} datosNuevos - Datos después del cambio (para CREATE/UPDATE)
 */
export async function registrarAuditoria({
  req,
  accion,
  tabla,
  registroId = null,
  datosAnteriores = null,
  datosNuevos = null,
}) {
  try {
    const usuarioId = req.user?.id || null;
    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await query(
      `INSERT INTO auditoria_logs 
       (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        usuarioId,
        accion,
        tabla,
        registroId,
        datosAnteriores ? JSON.stringify(datosAnteriores) : null,
        datosNuevos ? JSON.stringify(datosNuevos) : null,
        ip,
        userAgent,
      ]
    );
  } catch (err) {
    
    console.error('Error registrando auditoría:', err);
  }
}

/**
 * Middleware para auditoría automática en rutas CRUD
 * @param {string} accion - CREATE, UPDATE, DELETE
 * @param {string} tabla - Nombre de la tabla
 * @param {function} getRegistroId - Función para obtener el ID del registro desde req.params o req.body
 */
export function auditMiddleware(accion, tabla, getRegistroId) {
  return async (req, res, next) => {
    
    const originalJson = res.json;
    res.json = function (data) {
      
      if (data && data.success !== false) {
        let registroId = null;
        if (getRegistroId) {
          registroId = getRegistroId(req);
        } else if (req.params.id) {
          registroId = parseInt(req.params.id);
        }

        
        
        registrarAuditoria({
          req,
          accion,
          tabla,
          registroId,
          datosNuevos: req.body || null,
        }).catch(console.error);
      }
      return originalJson.call(this, data);
    };
    next();
  };
}