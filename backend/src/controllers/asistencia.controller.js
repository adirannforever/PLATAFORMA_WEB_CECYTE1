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

// ── ASISTENCIA POR CLASE (materia_grupo) ─────────────────────────────────

// Obtener alumnos del grupo de una materia con su estado de asistencia
export const getAsistenciaClase = async (req, res) => {
  const { materia_grupo_id, fecha } = req.query;

  if (!materia_grupo_id) {
    return res.status(400).json({ success: false, message: 'materia_grupo_id es requerido.' });
  }

  try {
    // Verificar que el usuario tenga acceso a esta materia_grupo (docente o admin)
    if (req.user.rol === 'docente') {
      const owns = await query(
        'SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE',
        [materia_grupo_id, req.user.id]
      );
      if (!owns.rows[0]) {
        return res.status(403).json({ success: false, message: 'Acceso denegado a esta materia.' });
      }
    } else if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const fechaSeleccionada = fecha || new Date().toISOString().split('T')[0];

    // Obtener todos los alumnos del grupo (via historial_grupos_alumno) y su asistencia para la fecha
    const result = await query(
      `SELECT 
         a.id AS alumno_id,
         u.nombre,
         u.apellidos,
         a.matricula,
         ac.estado,
         ac.justificacion,
         ac.fecha,
         ac.id AS asistencia_id
       FROM alumnos a
       JOIN usuarios u ON a.usuario_id = u.id
       JOIN historial_grupos_alumno h ON h.alumno_id = a.id
       JOIN materias_grupo mg ON mg.grupo_id = h.grupo_id
       LEFT JOIN asistencia_clase ac ON ac.alumno_id = a.id 
         AND ac.materia_grupo_id = mg.id 
         AND ac.fecha = $2
       WHERE mg.id = $1 
         AND h.activo = TRUE 
         AND h.ciclo_id = (SELECT ciclo_id FROM materias_grupo WHERE id = $1)
       ORDER BY u.apellidos, u.nombre`,
      [materia_grupo_id, fechaSeleccionada]
    );

    // Si no hay alumnos, devolver un array vacío con mensaje informativo
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay alumnos asignados a esta materia en el ciclo actual.'
      });
    }

    return res.json({
      success: true,
      data: result.rows,
      fecha: fechaSeleccionada,
    });
  } catch (err) {
    console.error('Error en getAsistenciaClase:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Registrar o actualizar asistencia de clase para un alumno
export const registrarAsistenciaClase = async (req, res) => {
  const { alumno_id, materia_grupo_id, fecha, estado, justificacion } = req.body;

  // Validaciones
  if (!alumno_id || !materia_grupo_id || !estado) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, materia_grupo_id y estado son requeridos.'
    });
  }

  const estadosValidos = ['presente', 'ausente', 'justificado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      success: false,
      message: 'Estado inválido. Debe ser: presente, ausente o justificado.'
    });
  }

  // Fecha: usar la proporcionada o hoy
  const fechaFinal = fecha || new Date().toISOString().split('T')[0];

  try {
    // Verificar que el docente tenga acceso a la materia_grupo
    if (req.user.rol === 'docente') {
      const owns = await query(
        'SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE',
        [materia_grupo_id, req.user.id]
      );
      if (!owns.rows[0]) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta materia.' });
      }
    } else if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Insertar o actualizar (usamos periodo_numero = 1 por simplicidad)
    const result = await query(
      `INSERT INTO asistencia_clase 
        (alumno_id, materia_grupo_id, fecha, periodo_numero, estado, justificacion, registrado_por)
       VALUES ($1, $2, $3, 1, $4, $5, $6)
       ON CONFLICT (alumno_id, materia_grupo_id, fecha, periodo_numero)
       DO UPDATE SET 
         estado = EXCLUDED.estado,
         justificacion = EXCLUDED.justificacion,
         registrado_por = EXCLUDED.registrado_por
       RETURNING *`,
      [alumno_id, materia_grupo_id, fechaFinal, estado, justificacion || null, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Asistencia registrada correctamente.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error en registrarAsistenciaClase:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Guardar todas las asistencias de una materia en lote (opcional, para eficiencia)
export const guardarAsistenciasLote = async (req, res) => {
  const { asistencias } = req.body; // array de objetos { alumno_id, estado, justificacion }
  const { materia_grupo_id, fecha } = req.body;

  if (!materia_grupo_id || !asistencias || !Array.isArray(asistencias)) {
    return res.status(400).json({
      success: false,
      message: 'materia_grupo_id y asistencias (array) son requeridos.'
    });
  }

  const fechaFinal = fecha || new Date().toISOString().split('T')[0];

  try {
    // Verificar permisos (docente o admin)
    if (req.user.rol === 'docente') {
      const owns = await query(
        'SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE',
        [materia_grupo_id, req.user.id]
      );
      if (!owns.rows[0]) {
        return res.status(403).json({ success: false, message: 'No tienes permisos sobre esta materia.' });
      }
    } else if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Procesar cada asistencia en una transacción
    const resultados = [];
    for (const item of asistencias) {
      const { alumno_id, estado, justificacion } = item;
      if (!alumno_id || !estado) {
        continue; // omitir inválidos
      }
      const result = await query(
        `INSERT INTO asistencia_clase 
          (alumno_id, materia_grupo_id, fecha, periodo_numero, estado, justificacion, registrado_por)
         VALUES ($1, $2, $3, 1, $4, $5, $6)
         ON CONFLICT (alumno_id, materia_grupo_id, fecha, periodo_numero)
         DO UPDATE SET 
           estado = EXCLUDED.estado,
           justificacion = EXCLUDED.justificacion,
           registrado_por = EXCLUDED.registrado_por
         RETURNING *`,
        [alumno_id, materia_grupo_id, fechaFinal, estado, justificacion || null, req.user.id]
      );
      resultados.push(result.rows[0]);
    }

    return res.json({
      success: true,
      message: `Se guardaron ${resultados.length} asistencias.`,
      data: resultados
    });
  } catch (err) {
    console.error('Error en guardarAsistenciasLote:', err);
    return res.status(500).json({ success: false, message: 'Error al guardar asistencias.' });
  }
};