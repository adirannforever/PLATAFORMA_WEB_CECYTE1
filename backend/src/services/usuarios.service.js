import bcrypt from 'bcryptjs';
import { ROLES_VALIDOS } from '../config/catalogos.js';

export const MAX_IMPORT_CSV_BYTES = 1_000_000;
export const MAX_IMPORT_ROWS = 500;
export const PLANTILLA_IMPORTACION_USUARIOS =
  'nombre,apellidos,email,password,rol,matricula\r\n';

const COLUMNAS_IMPORTACION = new Set([
  'nombre',
  'apellidos',
  'email',
  'password',
  'rol',
  'matricula',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const crearUsuarioEnTransaccion = async (client, datos) => {
  const { nombre, apellidos, email, password, rol, matricula } = datos;
  const hash = await bcrypt.hash(password, 12);
  const result = await client.query(
    `INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, apellidos, email, rol`,
    [nombre.trim(), apellidos.trim(), email.toLowerCase().trim(), hash, rol]
  );
  const usuario = result.rows[0];
  let matriculaCreada = null;

  if (rol === 'alumno') {
    matriculaCreada = matricula?.trim() || `A${String(usuario.id).padStart(4, '0')}`;
    await client.query(
      `INSERT INTO alumnos (usuario_id, matricula, estatus) VALUES ($1, $2, 'activo')`,
      [usuario.id, matriculaCreada]
    );
  }

  return { usuario, matricula: matriculaCreada };
};

const parseCsvRows = (csv) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
        if (char === '\n') line += 1;
      }
      continue;
    }

    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n') {
      throw new Error(`Contenido inesperado después de una comilla CSV en la línea ${line}.`);
    }

    if (char === '"') {
      if (field.length !== 0) throw new Error(`Comillas CSV inválidas en la línea ${line}.`);
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      afterQuote = false;
    } else if (char === '\r' || char === '\n') {
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push({ line: rowLine, cells: row });
      row = [];
      field = '';
      afterQuote = false;
      if (char === '\r' && csv[i + 1] === '\n') i += 1;
      line += 1;
      rowLine = line;
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error(`Comillas CSV sin cerrar en la línea ${rowLine}.`);
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push({ line: rowLine, cells: row });
  return rows;
};

export const parseImportacionUsuariosCsv = (csv) => {
  if (typeof csv !== 'string' || csv.length === 0) {
    throw new Error('El campo csv debe contener el archivo CSV.');
  }
  if (Buffer.byteLength(csv, 'utf8') > MAX_IMPORT_CSV_BYTES) {
    throw new Error(`El CSV no debe superar ${MAX_IMPORT_CSV_BYTES} bytes.`);
  }

  const [headerRow, ...dataRows] = parseCsvRows(csv);
  if (!headerRow) throw new Error('El CSV debe incluir encabezados y al menos un registro.');

  const headers = headerRow.cells.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase()
  );
  if (headers.some((header) => !header)) throw new Error('Los encabezados CSV no pueden estar vacíos.');
  if (new Set(headers).size !== headers.length) throw new Error('El CSV contiene encabezados duplicados.');

  const unknown = headers.filter((header) => !COLUMNAS_IMPORTACION.has(header));
  if (unknown.length) throw new Error(`Encabezado CSV no reconocido: ${unknown.join(', ')}.`);
  for (const required of ['nombre', 'apellidos', 'email']) {
    if (!headers.includes(required)) throw new Error(`Falta el encabezado obligatorio "${required}".`);
  }
  if (dataRows.length === 0) throw new Error('El CSV debe incluir al menos un registro.');
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`El CSV no debe superar ${MAX_IMPORT_ROWS} registros.`);
  }

  return dataRows.map(({ line, cells }) => ({
    line,
    errors: cells.length > headers.length ? ['La fila contiene más columnas que los encabezados.'] : [],
    data: Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])),
  }));
};

export const validarFilaImportacionUsuario = (data, defaultPassword) => {
  const nombre = (data.nombre ?? '').trim();
  const apellidos = (data.apellidos ?? '').trim();
  const email = (data.email ?? '').trim().toLowerCase();
  const password = data.password || defaultPassword || '';
  const rol = (data.rol ?? '').trim() || 'alumno';
  const matricula = (data.matricula ?? '').trim();
  const errors = [];

  if (!nombre) errors.push('nombre es obligatorio.');
  else if (nombre.length > 100) errors.push('nombre no puede superar 100 caracteres.');
  if (!apellidos) errors.push('apellidos es obligatorio.');
  else if (apellidos.length > 150) errors.push('apellidos no puede superar 150 caracteres.');
  if (!email) errors.push('email es obligatorio.');
  else if (email.length > 255 || !EMAIL_RE.test(email)) errors.push('email no tiene un formato válido.');
  if (password.length < 8) errors.push('password debe tener al menos 8 caracteres.');
  if (Buffer.byteLength(password, 'utf8') > 72) errors.push('password no puede superar 72 bytes.');
  if (!ROLES_VALIDOS.includes(rol) || rol === 'aspirante') {
    errors.push(`rol debe ser uno de: ${ROLES_VALIDOS.filter((item) => item !== 'aspirante').join(', ')}.`);
  }
  if (matricula.length > 30) errors.push('matricula no puede superar 30 caracteres.');

  return {
    errors,
    usuario: { nombre, apellidos, email, password, rol, matricula },
  };
};
