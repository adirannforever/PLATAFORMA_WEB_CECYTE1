import { query } from '../config/db.js';


export const getComunicados = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion,
              u.nombre AS autor_nombre, u.apellidos AS autor_apellidos
       FROM comunicados c
       JOIN usuarios u ON u.id = c.autor_id
       WHERE c.activo = TRUE
       ORDER BY c.fecha_publicacion DESC`,
      []
    );

    return res.json({ success: true, comunicados: result.rows });
  } catch (err) {
    console.error('Error en getComunicados:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getComunicadoById = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.nombre AS autor_nombre, u.apellidos AS autor_apellidos
       FROM comunicados c JOIN usuarios u ON u.id = c.autor_id
       WHERE c.id = $1 AND c.activo = TRUE`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Comunicado no encontrado.' });
    }

    return res.json({ success: true, comunicado: result.rows[0] });
  } catch (err) {
    console.error('Error en getComunicadoById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const crearComunicado = async (req, res) => {
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({
      success: false,
      message: 'titulo y contenido son requeridos.',
    });
  }

  try {
    const result = await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [titulo.trim(), contenido.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Comunicado publicado.',
      comunicado: result.rows[0],
    });
  } catch (err) {
    console.error('Error en crearComunicado:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarComunicado = async (req, res) => {
  const { titulo, contenido, activo } = req.body;

  try {
    const result = await query(
      `UPDATE comunicados
       SET titulo    = COALESCE($1, titulo),
           contenido = COALESCE($2, contenido),
           activo    = COALESCE($3, activo)
       WHERE id = $4
       RETURNING *`,
      [titulo, contenido, activo, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Comunicado no encontrado.' });
    }

    return res.json({ success: true, message: 'Comunicado actualizado.', comunicado: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarComunicado:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
