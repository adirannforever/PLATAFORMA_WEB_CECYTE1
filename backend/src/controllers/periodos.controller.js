import { query } from '../config/db.js';

// ============================================================
// FUNCIÓN EXISTENTE – Estado del alumno
// ============================================================
export const getEstadoAlumno = async (req, res) => {
  const { alumno_id } = req.params;

  try {
    const alumnoRes = await query(
      `SELECT a.semestre_actual, a.grupo_actual_id, a.estatus,
              g.ciclo_id, g.semestre AS grupo_semestre
       FROM alumnos a
       LEFT JOIN grupos g ON g.id = a.grupo_actual_id
       WHERE a.id = $1`,
      [alumno_id]
    );

    if (!alumnoRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }

    const { semestre_actual, estatus, grupo_semestre, ciclo_id } = alumnoRes.rows[0];
    const semestre = semestre_actual || grupo_semestre || 1;

    const periodosRes = await query(
      `SELECT tipo, fecha_inicio, fecha_fin
       FROM periodos_escolares
       WHERE ciclo_id = $1 AND semestre = $2 AND activo = TRUE
       ORDER BY fecha_inicio`,
      [ciclo_id, semestre]
    );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let estado = 'inscripcion';
    let mensaje = 'El alumno está en proceso de Inscripción.';
    let etapaActual = 'inscripcion';
    let esEditable = true;

    for (const p of periodosRes.rows) {
      const inicio = new Date(p.fecha_inicio);
      const fin = new Date(p.fecha_fin);
      inicio.setHours(0,0,0,0);
      fin.setHours(0,0,0,0);

      if (hoy >= inicio && hoy <= fin) {
        estado = p.tipo;
        etapaActual = p.tipo;
        esEditable = true;
        const mensajes = {
          preinscripcion: 'Período de Preinscripción activo. Debes completar los documentos requeridos.',
          inscripcion_nuevo_ingreso: 'Período de Inscripción para nuevo ingreso activo. Entrega los documentos necesarios.',
          reinscripcion: 'Período de Reinscripción activo. Actualiza tus datos y entrega los documentos correspondientes.',
          inicio_semestre: 'El semestre ha iniciado. Verifica que tu documentación esté completa.',
          fin_semestre: 'Fin de semestre. Revisa tus calificaciones y documentos pendientes.',
          evaluaciones_parciales: 'Período de evaluaciones parciales. Entrega tus trabajos.',
          evaluacion_recuperacion: 'Período de recuperación. Asegúrate de cumplir con los requisitos.',
          evaluacion_extraordinaria: 'Período de extraordinarios. Entrega los documentos solicitados.',
          curso_intersemestral: 'Curso intersemestral activo. Completa tu inscripción.'
        };
        mensaje = mensajes[p.tipo] || mensaje;
        break;
      }
    }

    if (estado === 'inscripcion') {
      const reinscripcion = periodosRes.rows.find(p => p.tipo === 'reinscripcion');
      if (reinscripcion && new Date(reinscripcion.fecha_fin) < hoy) {
        estado = 'reinscripcion_cerrada';
        esEditable = false;
        mensaje = 'El período de Reinscripción ha finalizado. El alumno debe presentar documentos para el siguiente ciclo.';
      } else {
        mensaje = 'El alumno está en proceso de Inscripción. Entrega los documentos correspondientes.';
      }
    }

    if (semestre === 6 && estatus === 'activo') {
      estado = 'titulacion';
      mensaje = 'El alumno cursa el último semestre. Debe iniciar el proceso de Titulación.';
      esEditable = true;
    }

    if (estatus === 'egresado') {
      estado = 'egresado';
      mensaje = 'Alumno egresado. Ya no requiere inscripción ni reinscripción.';
      esEditable = false;
    }

    return res.json({
      success: true,
      data: {
        estado,
        mensaje,
        etapaActual,
        esEditable,
        semestre,
        periodos: periodosRes.rows
      }
    });
  } catch (err) {
    console.error('Error en getEstadoAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ADMINISTRACIÓN DE PERÍODOS ESCOLARES
// ============================================================

export const getPeriodosEscolares = async (req, res) => {
  try {
    const { ciclo_id, semestre, especialidad_id } = req.query;
    if (!ciclo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere ciclo_id' });
    }
    let sql = `
      SELECT id, ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo
      FROM periodos_escolares
      WHERE ciclo_id = $1
    `;
    const params = [ciclo_id];
    let idx = 2;
    if (semestre) {
      sql += ` AND semestre = $${idx++}`;
      params.push(parseInt(semestre));
    }
    sql += ' ORDER BY semestre, tipo';
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getPeriodosEscolares:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarPeriodoEscolar = async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, activo } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (fecha_inicio !== undefined) { fields.push(`fecha_inicio = $${idx++}`); values.push(fecha_inicio); }
    if (fecha_fin !== undefined) { fields.push(`fecha_fin = $${idx++}`); values.push(fecha_fin); }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    values.push(id);
    const sql = `UPDATE periodos_escolares SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Período no encontrado' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarPeriodoEscolar:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearPeriodoEscolar = async (req, res) => {
  const { ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo } = req.body;
  if (!ciclo_id || !semestre || !tipo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `INSERT INTO periodos_escolares (ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo !== undefined ? activo : true]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un período con ese tipo para este semestre' });
    }
    console.error('Error en crearPeriodoEscolar:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearPeriodosEscolaresBatch = async (req, res) => {
  const { ciclo_id, periodos } = req.body;
  if (!ciclo_id || !periodos || !Array.isArray(periodos) || periodos.length === 0) {
    return res.status(400).json({ success: false, message: 'Datos inválidos' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const resultados = [];
    const errores = [];
    for (const p of periodos) {
      const { semestre, tipo, fecha_inicio, fecha_fin, activo } = p;
      if (!semestre || !tipo || !fecha_inicio || !fecha_fin) {
        errores.push({ semestre, tipo, error: 'Faltan campos' });
        continue;
      }
      try {
        const result = await query(
          `INSERT INTO periodos_escolares (ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [ciclo_id, semestre, tipo, fecha_inicio, fecha_fin, activo !== undefined ? activo : true]
        );
        resultados.push({ semestre, tipo, id: result.rows[0].id });
      } catch (err) {
        if (err.code === '23505') {
          errores.push({ semestre, tipo, error: 'Ya existe un período con ese tipo para este semestre' });
        } else {
          errores.push({ semestre, tipo, error: err.message });
        }
      }
    }
    return res.status(201).json({
      success: true,
      data: {
        creados: resultados,
        errores,
        total: periodos.length,
        exitosos: resultados.length,
        fallidos: errores.length,
      }
    });
  } catch (err) {
    console.error('Error en crearPeriodosEscolaresBatch:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const regenerarPeriodos = async (req, res) => {
  const { ciclo_id } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    await query('DELETE FROM periodos_escolares WHERE ciclo_id = $1', [ciclo_id]);
    await query('DELETE FROM periodos_evaluacion WHERE ciclo_id = $1', [ciclo_id]);
    return res.json({ success: true, message: 'Períodos eliminados. Debes regenerarlos manualmente.' });
  } catch (err) {
    console.error('Error en regenerarPeriodos:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// ADMINISTRACIÓN DE PERÍODOS DE EVALUACIÓN (CON TIPO)
// ============================================================

export const getPeriodosEvaluacion = async (req, res) => {
  try {
    const { ciclo_id } = req.query;
    if (!ciclo_id) {
      return res.status(400).json({ success: false, message: 'Se requiere ciclo_id' });
    }
    const result = await query(
      `SELECT id, ciclo_id, parcial, tipo, fecha_inicio, fecha_fin, activo
       FROM periodos_evaluacion
       WHERE ciclo_id = $1
       ORDER BY 
         CASE tipo
           WHEN 'parcial' THEN 1
           WHEN 'recuperacion' THEN 2
           WHEN 'extraordinario' THEN 3
         END,
         parcial`,
      [ciclo_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getPeriodosEvaluacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarPeriodoEvaluacion = async (req, res) => {
  const { id } = req.params;
  const { parcial, tipo, fecha_inicio, fecha_fin, activo } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (parcial !== undefined) { fields.push(`parcial = $${idx++}`); values.push(parcial); }
    if (tipo !== undefined) { fields.push(`tipo = $${idx++}`); values.push(tipo); }
    if (fecha_inicio !== undefined) { fields.push(`fecha_inicio = $${idx++}`); values.push(fecha_inicio); }
    if (fecha_fin !== undefined) { fields.push(`fecha_fin = $${idx++}`); values.push(fecha_fin); }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    values.push(id);
    const sql = `UPDATE periodos_evaluacion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Período de evaluación no encontrado' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarPeriodoEvaluacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearPeriodoEvaluacion = async (req, res) => {
  const { ciclo_id, parcial, tipo, fecha_inicio, fecha_fin, activo } = req.body;
  if (!ciclo_id || !tipo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos (ciclo, tipo, fechas)' });
  }
  // Validar que si tipo es 'parcial', parcial sea un número entre 1 y 3
  if (tipo === 'parcial' && (!parcial || parcial < 1 || parcial > 3)) {
    return res.status(400).json({ success: false, message: 'Para tipo parcial, el número de parcial debe ser 1, 2 o 3' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `INSERT INTO periodos_evaluacion (ciclo_id, parcial, tipo, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [ciclo_id, tipo === 'parcial' ? parcial : 0, tipo, fecha_inicio, fecha_fin, activo !== undefined ? activo : true]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un período para este parcial/tipo' });
    }
    console.error('Error en crearPeriodoEvaluacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};