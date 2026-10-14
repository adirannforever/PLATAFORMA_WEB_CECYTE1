import { query, withTransaction } from '../config/db.js';
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

// Catálogos mínimos para el formulario de pre-registro de la landing.
// Solo id/nombre: sin PII, sin datos internos, cacheable.
export const getCatalogosPublicos = async (req, res) => {
  try {
    const [espRes, turnosRes] = await Promise.all([
      query('SELECT id, clave, nombre FROM especialidades ORDER BY nombre'),
      query('SELECT id, nombre FROM turnos ORDER BY id'),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.json({
      success: true,
      data: {
        especialidades: espRes.rows,
        turnos: turnosRes.rows,
      },
    });
  } catch (err) {
    console.error('Error en getCatalogosPublicos:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

/**
 * POST /api/public/pre-registro — alta pública de aspirante (estatus 'registrado').
 * - NO envía invitación: requiere un usuario autenticado como creador y correo
 *   verificado; Control Escolar la reenvía desde el panel de aspirantes.
 * - Resuelve ciclo activo y folio en el server; el público solo manda datos personales.
 * - Honeypot `website`: si viene relleno, responder como un éxito real sin insertar.
 */
export const preRegistro = async (req, res) => {
  const { nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, website } = req.body;

  if (website && website.trim() !== '') {
    return res.status(201).json({
      success: true,
      message: 'Pre-registro recibido.',
      data: { folio: `ASP-${Date.now().toString().slice(-6)}` },
    });
  }

  try {
    const cicloRes = await query(
      'SELECT id, nombre FROM ciclos_escolares WHERE activo = TRUE LIMIT 1'
    );
    const ciclo = cicloRes.rows[0];
    if (!ciclo) {
      return res.status(503).json({
        success: false,
        message: 'No hay un ciclo de admisión activo en este momento. Consulta los avisos o contáctanos.',
      });
    }

    const folio = `ASP-${Date.now().toString().slice(-6)}`;
    await withTransaction(async (client) => {
      const existente = await client.query(
        'SELECT id FROM aspirantes WHERE LOWER(email) = LOWER($1) OR UPPER(curp) = UPPER($2) LIMIT 1',
        [email, curp]
      );
      if (existente.rows[0]) {
        const conflict = new Error('Ya existe una solicitud con ese correo o CURP.');
        conflict.code = 'ASPIRANTE_DUPLICADO';
        throw conflict;
      }

      await client.query(
        `INSERT INTO aspirantes
          (nombre, apellidos, curp, email, telefono, especialidad_id, turno_preferido_id, ciclo_id, folio, estatus)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'registrado')`,
        [
          nombre.trim(),
          apellidos.trim(),
          curp.trim().toUpperCase(),
          email.trim().toLowerCase(),
          telefono?.trim() || null,
          especialidad_id,
          turno_preferido_id,
          ciclo.id,
          folio.trim(),
        ]
      );
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({
      success: true,
      message:
        'Pre-registro recibido. Guarda tu folio: Control Escolar revisará tu solicitud y recibirás aviso de los siguientes pasos.',
      data: { folio, ciclo: ciclo.nombre },
    });
  } catch (err) {
    if (err.code === 'ASPIRANTE_DUPLICADO') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una solicitud con ese correo o CURP. Contacta a Control Escolar para recuperar tu folio.',
      });
    }
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'La especialidad o el turno seleccionado no es válido. Actualiza la página e inténtalo de nuevo.',
      });
    }
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'No se pudo generar tu folio. Intenta de nuevo en unos segundos.',
      });
    }
    console.error('Error en preRegistro (public):', err);
    return res.status(500).json({ success: false, message: 'Error interno. Intenta de nuevo más tarde.' });
  }
};
