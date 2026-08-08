import { query } from '../config/db.js';

export const getTutoriasGrupo = async (req, res) => {
  const { grupo_id, ciclo_id } = req.query;

  if (!grupo_id || !ciclo_id) {
    return res.status(400).json({ success: false, message: 'grupo_id y ciclo_id son requeridos.' });
  }

  try {
    let queryText = `
      SELECT t.*, u.nombre || ' ' || u.apellidos AS tutor_nombre, g.nombre AS grupo_nombre
      FROM tutorias t
      JOIN usuarios u ON t.tutor_id = u.id
      JOIN grupos g ON t.grupo_id = g.id
      WHERE t.grupo_id = $1 AND t.ciclo_id = $2
    `;
    const queryParams = [grupo_id, ciclo_id];

    // Si el rol es docente, se restringe estrictamente a sus propias tutorías
    if (req.user.rol === 'docente') {
      queryText += ` AND t.tutor_id = $3`;
      queryParams.push(req.user.id);
    }

    queryText += ` ORDER BY t.fecha DESC`;

    const result = await query(queryText, queryParams);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getTutoriasGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearTutoria = async (req, res) => {
  const { grupo_id, ciclo_id, fecha, tema, observaciones } = req.body;

  if (!grupo_id || !ciclo_id || !fecha || !tema) {
    return res.status(400).json({ success: false, message: 'grupo_id, ciclo_id, fecha y tema son obligatorios.' });
  }

  try {
    const result = await query(
      `INSERT INTO tutorias (tutor_id, grupo_id, ciclo_id, fecha, tema, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, grupo_id, ciclo_id, fecha, tema.trim(), observaciones || null]
    );

    return res.status(201).json({ success: true, message: 'Bitácora de tutoría registrada.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en crearTutoria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};