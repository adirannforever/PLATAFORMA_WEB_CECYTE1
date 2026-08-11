import { query } from '../config/db.js';

// ============================================================
// HELPERS: Validaciones basadas en reglamento
// ============================================================

const validarRequisitosPrevios = async (alumno_id, tipo) => {
  // Verificar que el alumno tenga 4° semestre aprobado
  const result = await query(
    `SELECT semestre_actual, id 
     FROM alumnos 
     WHERE id = $1`,
    [alumno_id]
  );
  if (!result.rows[0]) {
    throw new Error('Alumno no encontrado.');
  }
  const semestre = result.rows[0].semestre_actual;
  
  if (tipo === 'servicio_social' && semestre < 5) {
    throw new Error('El alumno debe estar en 5° semestre para realizar Servicio Social.');
  }
  if (tipo === 'practicas_profesionales') {
    if (semestre < 5) {
      throw new Error('El alumno debe estar en 5° semestre para realizar Prácticas Profesionales.');
    }
    // Si está en 6° semestre, es extemporáneo (permitido)
  }
  return semestre;
};

const obtenerNumeroReportes = (tipo) => {
  return tipo === 'servicio_social' ? 3 : 2; // 3 bimestrales vs 2
};

const obtenerHorasTotales = (tipo) => {
  return tipo === 'servicio_social' ? 480 : 240;
};

const obtenerFechasDefecto = (tipo, fecha_inicio = null) => {
  // Si no se proporciona fecha_inicio, usar la fecha actual (inicio de clases)
  const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
  const fin = new Date(inicio);
  if (tipo === 'servicio_social') {
    fin.setMonth(fin.getMonth() + 6); // 6 meses exactos
  } else {
    // Prácticas: 4 meses (ordinario) o 6 meses (extemporáneo, lo dejamos flexible)
    fin.setMonth(fin.getMonth() + 4);
  }
  return {
    fecha_inicio: inicio.toISOString().split('T')[0],
    fecha_fin: fin.toISOString().split('T')[0],
  };
};

// ============================================================
// CREAR REPORTES (bimestrales para servicio social, 2 para prácticas)
// ============================================================
const crearReportes = async (servicio_social_id, tipo, fecha_inicio, fecha_fin) => {
  const totalReportes = tipo === 'servicio_social' ? 3 : 2;
  const intervalos = [];
  
  const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
  const fin = fecha_fin ? new Date(fecha_fin) : new Date(inicio);
  fin.setMonth(fin.getMonth() + (tipo === 'servicio_social' ? 6 : 4));
  
  if (isNaN(inicio.getTime())) {
    console.warn('️ fecha_inicio inválida, usando fecha actual');
    const now = new Date();
    inicio.setTime(now.getTime());
    fin.setTime(now.getTime());
    fin.setMonth(fin.getMonth() + (tipo === 'servicio_social' ? 6 : 4));
  }
  
  const diff = (fin - inicio) / (totalReportes + 1);
  for (let i = 1; i <= totalReportes; i++) {
    const fechaLimite = new Date(inicio);
    fechaLimite.setDate(fechaLimite.getDate() + diff * i);
    intervalos.push(fechaLimite.toISOString().split('T')[0]);
  }

  for (let i = 0; i < totalReportes; i++) {
    const num = i + 1;
    await query(
      `INSERT INTO servicio_social_reportes (servicio_social_id, numero, fecha_limite)
       VALUES ($1, $2, $3)`,
      [servicio_social_id, num, intervalos[i] || null]
    );
  }
};

