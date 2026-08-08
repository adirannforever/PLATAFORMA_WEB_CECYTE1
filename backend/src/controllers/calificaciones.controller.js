import { query } from '../config/db.js';

// Verificar si un docente es responsable de una materia_grupo
const docenteOwnsMateriaGrupo = async (materia_grupo_id, docente_id) => {
  const result = await query(
    `SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE`,
    [materia_grupo_id, docente_id]
  );
  return result.rows.length > 0;
};

// Obtener las calificaciones del alumno autenticado
export const misCalificaciones = async (req, res) => {
  try {
    const alumno = await query('SELECT id FROM alumnos WHERE usuario_id = $1', [req.user.id]);
    if (!alumno.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }
    const alumnoId = alumno.rows[0].id;

    const result = await query(
      `SELECT mc.nombre AS materia, ce.nombre AS ciclo_escolar,
              c.parcial, c.calificacion, c.fecha_registro,
              mg.id AS materia_grupo_id
       FROM calificaciones c
       JOIN materias_grupo mg ON mg.id = c.materia_grupo_id
       JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
       JOIN ciclos_escolares ce ON ce.id = mg.ciclo_id
       WHERE c.alumno_id = $1
       ORDER BY mc.nombre, c.parcial`,
      [alumnoId]
    );

    return res.json({ success: true, calificaciones: result.rows });
  } catch (err) {
    console.error('Error en misCalificaciones:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Obtener calificaciones de todos los alumnos en una materia_grupo específica
export const calificacionesPorMateria = async (req, res) => {
  const { materia_grupo_id } = req.params; // Cambiamos a materia_grupo_id

  try {
    // Verificar permisos: docente debe ser el responsable de esa materia_grupo
    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsMateriaGrupo(materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'Acceso denegado.' });
      }
    } else if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `SELECT u.id AS alumno_id, u.nombre, u.apellidos,
              a.id AS alumno_id_interno,
              c.id AS calificacion_id, c.parcial, c.calificacion
       FROM alumnos a
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN calificaciones c ON c.alumno_id = a.id AND c.materia_grupo_id = $1
       WHERE a.grupo_actual_id = (
         SELECT grupo_id FROM materias_grupo WHERE id = $1
       )
       ORDER BY u.apellidos, u.nombre, c.parcial`,
      [materia_grupo_id]
    );

    return res.json({ success: true, calificaciones: result.rows });
  } catch (err) {
    console.error('Error en calificacionesPorMateria:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Registrar una calificación para un alumno en una materia_grupo
export const registrarCalificacion = async (req, res) => {
  const { alumno_id, materia_grupo_id, parcial, calificacion } = req.body;

  if (!alumno_id || !materia_grupo_id || !parcial || calificacion === undefined) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, materia_grupo_id, parcial y calificacion son requeridos.',
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
    // Verificar que el docente tiene permiso sobre esta materia_grupo
    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsMateriaGrupo(materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta materia.' });
      }
    }

    // Verificar que el alumno pertenece al grupo de esa materia
    const grupoCheck = await query(
      `SELECT a.id FROM alumnos a
       JOIN materias_grupo mg ON mg.grupo_id = a.grupo_actual_id
       WHERE a.id = $1 AND mg.id = $2`,
      [alumno_id, materia_grupo_id]
    );
    if (!grupoCheck.rows[0]) {
      return res.status(400).json({ success: false, message: 'El alumno no pertenece al grupo de esta materia.' });
    }

    const result = await query(
      `INSERT INTO calificaciones (alumno_id, materia_grupo_id, parcial, calificacion, tipo_evaluacion, registrado_por)
       VALUES ($1, $2, $3, $4, 'ordinaria', $5) RETURNING *`,
      [alumno_id, materia_grupo_id, parcialNum, calNum, req.user.id]
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

// Actualizar una calificación existente
export const actualizarCalificacion = async (req, res) => {
  const { calificacion } = req.body;
  const { id } = req.params;

  const calNum = parseFloat(calificacion);
  if (calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0 y 10.' });
  }

  try {
    // Obtener la calificación para verificar permisos
    const calRow = await query(
      `SELECT c.id, c.materia_grupo_id, c.alumno_id
       FROM calificaciones c
       WHERE c.id = $1`,
      [id]
    );
    if (!calRow.rows[0]) {
      return res.status(404).json({ success: false, message: 'Calificación no encontrada.' });
    }

    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsMateriaGrupo(calRow.rows[0].materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta calificación.' });
      }
    }

    const result = await query(
      `UPDATE calificaciones SET calificacion = $1, registrado_por = $2
       WHERE id = $3 RETURNING *`,
      [calNum, req.user.id, id]
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