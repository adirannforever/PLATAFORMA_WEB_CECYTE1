// src/controllers/inscripciones.controller.js

import { query } from '../config/db.js';

// ── GET /api/inscripciones/mis-materias ───────────────────────
// Para un alumno: lista las materias en las que está inscrito
export const misMaterias = async (req, res) => {
  try {
    const result = await query(
      `SELECT i.id AS inscripcion_id, i.fecha_inscripcion,
              m.id AS materia_id, m.nombre AS materia, m.descripcion, m.ciclo_escolar,
              u.nombre AS docente_nombre, u.apellidos AS docente_apellidos
       FROM inscripciones i
       JOIN materias m ON m.id = i.materia_id
       JOIN usuarios u ON u.id = m.docente_id
       WHERE i.alumno_id = $1
       ORDER BY m.ciclo_escolar DESC, m.nombre`,
      [req.user.id]
    );

    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en misMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const inscribirAlumno = async (req, res) => {
  const { alumno_id, materia_id } = req.body;

  if (!alumno_id || !materia_id) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id y materia_id son requeridos.',
    });
  }

  try {
    const alumno = await query(
      "SELECT id FROM usuarios WHERE id = $1 AND rol = 'alumno' AND activo = TRUE",
      [alumno_id]
    );
    if (!alumno.rows[0]) {
      return res.status(400).json({ success: false, message: 'alumno_id inválido.' });
    }

    const materia = await query(
      'SELECT id FROM materias WHERE id = $1 AND activa = TRUE',
      [materia_id]
    );
    if (!materia.rows[0]) {
      return res.status(400).json({ success: false, message: 'materia_id inválido o inactiva.' });
    }

    const result = await query(
      `INSERT INTO inscripciones (alumno_id, materia_id)
       VALUES ($1, $2) RETURNING *`,
      [alumno_id, materia_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Alumno inscrito correctamente.',
      inscripcion: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya está inscrito en esta materia.',
      });
    }
    console.error('Error en inscribirAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const eliminarInscripcion = async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM inscripciones WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada.' });
    }

    return res.json({ success: true, message: 'Inscripción eliminada (y sus calificaciones).' });
  } catch (err) {
    console.error('Error en eliminarInscripcion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
