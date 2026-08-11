import { query } from '../config/db.js';

// ============================================================
// OBTENER BECAS (solo definiciones, sin alumno asignado)
// ============================================================
export const obtenerBecas = async (req, res) => {
  try {
    const { search, ciclo_id, estatus, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let sql = `
      SELECT 
        b.id, b.nombre_beca, b.descripcion, b.monto, b.periodicidad, 
        b.activo, b.ciclo_id,
        c.nombre AS ciclo_nombre,
        (SELECT COUNT(*) FROM becas_alumnos WHERE nombre_beca = b.nombre_beca AND alumno_id IS NOT NULL) AS alumnos_asignados
      FROM becas_alumnos b
      LEFT JOIN ciclos_escolares c ON c.id = b.ciclo_id
      WHERE b.alumno_id IS NULL
    `;
    const params = [];
    const conditions = [];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(`b.nombre_beca ILIKE $${params.length + 1}`);
      params.push(searchTerm);
    }
    if (ciclo_id) {
      conditions.push(`b.ciclo_id = $${params.length + 1}`);
      params.push(ciclo_id);
    }
    if (estatus !== undefined) {
      const isActive = estatus === 'true' || estatus === 'activo';
      conditions.push(`b.activo = $${params.length + 1}`);
      params.push(isActive);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // Contar total
    const countSql = sql.replace(
      /SELECT .+? FROM /,
      'SELECT COUNT(*) as total FROM '
    );
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    sql += ' ORDER BY b.nombre_beca';
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);

    return res.json({
      success: true,
      becas: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    console.error('Error en obtenerBecas:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// OBTENER DETALLE DE UNA BECA (alumnos asignados)
// ============================================================
export const obtenerDetalleBeca = async (req, res) => {
  const { nombre_beca } = req.params;
  const { ciclo_id, estatus_pago, search, page = 1, limit = 10 } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  try {
    // Obtener información de la beca
    const infoSql = `
      SELECT nombre_beca, descripcion, monto, periodicidad, activo,
        (SELECT nombre FROM ciclos_escolares WHERE id = b.ciclo_id LIMIT 1) AS ciclo_nombre
      FROM becas_alumnos b
      WHERE nombre_beca = $1 AND alumno_id IS NULL
      LIMIT 1
    `;
    const infoResult = await query(infoSql, [nombre_beca]);

    // Obtener alumnos asignados
    let sql = `
      SELECT 
        b.id, b.alumno_id, b.ciclo_id, b.nombre_beca, b.monto, b.estatus_pago,
        b.fecha_asignacion, b.comentarios_alumno,
        u.nombre, u.apellidos, u.email,
        a.matricula,
        c.nombre AS ciclo_nombre
      FROM becas_alumnos b
      JOIN alumnos a ON a.id = b.alumno_id
      JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN ciclos_escolares c ON c.id = b.ciclo_id
      WHERE b.nombre_beca = $1 AND b.alumno_id IS NOT NULL
    `;
    const params = [nombre_beca];
    const conditions = [];

    if (ciclo_id) {
      conditions.push(`b.ciclo_id = $${params.length + 1}`);
      params.push(ciclo_id);
    }
    if (estatus_pago) {
      conditions.push(`b.estatus_pago = $${params.length + 1}`);
      params.push(estatus_pago);
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(`(
        u.nombre ILIKE $${params.length + 1} OR 
        u.apellidos ILIKE $${params.length + 1} OR 
        a.matricula ILIKE $${params.length + 1}
      )`);
      params.push(searchTerm);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // Contar total
    const countSql = sql.replace(
      /SELECT .+? FROM /,
      'SELECT COUNT(*) as total FROM '
    );
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    sql += ' ORDER BY u.apellidos, u.nombre';
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await query(sql, params);

    return res.json({
      success: true,
      beca: infoResult.rows[0] || { nombre_beca },
      alumnos: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    console.error('Error en obtenerDetalleBeca:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// REGISTRAR BECA (solo definición, sin alumno)
// ============================================================
export const registrarBeca = async (req, res) => {
  const { nombre_beca, descripcion, monto, periodicidad, ciclo_id, activo } = req.body;

  if (!nombre_beca || !monto || !ciclo_id) {
    return res.status(400).json({
      success: false,
      message: 'nombre_beca, monto y ciclo_id son requeridos.',
    });
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum < 0) {
    return res.status(400).json({
      success: false,
      message: 'El monto debe ser un número válido mayor o igual a 0.',
    });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Verificar duplicado
    const dup = await query(
      `SELECT id FROM becas_alumnos WHERE nombre_beca = $1 AND alumno_id IS NULL`,
      [nombre_beca]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una beca con ese nombre.',
      });
    }

    const result = await query(
      `INSERT INTO becas_alumnos 
        (nombre_beca, descripcion, monto, periodicidad, ciclo_id, activo, alumno_id)
       VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING *`,
      [nombre_beca, descripcion || null, montoNum, periodicidad || 'semestral', ciclo_id, activo !== undefined ? activo : true]
    );

    return res.status(201).json({
      success: true,
      message: 'Beca registrada exitosamente.',
      beca: result.rows[0],
    });
  } catch (err) {
    console.error('Error en registrarBeca:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ACTUALIZAR BECA (definición)
// ============================================================
export const actualizarBeca = async (req, res) => {
  const { id } = req.params;
  const { nombre_beca, descripcion, monto, periodicidad, ciclo_id, activo } = req.body;

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Verificar que sea una definición (alumno_id IS NULL)
    const check = await query('SELECT id FROM becas_alumnos WHERE id = $1 AND alumno_id IS NULL', [id]);
    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Beca no encontrada o no es una definición.' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (nombre_beca !== undefined) {
      // Verificar duplicado si se cambia el nombre
      if (nombre_beca) {
        const dup = await query(
          `SELECT id FROM becas_alumnos WHERE nombre_beca = $1 AND id != $2 AND alumno_id IS NULL`,
          [nombre_beca, id]
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe una beca con ese nombre.',
          });
        }
      }
      fields.push(`nombre_beca = $${idx++}`);
      values.push(nombre_beca);
    }
    if (descripcion !== undefined) {
      fields.push(`descripcion = $${idx++}`);
      values.push(descripcion);
    }
    if (monto !== undefined) {
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser un número válido mayor o igual a 0.',
        });
      }
      fields.push(`monto = $${idx++}`);
      values.push(montoNum);
    }
    if (periodicidad !== undefined) {
      fields.push(`periodicidad = $${idx++}`);
      values.push(periodicidad);
    }
    if (ciclo_id !== undefined) {
      fields.push(`ciclo_id = $${idx++}`);
      values.push(ciclo_id);
    }
    if (activo !== undefined) {
      fields.push(`activo = $${idx++}`);
      values.push(activo);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    values.push(id);
    const sql = `UPDATE becas_alumnos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);

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

// ============================================================
// ASIGNAR BECA A UN ALUMNO
// ============================================================
export const asignarBecaAlumno = async (req, res) => {
  console.log(' asignarBecaAlumno iniciada');
  console.log(' Body recibido:', JSON.stringify(req.body, null, 2));

  const { alumno_id, ciclo_id, nombre_beca, estatus_pago, comentarios, fecha_inicio, fecha_fin } = req.body;

  if (!alumno_id || !ciclo_id || !nombre_beca) {
    console.warn('️ Faltan campos obligatorios');
    return res.status(400).json({
      success: false,
      message: 'alumno_id, ciclo_id y nombre_beca son requeridos.',
    });
  }

  try {
    console.log(' Usuario:', req.user.id, req.user.rol);

    if (req.user.rol !== 'administrador') {
      console.warn('️ Usuario no es administrador');
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Verificar que la beca existe
    console.log(' Buscando beca definición:', nombre_beca);
    const becaDef = await query(
      `SELECT id, monto, periodicidad, descripcion FROM becas_alumnos 
       WHERE nombre_beca = $1 AND alumno_id IS NULL AND activo = TRUE`,
      [nombre_beca]
    );
    console.log(' Beca definición encontrada:', becaDef.rows[0]);

    if (!becaDef.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'La beca no existe o está inactiva.',
      });
    }
    const { monto, periodicidad, descripcion } = becaDef.rows[0];

    // Verificar que el alumno existe
    console.log(' Verificando alumno ID:', alumno_id);
    const alumnoCheck = await query('SELECT id FROM alumnos WHERE id = $1', [alumno_id]);
    console.log(' Alumno encontrado:', alumnoCheck.rows[0]);

    if (!alumnoCheck.rows[0]) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado.' });
    }

    // Verificar duplicado
    console.log(' Verificando duplicado...');
    const dup = await query(
      `SELECT id FROM becas_alumnos WHERE alumno_id = $1 AND nombre_beca = $2 AND ciclo_id = $3`,
      [alumno_id, nombre_beca, ciclo_id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este alumno ya tiene esta beca asignada en este ciclo.',
      });
    }

    console.log(' Insertando asignación...');
    const result = await query(
      `INSERT INTO becas_alumnos 
        (alumno_id, ciclo_id, nombre_beca, monto, periodicidad, estatus_pago, comentarios_alumno, descripcion,
        fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [alumno_id, ciclo_id, nombre_beca, monto, periodicidad, estatus_pago || 'cursando', comentarios || null, descripcion || null, fecha_inicio || null, fecha_fin || null]
    );

    console.log(' Asignación exitosa:', result.rows[0]);

    return res.status(201).json({
      success: true,
      message: 'Beca asignada al alumno exitosamente.',
      asignacion: result.rows[0],
    });
  } catch (err) {
    console.error(' Error en asignarBecaAlumno:', err);
    console.error(' Detalle del error:', err.message);
    console.error(' Stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + err.message,
    });
  }
};

// ============================================================
// ACTUALIZAR ESTATUS DE PAGO DE UNA BECA ASIGNADA
// ============================================================
export const actualizarEstatusPago = async (req, res) => {
  const { id } = req.params;
  const { estatus_pago, comentarios } = req.body;

  if (!estatus_pago) {
    return res.status(400).json({
      success: false,
      message: 'estatus_pago es requerido.',
    });
  }

  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const result = await query(
      `UPDATE becas_alumnos 
       SET estatus_pago = $1, comentarios_alumno = COALESCE($2, comentarios_alumno)
       WHERE id = $3 AND alumno_id IS NOT NULL
       RETURNING *`,
      [estatus_pago, comentarios, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada.' });
    }

    return res.json({
      success: true,
      message: 'Estatus de pago actualizado.',
      asignacion: result.rows[0],
    });
  } catch (err) {
    console.error('Error en actualizarEstatusPago:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

// ============================================================
// ELIMINAR BECA (definición)
// ============================================================
export const eliminarBeca = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // Verificar que sea una definición
    const check = await query('SELECT id FROM becas_alumnos WHERE id = $1 AND alumno_id IS NULL', [id]);
    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Beca no encontrada o no es una definición.' });
    }

    // Opcional: también eliminar asignaciones? Mejor solo eliminar la definición
    const result = await query('DELETE FROM becas_alumnos WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Beca no encontrada.' });
    }

    return res.json({ success: true, message: 'Beca eliminada correctamente.' });
  } catch (err) {
    console.error('Error en eliminarBeca:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};