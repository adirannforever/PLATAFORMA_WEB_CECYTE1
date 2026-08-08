import { query } from '../config/db.js';

export const getComunicados = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }

    const { rol } = req.user;
    let sql = `
      SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion, c.activo,
             u.nombre AS autor_nombre, u.apellidos AS autor_apellidos,
             c.dirigido_a_rol, c.dirigido_a_grupo
      FROM comunicados c
      JOIN usuarios u ON u.id = c.autor_id
      WHERE c.activo = TRUE
    `;

    if (rol === 'administrador') {
      // Admin ve todos
    } else if (rol === 'docente') {
      sql += ` AND (c.dirigido_a_rol IS NULL OR c.dirigido_a_rol = 'docente')`;
    } else if (rol === 'alumno') {
      sql += ` AND (c.dirigido_a_rol IS NULL OR c.dirigido_a_rol = 'alumno')`;
    } else {
      sql += ` AND c.dirigido_a_rol IS NULL`;
    }

    sql += ' ORDER BY c.fecha_publicacion DESC';
    const result = await query(sql);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getComunicados:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getComunicadoById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion, c.activo,
              u.nombre AS autor_nombre, u.apellidos AS autor_apellidos,
              c.dirigido_a_rol, c.dirigido_a_grupo
       FROM comunicados c
       JOIN usuarios u ON u.id = c.autor_id
       WHERE c.id = $1`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Comunicado no encontrado.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en getComunicadoById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const createComunicado = async (req, res) => {
  const { titulo, contenido, dirigido_a_rol, dirigido_a_grupo } = req.body;
  const autor_id = req.user.id;

  if (!titulo || !contenido) {
    return res.status(400).json({ success: false, message: 'Título y contenido son requeridos.' });
  }

  try {
    const result = await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id, dirigido_a_rol, dirigido_a_grupo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, contenido, autor_id, dirigido_a_rol || null, dirigido_a_grupo || null]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en createComunicado:', err);
    return res.status(500).json({ success: false, message: 'Error al crear comunicado.' });
  }
};

export const updateComunicado = async (req, res) => {
  const { id } = req.params;
  const { titulo, contenido, dirigido_a_rol, dirigido_a_grupo, activo } = req.body;

  const fields = [];
  const values = [];
  let idx = 1;

  if (titulo !== undefined) { fields.push(`titulo = $${idx++}`); values.push(titulo); }
  if (contenido !== undefined) { fields.push(`contenido = $${idx++}`); values.push(contenido); }
  if (dirigido_a_rol !== undefined) { fields.push(`dirigido_a_rol = $${idx++}`); values.push(dirigido_a_rol); }
  if (dirigido_a_grupo !== undefined) { fields.push(`dirigido_a_grupo = $${idx++}`); values.push(dirigido_a_grupo); }
  if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
  }

  values.push(id);
  const sql = `UPDATE comunicados SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

  try {
    const result = await query(sql, values);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Comunicado no encontrado.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error en updateComunicado:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar.' });
  }
};

export const deleteComunicado = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM comunicados WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Comunicado no encontrado.' });
    }
    return res.json({ success: true, message: 'Comunicado eliminado.' });
  } catch (err) {
    console.error('Error en deleteComunicado:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar.' });
  }
};