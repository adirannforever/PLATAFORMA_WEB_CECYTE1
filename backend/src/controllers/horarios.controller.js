import { query } from '../config/db.js';
import { generateUploadUrl, generateDownloadUrl } from '../services/s3.service.js';

// ============================================================
// CONFIGURACIÓN GLOBAL
// ============================================================
export const getConfiguracion = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, duracion_bloque_minutos, hora_inicio_turno, hora_fin_turno,
              receso_inicio, receso_fin, receso_bloqueado, dias_semana
       FROM configuracion_horarios
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      const defaultConfig = await query(
        `INSERT INTO configuracion_horarios 
         (duracion_bloque_minutos, hora_inicio_turno, hora_fin_turno, 
          receso_inicio, receso_fin, receso_bloqueado, dias_semana)
         VALUES (50, '07:00', '13:00', '09:30', '10:00', false, ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes'])
         RETURNING *`
      );
      return res.json({ success: true, data: defaultConfig.rows[0] });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en getConfiguracion:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarConfiguracion = async (req, res) => {
  try {
    const {
      duracion_bloque_minutos,
      hora_inicio_turno,
      hora_fin_turno,
      receso_inicio,
      receso_fin,
      receso_bloqueado,
      dias_semana,
    } = req.body;

    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const result = await query(
      `UPDATE configuracion_horarios
       SET duracion_bloque_minutos = COALESCE($1, duracion_bloque_minutos),
           hora_inicio_turno = COALESCE($2, hora_inicio_turno),
           hora_fin_turno = COALESCE($3, hora_fin_turno),
           receso_inicio = COALESCE($4, receso_inicio),
           receso_fin = COALESCE($5, receso_fin),
           receso_bloqueado = COALESCE($6, receso_bloqueado),
           dias_semana = COALESCE($7, dias_semana)
       WHERE id = (SELECT id FROM configuracion_horarios LIMIT 1)
       RETURNING *`,
      [
        duracion_bloque_minutos,
        hora_inicio_turno,
        hora_fin_turno,
        receso_inicio,
        receso_fin,
        receso_bloqueado,
        dias_semana,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarConfiguracion:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// SEMESTRE ACTUAL
// ============================================================
export const getSemestreActual = (req, res) => {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  if (mes >= 1 && mes <= 6) {
    return res.json({ success: true, data: { semestres: [2, 4, 6] } });
  } else {
    return res.json({ success: true, data: { semestres: [1, 3, 5] } });
  }
};

// ============================================================
// LISTAR HORARIOS CON FILTROS
// ============================================================
export const listarHorarios = async (req, res) => {
  try {
    const {
      ciclo_id,
      semestre,
      tipo,
      especialidad_id,
      turno_id,
      grupo_letra,
      search,
    } = req.query;

    let sql = `
      SELECT 
        ha.id,
        ha.nombre,
        ha.key,
        ha.fecha,
        ha.semestre,
        ha.tipo_horario,
        ha.descripcion,
        ha.grupo_id,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra,
        g.semestre AS grupo_semestre,
        e.nombre AS especialidad_nombre,
        e.id AS especialidad_id,
        t.nombre AS turno_nombre,
        t.id AS turno_id,
        c.nombre AS ciclo_nombre,
        c.id AS ciclo_id,
        u.nombre AS usuario_nombre,
        u.apellidos AS usuario_apellidos
      FROM horario_archivos ha
      LEFT JOIN grupos g ON g.id = ha.grupo_id
      LEFT JOIN especialidades e ON e.id = ha.especialidad_id
      LEFT JOIN turnos t ON t.id = ha.turno_id
      LEFT JOIN ciclos_escolares c ON c.id = ha.ciclo_id
      LEFT JOIN usuarios u ON u.id = ha.subido_por
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (ciclo_id) {
      conditions.push(`ha.ciclo_id = $${params.length + 1}`);
      params.push(ciclo_id);
    }
    if (semestre) {
      conditions.push(`ha.semestre = $${params.length + 1}`);
      params.push(semestre);
    }
    if (tipo) {
      conditions.push(`ha.tipo_horario = $${params.length + 1}`);
      params.push(tipo);
    }
    if (especialidad_id) {
      conditions.push(`ha.especialidad_id = $${params.length + 1}`);
      params.push(especialidad_id);
    }
    if (turno_id) {
      conditions.push(`ha.turno_id = $${params.length + 1}`);
      params.push(turno_id);
    }
    if (grupo_letra) {
      conditions.push(`g.letra = $${params.length + 1}`);
      params.push(grupo_letra.toUpperCase());
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(`(ha.nombre ILIKE $${params.length + 1} OR g.nombre ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY ha.fecha DESC';

    const result = await query(sql, params);
    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error en listarHorarios:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// CONTAR HORARIOS FALTANTES
// ============================================================
export const contarHorariosFaltantes = async (req, res) => {
  try {
    const { ciclo_id, semestre } = req.query;
    if (!ciclo_id || !semestre) {
      return res.status(400).json({ success: false, message: 'ciclo_id y semestre son requeridos' });
    }

    const gruposResult = await query(
      `SELECT COUNT(*) as total FROM grupos WHERE ciclo_id = $1 AND semestre = $2 AND activo = TRUE`,
      [ciclo_id, semestre]
    );
    const totalGrupos = parseInt(gruposResult.rows[0]?.total || 0);

    const subidosResult = await query(
      `SELECT COUNT(DISTINCT grupo_id) as subidos FROM horario_archivos 
       WHERE ciclo_id = $1 AND semestre = $2 AND tipo_horario = 'grupo'`,
      [ciclo_id, semestre]
    );
    const subidos = parseInt(subidosResult.rows[0]?.subidos || 0);

    const faltantes = Math.max(0, totalGrupos - subidos);

    return res.json({
      success: true,
      data: {
        total: totalGrupos,
        subidos,
        faltantes,
        porcentaje: totalGrupos > 0 ? Math.round((subidos / totalGrupos) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('Error en contarHorariosFaltantes:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// SOLICITAR UPLOAD (INDIVIDUAL)
// ============================================================
export const solicitarUploadHorario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const {
      nombre,
      tipo,
      grupo_id,
      semestre,
      ciclo_id,
      especialidad_id,
      turno_id,
      tipo_horario,
      descripcion,
    } = req.body;

    if (!nombre || !tipo || !grupo_id || !semestre || !ciclo_id || !turno_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, tipo, grupo_id, semestre, ciclo_id, turno_id',
      });
    }

    const tiposValidosMIME = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposValidosMIME.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Formato no permitido. Solo PDF o Excel' });
    }

    // Validar tipo_horario
    const tiposHorarioValidos = ['grupo', 'maestro', 'laboratorio'];
    const tipoHorarioFinal = tiposHorarioValidos.includes(tipo_horario) ? tipo_horario : 'grupo';

    const { url, key } = await generateUploadUrl(nombre, tipo);

    await query(
      `INSERT INTO horario_archivos 
       (nombre, key, tipo, grupo_id, semestre, ciclo_id, especialidad_id, turno_id, tipo_horario, descripcion, subido_por, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        nombre,
        key,
        tipo,
        grupo_id,
        semestre,
        ciclo_id,
        especialidad_id || null,
        turno_id,
        tipoHorarioFinal,
        descripcion || null,
        req.user.id,
      ]
    );

    return res.json({
      success: true,
      data: {
        uploadUrl: url,
        key,
        expiresIn: 300,
      },
    });
  } catch (err) {
    console.error('Error en solicitarUploadHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// ACTUALIZAR HORARIO
// ============================================================
export const actualizarHorario = async (req, res) => {
  const { id } = req.params;
  const {
    grupo_id,
    semestre,
    ciclo_id,
    especialidad_id,
    turno_id,
    tipo_horario,
    descripcion,
  } = req.body;

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (grupo_id !== undefined) { fields.push(`grupo_id = $${idx++}`); values.push(grupo_id); }
    if (semestre !== undefined) { fields.push(`semestre = $${idx++}`); values.push(semestre); }
    if (ciclo_id !== undefined) { fields.push(`ciclo_id = $${idx++}`); values.push(ciclo_id); }
    if (especialidad_id !== undefined) { fields.push(`especialidad_id = $${idx++}`); values.push(especialidad_id); }
    if (turno_id !== undefined) { fields.push(`turno_id = $${idx++}`); values.push(turno_id); }
    if (tipo_horario !== undefined) { fields.push(`tipo_horario = $${idx++}`); values.push(tipo_horario); }
    if (descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(descripcion); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    values.push(id);
    const sql = `UPDATE horario_archivos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// SUBIDA MASIVA (BATCH)
// ============================================================
export const uploadMultipleHorarios = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { horarios } = req.body;
    if (!horarios || !Array.isArray(horarios) || horarios.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de horarios' });
    }

    const resultados = [];
    const errores = [];
    const tiposHorarioValidos = ['grupo', 'maestro', 'laboratorio'];

    for (const h of horarios) {
      const {
        nombre,
        tipo_mime,
        grupo_id,
        semestre,
        ciclo_id,
        especialidad_id,
        turno_id,
        tipo_horario,
        descripcion,
      } = h;

      if (!nombre || !tipo_mime || !grupo_id || !semestre || !ciclo_id || !turno_id) {
        errores.push({ nombre, error: 'Faltan campos requeridos' });
        continue;
      }

      try {
        const tipoHorarioFinal = tiposHorarioValidos.includes(tipo_horario) ? tipo_horario : 'grupo';
        const { url, key } = await generateUploadUrl(nombre, tipo_mime);

        await query(
          `INSERT INTO horario_archivos 
           (nombre, key, tipo, grupo_id, semestre, ciclo_id, especialidad_id, turno_id, tipo_horario, descripcion, subido_por, fecha)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            nombre,
            key,
            tipo_mime,
            grupo_id,
            semestre,
            ciclo_id,
            especialidad_id || null,
            turno_id,
            tipoHorarioFinal,
            descripcion || null,
            req.user.id,
          ]
        );

        resultados.push({ nombre, key, success: true });
      } catch (err) {
        console.error('Error en batch item:', err);
        errores.push({ nombre, error: err.message });
      }
    }

    return res.json({
      success: true,
      data: {
        creados: resultados,
        errores,
        total: horarios.length,
        exitosos: resultados.length,
        fallidos: errores.length,
      },
    });
  } catch (err) {
    console.error('Error en uploadMultipleHorarios:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// SOLICITAR DESCARGA
// ============================================================
export const solicitarDescarga = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Key es requerida' });
    }

    const url = await generateDownloadUrl(key);

    return res.json({
      success: true,
      data: {
        downloadUrl: url,
        expiresIn: 300,
      },
    });
  } catch (err) {
    console.error('Error en solicitarDescarga:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// ELIMINAR HORARIO
// ============================================================
export const eliminarHorario = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const result = await query('DELETE FROM horario_archivos WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Horario no encontrado' });
    }
    return res.json({ success: true, message: 'Horario eliminado correctamente' });
  } catch (err) {
    console.error('Error en eliminarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};