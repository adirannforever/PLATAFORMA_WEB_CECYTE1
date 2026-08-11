import { query } from '../config/db.js';

export const getLogs = async (req, res) => {
  try {
    const {
      usuario_id,
      accion,
      tabla_afectada,
      fecha_desde,
      fecha_hasta,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let sql = `
      SELECT 
        l.id,
        l.usuario_id,
        u.nombre AS usuario_nombre,
        u.apellidos AS usuario_apellidos,
        l.accion,
        l.tabla_afectada,
        l.registro_id,
        l.datos_anteriores,
        l.datos_nuevos,
        l.ip,
        l.user_agent,
        l.fecha
      FROM auditoria_logs l
      LEFT JOIN usuarios u ON u.id = l.usuario_id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (usuario_id) {
      conditions.push(`l.usuario_id = $${params.length + 1}`);
      params.push(usuario_id);
    }
    if (accion) {
      conditions.push(`l.accion = $${params.length + 1}`);
      params.push(accion);
    }
    if (tabla_afectada) {
      conditions.push(`l.tabla_afectada = $${params.length + 1}`);
      params.push(tabla_afectada);
    }
    if (fecha_desde) {
      conditions.push(`l.fecha >= $${params.length + 1}`);
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      conditions.push(`l.fecha <= $${params.length + 1}`);
      params.push(fecha_hasta);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    const countSql = sql.replace(/SELECT .+? FROM /, 'SELECT COUNT(*) as total FROM ');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    sql += ' ORDER BY l.fecha DESC';
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Error en getLogs:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};