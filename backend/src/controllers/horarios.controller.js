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
// SUBIDA DE ARCHIVOS CON PRESIGNED URL
// ============================================================
export const solicitarUpload = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { nombre, tipo, grupo_id } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ success: false, message: 'Nombre y tipo son requeridos' });
    }

    // Validar tipo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Formato no permitido. Solo PDF o Excel' });
    }

    const { url, key } = await generateUploadUrl(nombre, tipo);

    // Guardar metadata en BD (tamaño se actualizará después de subir)
    // Por ahora guardamos con tamaño 0 y luego lo actualizamos
    const result = await query(
      `INSERT INTO horario_archivos (nombre, key, tipo_mime, tamaño, grupo_id, subido_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [nombre, key, tipo, 0, grupo_id || null, req.user.id]
    );

    return res.json({
      success: true,
      data: {
        uploadUrl: url,
        key,
        id: result.rows[0].id,
        expiresIn: 300,
      },
    });
  } catch (err) {
    console.error('Error en solicitarUpload:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const confirmarUpload = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { id, tamaño } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID es requerido' });
    }

    await query(
      `UPDATE horario_archivos SET tamaño = $1 WHERE id = $2`,
      [tamaño, id]
    );

    return res.json({ success: true, message: 'Archivo confirmado' });
  } catch (err) {
    console.error('Error en confirmarUpload:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// LISTAR Y DESCARGAR ARCHIVOS
// ============================================================
export const listarHorarios = async (req, res) => {
  try {
    const { grupo_id } = req.query;
    let sql = `
      SELECT 
        h.id,
        h.nombre,
        h.key,
        h.tipo_mime,
        h.tamaño,
        h.grupo_id,
        h.fecha,
        g.nombre AS grupo_nombre,
        u.nombre AS usuario_nombre,
        u.apellidos AS usuario_apellidos
      FROM horario_archivos h
      LEFT JOIN grupos g ON g.id = h.grupo_id
      LEFT JOIN usuarios u ON u.id = h.subido_por
      WHERE 1=1
    `;
    const params = [];
    if (grupo_id) {
      sql += ` AND h.grupo_id = $${params.length + 1}`;
      params.push(grupo_id);
    }
    sql += ` ORDER BY h.fecha DESC`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en listarHorarios:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const solicitarDescarga = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Key es requerida' });
    }

    const url = await generateDownloadUrl(key);
    return res.json({
      success: true,
      data: { downloadUrl: url },
    });
  } catch (err) {
    console.error('Error en solicitarDescarga:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const eliminarHorario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID es requerido' });
    }

    // Obtener la key para eliminar de S3 (opcional, pero buena práctica)
    const result = await query('SELECT key FROM horario_archivos WHERE id = $1', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Eliminar de BD
    await query('DELETE FROM horario_archivos WHERE id = $1', [id]);

    // (Opcional) Eliminar de S3
    // const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    // const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: result.rows[0].key });
    // await s3Client.send(command);

    return res.json({ success: true, message: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error en eliminarHorario:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// HORARIO DE GRUPOS (PARA COMPATIBILIDAD)
// ============================================================
export const getHorarioGrupo = async (req, res) => {
  try {
    const { grupo_id } = req.params;
    const result = await query(
      `SELECT 
        h.id,
        h.nombre,
        h.key,
        h.tipo_mime,
        h.tamaño,
        h.fecha
      FROM horario_archivos h
      WHERE h.grupo_id = $1
      ORDER BY h.fecha DESC`,
      [grupo_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getHorarioGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// No usamos guardarHorarioGrupo porque ahora subimos archivos
export const guardarHorarioGrupo = async (req, res) => {
  return res.status(501).json({ success: false, message: 'No implementado - usa subida de archivos' });
};

export const getHorarioMaestro = async (req, res) => {
  return res.json({ success: true, data: [] });
};

export const getHorarioLaboratorio = async (req, res) => {
  return res.json({ success: true, data: [] });
};

export const regenerarMaestros = async (req, res) => {
  return res.json({ success: true, message: 'No implementado' });
};

export const regenerarLaboratorios = async (req, res) => {
  return res.json({ success: true, message: 'No implementado' });
};