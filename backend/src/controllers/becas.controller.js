import { query } from '../config/db.js';

// Obtener registros de becas (con control de roles)
export const obtenerBecas = async (req, res) => {
  try {
    let result;
    
    // Si es alumno, solo puede ver sus propias becas
    if (req.user.rol === 'alumno') {
      result = await query(
        `SELECT b.*, u.nombre, u.apellidos, u.email
         FROM becas b
         JOIN usuarios u ON u.id = b.alumno_id
         WHERE b.alumno_id = $1`,
        [req.user.id]
      );
    } else {
      // Administradores y docentes pueden ver todas (o filtradas por alumno_id si se pasa por query)
      const { alumno_id } = req.query;
      let sql = `
        SELECT b.*, u.nombre, u.apellidos, u.email
        FROM becas b
        JOIN usuarios u ON u.id = b.alumno_id
      `;
      let params = [];

      if (alumno_id) {
        sql += ` WHERE b.alumno_id = $1`;
        params.push(alumno_id);
      }

      sql += ` ORDER BY b.fecha_registro DESC`;
      result = await query(sql, params);
    }

    return res.json({ success: true, becas: result.rows });
  } catch (err) {
    console.error('Error en obtenerBecas:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Registrar beca (Solo administradores)
export const registrarBeca = async (req, res) => {
  const { alumno_id, tipo_beca, monto, ciclo_escolar, estatus, observaciones } = req.body;

  if (!alumno_id || !tipo_beca || monto === undefined || !ciclo_escolar) {
    return res.status(400).json({
      success: false,
      message: 'alumno_id, tipo_beca, monto y ciclo_escolar son requeridos.',
    });
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum < 0) {
    return res.status(400).json({
      success: false,
      message: 'El monto de la beca debe ser un número válido mayor o igual a 0.',
    });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `INSERT INTO becas 
       (alumno_id, tipo_beca, monto, ciclo_escolar, estatus, observaciones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        alumno_id,
        tipo_beca,
        montoNum,
        ciclo_escolar,
        estatus || 'activo',
        observaciones || null,
        req.user.id
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Beca registrada exitosamente.',
      beca: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'El alumno ya cuenta con una beca registrada para este ciclo escolar.',
      });
    }
    console.error('Error en registrarBeca:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// Actualizar beca
export const actualizarBeca = async (req, res) => {
  const { id } = req.params;
  const { tipo_beca, monto, ciclo_escolar, estatus, observaciones } = req.body;

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    let montoNum = undefined;
    if (monto !== undefined) {
      montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto de la beca debe ser un número válido mayor o igual a 0.',
        });
      }
    }

    const result = await query(
      `UPDATE becas 
       SET tipo_beca = COALESCE($1, tipo_beca),
           monto = COALESCE($2, monto),
           ciclo_escolar = COALESCE($3, ciclo_escolar),
           estatus = COALESCE($4, estatus),
           observaciones = COALESCE($5, observaciones)
       WHERE id = $6 RETURNING *`,
      [
        tipo_beca,
        montoNum,
        ciclo_escolar,
        estatus,
        observaciones,
        id
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Beca no encontrada.' });
    }

    return res.json({
      success: true,
      message: 'Beca actualizada exitosamente.',
      beca: result.rows[0],
    });
  } catch (err) {
    console.error('Error en actualizarBeca:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};