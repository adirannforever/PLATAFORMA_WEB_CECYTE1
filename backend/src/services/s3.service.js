import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID) {
  console.warn("Advertencia: Faltan variables de entorno para R2. Revisa tu .env.");
}

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

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9.-]/g, '_');

export async function generateUploadUrl(fileName, fileType, folder = 'horarios') {
  try {
    if (!fileName || !fileType) throw new Error("Faltan datos para generar la firma.");

    const cleanName = sanitizeFileName(fileName);
    const key = `${folder}/${Date.now()}-${cleanName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
    return { url, key };
  } catch (error) {
    console.error("Error al generar URL de subida:", error);
    throw new Error("No se pudo generar el acceso para subir el archivo.");
  }
}

export async function generateDownloadUrl(key) {
  try {
    if (!key) throw new Error("Necesitas proveer la llave exacta.");

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
    return url;
  } catch (error) {
    console.error("Error al generar URL de descarga:", error);
    throw new Error("No se pudo generar el acceso para descargar el archivo.");
  }
}