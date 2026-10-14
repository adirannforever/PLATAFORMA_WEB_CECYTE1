import { getFileMetadata } from './s3.service.js';

export const MAX_COMUNICADO_FILES = 5;
export const MAX_COMUNICADO_FILE_SIZE = 10 * 1024 * 1024;

export const COMUNICADO_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export class InvalidComunicadoAttachmentError extends Error {}

export function parseComunicadoUploadRequests(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COMUNICADO_FILES) {
    throw new InvalidComunicadoAttachmentError(
      `Selecciona de 1 a ${MAX_COMUNICADO_FILES} archivos para subir.`,
    );
  }

  return value.map((file) => {
    const { nombre, tipo, size } = file || {};
    if (
      typeof nombre !== 'string' ||
      nombre.trim().length === 0 ||
      nombre.length > 180 ||
      !COMUNICADO_FILE_TYPES.has(tipo) ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > MAX_COMUNICADO_FILE_SIZE
    ) {
      throw new InvalidComunicadoAttachmentError(
        'Uno o más archivos no son válidos. Adjunta imágenes o documentos de hasta 10 MB.',
      );
    }

    return { nombre: nombre.trim(), tipo, size };
  });
}

export function serializarArchivosComunicado(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.map(({ nombre, tipo }) => ({ nombre, tipo }));
}

export function parseComunicadoAttachments(value) {
  if (!Array.isArray(value) || value.length > MAX_COMUNICADO_FILES) {
    throw new InvalidComunicadoAttachmentError(`Se permiten hasta ${MAX_COMUNICADO_FILES} archivos por comunicado.`);
  }

  const seenKeys = new Set();
  return value.map((attachment) => {
    const { key, nombre, tipo, size } = attachment || {};
    if (
      typeof key !== 'string' ||
      !/^comunicados\/[a-f0-9-]{36}-[a-zA-Z0-9._-]{1,120}$/i.test(key) ||
      seenKeys.has(key) ||
      typeof nombre !== 'string' ||
      nombre.trim().length === 0 ||
      nombre.length > 180 ||
      !COMUNICADO_FILE_TYPES.has(tipo) ||
      !Number.isInteger(size) ||
      size < 1 ||
      size > MAX_COMUNICADO_FILE_SIZE
    ) {
      throw new InvalidComunicadoAttachmentError('Los datos de uno o más archivos adjuntos no son válidos.');
    }

    seenKeys.add(key);
    return { key, nombre: nombre.trim(), tipo, size };
  });
}

export async function verificarComunicadoAttachments(attachments) {
  const metadata = await Promise.all(attachments.map(async ({ key }) => {
    try {
      return await getFileMetadata(key);
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound') {
        throw new InvalidComunicadoAttachmentError('Uno o más archivos no terminaron de subirse.');
      }
      throw error;
    }
  }));

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    const actual = metadata[index];
    if (actual.size !== attachment.size || actual.type !== attachment.tipo) {
      throw new InvalidComunicadoAttachmentError(`El archivo "${attachment.nombre}" no coincide con los datos recibidos.`);
    }
  }
}

export function buildAttachmentDisposition(attachment) {
  const filename = attachment.nombre
    .replace(/[\r\n"]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');
  const disposition = attachment.tipo.startsWith('image/') ? 'inline' : 'attachment';
  return `${disposition}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(attachment.nombre)}`;
}
