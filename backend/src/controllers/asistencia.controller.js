import { query } from '../config/db.js';

// ── ASISTENCIA DIARIA (Pase de entrada al plantel) ───────────────────────
export const getAsistenciaDiaria = async (req, res) => {
  const { fecha, alumno_id } = req.query;
  try {
    let sql = `
      SELECT ad.*, u.nombre, u.apellidos, al.matricula
      FROM asistencia_diaria ad
      JOIN alumnos al ON ad.alumno_id = al.id
      JOIN usuarios u ON al.usuario_id = u.id
      WHERE ad.fecha = COALESCE($1, CURRENT_DATE)
    `;
    const params = [fecha || null];

    if (alumno_id) {
      params.push(alumno_id);
      sql += ` AND ad.alumno_id = $${params.length}`;
    }

    sql += ' ORDER BY u.apellidos, u.nombre';
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAsistenciaDiaria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const registrarAsistenciaDiaria = async (req, res) => {
  const { alumno_id, fecha, llego, justificada, motivo_justificacion } = req.body;

  try {
    const result = await query(
      `INSERT INTO asistencia_diaria (alumno_id, fecha, llego, justificada, motivo_justificacion, registrado_por)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, COALESCE($4, FALSE), $5, $6)
       ON CONFLICT (alumno_id, fecha)
       DO UPDATE SET llego = EXCLUDED.llego,
                     justificada = EXCLUDED.justificada,
                     motivo_justificacion = EXCLUDED.motivo_justificacion,
                     registrado_por = EXCLUDED.registrado_por
       RETURNING *`,
      [alumno_id, fecha || null, llego, justificada, motivo_justificacion || null, req.user.id]
    );

    return res.json({ success: true, message: 'Asistencia diaria registrada.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en registrarAsistenciaDiaria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getAsistenciaClase = async (req, res) => {
  const { materia_grupo_id, fecha } = req.query;
  try {
    const result = await query(
      `SELECT ac.*, u.nombre, u.apellidos, al.matricula
       FROM asistencia_clase ac
       JOIN alumnos al ON ac.alumno_id = al.id
       JOIN usuarios u ON al.usuario_id = u.id
       WHERE ac.materia_grupo_id = $1 AND ac.fecha = COALESCE($2, CURRENT_DATE)
       ORDER BY ac.periodo_numero, u.apellidos`,
      [materia_grupo_id, fecha || null]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAsistenciaClase:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const registrarAsistenciaClase = async (req, res) => {
  const { alumno_id, materia_grupo_id, fecha, periodo_numero, estado, justificacion } = req.body;

  try {
    const result = await query(
      `INSERT INTO asistencia_clase (alumno_id, materia_grupo_id, fecha, periodo_numero, estado, justificacion, registrado_por)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6, $7)
       ON CONFLICT (alumno_id, materia_grupo_id, fecha, periodo_numero)
       DO UPDATE SET estado = EXCLUDED.estado,
                     justificacion = EXCLUDED.justificacion,
                     registrado_por = EXCLUDED.registrado_por
       RETURNING *`,
      [alumno_id, materia_grupo_id, fecha || null, periodo_numero, estado, justificacion || null, req.user.id]
    );

    return res.json({ success: true, message: 'Asistencia de clase registrada.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en registrarAsistenciaClase:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};