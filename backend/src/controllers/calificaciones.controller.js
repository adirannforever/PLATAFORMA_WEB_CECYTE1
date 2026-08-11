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
  const { materia_grupo_id } = req.params;

  try {
    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsMateriaGrupo(materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'Acceso denegado.' });
      }
    } else if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `SELECT 
         a.id AS alumno_id,
         u.id AS usuario_id,
         u.nombre,
         u.apellidos,
         c.id AS calificacion_id,
         c.parcial,
         c.calificacion
       FROM materias_grupo mg
       JOIN grupos g ON mg.grupo_id = g.id
       JOIN historial_grupos_alumno h ON h.grupo_id = g.id AND h.activo = TRUE
       JOIN alumnos a ON a.id = h.alumno_id
       JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN calificaciones c ON c.alumno_id = a.id AND c.materia_grupo_id = mg.id
       WHERE mg.id = $1
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
      message: 'Faltan datos: alumno, materia, parcial y calificación son requeridos.',
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
      const owns = await docenteOwnsMateriaGrupo(materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta materia.' });
      }
    }

    // Obtener el ciclo_id de la materia_grupo
    const materiaInfo = await query(
      `SELECT ciclo_id FROM materias_grupo WHERE id = $1 AND activa = TRUE`,
      [materia_grupo_id]
    );
    if (!materiaInfo.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada o inactiva.' });
    }
    const cicloId = materiaInfo.rows[0].ciclo_id;

    // Verificar que el alumno existe en la tabla alumnos
    const alumnoCheck = await query('SELECT id FROM alumnos WHERE id = $1', [alumno_id]);
    if (!alumnoCheck.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El alumno no existe o no está registrado correctamente. Verifica que el usuario tenga rol de alumno.',
      });
    }

    // Verificar que no exista duplicado
    const duplicado = await query(
      `SELECT id FROM calificaciones 
       WHERE alumno_id = $1 AND materia_grupo_id = $2 AND parcial = $3`,
      [alumno_id, materia_grupo_id, parcialNum]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una calificación para este parcial. Si deseas modificarla, edita la celda correspondiente.',
      });
    }

    const result = await query(
      `INSERT INTO calificaciones 
        (alumno_id, materia_grupo_id, ciclo_id, parcial, calificacion, tipo_evaluacion, registrado_por)
       VALUES ($1, $2, $3, $4, $5, 'ordinaria', $6) 
       RETURNING *`,
      [alumno_id, materia_grupo_id, cicloId, parcialNum, calNum, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Calificación registrada correctamente.',
      calificacion: result.rows[0],
    });
  } catch (err) {
    console.error('Error en registrarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
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

    return res.json({ success: true, message: 'Calificación actualizada correctamente.', calificacion: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

// Obtener períodos de evaluación para un ciclo (basado en materia_grupo_id)
export const getPeriodosEvaluacion = async (req, res) => {
  const { materia_grupo_id } = req.params;

  try {
    const result = await query(
      `SELECT ciclo_id FROM materias_grupo WHERE id = $1 AND activa = TRUE`,
      [materia_grupo_id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada o inactiva.' });
    }
    const cicloId = result.rows[0].ciclo_id;

    const periodos = await query(
      `SELECT parcial, fecha_inicio, fecha_fin
       FROM periodos_evaluacion
       WHERE ciclo_id = $1 AND activo = TRUE
       ORDER BY parcial`,
      [cicloId]
    );

    return res.json({ success: true, periodos: periodos.rows });
  } catch (err) {
    console.error('Error en getPeriodosEvaluacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};