const actualizarEstadoCompletado = async (servicio_social_id) => {
  const reportes = await query(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN entregado THEN 1 ELSE 0 END) AS entregados
     FROM servicio_social_reportes WHERE servicio_social_id = $1`,
    [servicio_social_id]
  );
  const { total, entregados } = reportes.rows[0];
  const totalNum = parseInt(total);
  const entregadosNum = parseInt(entregados);
  
  if (totalNum === 0) return;
  
  const tipoResult = await query(
    `SELECT tipo FROM servicio_social_practicas WHERE id = $1`,
    [servicio_social_id]
  );
  const tipo = tipoResult.rows[0]?.tipo;
  const horasTotales = tipo === 'servicio_social' ? 480 : 240;
  
  if (entregadosNum === totalNum) {
    // Completado -> liberado
    await query(
      `UPDATE servicio_social_practicas
       SET estatus = 'liberado', horas_acumuladas = $1
       WHERE id = $2`,
      [horasTotales, servicio_social_id]
    );
  } else {
    // No completado -> en_proceso
    await query(
      `UPDATE servicio_social_practicas
       SET estatus = 'en_proceso', horas_acumuladas = 0
       WHERE id = $1 AND estatus != 'reprobado'`,
      [servicio_social_id]
    );
  }
};

// ============================================================
// OBTENER REGISTROS
// ============================================================
export const obtenerServicioSocial = async (req, res) => {
  try {
    const { alumno_id, tipo, estatus, search } = req.query;

    let sql = `
      SELECT ss.*,
             u.nombre || ' ' || u.apellidos AS alumno_nombre,
             a.matricula,
             u2.nombre || ' ' || u2.apellidos AS registrado_por_nombre,
             a.semestre_actual,
             (SELECT COUNT(*) FROM servicio_social_reportes WHERE servicio_social_id = ss.id) AS total_reportes,
             (SELECT COUNT(*) FROM servicio_social_reportes WHERE servicio_social_id = ss.id AND entregado = TRUE) AS reportes_entregados
      FROM servicio_social_practicas ss
      JOIN alumnos a ON a.id = ss.alumno_id
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN usuarios u2 ON u2.id = ss.registrado_por
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (alumno_id) {
      conditions.push(`ss.alumno_id = $${params.length + 1}`);
      params.push(alumno_id);
    }
    if (tipo) {
      conditions.push(`ss.tipo = $${params.length + 1}`);
      params.push(tipo);
    }
    if (estatus) {
      conditions.push(`ss.estatus = $${params.length + 1}`);
      params.push(estatus);
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(`(u.nombre ILIKE $${params.length + 1} OR u.apellidos ILIKE $${params.length + 1} OR a.matricula ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ss.fecha_registro DESC';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en obtenerServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// OBTENER REPORTES
// ============================================================
export const obtenerReportes = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM servicio_social_reportes WHERE servicio_social_id = $1 ORDER BY numero`,
      [id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en obtenerReportes:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// TOGGLE REPORTE
// ============================================================
export const toggleReporte = async (req, res) => {
  const { id } = req.params;
  const { entregado } = req.body;

  try {
    const result = await query(
      `UPDATE servicio_social_reportes
       SET entregado = $1, fecha_entrega = CASE WHEN $1 THEN CURRENT_DATE ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [entregado, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });
    }

    const ssId = result.rows[0].servicio_social_id;
    await actualizarEstadoCompletado(ssId);

    return res.json({
      success: true,
      message: `Reporte marcado como ${entregado ? 'entregado' : 'pendiente'}.`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error en toggleReporte:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// REGISTRAR SERVICIO SOCIAL (con reglas reales)
// ============================================================
export const registrarServicioSocial = async (req, res) => {
  const {
    alumno_id,
    tipo,
    institucion_empresa,
    asesor_externo,
    tipo_institucion,
    tiene_convenio,
    autorizacion_tutor,
    fecha_inicio,
    fecha_fin,
    observaciones,
  } = req.body;

  if (!alumno_id || !tipo || !institucion_empresa) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, tipo e institucion_empresa son requeridos.',
    });
  }

  const tiposValidos = ['servicio_social', 'practicas_profesionales'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({
      success: false,
      message: `Tipo inválido. Valores permitidos: ${tiposValidos.join(', ')}`,
    });
  }

  // Validar tipo de institución según reglamento
  if (tipo === 'servicio_social') {
    if (!['gubernamental', 'publica'].includes(tipo_institucion)) {
      return res.status(400).json({
        success: false,
        message: 'El Servicio Social solo puede realizarse en instituciones gubernamentales o públicas.',
      });
    }
    if (tiene_convenio) {
      return res.status(400).json({
        success: false,
        message: 'El Servicio Social NO requiere convenio. Elimina el campo "tiene_convenio".',
      });
    }
  } else {
    // Prácticas profesionales
    if (tipo_institucion !== 'privada_convenio') {
      return res.status(400).json({
        success: false,
        message: 'Las Prácticas Profesionales requieren una empresa privada con convenio.',
      });
    }
    if (!tiene_convenio) {
      return res.status(400).json({
        success: false,
        message: 'La empresa debe tener un convenio vigente con el colegio.',
      });
    }
  }

  try {
    // Validar requisitos previos
    const semestre = await validarRequisitosPrevios(alumno_id, tipo);

    // Fechas por defecto si no se proporcionan
    let fechas = {};
    if (!fecha_inicio) {
      fechas = obtenerFechasDefecto(tipo);
      const fechaInicio = fecha_inicio || fechas.fecha_inicio;
      const fechaFin = fecha_fin || fechas.fecha_fin;
    } else {
      fechas = { fecha_inicio, fecha_fin };
    }

    // Establecer estatus automático
    const estatusInicial = 'en_proceso';

    const result = await query(
      `INSERT INTO servicio_social_practicas
        (alumno_id, tipo, institucion_empresa, asesor_externo, tipo_institucion,
         tiene_convenio, autorizacion_tutor, estatus, semestre_requerido,
         fecha_inicio, fecha_fin, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        alumno_id,
        tipo,
        institucion_empresa,
        asesor_externo || null,
        tipo_institucion || null,
        tiene_convenio || false,
        autorizacion_tutor || false,
        estatusInicial,
        semestre,
        fechas.fecha_inicio || null,
        fechas.fecha_fin || null,
        observaciones || null,
        req.user.id,
      ]
    );

    const nuevoRegistro = result.rows[0];
    await crearReportes(nuevoRegistro.id, tipo, fechas.fecha_inicio, fechas.fecha_fin);

    return res.status(201).json({
      success: true,
      message: `Registro de ${tipo === 'servicio_social' ? 'Servicio Social' : 'Prácticas Profesionales'} creado correctamente.`,
      data: nuevoRegistro,
    });
  } catch (err) {
    if (err.message.includes('semestre')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('Error en registrarServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ACTUALIZAR SERVICIO SOCIAL
// ============================================================
export const actualizarServicioSocial = async (req, res) => {
  const { id } = req.params;
  const {
    institucion_empresa,
    asesor_externo,
    tipo_institucion,
    tiene_convenio,
    autorizacion_tutor,
    estatus,
    fecha_inicio,
    fecha_fin,
    observaciones,
  } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (institucion_empresa !== undefined) {
      fields.push(`institucion_empresa = $${idx++}`);
      values.push(institucion_empresa);
    }
    if (asesor_externo !== undefined) {
      fields.push(`asesor_externo = $${idx++}`);
      values.push(asesor_externo);
    }
    if (tipo_institucion !== undefined) {
      fields.push(`tipo_institucion = $${idx++}`);
      values.push(tipo_institucion);
    }
    if (tiene_convenio !== undefined) {
      fields.push(`tiene_convenio = $${idx++}`);
      values.push(tiene_convenio);
    }
    if (autorizacion_tutor !== undefined) {
      fields.push(`autorizacion_tutor = $${idx++}`);
      values.push(autorizacion_tutor);
    }
    if (estatus !== undefined) {
      fields.push(`estatus = $${idx++}`);
      values.push(estatus);
    }
    if (fecha_inicio !== undefined) {
      fields.push(`fecha_inicio = $${idx++}`);
      values.push(fecha_inicio);
    }
    if (fecha_fin !== undefined) {
      fields.push(`fecha_fin = $${idx++}`);
      values.push(fecha_fin);
    }
    if (observaciones !== undefined) {
      fields.push(`observaciones = $${idx++}`);
      values.push(observaciones);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    values.push(id);
    const sql = `UPDATE servicio_social_practicas SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
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
    console.error('Error en actualizarServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ELIMINAR
// ============================================================
export const eliminarServicioSocial = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM servicio_social_practicas WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }
    return res.json({ success: true, message: 'Registro eliminado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};