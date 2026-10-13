import { query } from '../config/db.js';

/**
 * ============================================================
 * PUBLIC — superficie no autenticada para el portal (landing).
 * ------------------------------------------------------------
 * Solo lectura, solo datos ya públicos:
 *  - avisos: comunicados activo=TRUE + dirigido_a_rol IS NULL
 *    (solo columnas blanqueadas).
 *    NUNCA expone autor_id, storage keys, dirigido_a_rol/grupo ni activo.
 *  - resumen: conteos agregados (especialidades, ciclo activo).
 *    Sin PII, sin filas de usuarios.
 * ============================================================
 */

const AVISOS_LIMIT_DEFAULT = 6;
const AVISOS_LIMIT_MAX = 20;

export const getAvisos = async (req, res) => {
  try {
    const limit = req.query?.limit ?? AVISOS_LIMIT_DEFAULT;
    const result = await query(
      `SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion
         FROM comunicados c
        WHERE c.activo = TRUE AND c.dirigido_a_rol IS NULL
        ORDER BY c.fecha_publicacion DESC
        LIMIT $1`,
      [limit]
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    const data = result.rows;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error en getAvisos (public):', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const getResumen = async (req, res) => {
  try {
    const [espRes, cicloRes, gruposRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM especialidades'),
      query('SELECT nombre FROM ciclos_escolares WHERE activo = TRUE LIMIT 1'),
      query('SELECT COUNT(*)::int AS total FROM grupos WHERE activo = TRUE'),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      success: true,
      data: {
        especialidades: espRes.rows[0]?.total ?? 0,
        grupos_activos: gruposRes.rows[0]?.total ?? 0,
        ciclo_activo: cicloRes.rows[0]?.nombre ?? null,
      },
    });
  } catch (err) {
    console.error('Error en getResumen (public):', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};
