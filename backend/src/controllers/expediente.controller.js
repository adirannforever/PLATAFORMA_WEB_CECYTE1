import { query } from '../config/db.js';

export const getExpedienteAlumno = async (req, res) => {
  const { alumno_id } = req.params;
  try {
    const result = await query(
      `SELECT cd.id AS documento_id, cd.clave, cd.nombre AS documento_nombre, cd.etapa, cd.obligatorio,
              COALESCE(ed.entregado, FALSE) AS entregado,
              ed.fecha_entrega, ed.observaciones,
              u.nombre || ' ' || u.apellidos AS recibido_por_nombre
       FROM catalogo_documentos cd
       LEFT JOIN expediente_documentos ed ON ed.documento_id = cd.id AND ed.alumno_id = $1
       LEFT JOIN usuarios u ON u.id = ed.recibido_por
       ORDER BY cd.etapa, cd.nombre`,
      [alumno_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getExpedienteAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const actualizarDocumentoExpediente = async (req, res) => {
  const { alumno_id, documento_id, entregado, observaciones } = req.body;

  try {
    const result = await query(
      `INSERT INTO expediente_documentos (alumno_id, documento_id, entregado, fecha_entrega, recibido_por, observaciones)
       VALUES ($1, $2, $3, CASE WHEN $3 = TRUE THEN CURRENT_DATE ELSE NULL END, $4, $5)
       ON CONFLICT (alumno_id, documento_id)
       DO UPDATE SET entregado = EXCLUDED.entregado,
                     fecha_entrega = EXCLUDED.fecha_entrega,
                     recibido_por = EXCLUDED.recibido_por,
                     observaciones = EXCLUDED.observaciones
       RETURNING *`,
      [alumno_id, documento_id, entregado, req.user.id, observaciones || null]
    );

    return res.json({ success: true, message: 'Expediente actualizado.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en actualizarDocumentoExpediente:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};