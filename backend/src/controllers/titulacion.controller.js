import { query } from '../config/db.js';

async function generarNumerosTitulacion() {
  const year = new Date().getFullYear();
  const tituloResult = await query(
    `SELECT numero_titulo FROM titulacion 
     WHERE numero_titulo LIKE $1 
     ORDER BY numero_titulo DESC LIMIT 1`,
    [`CECYTE-${year}-%`]
  );
  let nextTitulo = 1;
  if (tituloResult.rows.length > 0) {
    const last = tituloResult.rows[0].numero_titulo;
    const parts = last.split('-');
    const num = parseInt(parts[2], 10);
    if (!isNaN(num)) nextTitulo = num + 1;
  }
  const numero_titulo = `CECYTE-${year}-${String(nextTitulo).padStart(4, '0')}`;

  const cedulaResult = await query(
    `SELECT cedula_profesional FROM titulacion 
     WHERE cedula_profesional LIKE $1 
     ORDER BY cedula_profesional DESC LIMIT 1`,
    [`CED-${year}-%`]
  );
  let nextCedula = 1;
  if (cedulaResult.rows.length > 0) {
    const last = cedulaResult.rows[0].cedula_profesional;
    const parts = last.split('-');
    const num = parseInt(parts[2], 10);
    if (!isNaN(num)) nextCedula = num + 1;
  }
  const cedula_profesional = `CED-${year}-${String(nextCedula).padStart(4, '0')}`;
  return { numero_titulo, cedula_profesional };
}

