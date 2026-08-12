import { spawn, exec } from 'child_process';
import { mkdir, readFile, unlink } from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';

dotenv.config();

const execAsync = promisify(exec);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || !process.env.AWS_BUCKET_NAME) {
  console.warn('️ Faltan variables de entorno.');
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

const BUCKET = process.env.AWS_BUCKET_NAME;

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
        reject(new Error(`pg_dump se rindió. Código ${code}. Stderr: ${stderr}`));
      }
    });

    writeStream.on('error', reject);
  });
}

export async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql.gz`;

  const secureBackupDir = join(tmpdir(), 'backups_seguros_r2');
  await mkdir(secureBackupDir, { recursive: true });

  const sqlPath = join(secureBackupDir, `backup-${timestamp}.sql`);
  const gzPath = join(secureBackupDir, filename);

  console.log(` Iniciando backup...`);
  console.log(` Guardando archivos temporalmente: ${secureBackupDir}`);

  try {
    let pgDumpCmd = 'pg_dump';
    if (process.platform === 'win32') {
      const found = await findPgDumpWindows();
      if (found) {
        pgDumpCmd = found;
        console.log(` pg_dump localizado en: ${found}`);
      } else {
        console.warn('️ No encontré pg_dump. Buscando alternativa.');
      }
    }

    let connUrl = DATABASE_URL;
    if (connUrl.includes('sslmode=verify-full')) {
      connUrl = connUrl.replace('sslmode=verify-full', 'sslmode=require');
      console.log(' Bajando la restricción de SSL a "require".');
    }

    console.log(` Extrayendo tu base de datos...`);
    await runPgDumpWithCommand(pgDumpCmd, connUrl, sqlPath);

    console.log(' Comprimiendo...');
    const readStream = createReadStream(sqlPath);
    const writeStream = createWriteStream(gzPath);
    const gzip = createGzip();
    await pipeline(readStream, gzip, writeStream);
    console.log(` Archivo listo: ${gzPath}`);

    console.log(`️ Subiendo a la nube...`);
    const fileBuffer = await readFile(gzPath);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: fileBuffer,
      ContentType: 'application/gzip',
    }));
    console.log(` Backup completado y subido: ${filename}`);

    
    const list = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));
    const files = list.Contents || [];
    const sorted = files.sort((a, b) => a.Key.localeCompare(b.Key));
    const toDelete = sorted.slice(0, Math.max(0, sorted.length - 7));
    for (const item of toDelete) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: item.Key }));
      console.log(`️ Backup antiguo eliminado: ${item.Key}`);
    }

    console.log(' Todo terminado. Sistema impecable.');
  } finally {
    console.log(` Limpiando directorio temporal...`);
    await unlink(sqlPath).catch(() => {});
    await unlink(gzPath).catch(() => {});
  }
}


