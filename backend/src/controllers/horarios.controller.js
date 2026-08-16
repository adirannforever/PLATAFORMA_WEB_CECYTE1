import { query } from '../config/db.js';
import { generateUploadUrl, generateDownloadUrl } from '../services/s3.service.js';
import { generarPlantillaHorarioDOCX } from '../utils/docxGenerator.js';

// ============================================================
// CONFIGURACIÓN (solo admin)
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
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const {
      duracion_bloque_minutos,
      hora_inicio_turno,
      hora_fin_turno,
      receso_inicio,
      receso_fin,
      receso_bloqueado,
      dias_semana,
    } = req.body;

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
// UTILIDADES (públicas)
// ============================================================

export const getSemestreActual = (req, res) => {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const semestres = (mes >= 1 && mes <= 6) ? [2, 4, 6] : [1, 3, 5];
  return res.json({ success: true, data: { semestres } });
};

// ============================================================
// LISTAR HORARIOS (con permisos por rol)
// ============================================================

export const listarHorarios = async (req, res) => {
  try {
    const userRole = req.user.rol;
    const userId = req.user.id;

    let {
      ciclo_id,
      semestre,
      grupo_letra,
      especialidad_id,
      turno_id,
      search,
      tipo,
      grupo_id,
      docente_id,
    } = req.query;

    // ---------- VALIDACIÓN DE PERMISOS SEGÚN ROL ----------
    if (userRole === 'alumno') {
      const alumnoRes = await query(
        'SELECT grupo_actual_id FROM alumnos WHERE usuario_id = $1',
        [userId]
      );
      if (alumnoRes.rows.length === 0 || !alumnoRes.rows[0].grupo_actual_id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes un grupo asignado. Contacta a la Coordinación Académica.',
        });
      }
      const grupoAlumno = alumnoRes.rows[0].grupo_actual_id;
      if (grupo_id && parseInt(grupo_id) !== grupoAlumno) {
        return res.status(403).json({
          success: false,
          message: 'No puedes ver horarios de otro grupo.',
        });
      }
      grupo_id = grupoAlumno;
      docente_id = null;
    }

    if (userRole === 'docente') {
      if (grupo_id) {
        const check = await query(
          'SELECT 1 FROM materias_grupo WHERE grupo_id = $1 AND docente_id = $2 AND activa = true LIMIT 1',
          [grupo_id, userId]
        );
        if (check.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'No tienes materias en ese grupo.',
          });
        }
      }
      docente_id = userId;
    }

    // ---------- CONSTRUCCIÓN DE LA CONSULTA ----------
    let sql = `
      SELECT 
        ha.id,
        ha.nombre,
        ha.key,
        ha.fecha,
        ha.semestre,
        ha.letra,
        ha.descripcion,
        ha.tipo_horario,
        g.id AS grupo_id,
        g.nombre AS grupo_nombre,
        g.letra AS grupo_letra,
        e.nombre AS especialidad_nombre,
        t.nombre AS turno_nombre,
        c.nombre AS ciclo_nombre
      FROM horario_archivos ha
      LEFT JOIN grupos g ON g.id = ha.grupo_id
      LEFT JOIN especialidades e ON e.id = ha.especialidad_id
      LEFT JOIN turnos t ON t.id = ha.turno_id
      LEFT JOIN ciclos_escolares c ON c.id = ha.ciclo_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (ciclo_id) {
      sql += ` AND ha.ciclo_id = $${paramIndex}`;
      params.push(ciclo_id);
      paramIndex++;
    }
    if (semestre) {
      sql += ` AND ha.semestre = $${paramIndex}`;
      params.push(semestre);
      paramIndex++;
    }
    if (grupo_letra) {
      sql += ` AND ha.letra = $${paramIndex}`;
      params.push(grupo_letra);
      paramIndex++;
    }
    if (especialidad_id) {
      sql += ` AND ha.especialidad_id = $${paramIndex}`;
      params.push(especialidad_id);
      paramIndex++;
    }
    if (turno_id) {
      sql += ` AND ha.turno_id = $${paramIndex}`;
      params.push(turno_id);
      paramIndex++;
    }
    if (search) {
      sql += ` AND ha.nombre ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (tipo) {
      sql += ` AND ha.tipo_horario = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }
    if (grupo_id) {
      sql += ` AND ha.grupo_id = $${paramIndex}`;
      params.push(grupo_id);
      paramIndex++;
    }
    if (docente_id) {
      sql += ` AND ha.grupo_id IN (
        SELECT DISTINCT mg.grupo_id 
        FROM materias_grupo mg
        WHERE mg.docente_id = $${paramIndex} AND mg.activa = TRUE
      )`;
      params.push(docente_id);
      paramIndex++;
    }

    sql += ' ORDER BY ha.fecha DESC, ha.semestre, ha.letra';

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en listarHorarios:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ============================================================
// CONTADOR DE FALTANTES (solo admin - ya no se usa en frontend pero se mantiene)
// ============================================================

export const contarHorariosFaltantes = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

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
// SUBIR HORARIO (solo admin)
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
// ACTUALIZAR METADATOS DE HORARIO (solo admin)
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
// SUBIDA MASIVA (solo admin)
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
// SOLICITAR DESCARGA (autenticado)
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
// ELIMINAR HORARIO (solo admin)
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

// ============================================================
// GENERAR PLANTILLA DOCX (CORREGIDA)
// ============================================================

export const generarPlantillaHorario = async (req, res) => {
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado.',
      });
    }

    const { tipo, grupo_id, semestre, ciclo_id, turno_id, letra } = req.query;

    // Validar campos obligatorios según tipo
    if (!turno_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos. Se requiere: turno_id.',
      });
    }

    // Si es tipo "grupo", validar grupo_id y también semestre/ciclo
    if (tipo === 'grupo') {
      if (!grupo_id) {
        return res.status(400).json({
          success: false,
          message: 'Para tipo "grupo" se requiere grupo_id.',
        });
      }
      if (!semestre || !ciclo_id) {
        return res.status(400).json({
          success: false,
          message: 'Para tipo "grupo" se requiere semestre y ciclo_id.',
        });
      }
    }

    const esVespertino = parseInt(turno_id) === 2;
    let periodos = [];

    if (esVespertino) {
      periodos = [
        { inicio: '12:00', fin: '12:50', receso: false },
        { inicio: '12:50', fin: '13:40', receso: false },
        { inicio: '13:40', fin: '14:30', receso: false },
        { inicio: '14:30', fin: '15:00', receso: true },
        { inicio: '15:00', fin: '15:50', receso: false },
        { inicio: '15:50', fin: '16:40', receso: false },
        { inicio: '16:40', fin: '17:30', receso: false },
        { inicio: '17:30', fin: '18:20', receso: false },
        { inicio: '18:20', fin: '19:10', receso: false },
      ];
    } else {
      periodos = [
        { inicio: '07:00', fin: '07:50', receso: false },
        { inicio: '07:50', fin: '08:40', receso: false },
        { inicio: '08:40', fin: '09:30', receso: false },
        { inicio: '09:30', fin: '10:00', receso: true },
        { inicio: '10:00', fin: '10:50', receso: false },
        { inicio: '10:50', fin: '11:40', receso: false },
        { inicio: '11:40', fin: '12:30', receso: false },
        { inicio: '12:30', fin: '13:20', receso: false },
        { inicio: '13:20', fin: '14:10', receso: false },
      ];
    }

    let nombre = '';
    let cicloNombre = '';
    let semestreFinal = semestre || '1';
    let cicloFinal = ciclo_id || 'General';

    // Si hay grupo_id, obtener datos del grupo
    if (grupo_id) {
      const grupoRes = await query(
        `SELECT g.id, g.nombre, g.semestre, g.letra,
                e.nombre AS especialidad_nombre,
                t.nombre AS turno_nombre,
                c.nombre AS ciclo_nombre
         FROM grupos g
         LEFT JOIN especialidades e ON e.id = g.especialidad_id
         LEFT JOIN turnos t ON t.id = g.turno_id
         LEFT JOIN ciclos_escolares c ON c.id = g.ciclo_id
         WHERE g.id = $1`,
        [grupo_id]
      );

      if (grupoRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Grupo no encontrado.' });
      }

      const grupo = grupoRes.rows[0];
      nombre = grupo.nombre;
      cicloNombre = grupo.ciclo_nombre || 'Sin ciclo';
      semestreFinal = grupo.semestre || semestre || '1';
    } else {
      // Si no hay grupo, usar nombres genéricos según tipo
      const tipoNombres = {
        maestro: 'Maestro',
        laboratorio: 'Laboratorio',
      };
      nombre = tipoNombres[tipo] || tipo;
      cicloNombre = 'General';
      semestreFinal = semestre || '1';
    }

    const data = {
      tipo: tipo || 'grupo',
      nombre: nombre,
      semestre: semestreFinal,
      ciclo: cicloNombre,
      especialidad: 'General',
      turno: esVespertino ? 'Vespertino' : 'Matutino',
      letra: letra || '',
      dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      periodos: periodos,
    };

    const buffer = await generarPlantillaHorarioDOCX(data);

    const nombreSeguro = nombre.replace(/[^a-zA-Z0-9]/g, '_');
    const cicloSeguro = cicloNombre.replace(/[^a-zA-Z0-9]/g, '_');
    const turnoSeguro = esVespertino ? 'Vespertino' : 'Matutino';
    const letraSegura = letra ? `_${letra}` : '';
    const filename = `Horario_${nombreSeguro}${letraSegura}_${cicloSeguro}_${turnoSeguro}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (err) {
    console.error('Error generando plantilla DOCX:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno.',
      error: err.message,
    });
  }
};