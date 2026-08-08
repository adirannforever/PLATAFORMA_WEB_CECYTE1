import { query } from '../config/db.js';

// Obtener registros de titulación (con control de roles)
export const obtenerTitulaciones = async (req, res) => {
  try {
    let result;
    
    // Si es alumno, solo puede ver su propio registro de titulación
    if (req.user.rol === 'alumno') {
      result = await query(
        `SELECT t.*, a.matricula, u.nombre, u.apellidos, u.email
         FROM titulacion t
         JOIN alumnos a ON a.id = t.alumno_id
         JOIN usuarios u ON u.id = a.usuario_id
         WHERE a.usuario_id = $1`,
        [req.user.id]
      );
    } else {
      // Administradores y docentes pueden ver todos (o filtrados por alumno_id si se pasa por query)
      const { alumno_id } = req.query;
      let sql = `
        SELECT t.*, a.matricula, u.nombre, u.apellidos, u.email
        FROM titulacion t
        JOIN alumnos a ON a.id = t.alumno_id
        JOIN usuarios u ON u.id = a.usuario_id
      `;
      let params = [];

      if (alumno_id) {
        sql += ` WHERE t.alumno_id = $1`;
        params.push(alumno_id);
      }

      sql += ` ORDER BY t.fecha_registro DESC`;
      result = await query(sql, params);
    }

    return res.json({ success: true, titulaciones: result.rows });
  } catch (err) {
    console.error('Error en obtenerTitulaciones:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Registrar titulación (Solo administradores)
export const registrarTitulacion = async (req, res) => {
  const { 
    alumno_id, 
    opcion_titulacion, 
    estatus, 
    fecha_examen, 
    numero_titulo, 
    cedula_profesional, 
    observaciones 
  } = req.body;

  if (!alumno_id || !opcion_titulacion) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id y opcion_titulacion son requeridos.',
    });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `INSERT INTO titulacion 
       (alumno_id, opcion_titulacion, estatus, fecha_examen, numero_titulo, cedula_profesional, observaciones, autorizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        alumno_id,
        opcion_titulacion,
        estatus || 'en_proceso',
        fecha_examen || null,
        numero_titulo || null,
        cedula_profesional || null,
        observaciones || null,
        req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Registro de titulación creado exitosamente.',
      titulacion: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya cuenta con un registro de titulación, o el número de título/cédula profesional ya está registrado.',
      });
    }
    console.error('Error en registrarTitulacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Actualizar titulación (Solo administradores)
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

    const result = await query(
      `UPDATE titulacion 
       SET opcion_titulacion = COALESCE($1, opcion_titulacion),
           estatus = COALESCE($2, estatus),
           fecha_examen = COALESCE($3, fecha_examen),
           numero_titulo = COALESCE($4, numero_titulo),
           cedula_profesional = COALESCE($5, cedula_profesional),
           observaciones = COALESCE($6, observaciones),
           autorizado_por = $7
       WHERE id = $8 RETURNING *`,
      [
        opcion_titulacion || null,
        estatus || null,
        fecha_examen || null,
        numero_titulo || null,
        cedula_profesional || null,
        observaciones || null,
        req.user.id,
        id
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Registro de titulación no encontrado.' });
    }

    return res.json({
      success: true,
      message: 'Registro de titulación actualizado exitosamente.',
      titulacion: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El número de título o cédula profesional ya se encuentra registrado en otro expediente.',
      });
    }
    console.error('Error en actualizarTitulacion:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};