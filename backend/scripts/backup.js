import { spawn, exec } from 'child_process';
import { mkdir, readFile, unlink } from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

dotenv.config();

const execAsync = promisify(exec);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida. Abortando: no se puede generar el backup.');
  process.exit(1);
}

const BUCKET = process.env.AWS_BUCKET_NAME;
const S3_ENABLED = !!BUCKET && !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

if (!S3_ENABLED) {
  console.warn('⚠️  AWS_BUCKET_NAME / credenciales no definidas: el backup se generará localmente pero NO se subirá a la nube.');
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function s3SendWithTimeout(command, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await s3.send(command, { abortSignal: controller.signal });
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function findPgDumpWindows() {
  const possiblePaths = [
    'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',
    'C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',
    'C:/Program Files/PostgreSQL/16/bin/pg_dump.exe',
    'C:/Program Files/PostgreSQL/15/bin/pg_dump.exe',
    'C:/Program Files/PostgreSQL/14/bin/pg_dump.exe',
  ];
  for (const p of possiblePaths) {
    try {
      await execAsync(`"${p}" --version`);
      return p;
    } catch {
      // continuar
    }
  }
  return null;
}

async function runPgDumpWithCommand(cmd, connUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [connUrl, '--format=plain', '--no-owner', '--no-privileges'];
    const pgDump = spawn(cmd, args, { shell: false });

    const writeStream = createWriteStream(outputPath);
    let stderr = '';

    pgDump.stdout.pipe(writeStream);
    pgDump.stderr.on('data', (data) => { stderr += data.toString(); });

    pgDump.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump falló. Código ${code}. Stderr: ${stderr}`));
      }
    });

    writeStream.on('error', reject);
  });
}

async function ensureBucketAccessible() {
  if (!S3_ENABLED) return false;
  try {
    await s3SendWithTimeout(new HeadBucketCommand({ Bucket: BUCKET }), 30000);
    log(`✅ Bucket accesible: ${BUCKET}`);
    return true;
  } catch (e) {
    log(`❌ No se puede acceder al bucket ${BUCKET}: ${e.message}`);
    return false;
  }
}

export async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql.gz`;

  const secureBackupDir = join(tmpdir(), 'backups_seguros_r2');
  await mkdir(secureBackupDir, { recursive: true });

  const sqlPath = join(secureBackupDir, `backup-${timestamp}.sql`);
  const gzPath = join(secureBackupDir, filename);

  log(`🚀 Iniciando backup de base de datos...`);
  log(`📁 Directorio temporal: ${secureBackupDir}`);

  let uploadOk = false;

  try {
    let pgDumpCmd = 'pg_dump';
    if (process.platform === 'win32') {
      const found = await findPgDumpWindows();
      if (found) {
        pgDumpCmd = found;
        log(`📍 pg_dump localizado en: ${found}`);
      } else {
        log('⚠️  No se encontró pg_dump en rutas estándar de Windows.');
      }
    }

    let connUrl = DATABASE_URL;
    if (connUrl.includes('sslmode=verify-full')) {
      connUrl = connUrl.replace('sslmode=verify-full', 'sslmode=require');
      log('🔒 Ajustando SSL de verify-full a require.');
    }

    log(`📤 Extrayendo base de datos...`);
    await runPgDumpWithCommand(pgDumpCmd, connUrl, sqlPath);

    log(`🗜️  Comprimiendo backup...`);
    const readStream = createReadStream(sqlPath);
    const writeStream = createWriteStream(gzPath);
    const gzip = createGzip();
    await pipeline(readStream, gzip, writeStream);

    const { stat } = await import('fs/promises');
    const stats = await stat(gzPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    log(`📦 Archivo comprimido listo: ${gzPath} (${sizeMB} MB)`);

    if (S3_ENABLED) {
      const bucketOk = await ensureBucketAccessible();
      if (bucketOk) {
        log(`☁️  Subiendo a la nube (R2)...`);
        const fileBuffer = await readFile(gzPath);
        await s3SendWithTimeout(new PutObjectCommand({
          Bucket: BUCKET,
          Key: filename,
          Body: fileBuffer,
          ContentType: 'application/gzip',
        }), 300000);
        log(`✅ Backup subido exitosamente: ${filename}`);
        uploadOk = true;
      } else {
        log('⚠️  Omitiendo subida a la nube: bucket no accesible.');
      }
    } else {
      log('📂 S3/R2 no configurado. Backup solo local.');
    }

    
    if (S3_ENABLED && uploadOk) {
      log(`🧹 Aplicando política de retención (últimos 7 backups)...`);
      const list = await s3SendWithTimeout(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'backup-' }), 30000);
      const files = list.Contents || [];
      const sorted = files.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));
      const toDelete = sorted.slice(0, Math.max(0, sorted.length - 7));
      for (const item of toDelete) {
        await s3SendWithTimeout(new DeleteObjectCommand({ Bucket: BUCKET, Key: item.Key }), 30000);
        log(`🗑️  Backup antiguo eliminado: ${item.Key}`);
      }
    }

    log(`✅ Backup completado. Sistema impecable.`);
  } catch (e) {
    log(`❌ Error durante el backup: ${e.message}`);
    throw e;
  } finally {
    log(`🧹 Limpiando archivos temporales...`);
    await unlink(sqlPath).catch(() => {});
    await unlink(gzPath).catch(() => {});
  }

  return { uploadOk, filename, timestamp };
}


