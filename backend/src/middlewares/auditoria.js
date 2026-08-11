import { query } from '../config/db.js';

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