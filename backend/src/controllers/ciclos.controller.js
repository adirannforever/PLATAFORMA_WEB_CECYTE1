import { query } from '../config/db.js';

export const getCiclos = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, fecha_inicio, fecha_fin, activo
       FROM ciclos_escolares
       ORDER BY fecha_inicio DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getCiclos:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const crearCiclo = async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, activo } = req.body;
  if (!nombre || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ success: false, message: 'Nombre, fecha_inicio y fecha_fin son requeridos' });
  }
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `INSERT INTO ciclos_escolares (nombre, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre, fecha_inicio, fecha_fin, activo || false]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un ciclo con ese nombre' });
    }
    console.error('Error en crearCiclo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const actualizarCiclo = async (req, res) => {
  const { id } = req.params;
  const { nombre, fecha_inicio, fecha_fin, activo } = req.body;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); values.push(nombre); }
    if (fecha_inicio !== undefined) { fields.push(`fecha_inicio = $${idx++}`); values.push(fecha_inicio); }
    if (fecha_fin !== undefined) { fields.push(`fecha_fin = $${idx++}`); values.push(fecha_fin); }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }
    values.push(id);
    const sql = `UPDATE ciclos_escolares SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarCiclo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

export const eliminarCiclo = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const result = await query(
      `UPDATE ciclos_escolares SET activo = FALSE WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Ciclo no encontrado' });
    }
    return res.json({ success: true, message: 'Ciclo desactivado correctamente' });
  } catch (err) {
    console.error('Error en eliminarCiclo:', err);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};