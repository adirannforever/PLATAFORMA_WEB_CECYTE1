import { query } from '../config/db.js';

export const getConceptosPago = async (req, res) => {
  try {
    const result = await query('SELECT * FROM conceptos_pago WHERE activo = TRUE ORDER BY nombre');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getConceptosPago:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getPagosAlumno = async (req, res) => {
  const { alumno_id } = req.params;
  try {
    const result = await query(
      `SELECT pa.*, cp.nombre AS concepto_nombre, ce.nombre AS ciclo
       FROM pagos_alumno pa
       JOIN conceptos_pago cp ON pa.concepto_id = cp.id
       LEFT JOIN ciclos_escolares ce ON pa.ciclo_id = ce.id
       WHERE pa.alumno_id = $1
       ORDER BY pa.fecha_pago DESC`,
      [alumno_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getPagosAlumno:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const registrarPago = async (req, res) => {
  const { alumno_id, concepto_id, ciclo_id, monto, folio_recibo, observaciones } = req.body;

  if (!alumno_id || !concepto_id || monto === undefined) {
    return res.status(400).json({ success: false, message: 'alumno_id, concepto_id y monto son requeridos.' });
  }

  try {
    const result = await query(
      `INSERT INTO pagos_alumno (alumno_id, concepto_id, ciclo_id, monto, folio_recibo, registrado_por, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [alumno_id, concepto_id, ciclo_id || null, monto, folio_recibo || null, req.user.id, observaciones || null]
    );

    return res.status(201).json({ success: true, message: 'Pago registrado correctamente.', data: result.rows[0] });
  } catch (err) {
    console.error('Error en registrarPago:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};