import { query, withTransaction } from '../config/db.js';

const docenteOwnsMateriaGrupo = async (materia_grupo_id, docente_id) => {
  const result = await query(
    `SELECT id FROM materias_grupo WHERE id = $1 AND docente_id = $2 AND activa = TRUE`,
    [materia_grupo_id, docente_id]
  );
  return result.rows.length > 0;
};

const alumnoPerteneceAMateriaGrupo = async (alumnoId, materiaGrupoId) => {
  const result = await query(
    `SELECT 1
     FROM materias_grupo mg
     JOIN historial_grupos_alumno h
       ON h.grupo_id = mg.grupo_id
      AND h.ciclo_id = mg.ciclo_id
     WHERE mg.id = $1 AND h.alumno_id = $2
     LIMIT 1`,
    [materiaGrupoId, alumnoId]
  );
  return result.rows.length > 0;
};

// ============================================================
// EVALUAR CONDICIÓN ACADÉMICA DEL ALUMNO (Motor de Acreditación)
// ============================================================
export const calcularCondicionAcademica = async (alumnoId, cicloId = null) => {
  // Si no se pasa cicloId, obtener el activo
  let targetCicloId = cicloId;
  if (!targetCicloId) {
    const cicloRes = await query('SELECT id FROM ciclos_escolares WHERE activo = TRUE LIMIT 1');
    if (!cicloRes.rows[0]) return null;
    targetCicloId = cicloRes.rows[0].id;
  }

  // Obtener grupo del alumno en este ciclo
  const grupoRes = await query(
    `SELECT g.id, g.semestre, g.nombre, a.estatus
     FROM historial_grupos_alumno h
     JOIN grupos g ON g.id = h.grupo_id
     JOIN alumnos a ON a.id = h.alumno_id
     WHERE h.alumno_id = $1 AND h.ciclo_id = $2 AND h.activo = TRUE
     LIMIT 1`,
    [alumnoId, targetCicloId]
  );

  if (!grupoRes.rows[0]) return null;
  const { id: grupoId, semestre, estatus: estatusActual } = grupoRes.rows[0];

  // Materias del grupo
  const materiasRes = await query(
    `SELECT mg.id AS materia_grupo_id, mc.nombre AS materia_nombre, mc.clave, mc.tipo
     FROM materias_grupo mg
     JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
     WHERE mg.grupo_id = $1 AND mg.ciclo_id = $2 AND mg.activa = TRUE`,
    [grupoId, targetCicloId]
  );

  // Calificaciones registradas
  const califsRes = await query(
    `SELECT materia_grupo_id, parcial, calificacion, tipo_evaluacion, calificacion_ordinaria_previa
     FROM calificaciones
     WHERE alumno_id = $1 AND ciclo_id = $2`,
    [alumnoId, targetCicloId]
  );

  const califMap = {};
  califsRes.rows.forEach(r => {
    if (!califMap[r.materia_grupo_id]) califMap[r.materia_grupo_id] = {};
    califMap[r.materia_grupo_id][r.parcial] = {
      calificacion: parseFloat(r.calificacion),
      tipo_evaluacion: r.tipo_evaluacion,
      previa: r.calificacion_ordinaria_previa ? parseFloat(r.calificacion_ordinaria_previa) : null
    };
  });

  // Parciales configurados para el ciclo (periodos_evaluacion).
  // Si el ciclo no define periodos, se asume el esquema clásico 1-2-3.
  const perRes = await query(
    `SELECT parcial FROM periodos_evaluacion WHERE ciclo_id = $1 AND activo = TRUE ORDER BY parcial`,
    [targetCicloId]
  );
  const parcialesConfig = perRes.rows
    .map(r => Number(r.parcial))
    .filter(n => Number.isFinite(n) && n > 0);
  const parciales = parcialesConfig.length > 0 ? parcialesConfig : [1, 2, 3];
  const totalParciales = parciales.length;

  const detalleMaterias = [];
  let sumaPromedios = 0;
  let materiasEvaluadas = 0;
  let reprobadas = 0;

  for (const m of materiasRes.rows) {
    const valoresPorParcial = parciales.map(
      p => califMap[m.materia_grupo_id]?.[p]?.calificacion ?? null
    );

    const parcialesPresentes = valoresPorParcial.filter(v => v !== null);
    let promedioOrdinario = null;
    let calificacionFinal = null;
    let acreditada = false;
    let estatusMateria = 'en_curso';

    if (totalParciales > 0 && parcialesPresentes.length === totalParciales) {
      promedioOrdinario = parcialesPresentes.reduce((a, b) => a + b, 0) / totalParciales;
      // Regla de acreditación CECyTE: < 6.0 no es aprobatorio
      if (promedioOrdinario >= 6.0) {
        calificacionFinal = Math.round(promedioOrdinario * 10) / 10;
        acreditada = true;
        estatusMateria = 'aprobada';
      } else {
        // Verificar si tiene extraordinario o recuperación
        const evalRecup = Object.values(califMap[m.materia_grupo_id] || {}).find(
          e => ['extraordinario', 'recuperacion'].includes(e.tipo_evaluacion)
        );

        if (evalRecup && evalRecup.calificacion >= 6.0) {
          calificacionFinal = evalRecup.calificacion;
          acreditada = true;
          estatusMateria = 'aprobada_regularizacion';
        } else {
          calificacionFinal = Math.floor(promedioOrdinario * 10) / 10;
          acreditada = false;
          estatusMateria = 'reprobada';
          reprobadas++;
        }
      }

      sumaPromedios += calificacionFinal;
      materiasEvaluadas++;
    } else {
      estatusMateria = 'parciales_incompletos';
    }

    detalleMaterias.push({
      materia_grupo_id: m.materia_grupo_id,
      nombre: m.materia_nombre,
      clave: m.clave,
      tipo: m.tipo,
      parciales: Object.fromEntries(parciales.map((p, i) => [p, valoresPorParcial[i]])),
      promedio_ordinario: promedioOrdinario ? Math.round(promedioOrdinario * 10) / 10 : null,
      calificacion_final: calificacionFinal,
      acreditada,
      estatus_materia: estatusMateria
    });
  }

  const promedioGeneral = materiasEvaluadas > 0 ? Math.round((sumaPromedios / materiasEvaluadas) * 10) / 10 : null;

  // Determinar condición académica según normativa CECyTE / DGETI:
  // - 0 materias reprobadas -> REGULAR
  // - 1 o 2 materias reprobadas -> IRREGULAR (puede reinscribirse con adeudo)
  // - 3 o más materias reprobadas -> NO PROMOVIDO (repite semestre / baja temporal)
  let condicion = 'regular';
  let elegibleReinscripcion = true;
  let motivoNoElegible = null;

  if (reprobadas === 0) {
    condicion = 'regular';
    elegibleReinscripcion = true;
  } else if (reprobadas <= 2) {
    condicion = 'irregular';
    elegibleReinscripcion = true; // Promoción condicional con adeudo
  } else {
    condicion = 'no_promovido';
    elegibleReinscripcion = false;
    motivoNoElegible = `El alumno adeuda ${reprobadas} materias. Supera el límite permitido (máximo 2) para avanzar al siguiente semestre.`;
  }

  // Si ya está en 6° semestre y acreditó todo -> Candidato a Egreso
  if (semestre === 6 && reprobadas === 0 && materiasEvaluadas === materiasRes.rows.length) {
    condicion = 'candidato_egreso';
    elegibleReinscripcion = false;
    motivoNoElegible = 'El alumno ha concluido satisfactoriamente el 6° semestre. Procede a trámite de egreso y titulación.';
  }

  return {
    alumno_id: alumnoId,
    ciclo_id: targetCicloId,
    semestre_evaluado: semestre,
    total_materias: materiasRes.rows.length,
    materias_evaluadas: materiasEvaluadas,
    materias_reprobadas: reprobadas,
    promedio_general: promedioGeneral,
    condicion,
    elegible_reinscripcion: elegibleReinscripcion,
    motivo_no_elegible: motivoNoElegible,
    materias: detalleMaterias
  };
};

