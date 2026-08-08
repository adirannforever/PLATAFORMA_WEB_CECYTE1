import { query } from '../config/db.js';

export const getIncidenciasAlumno = async (req, res) => {
  const { alumno_id } = req.params;
  try {
    const result = await query(
      `SELECT i.*, ce.nombre AS ciclo, u.nombre || ' ' || u.apellidos AS registrado_por_nombre
       FROM incidencias i
       JOIN ciclos_escolares ce ON i.ciclo_id = ce.id
       JOIN usuarios u ON i.registrado_por = u.id
       WHERE i.alumno_id = $1
       ORDER BY i.fecha DESC, i.id DESC`,
      [alumno_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getIncidenciasAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearIncidencia = async (req, res) => {
  const { alumno_id, ciclo_id, tipo, descripcion, fecha } = req.body;

  if (!alumno_id || !ciclo_id || !tipo || !descripcion) {
    return res.status(400).json({ success: false, message: 'alumno_id, ciclo_id, tipo y descripcion son requeridos.' });
  }

  try {
    const result = await query(
      `INSERT INTO incidencias (alumno_id, ciclo_id, tipo, descripcion, registrado_por, fecha)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE))
       RETURNING *`,
      [alumno_id, ciclo_id, tipo, descripcion.trim(), req.user.id, fecha || null]
    );

    return res.status(201).json({ success: true, message: 'Incidencia registrada.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en crearIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const resolverIncidencia = async (req, res) => {
  const { id } = req.params;
  const { resolucion } = req.body;

  try {
    const result = await query(
      `UPDATE incidencias
       SET resuelta = TRUE,
           resolucion = COALESCE($1, resolucion)
       WHERE id = $2
       RETURNING *`,
      [resolucion?.trim() || null, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Incidencia no encontrada.' });
    }

    return res.json({ success: true, message: 'Incidencia marcada como resuelta.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en resolverIncidencia:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};