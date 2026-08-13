import { query } from '../config/db.js';

const docenteOwnsMateriaGrupo = async (materia_grupo_id, docente_id) => {
  const result = await query(
    `SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE`,
    [materia_grupo_id, docente_id]
  );
  return result.rows.length > 0;
};

export const misCalificaciones = async (req, res) => {
  try {
    const userId = req.user.id;

    const alumnoResult = await query(
      `SELECT a.id AS alumno_id, a.grupo_actual_id, a.semestre_actual
       FROM alumnos a
       WHERE a.usuario_id = $1`,
      [userId]
    );

    if (alumnoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    const { alumno_id, grupo_actual_id, semestre_actual } = alumnoResult.rows[0];

    if (!grupo_actual_id) {
      return res.status(400).json({ success: false, message: 'El alumno no tiene un grupo asignado' });
    }

    const materiasResult = await query(
      `SELECT 
         mg.id AS materia_grupo_id,
         mc.nombre AS materia_nombre,
         mc.clave,
         mc.semestre,
         g.nombre AS grupo_nombre,
         g.letra AS grupo_letra,
         c.nombre AS ciclo_nombre
       FROM materias_grupo mg
       JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
       JOIN grupos g ON g.id = mg.grupo_id
       JOIN ciclos_escolares c ON c.id = mg.ciclo_id
       WHERE mg.grupo_id = $1 AND mg.activa = true`,
      [grupo_actual_id]
    );

    const materias = materiasResult.rows;

    if (materias.length === 0) {
      return res.json({ success: true, calificaciones: [], materias: [] });
    }

    const califResult = await query(
      `SELECT 
         c.materia_grupo_id,
         c.parcial,
         c.calificacion,
         c.tipo_evaluacion
       FROM calificaciones c
       WHERE c.alumno_id = $1 AND c.tipo_evaluacion = 'ordinaria'`,
      [alumno_id]
    );

    const califMap = {};
    califResult.rows.forEach(row => {
      if (!califMap[row.materia_grupo_id]) {
        califMap[row.materia_grupo_id] = {};
      }
      califMap[row.materia_grupo_id][row.parcial] = row.calificacion;
    });

    const resultado = materias.map(m => {
      const califs = califMap[m.materia_grupo_id] || {};
      return {
        materia: m.materia_nombre,
        clave: m.clave,
        semestre: m.semestre,
        grupo: `${m.grupo_nombre} (${m.grupo_letra})`,
        ciclo: m.ciclo_nombre,
        parciales: {
          1: califs[1] || null,
          2: califs[2] || null,
          3: califs[3] || null,
        }
      };
    });

    res.json({ success: true, calificaciones: resultado });
  } catch (error) {
    console.error('Error en misCalificaciones:', error);
    res.status(500).json({ success: false, message: 'Error al obtener calificaciones' });
  }
};

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

    const materiaInfo = await query(
      `SELECT ciclo_id FROM materias_grupo WHERE id = $1 AND activa = TRUE`,
      [materia_grupo_id]
    );
    if (!materiaInfo.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada o inactiva.' });
    }
    const cicloId = materiaInfo.rows[0].ciclo_id;

    const alumnoCheck = await query('SELECT id FROM alumnos WHERE id = $1', [alumno_id]);
    if (!alumnoCheck.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'El alumno no existe o no está registrado correctamente.',
      });
    }

    const duplicado = await query(
      `SELECT id FROM calificaciones 
       WHERE alumno_id = $1 AND materia_grupo_id = $2 AND parcial = $3`,
      [alumno_id, materia_grupo_id, parcialNum]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una calificación para este parcial. Edita la celda correspondiente.',
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