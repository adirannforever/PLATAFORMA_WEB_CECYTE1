import { query } from '../config/db.js';

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
// HORARIO DE GRUPOS
// ============================================================
export const getHorarioGrupo = async (req, res) => {
  try {
    const { grupo_id } = req.params;
    const result = await query(
      `SELECT 
        hg.id,
        hg.grupo_id,
        hg.materia_grupo_id,
        hg.dia_semana,
        hg.hora_inicio,
        hg.hora_fin,
        mc.nombre AS materia_nombre,
        mc.clave AS materia_clave,
        u.nombre AS docente_nombre,
        u.apellidos AS docente_apellidos
      FROM horario_grupos hg
      JOIN materias_grupo mg ON mg.id = hg.materia_grupo_id
      JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
      LEFT JOIN usuarios u ON u.id = mg.docente_id
      WHERE hg.grupo_id = $1
      ORDER BY hg.dia_semana, hg.hora_inicio`,
      [grupo_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getHorarioGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const guardarHorarioGrupo = async (req, res) => {
  const { grupo_id } = req.params;
  const { bloques } = req.body;

  if (!bloques || !Array.isArray(bloques)) {
    return res.status(400).json({ success: false, message: 'Se requiere un array de bloques' });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    // Iniciar transacción
    await query('BEGIN');

    // Eliminar bloques existentes del grupo
    await query('DELETE FROM horario_grupos WHERE grupo_id = $1', [grupo_id]);

    // Insertar nuevos bloques
    for (const bloque of bloques) {
      const { materia_grupo_id, dia_semana, hora_inicio, hora_fin } = bloque;
      await query(
        `INSERT INTO horario_grupos 
         (grupo_id, materia_grupo_id, dia_semana, hora_inicio, hora_fin, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [grupo_id, materia_grupo_id, dia_semana, hora_inicio, hora_fin, req.user.id]
      );
    }

    await query('COMMIT');
    return res.json({ success: true, message: 'Horario guardado correctamente' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error en guardarHorarioGrupo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// HORARIO DE MAESTROS (automático)
// ============================================================
export const getHorarioMaestro = async (req, res) => {
  try {
    const { docente_id } = req.params;
    const result = await query(
      `SELECT 
        hm.id,
        hm.docente_id,
        hm.materia_grupo_id,
        hm.dia_semana,
        hm.hora_inicio,
        hm.hora_fin,
        hm.es_automatico,
        mc.nombre AS materia_nombre,
        mc.clave AS materia_clave,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra
      FROM horario_maestros hm
      JOIN materias_grupo mg ON mg.id = hm.materia_grupo_id
      JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
      JOIN grupos g ON g.id = mg.grupo_id
      WHERE hm.docente_id = $1
      ORDER BY hm.dia_semana, hm.hora_inicio`,
      [docente_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getHorarioMaestro:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// HORARIO DE LABORATORIOS (automático)
// ============================================================
export const getHorarioLaboratorio = async (req, res) => {
  try {
    const { laboratorio_id } = req.params;
    const result = await query(
      `SELECT 
        hl.id,
        hl.laboratorio_id,
        hl.materia_grupo_id,
        hl.dia_semana,
        hl.hora_inicio,
        hl.hora_fin,
        hl.es_automatico,
        mc.nombre AS materia_nombre,
        mc.clave AS materia_clave,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra
      FROM horario_laboratorios hl
      JOIN materias_grupo mg ON mg.id = hl.materia_grupo_id
      JOIN materias_catalogo mc ON mc.id = mg.materia_catalogo_id
      JOIN grupos g ON g.id = mg.grupo_id
      WHERE hl.laboratorio_id = $1
      ORDER BY hl.dia_semana, hl.hora_inicio`,
      [laboratorio_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getHorarioLaboratorio:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ============================================================
// REGENERAR HORARIOS AUTOMÁTICOS
// ============================================================
export const regenerarMaestros = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    await query('BEGIN');

    // Eliminar horarios automáticos de maestros
    await query('DELETE FROM horario_maestros WHERE es_automatico = TRUE');

    // Generar desde horario_grupos
    await query(`
      INSERT INTO horario_maestros (docente_id, materia_grupo_id, dia_semana, hora_inicio, hora_fin, es_automatico)
      SELECT 
        mg.docente_id,
        hg.materia_grupo_id,
        hg.dia_semana,
        hg.hora_inicio,
        hg.hora_fin,
        TRUE
      FROM horario_grupos hg
      JOIN materias_grupo mg ON mg.id = hg.materia_grupo_id
      WHERE mg.docente_id IS NOT NULL
    `);

    await query('COMMIT');
    return res.json({ success: true, message: 'Horarios de maestros regenerados correctamente' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error en regenerarMaestros:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const regenerarLaboratorios = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    await query('BEGIN');

    // Eliminar horarios automáticos de laboratorios
    await query('DELETE FROM horario_laboratorios WHERE es_automatico = TRUE');

    // Generar desde horario_grupos (asumiendo que tienes laboratorio_id en materias_grupo)
    // Por ahora, si no tienes laboratorio_id, esto no generará nada
    await query(`
      INSERT INTO horario_laboratorios (laboratorio_id, materia_grupo_id, dia_semana, hora_inicio, hora_fin, es_automatico)
      SELECT 
        mg.laboratorio_id,
        hg.materia_grupo_id,
        hg.dia_semana,
        hg.hora_inicio,
        hg.hora_fin,
        TRUE
      FROM horario_grupos hg
      JOIN materias_grupo mg ON mg.id = hg.materia_grupo_id
      WHERE mg.laboratorio_id IS NOT NULL
    `);

    await query('COMMIT');
    return res.json({ success: true, message: 'Horarios de laboratorios regenerados correctamente' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error en regenerarLaboratorios:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};