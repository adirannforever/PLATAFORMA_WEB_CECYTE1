// src/controllers/inscripciones.controller.js
import { query } from '../config/db.js';

export const misMaterias = async (req, res) => {
  try {
    const alumnoRes = await query('SELECT id FROM alumnos WHERE usuario_id = $1', [req.user.id]);
    if (!alumnoRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Perfil de alumno no encontrado.' });
    }
    const alumnoId = alumnoRes.rows[0].id;

    const result = await query(
      `SELECT i.id AS inscripcion_id, i.fecha_inscripcion,
              mg.id AS materia_grupo_id, m.nombre AS materia, m.descripcion,
              u.nombre AS docente_nombre, u.apellidos AS docente_apellidos
       FROM inscripciones_grupo i
       JOIN materias_grupo mg ON mg.id = i.materia_grupo_id
       JOIN materias m ON m.id = mg.materia_id
       JOIN docentes d ON d.id = mg.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE i.alumno_id = $1
       ORDER BY m.nombre`,
      [alumnoId]
    );

    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en misMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const inscribirAlumno = async (req, res) => {
  const { alumno_id, materia_grupo_id } = req.body;

  if (!alumno_id || !materia_grupo_id) {
    return res.status(400).json({ success: false, message: 'alumno_id y materia_grupo_id son requeridos.' });
  }

  try {
    const result = await query(
      `INSERT INTO inscripciones_grupo (alumno_id, materia_grupo_id)
       VALUES ($1, $2) RETURNING *`,
      [alumno_id, materia_grupo_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Alumno inscrito correctamente.',
      inscripcion: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'El alumno ya está inscrito en este grupo.' });
    }
    console.error('Error en inscribirAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const eliminarInscripcion = async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM inscripciones_grupo WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Inscripción no encontrada.' });
    }

    return res.json({ success: true, message: 'Inscripción eliminada.' });
  } catch (err) {
    console.error('Error en eliminarInscripcion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};