import { query } from '../config/db.js';


export const getMaterias = async (req, res) => {
  try {
    let sql, params;

    if (req.user.rol === 'administrador') {
      sql = `
        SELECT m.id, m.nombre, m.descripcion, m.ciclo_escolar, m.activa,
               u.id AS docente_id, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos
        FROM materias m
        JOIN usuarios u ON u.id = m.docente_id
        ORDER BY m.ciclo_escolar DESC, m.nombre
      `;
      params = [];
    } else {
      sql = `
        SELECT m.id, m.nombre, m.descripcion, m.ciclo_escolar, m.activa,
               u.id AS docente_id, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos
        FROM materias m
        JOIN usuarios u ON u.id = m.docente_id
        WHERE m.docente_id = $1
        ORDER BY m.ciclo_escolar DESC, m.nombre
      `;
      params = [req.user.id];
    }

    const result = await query(sql, params);
    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en getMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getMateriaById = async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos
       FROM materias m JOIN usuarios u ON u.id = m.docente_id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
    }

    if (req.user.rol === 'docente' && result.rows[0].docente_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    return res.json({ success: true, materia: result.rows[0] });
  } catch (err) {
    console.error('Error en getMateriaById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearMateria = async (req, res) => {
  const { nombre, descripcion, ciclo_escolar, docente_id } = req.body;

  if (!nombre || !ciclo_escolar || !docente_id) {
    return res.status(400).json({
      success: false,
      message: 'nombre, ciclo_escolar y docente_id son requeridos.',
    });
  }

  try {
    
    const docente = await query(
      "SELECT id FROM usuarios WHERE id = $1 AND rol = 'docente' AND activo = TRUE",
      [docente_id]
    );

    if (!docente.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El docente_id no corresponde a un docente activo.',
      });
    }

    const result = await query(
      `INSERT INTO materias (nombre, descripcion, ciclo_escolar, docente_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, ciclo_escolar.trim(), docente_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Materia creada correctamente.',
      materia: result.rows[0],
    });
  } catch (err) {
    console.error('Error en crearMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarMateria = async (req, res) => {
  const { nombre, descripcion, ciclo_escolar, docente_id, activa } = req.body;

  try {
    const result = await query(
      `UPDATE materias
       SET nombre        = COALESCE($1, nombre),
           descripcion   = COALESCE($2, descripcion),
           ciclo_escolar = COALESCE($3, ciclo_escolar),
           docente_id    = COALESCE($4, docente_id),
           activa        = COALESCE($5, activa)
       WHERE id = $6
       RETURNING *`,
      [nombre, descripcion, ciclo_escolar, docente_id, activa, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada.' });
    }

    return res.json({ success: true, message: 'Materia actualizada.', materia: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getAlumnosDeMateria = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, i.id AS inscripcion_id, i.fecha_inscripcion
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.alumno_id
       WHERE i.materia_id = $1
       ORDER BY u.apellidos, u.nombre`,
      [req.params.id]
    );

    return res.json({ success: true, alumnos: result.rows });
  } catch (err) {
    console.error('Error en getAlumnosDeMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
