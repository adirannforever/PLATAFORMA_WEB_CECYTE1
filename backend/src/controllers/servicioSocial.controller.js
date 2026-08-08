import { query } from '../config/db.js';

// Obtener registros de servicio social / prácticas (con control de roles)
export const obtenerServicioSocial = async (req, res) => {
  try {
    let result;
    
    // Si es alumno, solo puede ver su propio registro
    if (req.user.rol === 'alumno') {
      result = await query(
        `SELECT s.*, u.nombre, u.apellidos, u.email
         FROM servicio_social_practicas s
         JOIN usuarios u ON u.id = s.alumno_id
         WHERE s.alumno_id = $1`,
        [req.user.id]
      );
    } else {
      // Administradores y docentes pueden ver todos (o filtrados por alumno_id si se pasa por query)
      const { alumno_id } = req.query;
      let sql = `
        SELECT s.*, u.nombre, u.apellidos, u.email
        FROM servicio_social_practicas s
        JOIN usuarios u ON u.id = s.alumno_id
      `;
      let params = [];

      if (alumno_id) {
        sql += ` WHERE s.alumno_id = $1`;
        params.push(alumno_id);
      }

      sql += ` ORDER BY s.fecha_registro DESC`;
      result = await query(sql, params);
    }

    return res.json({ success: true, servicio_social: result.rows });
  } catch (err) {
    console.error('Error en obtenerServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Registrar servicio social o prácticas (Solo administradores o personal autorizado)
export const registrarServicioSocial = async (req, res) => {
  const { alumno_id, tipo, institucion_empresa, asesor_externo, fecha_inicio, fecha_fin, observaciones } = req.body;

  if (!alumno_id || !tipo || !institucion_empresa) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, tipo e institucion_empresa son requeridos.',
    });
  }

  if (!['servicio_social', 'practicas_profesionales'].includes(tipo)) {
    return res.status(400).json({
      success: false,
      message: 'El tipo debe ser "servicio_social" o "practicas_profesionales".',
    });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `INSERT INTO servicio_social_practicas 
       (alumno_id, tipo, institucion_empresa, asesor_externo, fecha_inicio, fecha_fin, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        alumno_id, 
        tipo, 
        institucion_empresa, 
        asesor_externo || null, 
        fecha_inicio || null, 
        fecha_fin || null, 
        observaciones || null, 
        req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente.',
      servicio_social: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya cuenta con un registro para este tipo. Usa PUT para actualizar.',
      });
    }
    console.error('Error en registrarServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Actualizar servicio social o prácticas
export const actualizarServicioSocial = async (req, res) => {
  const { id } = req.params;
  const { institucion_empresa, asesor_externo, horas_acumuladas, estatus, fecha_inicio, fecha_fin, observaciones } = req.body;

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `UPDATE servicio_social_practicas 
       SET institucion_empresa = COALESCE($1, institucion_empresa),
           asesor_externo = COALESCE($2, asesor_externo),
           horas_acumuladas = COALESCE($3, horas_acumuladas),
           estatus = COALESCE($4, estatus),
           fecha_inicio = COALESCE($5, fecha_inicio),
           fecha_fin = COALESCE($6, fecha_fin),
           observaciones = COALESCE($7, observaciones)
       WHERE id = $8 RETURNING *`,
      [
        institucion_empresa, 
        asesor_externo, 
        horas_acumuladas, 
        estatus, 
        fecha_inicio, 
        fecha_fin, 
        observaciones, 
        id
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Registro actualizado exitosamente.',
      servicio_social: result.rows[0],
    });
  } catch (err) {
    console.error('Error en actualizarServicioSocial:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};