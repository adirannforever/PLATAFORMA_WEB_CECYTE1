import { query } from '../config/db.js';

// Obtener grupos con filtros
export const getGrupos = async (req, res) => {
  try {
    const { ciclo_id, semestre, especialidad_id, turno_id } = req.query;

    let sql = `
      SELECT g.id, g.nombre, g.semestre, g.letra,
             c.id AS ciclo_id, c.nombre AS ciclo_nombre,
             e.id AS especialidad_id, e.nombre AS especialidad_nombre,
             t.id AS turno_id, t.nombre AS turno_nombre,
             u.id AS tutor_id, u.nombre AS tutor_nombre, u.apellidos AS tutor_apellidos,
             g.activo
      FROM grupos g
      JOIN ciclos_escolares c ON g.ciclo_id = c.id
      JOIN especialidades e ON g.especialidad_id = e.id
      JOIN turnos t ON g.turno_id = t.id
      LEFT JOIN usuarios u ON g.tutor_id = u.id
      WHERE g.activo = TRUE
    `;
    const params = [];

    if (ciclo_id) { params.push(ciclo_id); sql += ` AND g.ciclo_id = $${params.length}`; }
    if (semestre) { params.push(semestre); sql += ` AND g.semestre = $${params.length}`; }
    if (especialidad_id) { params.push(especialidad_id); sql += ` AND g.especialidad_id = $${params.length}`; }
    if (turno_id) { params.push(turno_id); sql += ` AND g.turno_id = $${params.length}`; }

    sql += ` ORDER BY g.semestre, g.letra, t.nombre`;

    const result = await query(sql, params);
    return res.json({ success: true, grupos: result.rows });
  } catch (err) {
    console.error('Error en getGrupos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Obtener un grupo por ID (con detalles)
export const getGrupoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT g.id, g.nombre, g.semestre, g.letra,
              c.id AS ciclo_id, c.nombre AS ciclo_nombre,
              e.id AS especialidad_id, e.nombre AS especialidad_nombre,
              t.id AS turno_id, t.nombre AS turno_nombre,
              u.id AS tutor_id, u.nombre AS tutor_nombre, u.apellidos AS tutor_apellidos,
              g.activo
       FROM grupos g
       JOIN ciclos_escolares c ON g.ciclo_id = c.id
       JOIN especialidades e ON g.especialidad_id = e.id
       JOIN turnos t ON g.turno_id = t.id
       LEFT JOIN usuarios u ON g.tutor_id = u.id
       WHERE g.id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }
    return res.json({ success: true, grupo: result.rows[0] });
  } catch (err) {
    console.error('Error en getGrupoById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Obtener materias de un grupo
export const getMateriasDeGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT mg.id, mc.nombre AS materia_nombre, mc.clave, mc.semestre,
              u.id AS docente_id, u.nombre AS docente_nombre, u.apellidos AS docente_apellidos,
              mg.activa
       FROM materias_grupo mg
       JOIN materias_catalogo mc ON mg.materia_catalogo_id = mc.id
       JOIN usuarios u ON mg.docente_id = u.id
       WHERE mg.grupo_id = $1 AND mg.activa = TRUE
       ORDER BY mc.nombre`,
      [id]
    );
    return res.json({ success: true, materias: result.rows });
  } catch (err) {
    console.error('Error en getMateriasDeGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getMaterias = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        mg.id,
        mg.grupo_id,
        mg.materia_catalogo_id,
        mg.docente_id,
        mc.nombre AS materia_nombre,
        mc.clave AS clave,
        mc.semestre,
        mc.tipo,
        mc.horas_semana,
        u.nombre AS docente_nombre,
        u.apellidos AS docente_apellidos
      FROM materias_grupo mg
      JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
      LEFT JOIN usuarios u ON u.id = mg.docente_id
      WHERE mg.grupo_id = $1 AND mg.activa = TRUE`,
      [id]
    );

    // Formatear respuesta para que coincida con lo que espera el frontend
    const materias = result.rows.map(row => ({
      id: row.id,
      materia_grupo_id: row.id,
      materia_nombre: row.materia_nombre,
      nombre: row.materia_nombre,
      clave: row.clave,
      semestre: row.semestre,
      tipo: row.tipo,
      horas_semana: row.horas_semana,
      docente_id: row.docente_id,
      docente_nombre: row.docente_nombre,
      docente_apellidos: row.docente_apellidos,
      apellidos: row.docente_apellidos,
    }));

    return res.json({
      success: true,
      materias, //  El frontend espera 'materias'
    });
  } catch (err) {
    console.error('Error en getMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearGrupo = async (req, res) => {
  const { ciclo_id, especialidad_id, turno_id, semestre, letra, tutor_id } = req.body;
  const tutorYaAsignado = async (tutor_id, ciclo_id, grupo_id_excluir = null) => {
  let sql = `
    SELECT id FROM grupos 
    WHERE tutor_id = $1 AND ciclo_id = $2 AND id != COALESCE($3, 0)
  `;
  const params = [tutor_id, ciclo_id, grupo_id_excluir || 0];
  const result = await query(sql, params);
  return result.rows.length > 0;
        };

  // Validaciones básicas
  if (!ciclo_id || !especialidad_id || !turno_id || !semestre || !letra) {
    return res.status(400).json({
      success: false,
      message: 'Ciclo, especialidad, turno, semestre y letra son obligatorios.'
    });
  }

  if (semestre < 1 || semestre > 6) {
    return res.status(400).json({ success: false, message: 'Semestre debe ser 1-6.' });
  }

  if (!['A','B','C','D'].includes(letra.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Letra debe ser A, B, C o D.' });
  }

  try {
    // Verificar que no exista duplicado (mismo ciclo, semestre, letra, turno)
    const existe = await query(
      `SELECT id FROM grupos 
       WHERE ciclo_id = $1 AND semestre = $2 AND letra = $3 AND turno_id = $4`,
      [ciclo_id, semestre, letra.toUpperCase(), turno_id]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un grupo con esa combinación de ciclo, semestre, letra y turno.'
      });
    }

    const result = await query(
      `INSERT INTO grupos (ciclo_id, especialidad_id, turno_id, semestre, letra, tutor_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [ciclo_id, especialidad_id, turno_id, semestre, letra.toUpperCase(), tutor_id || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Grupo creado correctamente.',
      grupo: result.rows[0]
    });
  } catch (err) {
    console.error('Error en crearGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno al crear grupo.' });
  }
};

// Obtener alumnos de un grupo con su promedio global
export const getAlumnosDeGrupo = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener el ciclo_id del grupo
    const grupoInfo = await query('SELECT ciclo_id FROM grupos WHERE id = $1', [id]);
    if (!grupoInfo.rows[0]) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }
    const cicloId = grupoInfo.rows[0].ciclo_id;

    // Obtener alumnos desde historial_grupos_alumno
    const alumnosResult = await query(
      `SELECT a.id AS alumno_id, u.id AS usuario_id, u.nombre, u.apellidos,
              a.matricula, h.semestre
       FROM historial_grupos_alumno h
       JOIN alumnos a ON h.alumno_id = a.id
       JOIN usuarios u ON a.usuario_id = u.id
       WHERE h.grupo_id = $1 AND h.ciclo_id = $2 AND h.activo = TRUE
       ORDER BY u.apellidos, u.nombre`,
      [id, cicloId]
    );

    // Calcular promedio global para cada alumno (todas sus calificaciones ordinarias)
    const alumnosConPromedio = [];
    for (const alumno of alumnosResult.rows) {
      const calificaciones = await query(
        `SELECT calificacion
         FROM calificaciones
         WHERE alumno_id = $1 AND tipo_evaluacion = 'ordinaria'
         ORDER BY parcial`,
        [alumno.alumno_id]
      );
      const notas = calificaciones.rows.map(r => parseFloat(r.calificacion));
      let promedio = 0;
      if (notas.length > 0) {
        promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
      }
      alumnosConPromedio.push({
        ...alumno,
        promedio: promedio
      });
    }

    return res.json({ success: true, alumnos: alumnosConPromedio });
  } catch (err) {
    console.error('Error en getAlumnosDeGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarGrupo = async (req, res) => {
  const { id } = req.params;
  const { ciclo_id, especialidad_id, turno_id, semestre, letra, tutor_id, activo } = req.body;
  const tutorYaAsignado = async (tutor_id, ciclo_id, grupo_id_excluir = null) => {
  let sql = `
    SELECT id FROM grupos 
    WHERE tutor_id = $1 AND ciclo_id = $2 AND id != COALESCE($3, 0)
  `;
  const params = [tutor_id, ciclo_id, grupo_id_excluir || 0];
  const result = await query(sql, params);
  return result.rows.length > 0;
    };

  // Validaciones básicas
  if (!ciclo_id && !especialidad_id && !turno_id && !semestre && !letra && tutor_id === undefined && activo === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Al menos un campo debe ser actualizado.'
    });
  }

  // Validar semestre si viene
  if (semestre !== undefined && (semestre < 1 || semestre > 6)) {
    return res.status(400).json({ success: false, message: 'Semestre debe ser 1-6.' });
  }

  // Validar letra si viene
  if (letra !== undefined && !['A','B','C','D'].includes(letra.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Letra debe ser A, B, C o D.' });
  }

  try {
    // Verificar que el grupo existe
    const grupoActual = await query('SELECT * FROM grupos WHERE id = $1', [id]);
    if (!grupoActual.rows[0]) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
    }

    // Si se actualiza combinación que podría causar duplicado, verificar
    const nuevoCiclo = ciclo_id || grupoActual.rows[0].ciclo_id;
    const nuevoSemestre = semestre !== undefined ? semestre : grupoActual.rows[0].semestre;
    const nuevaLetra = letra ? letra.toUpperCase() : grupoActual.rows[0].letra;
    const nuevoTurno = turno_id || grupoActual.rows[0].turno_id;

    // Verificar duplicado (excluyendo el propio grupo)
    const duplicado = await query(
      `SELECT id FROM grupos 
       WHERE ciclo_id = $1 AND semestre = $2 AND letra = $3 AND turno_id = $4 AND id != $5`,
      [nuevoCiclo, nuevoSemestre, nuevaLetra, nuevoTurno, id]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro grupo con esa combinación de ciclo, semestre, letra y turno.'
      });
    }
    // Validar que el tutor no esté ya asignado a otro grupo en el mismo ciclo
    if (tutor_id) {
        const yaAsignado = await tutorYaAsignado(tutor_id, ciclo_id);
        if (yaAsignado) {
            return res.status(400).json({
            success: false,
            message: 'Este tutor ya está asignado a otro grupo en el mismo ciclo escolar.'
            });
        }
        }

    // Construir SET dinámico
    const fields = [];
    const values = [];
    let idx = 1;

    if (ciclo_id !== undefined) { fields.push(`ciclo_id = $${idx++}`); values.push(ciclo_id); }
    if (especialidad_id !== undefined) { fields.push(`especialidad_id = $${idx++}`); values.push(especialidad_id); }
    if (turno_id !== undefined) { fields.push(`turno_id = $${idx++}`); values.push(turno_id); }
    if (semestre !== undefined) { fields.push(`semestre = $${idx++}`); values.push(semestre); }
    if (letra !== undefined) { fields.push(`letra = $${idx++}`); values.push(letra.toUpperCase()); }
    if (tutor_id !== undefined) { fields.push(`tutor_id = $${idx++}`); values.push(tutor_id || null); }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }
    if (tutor_id !== undefined || ciclo_id !== undefined) {
    const tutorIdFinal = tutor_id !== undefined ? tutor_id : grupoActual.tutor_id;
    const cicloIdFinal = ciclo_id !== undefined ? ciclo_id : grupoActual.ciclo_id;
  
  if (tutorIdFinal) {
            const yaAsignado = await tutorYaAsignado(tutorIdFinal, cicloIdFinal, id);
            if (yaAsignado) {
            return res.status(400).json({
                success: false,
                message: 'Este tutor ya está asignado a otro grupo en el mismo ciclo escolar.'
            });
            }
        }
        }
    values.push(id);
    const sql = `UPDATE grupos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const result = await query(sql, values);
    return res.json({
      success: true,
      message: 'Grupo actualizado correctamente.',
      grupo: result.rows[0]
    });
  } catch (err) {
    console.error('Error en actualizarGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar grupo.' });
  }
};
export const asignarMaterias = async (req, res) => {
  const { id } = req.params;
  const { materias_ids } = req.body;

  if (!materias_ids || !Array.isArray(materias_ids) || materias_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Se requiere un array de IDs de materias' });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const grupoRes = await query('SELECT ciclo_id FROM grupos WHERE id = $1', [id]);
    if (!grupoRes.rows[0]) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }
    const { ciclo_id } = grupoRes.rows[0];

    await query('BEGIN');

    let asignadas = 0;
    for (const materia_id of materias_ids) {
      const existente = await query(
        'SELECT id FROM materias_grupo WHERE grupo_id = $1 AND materia_catalogo_id = $2 AND ciclo_id = $3',
        [id, materia_id, ciclo_id]
      );
      if (existente.rows.length === 0) {
        await query(
          `INSERT INTO materias_grupo (grupo_id, materia_catalogo_id, docente_id, ciclo_id, activa)
           VALUES ($1, $2, NULL, $3, TRUE)`, // ✅ docente_id = NULL
          [id, materia_id, ciclo_id]
        );
        asignadas++;
      }
    }

    await query('COMMIT');
    return res.json({
      success: true,
      message: `${asignadas} materia(s) asignadas correctamente`,
      asignadas,
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error en asignarMaterias:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};