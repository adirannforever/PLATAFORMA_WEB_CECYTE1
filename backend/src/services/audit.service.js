import { query } from '../config/db.js';

/**
 * Servicio de auditor\'a centralizado.
 * Registra cada acci\'on relevante en la tabla auditoria_logs
 * (usuario, acci\'on, tabla, registro, datos anteriores/nuevos, IP, user agent).
 */
export const logAudit = async (dados) => {
  const {
    usuario_id,
    accion,
    tabla,
    registro_id,
    anteriores,
    nuevos,
    ip,
    userAgent,
  } = dados;

  await query(
    `INSERT INTO auditoria_logs (
      usuario_id,
      accion,
      tabla_afectada,
      registro_id,
      datos_anteriores,
      datos_nuevos,
      ip,
      user_agent,
      fecha
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      usuario_id,
      accion,
      tabla,
      registro_id,
      anteriores,
      nuevos,
      ip,
      userAgent,
    ]
  );
};

/**
 * Helper para construir ``datos_anteriores'' y ``datos_nuevos''
 * a partir de objetos JavaScript (serializados a JSONB).
 */
export const fromJson = (value) => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return null;
  }
};

/**
 * Crea un payload listo para loggear en auditoria_logs.
 */
export const makeAuditPayload = ({
  usuario_id,
  accion,
  tabla,
  registro_id,
  anteriores,
  nuevos,
  ip,
  userAgent,
}) => ({
  usuario_id,
  accion,
  tabla,
  registro_id,
  datos_anteriores: fromJson(anteriores),
  datos_nuevos: fromJson(nuevos),
  ip,
  userAgent,
});

export const auditFields = ['usuario_id', 'accion', 'tabla', 'registro_id', 'anteriores', 'nuevos', 'ip', 'userAgent'];
