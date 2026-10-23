// ============================================================================
// probe-r2.cjs — Prueba activa de conexión a Cloudflare R2 (S3-compatible)
// ============================================================================

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

const LOG_PREFIX = '[R2-PROBE]';

function log(msg, color = RESET) {
  console.log(`${color}${LOG_PREFIX} ${msg}${RESET}`);
}
function ok(msg) { console.log(`${GREEN}[OK]${RESET} ${LOG_PREFIX} ${msg}`); }
function err(msg) { console.log(`${RED}[ERR]${RESET} ${LOG_PREFIX} ${msg}`); }
function info(msg) { console.log(`${CYAN}[INFO]${RESET} ${LOG_PREFIX} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}[WARN]${RESET} ${LOG_PREFIX} ${msg}`); }

const AWS_REGION = process.env.AWS_REGION || 'auto';
const AWS_ENDPOINT = process.env.AWS_ENDPOINT;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const TEST_KEY = `probe-r2/${Date.now()}-test-object.bin`;
const TEST_CONTENT = Buffer.from(`CECyTE R2 connectivity probe - ${new Date().toISOString()}\n`);
const TEST_CONTENT_HASH = createHash('sha256').update(TEST_CONTENT).digest('hex');

const results = [];
let passed = 0;
let failed = 0;

function check(name, okFlag, detail = '') {
  results.push({ name, ok: okFlag, detail });
  if (okFlag) { passed += 1; ok(`${name}${detail ? ` — ${detail}` : ''}`); }
  else { failed += 1; err(`${name}${detail ? ` — ${detail}` : ''}`); }
}

// ============================================================================
// Verificación de configuración temprana
// ============================================================================

const missing = [];
if (!AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
if (!AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
if (!AWS_BUCKET_NAME) missing.push('AWS_BUCKET_NAME');
if (!AWS_ENDPOINT) missing.push('AWS_ENDPOINT');

if (missing.length > 0) {
  err('Faltan variables de entorno requeridas: ' + missing.join(', '));
  info('Copie backend/.env.example a backend/.env y complete los valores de Cloudflare R2.');
  process.exit(1);
}

info(`Región: ${AWS_REGION}`);
info(`Endpoint: ${AWS_ENDPOINT}`);
info(`Bucket: ${AWS_BUCKET_NAME}`);
info(`Objeto de prueba: ${TEST_KEY}`);

// ============================================================================
// Cliente S3 (configurado para Cloudflare R2)
// ============================================================================

const s3Client = new S3Client({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// ============================================================================
// Chequeos
// ============================================================================

async function checkS3ClientInitialized() {
  const start = Date.now();
  try {
    if (!s3Client) throw new Error('S3Client no se inicializó');
    check('S3Client_inicializado', true, `${Date.now() - start} ms`);
  } catch (e) {
    check('S3Client_inicializado', false, e.message);
  }
}

async function checkBucketAccessible() {
  const start = Date.now();
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: '__r2_probe_bucket_check__',
    }));
    check('Bucket_accesible', true, `${Date.now() - start} ms`);
  } catch (e) {
    const status = e.$metadata?.httpStatusCode;
    const code = e.name || e.code;
    if (status === 404 || code === 'NotFound' || code === 'NoSuchKey') {
      check('Bucket_accesible', true, `${Date.now() - start} ms (objeto no existe, bucket responde 404)`);
    } else if (code === 'NoSuchBucket' || status === 404) {
      check('Bucket_accesible', false, `Bucket no existe o no accesible: ${e.message}`);
    } else {
      check('Bucket_accesible', false, `${e.message} (status=${status}, code=${code})`);
    }
  }
}

async function checkUploadObject() {
  const start = Date.now();
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: TEST_KEY,
      Body: TEST_CONTENT,
      ContentType: 'application/octet-stream',
      ContentLength: TEST_CONTENT.length,
    }));
    check('Upload_objeto_prueba', true, `${Date.now() - start} ms, ${TEST_CONTENT.length} bytes`);
  } catch (e) {
    check('Upload_objeto_prueba', false, `${Date.now() - start} ms — ${e.message}`);
  }
}

async function checkDownloadAndVerify() {
  const start = Date.now();
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: TEST_KEY,
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const downloaded = Buffer.concat(chunks);
    const downloadedHash = createHash('sha256').update(downloaded).digest('hex');

    const sizeOk = downloaded.length === TEST_CONTENT.length;
    const hashOk = downloadedHash === TEST_CONTENT_HASH;

    if (sizeOk && hashOk) {
      check('Download_y_verificacion', true, `${Date.now() - start} ms, ${downloaded.length} bytes, SHA-256 coincide`);
    } else {
      check('Download_y_verificacion', false, `Tamaño: ${downloaded.length} vs ${TEST_CONTENT.length}, Hash: ${downloadedHash} vs ${TEST_CONTENT_HASH}`);
    }
  } catch (e) {
    check('Download_y_verificacion', false, `${Date.now() - start} ms — ${e.message}`);
  }
}

async function checkCleanup() {
  const start = Date.now();
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: TEST_KEY,
    }));
    check('Limpieza_objeto_prueba', true, `${Date.now() - start} ms`);
  } catch (e) {
    check('Limpieza_objeto_prueba', false, `${Date.now() - start} ms — ${e.message}`);
  }
}


// ============================================================================
// Ejecución principal
// ============================================================================

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(' PRUEBA ACTIVA DE CONEXIÓN A CLOUDFLARE R2');
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  await checkS3ClientInitialized();
  await checkBucketAccessible();
  await checkUploadObject();
  await checkDownloadAndVerify();
  await checkCleanup();

  // Resumen final
  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log(` RESULTADO: ${passed}/${passed + failed} checks pasaron`);
  console.log(`   Aprobados: ${passed}`);
  console.log(`   Fallidos: ${failed}`);
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    err('La conexión a Cloudflare R2 NO está funcionando correctamente.');
    console.log('\nDetalles de fallos:');
    for (const r of results) {
      if (!r.ok) console.log(`  ✗ ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    ok('Cloudflare R2 responde correctamente. La conexión está activa.');
    process.exit(0);
  }
}

main().catch((e) => {
  err(`Error inesperado: ${e.message}`);
  process.exit(1);
});

