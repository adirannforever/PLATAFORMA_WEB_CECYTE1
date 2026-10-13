import { query } from '../config/db.js';
import { generateComunicadoUploadUrl, generateDownloadUrl } from '../services/s3.service.js';
import {
  buildAttachmentDisposition,
  COMUNICADO_FILE_TYPES,
  InvalidComunicadoAttachmentError,
  MAX_COMUNICADO_FILE_SIZE,
  parseComunicadoAttachments,
  serializarArchivosComunicado,
  verificarComunicadoAttachments,
} from '../services/comunicados-attachments.service.js';

export const getComunicados = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }

    const { rol } = req.user;
    let sql = `
      SELECT c.id, c.titulo, c.contenido, c.fecha_publicacion, c.activo, c.archivos,
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
    const data = result.rows.map((comunicado) => ({
      ...comunicado,
      archivos: serializarArchivosComunicado(comunicado.archivos),
    }));
    return res.json({ success: true, data });
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
    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        archivos: serializarArchivosComunicado(result.rows[0].archivos),
      },
    });
  } catch (err) {
    console.error('Error en getComunicadoById:', err);
    return res.status(500).json({ success: false, message: 'Error interno.' });
  }
};

export const solicitarUploadComunicado = async (req, res) => {
  const { nombre, tipo, size } = req.body || {};
  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.length > 180 ||
    !COMUNICADO_FILE_TYPES.has(tipo) ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > MAX_COMUNICADO_FILE_SIZE
  ) {
    return res.status(400).json({
      success: false,
      message: 'Archivo no válido. Adjunta una imagen o documento permitido de hasta 10 MB.',
    });
  }

  try {
    const { url, key } = await generateComunicadoUploadUrl(nombre, tipo);
    return res.json({ success: true, data: { uploadUrl: url, key, expiresIn: 300 } });
  } catch (err) {
    console.error('Error al solicitar subida de adjunto de comunicado:', err);
    return res.status(500).json({ success: false, message: 'No se pudo preparar la subida del archivo.' });
  }
};

export const descargarAdjuntoComunicado = async (req, res) => {
  const id = Number(req.params.id);
  const index = Number(req.params.index);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(index) || index < 0) {
    return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
  }

  try {
    const rol = req.user?.rol;
    const params = [id];
    let roleFilter = '';
    if (rol === 'docente' || rol === 'alumno') {
      params.push(rol);
      roleFilter = ' AND (c.dirigido_a_rol IS NULL OR c.dirigido_a_rol = $2)';
    } else if (rol !== 'administrador') {
      roleFilter = ' AND c.dirigido_a_rol IS NULL';
    }

    const result = await query(
      `SELECT c.archivos FROM comunicados c
       WHERE c.id = $1 AND c.activo = TRUE${roleFilter}`,
      params,
    );
    const attachment = result.rows[0]?.archivos?.[index];
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }

    const url = await generateDownloadUrl(attachment.key, {
      contentType: attachment.tipo,
      contentDisposition: buildAttachmentDisposition(attachment),
    });
    return res.redirect(302, url);
  } catch (err) {
    console.error('Error al generar descarga de adjunto de comunicado:', err);
    return res.status(500).json({ success: false, message: 'No se pudo abrir el archivo.' });
  }
};

export const createComunicado = async (req, res) => {
  const { titulo, contenido, dirigido_a_rol, dirigido_a_grupo } = req.body;
  const autor_id = req.user.id;
  let archivos;

  if (!titulo || !contenido) {
    return res.status(400).json({ success: false, message: 'Título y contenido son requeridos.' });
  }

  try {
    archivos = parseComunicadoAttachments(req.body.archivos ?? []);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  try {
    await verificarComunicadoAttachments(archivos);
    const result = await query(
      `INSERT INTO comunicados (titulo, contenido, autor_id, dirigido_a_rol, dirigido_a_grupo, archivos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [titulo, contenido, autor_id, dirigido_a_rol || null, dirigido_a_grupo || null, JSON.stringify(archivos)]
    );
    return res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        archivos: serializarArchivosComunicado(result.rows[0].archivos),
      },
    });
  } catch (err) {
    if (err instanceof InvalidComunicadoAttachmentError) {
      return res.status(400).json({ success: false, message: err.message });
    }
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