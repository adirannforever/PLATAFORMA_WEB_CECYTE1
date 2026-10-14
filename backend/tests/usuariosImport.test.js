import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  crearUsuarioEnTransaccion,
  parseImportacionUsuariosCsv,
  PLANTILLA_IMPORTACION_USUARIOS,
  validarFilaImportacionUsuario,
} from '../src/services/usuarios.service.js';
import { importarUsuariosSchema } from '../src/schemas/usuarios.schema.js';

test('CSV import parses BOM, quoted values, escaped quotes and multiline rows', () => {
  const rows = parseImportacionUsuariosCsv(
    '\uFEFFnombre,apellidos,email,matricula\r\n"Ana, María","O""Neil\nLópez",ANA@example.edu,'
  );

  assert.deepEqual(rows, [{
    line: 2,
    errors: [],
    data: {
      nombre: 'Ana, María',
      apellidos: 'O"Neil\nLópez',
      email: 'ANA@example.edu',
      matricula: '',
    },
  }]);
});

test('CSV import rejects malformed headers, quoting and oversized batches', () => {
  assert.throws(() => parseImportacionUsuariosCsv('nombre,nombre,email\nAna,López,a@example.edu'), /duplicados/);
  assert.throws(() => parseImportacionUsuariosCsv('nombre,apellidos,email\n"Ana,López,a@example.edu'), /sin cerrar/);
  assert.throws(() => parseImportacionUsuariosCsv('nombre,apellidos,email\n"Ana"x,López,a@example.edu'), /después de una comilla/);
  assert.throws(() => parseImportacionUsuariosCsv(`nombre,apellidos,email\n${'Ana,López,a@example.edu\n'.repeat(501)}`), /500 registros/);
  assert.deepEqual(
    parseImportacionUsuariosCsv('nombre,apellidos,email\nAna,López,a@example.edu,extra')[0].errors,
    ['La fila contiene más columnas que los encabezados.']
  );
});

test('bulk import request schema accepts only CSV and an optional default password', () => {
  assert.deepEqual(importarUsuariosSchema.parse({ csv: 'nombre,apellidos,email\nAda,Lovelace,a@example.edu' }), {
    csv: 'nombre,apellidos,email\nAda,Lovelace,a@example.edu',
  });
  assert.throws(() => importarUsuariosSchema.parse({ csv: 'x', extra: true }));
});

test('downloadable user CSV template provides all supported column names', () => {
  assert.equal(
    PLANTILLA_IMPORTACION_USUARIOS,
    'nombre,apellidos,email,password,rol,matricula\r\n'
  );
});

test('bulk rows normalize user data, default to students and accept a supplied password default', () => {
  const result = validarFilaImportacionUsuario({
    nombre: ' Ada ',
    apellidos: ' Lovelace ',
    email: ' ADA@EXAMPLE.EDU ',
    rol: '',
    matricula: '',
  }, 'Initial-Password1');

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.usuario, {
    nombre: 'Ada',
    apellidos: 'Lovelace',
    email: 'ada@example.edu',
    password: 'Initial-Password1',
    rol: 'alumno',
    matricula: '',
  });
});

test('bulk rows reject incomplete, invalid, excessive and applicant account data', () => {
  const { errors } = validarFilaImportacionUsuario({
    nombre: '',
    apellidos: 'x'.repeat(151),
    email: 'not-an-email',
    password: 'short',
    rol: 'aspirante',
    matricula: 'x'.repeat(31),
  });

  assert.equal(errors.length, 6);
});

test('shared user creation inserts student matrícula defaults and stores only a password hash', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('INSERT INTO usuarios')) {
        return { rows: [{ id: 31, nombre: 'Ada', apellidos: 'Lovelace', email: 'ada@example.edu', rol: 'alumno' }] };
      }
      return { rows: [] };
    },
  };

  const result = await crearUsuarioEnTransaccion(client, {
    nombre: ' Ada ',
    apellidos: ' Lovelace ',
    email: 'ADA@example.edu',
    password: 'Student-Password1',
    rol: 'alumno',
  });

  assert.equal(result.matricula, 'A0031');
  assert.equal(calls[1].params[1], 'A0031');
  assert.notEqual(calls[0].params[3], 'Student-Password1');
  assert.equal(await bcrypt.compare('Student-Password1', calls[0].params[3]), true);
  assert.equal('password' in result.usuario, false);
});
