import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

export async function generateUploadUrl(fileName, fileType) {
  const key = `horarios/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: fileType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
  return { url, key };
}

export async function generateDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: EXPIRES_IN });
  return url;
}

export async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}