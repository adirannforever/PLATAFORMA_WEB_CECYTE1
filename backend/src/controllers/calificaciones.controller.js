import { query } from '../config/db.js';

const docenteOwnsInscripcion = async (inscripcion_id, docente_id) => {
  const result = await query(
    `SELECT i.id
     FROM inscripciones i
     JOIN materias m ON m.id = i.materia_id
     WHERE i.id = $1 AND m.docente_id = $2`,
    [inscripcion_id, docente_id]
  );
  return result.rows.length > 0;
};

export const misCalificaciones = async (req, res) => {
  try {
    const result = await query(
      `SELECT m.nombre AS materia, m.ciclo_escolar,
              c.parcial, c.calificacion, c.fecha_registro,
              i.id AS inscripcion_id
       FROM calificaciones c
       JOIN inscripciones i ON i.id = c.inscripcion_id
       JOIN materias m ON m.id = i.materia_id
       WHERE i.alumno_id = $1
       ORDER BY m.nombre, c.parcial`,
      [req.user.id]
    );

    return res.json({ success: true, calificaciones: result.rows });
  } catch (err) {
    console.error('Error en misCalificaciones:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const calificacionesPorMateria = async (req, res) => {
  const { materia_id } = req.params;

  try {
    if (req.user.rol === 'docente') {
      const owns = await query(
        'SELECT id FROM materias WHERE id = $1 AND docente_id = $2',
        [materia_id, req.user.id]
      );
      if (!owns.rows[0]) {
        return res.status(403).json({ success: false, message: 'Acceso denegado.' });
      }
    }

    const result = await query(
      `SELECT u.id AS alumno_id, u.nombre, u.apellidos,
              i.id AS inscripcion_id,
              c.id AS calificacion_id, c.parcial, c.calificacion
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.alumno_id
       LEFT JOIN calificaciones c ON c.inscripcion_id = i.id
       WHERE i.materia_id = $1
       ORDER BY u.apellidos, u.nombre, c.parcial`,
      [materia_id]
    );

    return res.json({ success: true, calificaciones: result.rows });
  } catch (err) {
    console.error('Error en calificacionesPorMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const registrarCalificacion = async (req, res) => {
  const { inscripcion_id, parcial, calificacion } = req.body;

  if (!inscripcion_id || !parcial || calificacion === undefined) {
    return res.status(400).json({
      success: false,
      message: 'inscripcion_id, parcial y calificacion son requeridos.',
    });
  }

  const parcialNum = parseInt(parcial);
  const calNum = parseFloat(calificacion);

  if (![1, 2, 3].includes(parcialNum)) {
    return res.status(400).json({ success: false, message: 'El parcial debe ser 1, 2 o 3.' });
  }

  if (calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0 y 10.' });
  }

  try {
    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsInscripcion(inscripcion_id, req.user.id);
      if (!owns) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos sobre esta inscripción.',
        });
      }
    }

    const result = await query(
      `INSERT INTO calificaciones (inscripcion_id, parcial, calificacion)
       VALUES ($1, $2, $3) RETURNING *`,
      [inscripcion_id, parcialNum, calNum]
    );

    return res.status(201).json({
      success: true,
      message: 'Calificación registrada.',
      calificacion: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una calificación para este alumno en este parcial. Usa PUT para actualizar.',
      });
    }
    console.error('Error en registrarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarCalificacion = async (req, res) => {
  const { calificacion } = req.body;
  const { id } = req.params;

  const calNum = parseFloat(calificacion);
  if (calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0 y 10.' });
  }

  try {
    if (req.user.rol === 'docente') {
      const calRow = await query('SELECT inscripcion_id FROM calificaciones WHERE id = $1', [id]);
      if (!calRow.rows[0]) {
        return res.status(404).json({ success: false, message: 'Calificación no encontrada.' });
      }
      const owns = await docenteOwnsInscripcion(calRow.rows[0].inscripcion_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'No tienes permisos.' });
      }
    }

    const result = await query(
      'UPDATE calificaciones SET calificacion = $1 WHERE id = $2 RETURNING *',
      [calNum, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Calificación no encontrada.' });
    }

    return res.json({ success: true, message: 'Calificación actualizada.', calificacion: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
