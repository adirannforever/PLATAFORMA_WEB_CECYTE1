import { query } from '../config/db.js';

export const getAspirantes = async (req, res) => {
  try {
    const { ciclo_id, estatus } = req.query;
    let sql = `
      SELECT a.*, e.nombre AS especialidad, t.nombre AS turno_preferido, c.nombre AS ciclo
      FROM aspirantes a
      JOIN especialidades e ON a.especialidad_id = e.id
      JOIN turnos t ON a.turno_preferido_id = t.id
      JOIN ciclos_escolares c ON a.ciclo_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (ciclo_id) {
      params.push(ciclo_id);
      sql += ` AND a.ciclo_id = $${params.length}`;
    }
    if (estatus) {
      params.push(estatus);
      sql += ` AND a.estatus = $${params.length}`;
    }

    sql += ' ORDER BY a.fecha_registro DESC';
    const result = await query(sql, params);

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAspirantes:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearAspirante = async (req, res) => {
  const { folio, nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id } = req.body;

  if (!folio || !nombre || !apellidos || !curp || !email || !especialidad_id || !turno_preferido_id || !ciclo_id) {
    return res.status(400).json({ success: false, message: 'Todos los campos obligatorios deben completarse.' });
  }

  try {
    const result = await query(
      `INSERT INTO aspirantes (folio, nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [folio.trim(), nombre.trim(), apellidos.trim(), curp.toUpperCase().trim(), email.toLowerCase().trim(), telefono, especialidad_id, turno_preferido_id, ciclo_id]
    );

    return res.status(201).json({ success: true, message: 'Aspirante registrado correctamente.', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'El folio, CURP o correo ya están registrados.' });
    }
    console.error('Error en crearAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarEstatusAspirante = async (req, res) => {
  const { estatus } = req.body;
  const { id } = req.params;

  try {
    const result = await query(
      'UPDATE aspirantes SET estatus = $1 WHERE id = $2 RETURNING *',
      [estatus, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Aspirante no encontrado.' });
    }

    return res.json({ success: true, message: 'Estatus actualizado.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarEstatusAspirante:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};