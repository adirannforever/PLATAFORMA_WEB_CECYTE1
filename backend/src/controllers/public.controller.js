import { query } from '../config/db.js';
import { generateDownloadUrl } from '../services/s3.service.js';
import {
  buildAttachmentDisposition,
  serializarArchivosComunicado,
} from '../services/comunicados-attachments.service.js';

/**
 * ============================================================
 * PUBLIC — superficie no autenticada para el portal (landing).
 * ------------------------------------------------------------
 * Solo lectura, solo datos ya públicos:
 *  - avisos: comunicados activo=TRUE + dirigido_a_rol IS NULL
 *    (columnas blanqueadas y adjuntos limitados a nombre/tipo).
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
      `SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion, c.archivos
         FROM comunicados c
        WHERE c.activo = TRUE AND c.dirigido_a_rol IS NULL
        ORDER BY c.fecha_publicacion DESC
        LIMIT $1`,
      [limit]
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    const data = result.rows.map(({ archivos, ...aviso }) => ({
      ...aviso,
      archivos: serializarArchivosComunicado(archivos),
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error en getAvisos (public):', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const descargarAdjuntoAvisoPublico = async (req, res) => {
  const id = Number(req.params.id);
  const index = Number(req.params.index);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(index) || index < 0) {
    return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
  }

  try {
    const result = await query(
      `SELECT c.archivos FROM comunicados c
        WHERE c.id = $1 AND c.activo = TRUE AND c.dirigido_a_rol IS NULL`,
      [id],
    );
    const attachment = result.rows[0]?.archivos?.[index];
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    const url = await generateDownloadUrl(attachment.key, {
      contentType: attachment.tipo,
      contentDisposition: buildAttachmentDisposition(attachment),
    });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.redirect(302, url);
  } catch (err) {
    console.error('Error al generar descarga de adjunto público:', err);
    return res.status(500).json({ success: false, message: 'No se pudo abrir el archivo.' });
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
