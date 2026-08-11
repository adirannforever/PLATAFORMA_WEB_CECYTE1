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
  // ... (igual que antes, sin cambios)
};

// ============================================================
// SUBIDA DE ARCHIVOS CON METADATA
// ============================================================
export const solicitarUploadHorario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const { 
      nombre, 
      tipo, 
      tipo_horario,
      ciclo_id,
      semestre,
      letra,
      especialidad_id,
      turno_id,
      docente_id,
      laboratorio_id
    } = req.body;

    if (!nombre || !tipo || !tipo_horario) {
      return res.status(400).json({ success: false, message: 'Nombre, tipo y tipo_horario son requeridos' });
    }

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ success: false, message: 'Formato no permitido. Solo PDF o Excel' });
    }

    // Validar tipo_horario
    if (!['alumnos', 'maestros', 'laboratorios'].includes(tipo_horario)) {
      return res.status(400).json({ success: false, message: 'tipo_horario inválido' });
    }

    const { url, key } = await generateUploadUrl(nombre, tipo);

    // Guardar en BD con metadata
    await query(
      `INSERT INTO horario_archivos 
       (nombre, key, tipo, tipo_horario, ciclo_id, semestre, letra, especialidad_id, turno_id, docente_id, laboratorio_id, subido_por, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        nombre, 
        key, 
        tipo, 
        tipo_horario,
        ciclo_id || null,
        semestre || null,
        letra || null,
        especialidad_id || null,
        turno_id || null,
        docente_id || null,
        laboratorio_id || null,
        req.user.id
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
// LISTAR HORARIOS CON FILTROS
// ============================================================
export const listarHorarios = async (req, res) => {
  try {
    const { 
      tipo_horario, 
      ciclo_id, 
      semestre, 
      letra, 
      especialidad_id, 
      turno_id,
      docente_id,
      laboratorio_id
    } = req.query;

    let sql = `
      SELECT ha.id, ha.nombre, ha.key, ha.fecha,
             ha.tipo_horario, ha.semestre, ha.letra,
             ha.ciclo_id, ha.especialidad_id, ha.turno_id,
             ha.docente_id, ha.laboratorio_id,
             u.nombre AS usuario_nombre, u.apellidos AS usuario_apellidos,
             c.nombre AS ciclo_nombre,
             e.nombre AS especialidad_nombre,
             t.nombre AS turno_nombre,
             doc.nombre AS docente_nombre, doc.apellidos AS docente_apellidos,
             a.nombre AS laboratorio_nombre
      FROM horario_archivos ha
      LEFT JOIN usuarios u ON u.id = ha.subido_por
      LEFT JOIN ciclos_escolares c ON c.id = ha.ciclo_id
      LEFT JOIN especialidades e ON e.id = ha.especialidad_id
      LEFT JOIN turnos t ON t.id = ha.turno_id
      LEFT JOIN usuarios doc ON doc.id = ha.docente_id
      LEFT JOIN aulas a ON a.id = ha.laboratorio_id
      WHERE 1=1
    `;
    const params = [];
    const conditions = [];

    if (tipo_horario) {
      conditions.push(`ha.tipo_horario = $${params.length + 1}`);
      params.push(tipo_horario);
    }
    if (ciclo_id) {
      conditions.push(`ha.ciclo_id = $${params.length + 1}`);
      params.push(ciclo_id);
    }
    if (semestre) {
      conditions.push(`ha.semestre = $${params.length + 1}`);
      params.push(semestre);
    }
    if (letra) {
      conditions.push(`ha.letra = $${params.length + 1}`);
      params.push(letra);
    }
    if (especialidad_id) {
      conditions.push(`ha.especialidad_id = $${params.length + 1}`);
      params.push(especialidad_id);
    }
    if (turno_id) {
      conditions.push(`ha.turno_id = $${params.length + 1}`);
      params.push(turno_id);
    }
    if (docente_id) {
      conditions.push(`ha.docente_id = $${params.length + 1}`);
      params.push(docente_id);
    }
    if (laboratorio_id) {
      conditions.push(`ha.laboratorio_id = $${params.length + 1}`);
      params.push(laboratorio_id);
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