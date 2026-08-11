import { query } from '../config/db.js';

export const getMateriasCatalogo = async (req, res) => {
  try {
    const { especialidad_id, semestre, tipo } = req.query;
    let sql = `
      SELECT id, nombre, clave, semestre, tipo, especialidad_id,
             modulo_numero, submodulo_numero, horas_semana, activa
      FROM materias_catalogo
      WHERE activa = TRUE
    `;
    const params = [];
    const conditions = [];

    if (especialidad_id) {
      conditions.push(`especialidad_id = $${params.length + 1}`);
      params.push(especialidad_id);
    }
    if (semestre) {
      conditions.push(`semestre = $${params.length + 1}`);
      params.push(semestre);
    }
    if (tipo) {
      conditions.push(`tipo = $${params.length + 1}`);
      params.push(tipo);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY semestre, nombre';
    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getMateriasCatalogo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearMateriaCatalogo = async (req, res) => {
  const { nombre, clave, semestre, tipo, especialidad_id, modulo_numero, submodulo_numero, horas_semana } = req.body;
  if (!nombre || !semestre || !tipo) {
    return res.status(400).json({ success: false, message: 'Nombre, semestre y tipo son requeridos' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    // Convertir string vacío a null
    const espId = especialidad_id === '' || especialidad_id === 'null' ? null : especialidad_id;
    const result = await query(
      `INSERT INTO materias_catalogo
       (nombre, clave, semestre, tipo, especialidad_id, modulo_numero, submodulo_numero, horas_semana, activa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [nombre, clave || null, semestre, tipo, espId, modulo_numero || null, submodulo_numero || null, horas_semana || 3]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en crearMateriaCatalogo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarMateriaCatalogo = async (req, res) => {
  const { id } = req.params;
  const { nombre, clave, semestre, tipo, especialidad_id, modulo_numero, submodulo_numero, horas_semana, activa } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); values.push(nombre); }
    if (clave !== undefined) { fields.push(`clave = $${idx++}`); values.push(clave); }
    if (semestre !== undefined) { fields.push(`semestre = $${idx++}`); values.push(semestre); }
    if (tipo !== undefined) { fields.push(`tipo = $${idx++}`); values.push(tipo); }
    if (especialidad_id !== undefined) {
      fields.push(`especialidad_id = $${idx++}`);
      // Convertir string vacío a null
      values.push(especialidad_id === '' || especialidad_id === 'null' ? null : especialidad_id);
    }
    if (modulo_numero !== undefined) { fields.push(`modulo_numero = $${idx++}`); values.push(modulo_numero); }
    if (submodulo_numero !== undefined) { fields.push(`submodulo_numero = $${idx++}`); values.push(submodulo_numero); }
    if (horas_semana !== undefined) { fields.push(`horas_semana = $${idx++}`); values.push(horas_semana); }
    if (activa !== undefined) { fields.push(`activa = $${idx++}`); values.push(activa); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    values.push(id);
    const sql = `UPDATE materias_catalogo SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarMateriaCatalogo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const eliminarMateriaCatalogo = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `UPDATE materias_catalogo SET activa = FALSE WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Materia no encontrada' });
    }
    return res.json({ success: true, message: 'Materia desactivada correctamente' });
  } catch (err) {
    console.error('Error en eliminarMateriaCatalogo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};