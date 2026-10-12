// ============================================================
// Smoke tests de los servicios del backend.
// Valida que los servicios de generación y soporte SÍ funcionan:
//   1. PDF (ReportLab)      → boleta + constancia, magic %PDF
//   2. DOCX (python-docx)   → plantilla de horario, magic PK
//   3. Excel (openpyxl)     → listado + estadísticas, magic PK
//   4. S3                    → sanitización de keys + validación de env
//   5. Redis                 → stub deshabilitado sin crash (o real si hay REDIS_URL)
//   6. Logo institucional    → legibilidad (informativo)
//   7. Mailer                → verificación de conexión (informativo, no bloquea)
//
// Ejecutar: npm run test:servicios
// ============================================================
import { generarBoletaPDF, generarConstanciaPDF } from '../src/utils/pdfGenerator.js';
import { generarPlantillaHorarioDOCX } from '../src/utils/docxGenerator.js';
import { generarListadoAlumnosExcel, generarEstadisticasExcel } from '../src/utils/excelGenerator.js';
import { sanitizarNombreArchivo } from '../src/services/s3.service.js';
import redisClient from '../src/config/redis.js';
import { testConnection as testMailConnection } from '../src/services/mailer.service.js';

let pasados = 0;
let fallidos = 0;

const check = (nombre, condicion, detalle = '') => {
  if (condicion) {
    pasados++;
    console.log(`  ✔ ${nombre}`);
  } else {
    fallidos++;
    console.error(`  ✖ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  }
};

const info = (nombre, detalle) => {
  console.log(`  ℹ ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const esPdf = (buf) => Buffer.isBuffer(buf) && buf.subarray(0, 4).toString() === '%PDF';
const esZip = (buf) => Buffer.isBuffer(buf) && buf.subarray(0, 2).toString() === 'PK';

const alumnoPrueba = {
  apellidos: 'Pérez López',
  nombre: 'Juan Carlos',
  matricula: '2024010001',
  semestre_actual: 3,
  grupo_nombre: '3° A',
  especialidad_nombre: 'Programación',
  ciclo_nombre: '2024-2025',
  estatus: 'activo',
};

const materiasPrueba = [
  { nombre: 'Matemáticas', parciales: [null, 8, 9, 7], promedio: 8 },
  { nombre: 'Programación', parciales: [null, 9, 9, 10], promedio: 9.3 },
];

async function testPdf() {
  console.log('\n[1] Servicio PDF (motor Python · ReportLab)');
  try {
    const boleta = await generarBoletaPDF(alumnoPrueba, materiasPrueba, 8.5, { p1Prom: 8, p2Prom: 9, p3Prom: 8 });
    check('Boleta PDF se genera', esPdf(boleta), 'magic %PDF ausente');
    check('Boleta PDF tiene tamaño razonable', boleta.length > 1000, `${boleta.length} bytes`);
  } catch (err) {
    check('Boleta PDF se genera', false, err.message);
  }

  try {
    const sinCalificaciones = await generarBoletaPDF(alumnoPrueba, [], null, {});
    check('Boleta PDF sin materias (caso límite)', esPdf(sinCalificaciones));
  } catch (err) {
    check('Boleta PDF sin materias (caso límite)', false, err.message);
  }

  for (const tipo of ['estudios', 'conducta', 'beca']) {
    try {
      const constancia = await generarConstanciaPDF(alumnoPrueba, tipo, tipo === 'beca'
        ? { nombre_beca: 'Beca FE', monto: 1500, estatus: 'activa' }
        : null);
      check(`Constancia tipo "${tipo}"`, esPdf(constancia), 'magic %PDF ausente');
    } catch (err) {
      check(`Constancia tipo "${tipo}"`, false, err.message);
    }
  }
}

async function testDocx() {
  console.log('\n[2] Servicio DOCX (motor Python · python-docx)');
  try {
    const buf = await generarPlantillaHorarioDOCX({
      tipo: 'grupo',
      nombre: '3° A',
      semestre: 3,
      ciclo: '2024-2025',
      especialidad: 'Programación',
      turno: 'Matutino',
      letra: 'A',
    });
    check('Plantilla DOCX se genera', esZip(buf), 'magic PK ausente');
    check('Plantilla DOCX tiene tamaño razonable', buf.length > 1000, `${buf.length} bytes`);
  } catch (err) {
    check('Plantilla DOCX se genera', false, err.message);
  }
}

async function testExcel() {
  console.log('\n[3] Servicio Excel (motor Python · openpyxl)');
  try {
    const listado = await generarListadoAlumnosExcel([
      { matricula: '1', apellidos: 'Pérez', nombre: 'Juan', semestre_actual: 3, grupo_nombre: '3° A', grupo_letra: 'A', especialidad_nombre: 'Programación', estatus: 'activo' },
    ]);
    check('Listado Excel se genera', esZip(listado), 'magic PK ausente');
  } catch (err) {
    check('Listado Excel se genera', false, err.message);
  }

  try {
    const stats = await generarEstadisticasExcel([
      { grupo_nombre: '3° A', grupo_letra: 'A', materia_nombre: 'Matemáticas', total_alumnos: 10, promedio_materia: 8.2, aprobados: 9, reprobados: 1 },
    ]);
    check('Estadísticas Excel se generan', esZip(stats), 'magic PK ausente');
  } catch (err) {
    check('Estadísticas Excel se generan', false, err.message);
  }
}

function testS3() {
  console.log('\n[4] Servicio S3 (sanitización de keys)');
  const conEspacios = sanitizarNombreArchivo('Horario Gpo A (final)!!.pdf');
  check('Quita espacios y paréntesis', !/[\s()!]/.test(conEspacios), conEspacios);

  const conAcentos = sanitizarNombreArchivo('Mañana_2025-ÁÉÍÓÚ.pdf');
  check('Quita acentos/ñ', !/[áéíóúñÁÉÍÓÚÑ]/.test(conAcentos), conAcentos);

  const traversal = sanitizarNombreArchivo('../../etc/passwd');
  check('Bloquea path traversal (../)', !traversal.includes('..') && !traversal.includes('/'), traversal);

  const soloSimbolos = sanitizarNombreArchivo('!!!');
  check('Nunca devuelve cadena vacía', soloSimbolos.length > 0, soloSimbolos);

  const largo = sanitizarNombreArchivo('x'.repeat(500));
  check('Trunca nombres excesivos (≤120)', largo.length <= 120, `${largo.length} chars`);
}

async function testRedis() {
  console.log('\n[5] Servicio Redis');
  if (redisClient.disabled) {
    info('Redis deshabilitado (sin REDIS_URL)', 'modo stub, sin conexiones');
    try {
      const pong = await redisClient.ping();
      check('Stub de Redis no crashea (ping → null)', pong === null, `devolvió ${pong}`);
      redisClient.on('error', () => {});
      check('Stub acepta .on() (compat. logger.service)', true);
    } catch (err) {
      check('Stub de Redis no crashea', false, err.message);
    }
  } else {
    try {
      const pong = await redisClient.ping();
      check('Redis real responde PONG', pong === 'PONG', `devolvió ${pong}`);
      redisClient.disconnect?.();
    } catch (err) {
      check('Redis real responde PONG', false, err.message);
    }
  }
}

async function testLogo() {
  console.log('\n[6] Logo institucional (informativo)');
  const { getLogoBase64 } = await import('../src/utils/logoHelper.js');
  const logo = getLogoBase64();
  if (logo && logo.startsWith('data:image/png;base64,')) {
    info('Logo cargado', `${Math.round(logo.length / 1024)} KB (base64)`);
  } else {
    info('Logo NO encontrado', 'src/assets/logo_cecyte.png — los PDFs se generan sin él');
  }
}

async function testMailer() {
  console.log('\n[7] Servicio Mailer (informativo)');
  try {
    const { ok, error } = await testMailConnection();
    if (ok) info('SMTP verifica conexión', 'listo para enviar');
    else info('SMTP sin conexión', `${error} (esperado si Mailpit no corre localmente)`);
  } catch (err) {
    info('SMTP sin conexión', err.message);
  }
}

// ------------------------------------------------------------
async function main() {
  console.log('=== Smoke tests de servicios CECyTE ===');
  await testPdf();
  await testDocx();
  await testExcel();
  testS3();
  await testRedis();
  await testLogo();
  await testMailer();

  console.log(`\n=== Resultado: ${pasados} pasaron, ${fallidos} fallaron ===`);
  process.exit(fallidos > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error inesperado en la suite:', err);
  process.exit(1);
});