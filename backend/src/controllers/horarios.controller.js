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
// SUBIDA DE ARCHIVOS (PRESIGNED URL)
// ============================================================
export const solicitarUploadHorario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { nombre, tipo } = req.body;
    if (!nombre || !tipo) {
      return res.status(400).json({ success: false, message: 'Nombre y tipo son requeridos' });
    }

    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Formato no permitido. Solo PDF o Excel' });
    }

    const { url, key } = await generateUploadUrl(nombre, tipo);

    await query(
      `INSERT INTO horario_archivos (nombre, key, tipo, subido_por, fecha)
       VALUES ($1, $2, $3, $4, NOW())`,
      [nombre, key, tipo, req.user.id]
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
// LISTAR HORARIOS SUBIDOS - CORREGIDO
// ============================================================
export const listarHorarios = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        ha.id, 
        ha.nombre, 
        ha.key, 
        ha.tipo, 
        ha.fecha,
        u.nombre AS usuario_nombre, 
        u.apellidos AS usuario_apellidos
       FROM horario_archivos ha
       LEFT JOIN usuarios u ON u.id = ha.subido_por
       ORDER BY ha.fecha DESC`
    );
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