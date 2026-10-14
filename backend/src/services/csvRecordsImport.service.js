export const MAX_RECORDS_CSV_BYTES = 1_000_000;
export const MAX_RECORDS_CSV_ROWS = 500;

const parseRows = (csv) => {
  const rows = [];
  let cells = [];
  let value = '';
  let quoted = false;
  let afterQuote = false;
  let physicalLine = 1;
  let rowLine = 1;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        value += char;
        if (char === '\n') physicalLine += 1;
      }
      continue;
    }

    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n') {
      throw new Error(`Contenido inesperado después de una comilla CSV en la línea ${physicalLine}.`);
    }

    if (char === '"') {
      if (value.length !== 0) throw new Error(`Comillas CSV inválidas en la línea ${physicalLine}.`);
      quoted = true;
    } else if (char === ',') {
      cells.push(value);
      value = '';
      afterQuote = false;
    } else if (char === '\r' || char === '\n') {
      cells.push(value);
      if (cells.some((cell) => cell.trim() !== '')) rows.push({ line: rowLine, cells });
      cells = [];
      value = '';
      afterQuote = false;
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      physicalLine += 1;
      rowLine = physicalLine;
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error(`Comillas CSV sin cerrar en la línea ${rowLine}.`);
  cells.push(value);
  if (cells.some((cell) => cell.trim() !== '')) rows.push({ line: rowLine, cells });
  return rows;
};

export const parseRecordsCsv = (csv, { allowedHeaders, requiredHeaders = [] }) => {
  if (typeof csv !== 'string' || csv.length === 0) {
    throw new Error('El campo csv debe contener el archivo CSV.');
  }
  if (Buffer.byteLength(csv, 'utf8') > MAX_RECORDS_CSV_BYTES) {
    throw new Error(`El CSV no debe superar ${MAX_RECORDS_CSV_BYTES} bytes.`);
  }

  const [headerRow, ...dataRows] = parseRows(csv);
  if (!headerRow) throw new Error('El CSV debe incluir encabezados y al menos un registro.');

  const headers = headerRow.cells.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase()
  );
  if (headers.some((header) => !header)) throw new Error('Los encabezados CSV no pueden estar vacíos.');
  if (new Set(headers).size !== headers.length) throw new Error('El CSV contiene encabezados duplicados.');

  const unknown = headers.filter((header) => !allowedHeaders.includes(header));
  if (unknown.length) throw new Error(`Encabezado CSV no reconocido: ${unknown.join(', ')}.`);
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Falta el encabezado obligatorio "${missing.join(', ')}".`);
  if (dataRows.length === 0) throw new Error('El CSV debe incluir al menos un registro.');
  if (dataRows.length > MAX_RECORDS_CSV_ROWS) {
    throw new Error(`El CSV no debe superar ${MAX_RECORDS_CSV_ROWS} registros.`);
  }

  return dataRows.map(({ line, cells }) => ({
    line,
    errors: cells.length === headers.length
      ? []
      : [`La fila debe contener ${headers.length} columnas; contiene ${cells.length}.`],
    data: Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])),
  }));
};

export const crearImportadorCsv = (controller, {
  allowedHeaders,
  requiredHeaders = [],
  uniqueBy = [],
}) => async (req, res) => {
  let rows;
  try {
    rows = parseRecordsCsv(req.body.csv, { allowedHeaders, requiredHeaders });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  const seenKeys = new Set();
  const results = [];
  for (const row of rows) {
    if (row.errors.length) {
      results.push({ fila: row.line, success: false, status: 400, message: row.errors.join(' ') });
      continue;
    }

    if (uniqueBy.length) {
      const key = JSON.stringify(uniqueBy.map((column) => row.data[column]));
      if (seenKeys.has(key)) {
        results.push({
          fila: row.line,
          success: false,
          status: 400,
          message: `La fila duplica una clave ya incluida (${uniqueBy.join(', ')}).`,
        });
        continue;
      }
      seenKeys.add(key);
    }

    let statusCode = 200;
    let responseBody;
    const rowResponse = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return body;
      },
    };

    try {
      await controller({ ...req, body: row.data }, rowResponse);
      const success = responseBody?.success === true;
      results.push({
        fila: row.line,
        success,
        status: statusCode,
        message: responseBody?.message || (success ? 'Registro creado correctamente.' : 'No se pudo crear el registro.'),
        data: responseBody,
      });
    } catch {
      results.push({
        fila: row.line,
        success: false,
        status: 500,
        message: 'Error interno al procesar el registro.',
      });
    }
  }

  const succeeded = results.filter((result) => result.success).length;
  return res.status(200).json({
    success: succeeded === results.length,
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  });
};
