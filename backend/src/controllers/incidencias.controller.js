import { query } from '../config/db.js';

export const getIncidencias = async (req, res) => {
  try {
    const { alumno_id, tipo, subtipo, resuelta, fecha_desde, fecha_hasta, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let sql = `
      SELECT 
        i.id,
        i.alumno_id,
        i.ciclo_id,
        i.tipo,
        i.subtipo,
        i.descripcion,
        i.registrado_por,
        i.fecha,
        i.resuelta,
        i.resolucion,
        a.matricula,
        a.semestre_actual AS semestre,
        g.letra AS grupo_letra,
        u.nombre AS alumno_nombre,
        u.apellidos AS alumno_apellidos,
        r.nombre AS registrado_por_nombre,
        r.apellidos AS registrado_por_apellidos
      FROM incidencias i
      JOIN alumnos a ON a.id = i.alumno_id
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN grupos g ON g.id = a.grupo_actual_id
      JOIN usuarios r ON r.id = i.registrado_por
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (alumno_id) {
      conditions.push(`i.alumno_id = $${params.length + 1}`);
      params.push(alumno_id);
    }
    if (tipo) {
      conditions.push(`i.tipo = $${params.length + 1}`);
      params.push(tipo);
    }
    if (subtipo) {
      conditions.push(`i.subtipo = $${params.length + 1}`);
      params.push(subtipo);
    }
    if (resuelta !== undefined && resuelta !== '') {
      conditions.push(`i.resuelta = $${params.length + 1}`);
      params.push(resuelta === 'true');
    }
    if (fecha_desde) {
      conditions.push(`i.fecha >= $${params.length + 1}`);
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      conditions.push(`i.fecha <= $${params.length + 1}`);
      params.push(fecha_hasta);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    const countSql = sql.replace(/SELECT .+? FROM /, 'SELECT COUNT(*) as total FROM ');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    sql += ' ORDER BY i.fecha DESC, i.id DESC';
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
      }
    });
  } catch (err) {
    console.error('Error en getIncidencias:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const getIncidenciasByAlumno = async (req, res) => {
  try {
    const { alumno_id } = req.params;
    const result = await query(
      `SELECT 
        i.id, i.tipo, i.subtipo, i.descripcion, i.fecha, i.resuelta, i.resolucion,
        u.nombre AS registrado_por_nombre,
        u.apellidos AS registrado_por_apellidos
       FROM incidencias i
       JOIN usuarios u ON u.id = i.registrado_por
       WHERE i.alumno_id = $1
       ORDER BY i.fecha DESC`,
      [alumno_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getIncidenciasByAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearIncidencia = async (req, res) => {
  const { alumno_id, ciclo_id, tipo, subtipo, descripcion, fecha } = req.body;
  if (!alumno_id || !tipo || !descripcion) {
    return res.status(400).json({ success: false, message: 'Alumno, tipo y descripción son requeridos' });
  }
  try {
    const tiposValidos = ['conducta','academica','asistencia','citatorio_tutor','felicitacion','otro'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }
    const result = await query(
      `INSERT INTO incidencias (alumno_id, ciclo_id, tipo, subtipo, descripcion, registrado_por, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [alumno_id, ciclo_id || null, tipo, subtipo || null, descripcion, req.user.id, fecha || new Date().toISOString().split('T')[0]]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en crearIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarIncidencia = async (req, res) => {
  const { id } = req.params;
  const { tipo, subtipo, descripcion, fecha } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (tipo !== undefined) { fields.push(`tipo = $${idx++}`); values.push(tipo); }
    if (subtipo !== undefined) { fields.push(`subtipo = $${idx++}`); values.push(subtipo); }
    if (descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(descripcion); }
    if (fecha !== undefined) { fields.push(`fecha = $${idx++}`); values.push(fecha); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    values.push(id);
    const sql = `UPDATE incidencias SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Incidencia no encontrada' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const resolverIncidencia = async (req, res) => {
  const { id } = req.params;
  const { resolucion } = req.body;
  if (!resolucion) {
    return res.status(400).json({ success: false, message: 'La resolución es requerida' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `UPDATE incidencias SET resuelta = TRUE, resolucion = $1 WHERE id = $2 RETURNING *`,
      [resolucion, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Incidencia no encontrada' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en resolverIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const eliminarIncidencia = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query('DELETE FROM incidencias WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Incidencia no encontrada' });
    }
    return res.json({ success: true, message: 'Incidencia eliminada correctamente' });
  } catch (err) {
    console.error('Error en eliminarIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};