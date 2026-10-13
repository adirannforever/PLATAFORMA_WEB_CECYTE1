import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

// Configurar cliente S3 (compatible con Cloudflare R2)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, 
});

const BUCKET = process.env.AWS_BUCKET_NAME;
const EXPIRES_IN = 60 * 5; 

// ============================================================
// Validación de entorno: fallar RÁPIDO y con mensaje claro en
// vez de firmar URLs inválidas con bucket/credenciales undefined.
// ============================================================
const exigirConfigS3 = (accion) => {
  const faltantes = [];
  if (!BUCKET) faltantes.push('AWS_BUCKET_NAME');
  if (!process.env.AWS_ACCESS_KEY_ID) faltantes.push('AWS_ACCESS_KEY_ID');
  if (!process.env.AWS_SECRET_ACCESS_KEY) faltantes.push('AWS_SECRET_ACCESS_KEY');
  if (faltantes.length > 0) {
    throw new Error(
      `S3 no configurado: faltan variables [${faltantes.join(', ')}] (no se pudo ${accion})`
    );
  }
};

// ============================================================
// Sanitiza el nombre de archivo para usarlo dentro de la key:
// sin acentos, sin espacios raros, sin separadores de ruta.
// ============================================================
export const sanitizarNombreArchivo = (fileName) => {
  const base = String(fileName || 'archivo')
    .normalize('NFD')                       // Ñ → N + ˜
    .replace(/[\u0300-\u036f]/g, '')        // quita acentos
    .replace(/[/\\]/g, '-')                 // separadores de ruta
    .replace(/\.\.+/g, '.')                 // colapsa puntos (evita ../)
    .replace(/[^a-zA-Z0-9._-]/g, '_')       // solo caracteres seguros
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')                 // no iniciar con . _ -
    .slice(0, 120) || 'archivo';
  return base;
};

export async function generateUploadUrl(fileName, fileType) {
  exigirConfigS3('generar URL de subida');
  const key = `horarios/${Date.now()}-${sanitizarNombreArchivo(fileName)}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: fileType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
  return { url, key };
}

export async function generateComunicadoUploadUrl(fileName, fileType) {
  exigirConfigS3('generar URL de subida');
  const key = `comunicados/${randomUUID()}-${sanitizarNombreArchivo(fileName)}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: fileType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
  return { url, key };
}

export async function generateDownloadUrl(key, options = {}) {
  exigirConfigS3('generar URL de descarga');
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(options.contentType ? { ResponseContentType: options.contentType } : {}),
    ...(options.contentDisposition ? { ResponseContentDisposition: options.contentDisposition } : {}),
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
  return url;
}

// Verifica que un objeto exista en el bucket (HeadObject).
// Devuelve false si no existe o si S3 no está disponible.
export async function fileExists(key) {
  exigirConfigS3('verificar archivo');
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
      return false;
    }
    throw err; // errores de red/config: el caller decide
  }
}

export async function getFileMetadata(key) {
  exigirConfigS3('verificar metadata del archivo');
  const result = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    size: result.ContentLength,
    type: result.ContentType,
  };
}

export async function deleteFile(key) {
  exigirConfigS3('eliminar archivo');
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (err) {
    // 404: ya no existe — no es un error (idempotente)
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
      return false;
    }
    throw err;
  }
}