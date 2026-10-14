import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crearImportadorCsv,
  MAX_RECORDS_CSV_BYTES,
  MAX_RECORDS_CSV_ROWS,
  parseRecordsCsv,
} from '../src/services/csvRecordsImport.service.js';
import { importarRegistrosCsvSchema } from '../src/schemas/csvRecordsImport.schema.js';

const options = {
  allowedHeaders: ['alumno_id', 'fecha', 'descripcion'],
  requiredHeaders: ['alumno_id', 'descripcion'],
};

const invokeImport = async (handler, req) => {
  let response;
  const res = {
    status(statusCode) {
      response = { statusCode };
      return this;
    },
    json(body) {
      response = { ...response, body };
      return response;
    },
  };
  await handler(req, res);
  return response;
};

test('CSV parser handles BOM, escaped quotes, commas, multiline fields and CRLF', () => {
  assert.deepEqual(parseRecordsCsv(
    '\uFEFFalumno_id,descripcion\r\n1,"Nota, ""importante""\ny segunda línea"\r\n',
    options
  ), [{
    line: 2,
    errors: [],
    data: { alumno_id: '1', descripcion: 'Nota, "importante"\ny segunda línea' },
  }]);
});

test('CSV parser rejects malformed headers, quoting, and oversized batches', () => {
  assert.throws(() => parseRecordsCsv('alumno_id,alumno_id,descripcion\n1,2,x', options), /duplicados/);
  assert.throws(() => parseRecordsCsv('alumno_id,extra,descripcion\n1,x,y', options), /no reconocido/);
  assert.throws(() => parseRecordsCsv('alumno_id,descripcion\n"1,x', options), /sin cerrar/);
  assert.throws(
    () => parseRecordsCsv(`alumno_id,descripcion\n${'1,x\n'.repeat(MAX_RECORDS_CSV_ROWS + 1)}`, options),
    /500 registros/
  );
  assert.throws(
    () => parseRecordsCsv(`alumno_id,descripcion\n${'x'.repeat(MAX_RECORDS_CSV_BYTES)}`, options),
    /bytes/
  );
});

test('request schema accepts only a non-empty CSV string', () => {
  assert.deepEqual(importarRegistrosCsvSchema.parse({ csv: 'alumno_id,descripcion\n1,nota' }), {
    csv: 'alumno_id,descripcion\n1,nota',
  });
  assert.throws(() => importarRegistrosCsvSchema.parse({ csv: 'x', extra: true }));
});

test('bulk importer reuses controller behavior row by row and returns mixed row results', async () => {
  const seen = [];
  const importer = crearImportadorCsv(async (req, res) => {
    seen.push({ user: req.user.id, body: req.body });
    if (req.body.descripcion === 'rechazar') {
      return res.status(409).json({ success: false, message: 'Duplicado.' });
    }
    return res.status(201).json({ success: true, data: { id: seen.length } });
  }, options);

  const response = await invokeImport(importer, {
    user: { id: 7 },
    body: { csv: 'alumno_id,descripcion\n1,crear\n2,rechazar' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, false);
  assert.equal(response.body.total, 2);
  assert.equal(response.body.succeeded, 1);
  assert.equal(response.body.failed, 1);
  assert.deepEqual(response.body.results.map(({ fila, status, success }) => ({ fila, status, success })), [
    { fila: 2, status: 201, success: true },
    { fila: 3, status: 409, success: false },
  ]);
  assert.deepEqual(seen.map(({ user }) => user), [7, 7]);
});

test('bulk importer isolates invalid rows, duplicate keys, and unexpected controller exceptions', async () => {
  let calls = 0;
  const importer = crearImportadorCsv(async (req, res) => {
    calls += 1;
    if (req.body.descripcion === 'throws') throw new Error('private error');
    return res.json({ success: true, data: {} });
  }, { ...options, uniqueBy: ['alumno_id'] });

  const response = await invokeImport(importer, {
    user: { id: 4 },
    body: { csv: 'alumno_id,descripcion\n1,throws\n1,repetido\n3' },
  });

  assert.equal(response.body.total, 3);
  assert.equal(response.body.succeeded, 0);
  assert.equal(response.body.results[0].status, 500);
  assert.equal(response.body.results[0].message, 'Error interno al procesar el registro.');
  assert.match(response.body.results[1].message, /duplica una clave/);
  assert.equal(response.body.results[2].status, 400);
  assert.equal(calls, 1);
});

test('bulk importer returns a request-level error when the CSV is invalid', async () => {
  const importer = crearImportadorCsv(async () => {
    assert.fail('invalid CSV must not call the record controller');
  }, options);
  const response = await invokeImport(importer, { body: { csv: 'bad,headers\n1,x' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
});