export const obtenerTitulaciones = async (req, res) => {
  try {
    const {
      search,
      estatus,
      alumno_id,
      grupo_id,
      especialidad_id,
      turno_id,
      semestre,
      grupo_letra,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let sql = `
      SELECT 
        t.*,
        a.matricula,
        u.nombre, u.apellidos, u.email,
        u2.nombre || ' ' || u2.apellidos AS autorizado_por_nombre,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra,
        g.semestre AS grupo_semestre,
        e.nombre AS especialidad_nombre,
        turn.nombre AS turno_nombre,
        EXISTS (
          SELECT 1 FROM servicio_social_practicas ss
          WHERE ss.alumno_id = a.id 
            AND ss.tipo = 'servicio_social' 
            AND ss.estatus = 'liberado'
        ) AS servicio_social_completado,
        EXISTS (
          SELECT 1 FROM servicio_social_practicas ss
          WHERE ss.alumno_id = a.id 
            AND ss.tipo = 'practicas_profesionales' 
            AND ss.estatus = 'liberado'
        ) AS practicas_profesionales_completadas
      FROM titulacion t
      JOIN alumnos a ON a.id = t.alumno_id
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN usuarios u2 ON u2.id = t.autorizado_por
      LEFT JOIN grupos g ON g.id = a.grupo_actual_id
      LEFT JOIN especialidades e ON e.id = a.especialidad_id
      LEFT JOIN turnos turn ON turn.id = g.turno_id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (req.user.rol === 'alumno') {
      conditions.push(`a.usuario_id = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (alumno_id) {
      conditions.push(`t.alumno_id = $${params.length + 1}`);
      params.push(alumno_id);
    }
    if (estatus) {
      conditions.push(`t.estatus = $${params.length + 1}`);
      params.push(estatus);
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(`(u.nombre ILIKE $${params.length + 1} OR u.apellidos ILIKE $${params.length + 1} OR a.matricula ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (grupo_id) {
      conditions.push(`a.grupo_actual_id = $${params.length + 1}`);
      params.push(grupo_id);
    }
    if (especialidad_id) {
      conditions.push(`a.especialidad_id = $${params.length + 1}`);
      params.push(especialidad_id);
    }
    if (turno_id) {
      conditions.push(`g.turno_id = $${params.length + 1}`);
      params.push(turno_id);
    }
    if (semestre && semestre !== '') {
      const semestreNum = parseInt(semestre, 10);
      if (!isNaN(semestreNum) && semestreNum >= 1 && semestreNum <= 6) {
        conditions.push(`g.semestre = $${params.length + 1}`);
        params.push(semestreNum);
      }
    }
    if (grupo_letra) {
      conditions.push(`g.letra = $${params.length + 1}`);
      params.push(grupo_letra);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    const countSql = sql.replace(/SELECT .+? FROM /, 'SELECT COUNT(*) as total FROM ');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    sql += ' ORDER BY t.fecha_registro DESC';
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    console.error('Error en obtenerTitulaciones:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener titulaciones.',
      error: err.message
    });
  }
};

export const registrarTitulacion = async (req, res) => {
  const { alumno_id, opcion_titulacion, estatus, fecha_examen, numero_titulo, cedula_profesional, observaciones } = req.body;
  if (!alumno_id || !opcion_titulacion) {
    return res.status(400).json({ success: false, message: 'alumno_id y opcion_titulacion son requeridos.' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    const alumnoResult = await query(`SELECT semestre_actual FROM alumnos WHERE id = $1`, [alumno_id]);
    if (!alumnoResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }
    if (alumnoResult.rows[0].semestre_actual !== 6) {
      return res.status(400).json({
        success: false,
        message: `El alumno debe estar en sexto semestre (actual: ${alumnoResult.rows[0].semestre_actual}°) para titularse.`
      });
    }
    const existing = await query(`SELECT id FROM titulacion WHERE alumno_id = $1`, [alumno_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Este alumno ya tiene un registro de titulación.' });
    }
    const ssResult = await query(`SELECT estatus FROM servicio_social_practicas WHERE alumno_id = $1 AND tipo = 'servicio_social'`, [alumno_id]);
    const ssLiberado = ssResult.rows[0]?.estatus === 'liberado';
    const ppResult = await query(`SELECT estatus FROM servicio_social_practicas WHERE alumno_id = $1 AND tipo = 'practicas_profesionales'`, [alumno_id]);
    const ppLiberado = ppResult.rows[0]?.estatus === 'liberado';
    let advertencia = '';
    if (!ssLiberado) advertencia += 'El alumno no tiene Servicio Social liberado. ';
    if (!ppLiberado) advertencia += 'El alumno no tiene Prácticas Profesionales liberadas. ';

    let finalNumeroTitulo = numero_titulo || null;
    let finalCedula = cedula_profesional || null;
    if (estatus === 'titulado') {
      if (!finalNumeroTitulo || !finalCedula) {
        const generados = await generarNumerosTitulacion();
        if (!finalNumeroTitulo) finalNumeroTitulo = generados.numero_titulo;
        if (!finalCedula) finalCedula = generados.cedula_profesional;
      }
    }
    const result = await query(
      `INSERT INTO titulacion (alumno_id, opcion_titulacion, estatus, fecha_examen, numero_titulo, cedula_profesional, observaciones, autorizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [alumno_id, opcion_titulacion, estatus || 'en_proceso', fecha_examen || null, finalNumeroTitulo, finalCedula, observaciones || null, req.user.id]
    );
    return res.status(201).json({
      success: true,
      message: advertencia ? `Registro creado con advertencias: ${advertencia}` : 'Registro de titulación creado exitosamente.',
      data: result.rows[0],
      advertencia: advertencia || null,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'El número de título o cédula profesional ya está registrado.' });
    }
    console.error('Error en registrarTitulacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarTitulacion = async (req, res) => {
  const { id } = req.params;
  const {
    opcion_titulacion,
    estatus,
    fecha_examen,
    numero_titulo,
    cedula_profesional,
    observaciones
  } = req.body;

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const current = await query('SELECT * FROM titulacion WHERE id = $1', [id]);
    if (!current.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }

    let finalNumeroTitulo = numero_titulo !== undefined ? numero_titulo : current.rows[0].numero_titulo;
    let finalCedula = cedula_profesional !== undefined ? cedula_profesional : current.rows[0].cedula_profesional;
    if (estatus === 'titulado') {
      if (!finalNumeroTitulo || !finalCedula) {
        const generados = await generarNumerosTitulacion();
        if (!finalNumeroTitulo) finalNumeroTitulo = generados.numero_titulo;
        if (!finalCedula) finalCedula = generados.cedula_profesional;
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (opcion_titulacion !== undefined) {
      fields.push(`opcion_titulacion = $${idx++}`);
      values.push(opcion_titulacion);
    }
    if (estatus !== undefined) {
      fields.push(`estatus = $${idx++}`);
      values.push(estatus);
    }
    if (fecha_examen !== undefined) {
      fields.push(`fecha_examen = $${idx++}`);
      values.push(fecha_examen);
    }
    if (finalNumeroTitulo !== undefined) {
      fields.push(`numero_titulo = $${idx++}`);
      values.push(finalNumeroTitulo);
    }
    if (finalCedula !== undefined) {
      fields.push(`cedula_profesional = $${idx++}`);
      values.push(finalCedula);
    }
    if (observaciones !== undefined) {
      fields.push(`observaciones = $${idx++}`);
      values.push(observaciones);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    fields.push(`autorizado_por = $${idx++}`);
    values.push(req.user.id);
    values.push(id);

    const sql = `UPDATE titulacion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Registro actualizado correctamente.',
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El número de título o cédula profesional ya está registrado.',
      });
    }
    console.error('Error en actualizarTitulacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const eliminarTitulacion = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    const result = await query('DELETE FROM titulacion WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }
    return res.json({ success: true, message: 'Registro eliminado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarTitulacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};