// ============================================================
// ENDPOINT: MIS CALIFICACIONES (Portal del Alumno)
// ============================================================
export const misCalificaciones = async (req, res) => {
  try {
    const userId = req.user.id;

    const alumnoResult = await query(
      `SELECT a.id AS alumno_id, a.grupo_actual_id, a.semestre_actual, a.estatus
       FROM alumnos a
       WHERE a.usuario_id = $1`,
      [userId]
    );

    if (alumnoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
    }

    const { alumno_id, grupo_actual_id, semestre_actual } = alumnoResult.rows[0];

    if (!grupo_actual_id) {
      return res.status(400).json({ success: false, message: 'El alumno no tiene un grupo asignado actualmente.' });
    }

    // Calcular condición académica completa
    const resumen = await calcularCondicionAcademica(alumno_id);

    return res.json({
      success: true,
      alumno_id,
      semestre_actual,
      resumen_academico: resumen
    });
  } catch (error) {
    console.error('Error en misCalificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener calificaciones' });
  }
};

// ============================================================
// ENDPOINT: CALIFICACIONES POR MATERIA (Docente / Admin)
// ============================================================
export const calificacionesPorMateria = async (req, res) => {
  const { materia_grupo_id } = req.params;

  try {
    if (req.user.rol === 'docente') {
      const owns = await docenteOwnsMateriaGrupo(materia_grupo_id, req.user.id);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'Acceso denegado. No impartes esta materia.' });
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
         a.matricula,
         c.id AS calificacion_id,
         c.parcial,
         c.calificacion,
         c.tipo_evaluacion,
         c.calificacion_ordinaria_previa
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

// ============================================================
// ENDPOINT: REGISTRAR / GUARDAR CALIFICACIÓN ORDINARIA
// ============================================================
export const registrarCalificacion = async (req, res) => {
  const { alumno_id, materia_grupo_id, parcial, calificacion, tipo_evaluacion = 'ordinaria' } = req.body;

  if (!alumno_id || !materia_grupo_id || !parcial || calificacion === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos obligatorios: alumno_id, materia_grupo_id, parcial y calificacion son requeridos.',
    });
  }

  const parcialNum = parseInt(parcial, 10);
  const calNum = parseFloat(calificacion);

  if (![1, 2, 3].includes(parcialNum)) {
    return res.status(400).json({ success: false, message: 'El parcial debe ser 1, 2 o 3.' });
  }

  if (isNaN(calNum) || calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0.0 y 10.0.' });
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
      return res.status(400).json({ success: false, message: 'El alumno no existe.' });
    }

    if (!(await alumnoPerteneceAMateriaGrupo(alumno_id, materia_grupo_id))) {
      return res.status(400).json({
        success: false,
        message: 'El alumno no pertenece al grupo de esta materia en el ciclo correspondiente.',
      });
    }

    // Insertar o actualizar si ya existe para ese parcial
    const result = await query(
      `INSERT INTO calificaciones 
        (alumno_id, materia_grupo_id, ciclo_id, parcial, calificacion, tipo_evaluacion, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (alumno_id, materia_grupo_id, ciclo_id, parcial)
       DO UPDATE SET calificacion = EXCLUDED.calificacion,
                     tipo_evaluacion = EXCLUDED.tipo_evaluacion,
                     registrado_por = EXCLUDED.registrado_por,
                     fecha_registro = NOW()
       RETURNING *`,
      [alumno_id, materia_grupo_id, cicloId, parcialNum, calNum, tipo_evaluacion, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Calificación guardada correctamente.',
      calificacion: result.rows[0],
    });
  } catch (err) {
    console.error('Error en registrarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

// ============================================================
// ENDPOINT: REGISTRAR REGULARIZACIÓN (Extraordinario / Recuperación)
// ============================================================
export const registrarRegularizacion = async (req, res) => {
  const { alumno_id, materia_grupo_id, calificacion, tipo_evaluacion = 'extraordinario' } = req.body;

  if (!alumno_id || !materia_grupo_id || calificacion === undefined) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, materia_grupo_id y calificación son requeridos.',
    });
  }

  const calNum = parseFloat(calificacion);
  if (isNaN(calNum) || calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0.0 y 10.0.' });
  }

  if (!['extraordinario', 'recuperacion'].includes(tipo_evaluacion)) {
    return res.status(400).json({ success: false, message: 'El tipo debe ser extraordinario o recuperacion.' });
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

    // Obtener promedio ordinario previo
    const previas = await query(
      `SELECT calificacion FROM calificaciones
       WHERE alumno_id = $1 AND materia_grupo_id = $2 AND ciclo_id = $3 AND tipo_evaluacion = 'ordinaria'`,
      [alumno_id, materia_grupo_id, cicloId]
    );

    let promedioPrevio = null;
    if (previas.rows.length > 0) {
      const notas = previas.rows.map(r => parseFloat(r.calificacion));
      promedioPrevio = notas.reduce((a, b) => a + b, 0) / notas.length;
    }

    // Actualizar parcial 3 como registro de regularización de fin de curso
    const result = await query(
      `INSERT INTO calificaciones
        (alumno_id, materia_grupo_id, ciclo_id, parcial, calificacion, tipo_evaluacion, calificacion_ordinaria_previa, registrado_por)
       VALUES ($1, $2, $3, 3, $4, $5, $6, $7)
       ON CONFLICT (alumno_id, materia_grupo_id, ciclo_id, parcial)
       DO UPDATE SET calificacion = EXCLUDED.calificacion,
                     tipo_evaluacion = EXCLUDED.tipo_evaluacion,
                     calificacion_ordinaria_previa = COALESCE(calificaciones.calificacion, EXCLUDED.calificacion_ordinaria_previa),
                     registrado_por = EXCLUDED.registrado_por,
                     fecha_registro = NOW()
       RETURNING *`,
      [alumno_id, materia_grupo_id, cicloId, calNum, tipo_evaluacion, promedioPrevio, req.user.id]
    );

    // Actualizar estatus académico del alumno en la tabla alumnos
    const nuevaCondicion = await calcularCondicionAcademica(alumno_id, cicloId);
    if (nuevaCondicion) {
      const nuevoEstatus = nuevaCondicion.condicion === 'regular' ? 'activo' : 'irregular';
      await query('UPDATE alumnos SET estatus = $1 WHERE id = $2', [nuevoEstatus, alumno_id]);
    }

    return res.json({
      success: true,
      message: `Calificación de ${tipo_evaluacion} registrada correctamente.`,
      calificacion: result.rows[0],
      condicion_actualizada: nuevaCondicion
    });
  } catch (err) {
    console.error('Error en registrarRegularizacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

// ============================================================
// ENDPOINT: CONDICIÓN ACADÉMICA DE UN ALUMNO (Admin / Docente)
// ============================================================
export const getCondicionAcademica = async (req, res) => {
  const { alumno_id } = req.params;
  const { ciclo_id } = req.query;

  try {
    const condicion = await calcularCondicionAcademica(
      parseInt(alumno_id, 10),
      ciclo_id ? parseInt(ciclo_id, 10) : null
    );

    if (!condicion) {
      return res.status(404).json({ success: false, message: 'No se encontraron registros académicos para el alumno.' });
    }

    return res.json({ success: true, data: condicion });
  } catch (err) {
    console.error('Error en getCondicionAcademica:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

// ============================================================
// ENDPOINT: ACTUALIZAR CALIFICACIÓN INDIVIDUAL (con Auditoría)
// ============================================================
export const actualizarCalificacion = async (req, res) => {
  const { calificacion, motivo } = req.body;
  const { id } = req.params;

  const calNum = parseFloat(calificacion);
  if (isNaN(calNum) || calNum < 0 || calNum > 10) {
    return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0 y 10.' });
  }

  try {
    const calRow = await query(
      `SELECT c.id, c.materia_grupo_id, c.alumno_id, c.calificacion AS valor_anterior
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

    const valorAnterior = parseFloat(calRow.rows[0].valor_anterior);

    const result = await query(
      `UPDATE calificaciones SET calificacion = $1, registrado_por = $2, fecha_registro = NOW()
       WHERE id = $3 RETURNING *`,
      [calNum, req.user.id, id]
    );

    // Registrar en auditoría de calificaciones
    await query(
      `INSERT INTO auditoria_calificaciones (calificacion_id, valor_anterior, valor_nuevo, modificado_por, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, valorAnterior, calNum, req.user.id, motivo || 'Corrección de calificación']
    );

    return res.json({
      success: true,
      message: 'Calificación actualizada correctamente.',
      calificacion: result.rows[0],
    });
  } catch (err) {
    console.error('Error en actualizarCalificacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

// ============================================================
// PERIODOS DE EVALUACIÓN
// ============================================================
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
      `SELECT parcial, fecha_inicio, fecha_fin, tipo
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
