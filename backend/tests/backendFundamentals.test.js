import test from 'node:test';
import assert from 'node:assert/strict';
import { isMetricsAuthorized, parseCorsOrigins, parseTrustProxyHops } from '../src/config/http.js';
import { z } from '../src/config/zod.js';
import { apiErrorHandler, apiNotFound } from '../src/middleware/errors.js';
import { requestContext, requestPath } from '../src/middleware/requestContext.js';
import { validate } from '../src/middleware/validate.js';
import { authLimiter } from '../src/middlewares/rateLimit.js';
import { auditoriaQuerySchema } from '../src/schemas/auditoria.schema.js';
import { activateAccountSchema, loginSchema } from '../src/schemas/auth.schema.js';
import { crearAspiranteSchema } from '../src/schemas/aspirantes.schema.js';
import { preRegistroSchema } from '../src/schemas/public.schema.js';
import { reinscripcionSchema } from '../src/schemas/inscripciones.schema.js';
import {
  buildAttachmentDisposition,
  MAX_COMUNICADO_FILE_SIZE,
  parseComunicadoAttachments,
  serializarArchivosComunicado,
} from '../src/services/comunicados-attachments.service.js';
import { avisosQuerySchema, resumenQuerySchema } from '../src/schemas/public.schema.js';
import { createLimiter } from '../src/middlewares/rateLimit.js';
import { tienePermiso } from '../src/config/permisos.js';
import { getPagosAlumnoScope } from '../src/services/pagos-access.service.js';

test('public avisos query caps limit and rejects unknown params', () => {
  assert.deepEqual(avisosQuerySchema.parse({}), {});
  assert.deepEqual(avisosQuerySchema.parse({ limit: '6' }), { limit: 6 });
  assert.throws(() => avisosQuerySchema.parse({ limit: '21' }));
  assert.throws(() => avisosQuerySchema.parse({ limit: '0' }));
  assert.throws(() => avisosQuerySchema.parse({ search: 'hola' }));
  assert.deepEqual(resumenQuerySchema.parse({}), {});
  assert.throws(() => resumenQuerySchema.parse({ limit: '5' }));
});

test('payment-by-student scope restricts students to their own profile', () => {
  assert.deepEqual(getPagosAlumnoScope({ id: 27, rol: 'alumno' }), {
    condition: 'AND a.usuario_id = $2',
    params: [27],
  });
  assert.deepEqual(getPagosAlumnoScope({ id: 1, rol: 'administrador' }), {
    condition: '',
    params: [],
  });
  assert.deepEqual(getPagosAlumnoScope({ id: 2, rol: 'directivo' }), {
    condition: '',
    params: [],
  });
});

test('expediente permissions separate all-record, group, own-record, and edit access', () => {
  for (const role of ['administrador', 'control_escolar', 'directivo']) {
    assert.equal(tienePermiso(role, 'expediente.ver_todos'), true);
  }
  assert.equal(tienePermiso('control_escolar', 'expediente.editar'), true);
  assert.equal(tienePermiso('directivo', 'expediente.editar'), false);
  assert.equal(tienePermiso('tutor', 'expediente.ver'), true);
  assert.equal(tienePermiso('tutor', 'expediente.ver_todos'), false);
  assert.equal(tienePermiso('alumno', 'expediente.ver_mi_expediente'), true);
  assert.equal(tienePermiso('alumno', 'expediente.ver_todos'), false);
});

test('reenrollment permissions separate student self-service from administrative enrollment', () => {
  assert.equal(tienePermiso('alumno', 'inscripciones.reinscripcion_propia'), true);
  assert.equal(tienePermiso('alumno', 'inscripciones.crear'), false);
  assert.equal(tienePermiso('control_escolar', 'inscripciones.crear'), true);
});

test('aspirante role has only self-service permissions', () => {
  assert.equal(tienePermiso('aspirante', 'aspirantes.ver_propio'), true);
  assert.equal(tienePermiso('aspirante', 'aspirantes.ver'), false);
  assert.equal(tienePermiso('aspirante', 'aspirantes.crear'), false);
});

test('applicant invite and activation input are bounded', () => {
  assert.deepEqual(crearAspiranteSchema.parse({
    nombre: ' Ada ',
    apellidos: ' Lovelace ',
    curp: 'abco010101mxxxyza9',
    email: ' ADA@example.edu ',
    especialidad_id: '1',
    turno_preferido_id: '2',
    ciclo_id: '3',
  }), {
    nombre: 'Ada',
    apellidos: 'Lovelace',
    curp: 'ABCO010101MXXXYZA9',
    email: 'ada@example.edu',
    especialidad_id: 1,
    turno_preferido_id: 2,
    ciclo_id: 3,
  });
  assert.equal(activateAccountSchema.safeParse({
    token: 'x'.repeat(43),
    password: 'secure-enough-password',
  }).success, true);
  assert.equal(activateAccountSchema.safeParse({
    token: 'x',
    password: 'short',
  }).success, false);
});

test('public pre-registration input is bounded and honeypot-aware', () => {
  const base = {
    nombre: ' Ana ',
    apellidos: ' Pérez Gómez ',
    curp: 'abco010101mxxxyza9',
    email: ' ANA@example.edu ',
    especialidad_id: '1',
    turno_preferido_id: '2',
  };
  assert.deepEqual(preRegistroSchema.parse(base), {
    nombre: 'Ana',
    apellidos: 'Pérez Gómez',
    curp: 'ABCO010101MXXXYZA9',
    email: 'ana@example.edu',
    especialidad_id: 1,
    turno_preferido_id: 2,
    website: '',
  });
  // Teléfono vacío se acepta (formato de formularios) y se normaliza.
  assert.equal(preRegistroSchema.parse({ ...base, telefono: ' 55 1234 5678 ' }).telefono, '55 1234 5678');
  assert.equal(preRegistroSchema.parse({ ...base, telefono: '' }).telefono, '');
  // El público no puede mandar ciclo_id ni folio: los resuelve el server.
  assert.equal(preRegistroSchema.safeParse({ ...base, ciclo_id: 3 }).success, false);
  assert.equal(preRegistroSchema.safeParse({ ...base, folio: 'ASP-999999' }).success, false);
  // CURP mal formada y correo inválido se rechazan.
  assert.equal(preRegistroSchema.safeParse({ ...base, curp: 'ABC' }).success, false);
  assert.equal(preRegistroSchema.safeParse({ ...base, email: 'no-es-correo' }).success, false);
  // Honeypot: el schema lo acepta relleno; quien lo filtra es el controller.
  assert.equal(preRegistroSchema.parse({ ...base, website: 'http://spam' }).website, 'http://spam');
});

test('public limiter throttles unauthenticated flood', () => {
  const limiter = createLimiter({ windowMs: 60 * 1000, max: 3, message: 'Límite' });
  let nextCount = 0;
  const response = {
    statusCode: 200,
    setHeader() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  for (let i = 0; i < 5; i += 1) {
    limiter({ ip: '203.0.113.9', headers: {}, socket: {} }, response, () => { nextCount += 1; });
  }
  assert.equal(nextCount, 3);
  assert.equal(response.statusCode, 429);
});


test('CORS origins are exact HTTP(S) origins and deduplicated', () => {
  assert.deepEqual(
    parseCorsOrigins('https://school.example, https://school.example, http://localhost:5173'),
    ['https://school.example', 'http://localhost:5173'],
  );
  assert.throws(() => parseCorsOrigins('https://school.example/path'), /exact HTTP\(S\) origins/);
  assert.throws(() => parseCorsOrigins('*'), /Invalid CORS origin/);
});

test('trusted proxy hops default to zero and reject invalid values', () => {
  assert.equal(parseTrustProxyHops(), 0);
  assert.equal(parseTrustProxyHops('2'), 2);
  assert.throws(() => parseTrustProxyHops('-1'), /non-negative integer/);
  assert.throws(() => parseTrustProxyHops('11'), /between 0 and 10/);
});

test('metrics authorization requires the configured bearer token', () => {
  assert.equal(isMetricsAuthorized('Bearer secret-token', 'secret-token'), true);
  assert.equal(isMetricsAuthorized('Bearer wrong', 'secret-token'), false);
  assert.equal(isMetricsAuthorized('secret-token', 'secret-token'), false);
  assert.equal(isMetricsAuthorized('Bearer secret-token', ''), false);
});

test('Zod v4 validation normalizes login data and coerces audit pagination', () => {
  assert.deepEqual(loginSchema.parse({ email: '  ADMIN@EXAMPLE.EDU ', password: 'safe' }), {
    email: 'admin@example.edu',
    password: 'safe',
  });
  assert.deepEqual(auditoriaQuerySchema.parse({ limit: '500', page: '2' }), { limit: 500, page: 2 });
  assert.throws(() => auditoriaQuerySchema.parse({ limit: '501' }));
  assert.equal(z.string().email().safeParse('not-an-email').success, false);
});

test('reenrollment input is trimmed, bounded, and rejects unknown fields', () => {
  assert.deepEqual(reinscripcionSchema.parse({
    direccion: '  Calle 1  ',
    nombre_tutor: '  Ada Tutor ',
    telefono_tutor: ' 5551234567 ',
    curp_tutor: '',
  }), {
    direccion: 'Calle 1',
    nombre_tutor: 'Ada Tutor',
    telefono_tutor: '5551234567',
    curp_tutor: '',
  });
  assert.throws(() => reinscripcionSchema.parse({
    direccion: ' ',
    nombre_tutor: 'Ada',
    telefono_tutor: '5551234567',
  }));
  assert.throws(() => reinscripcionSchema.parse({
    direccion: 'Calle 1',
    nombre_tutor: 'Ada',
    telefono_tutor: '5551234567',
    target_user_id: 1,
  }));
});

test('validation middleware replaces getter-only request properties on success', async () => {
  const request = {};
  Object.defineProperty(request, 'query', {
    configurable: true,
    get: () => ({ limit: '20' }),
  });
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  await validate(auditoriaQuerySchema, 'query')(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.query, { limit: 20 });
});

test('validation middleware returns stable errors with request correlation', async () => {
  const request = { body: { email: 'bad', password: '' }, requestId: 'request-123' };
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await validate(loginSchema)(request, response, () => assert.fail('next should not be called'));

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
  assert.equal(response.body.requestId, 'request-123');
  assert.ok(response.body.errors.length >= 2);
});

test('API errors are sanitized and include stable not-found responses', () => {
  const request = { method: 'GET', requestId: 'request-456' };
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  apiErrorHandler(
    Object.assign(new Error('database password must not be exposed'), { statusCode: 500 }),
    request,
    response,
    assert.fail,
  );
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.code, 'INTERNAL_ERROR');
  assert.equal(response.body.requestId, 'request-456');
  assert.equal(JSON.stringify(response.body).includes('database password'), false);

  apiNotFound(request, response);
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.code, 'NOT_FOUND');
});

test('rate limiter uses the socket IP rather than spoofable forwarded headers', () => {
  let nextCount = 0;
  const response = {
    statusCode: 200,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const request = {
      headers: { 'x-forwarded-for': `203.0.113.${attempt + 1}` },
      socket: { remoteAddress: '198.51.100.10' },
    };
    authLimiter(request, response, () => { nextCount += 1; });
  }

  assert.equal(nextCount, 15);
  assert.equal(response.statusCode, 429);
});

test('request context validates client IDs and access paths omit query and record IDs', () => {
  const responseHeaders = {};
  const request = {
    originalUrl: '/api/records/123/550e8400-e29b-41d4-a716-446655440000?email=private@example.edu',
    baseUrl: '/api',
    route: { path: '/records/:id/:id' },
    get: () => 'valid-client-id:123',
  };
  const response = { setHeader: (name, value) => { responseHeaders[name] = value; } };

  requestContext(request, response, () => {});

  assert.equal(request.requestId, 'valid-client-id:123');
  assert.equal(responseHeaders['X-Request-Id'], request.requestId);
  assert.equal(requestPath(request), '/api/records/:id/:id');
  assert.equal(requestPath({ originalUrl: '/api/private@example.edu' }), '/unmatched');
});

test('comunicado attachments accept bounded image and document metadata only', () => {
  const valid = [{
    key: 'comunicados/550e8400-e29b-41d4-a716-446655440000-aviso.pdf',
    nombre: 'Aviso de inscripción.pdf',
    tipo: 'application/pdf',
    size: 2048,
  }];
  assert.deepEqual(parseComunicadoAttachments(valid), [{
    ...valid[0],
    nombre: 'Aviso de inscripción.pdf',
  }]);
  assert.deepEqual(serializarArchivosComunicado(valid), [{
    nombre: 'Aviso de inscripción.pdf',
    tipo: 'application/pdf',
  }]);
  assert.throws(() => parseComunicadoAttachments([{ ...valid[0], key: 'horarios/aviso.pdf' }]));
  assert.throws(() => parseComunicadoAttachments([{ ...valid[0], tipo: 'text/html' }]));
  assert.throws(() => parseComunicadoAttachments([{ ...valid[0], size: MAX_COMUNICADO_FILE_SIZE + 1 }]));
  assert.throws(() => parseComunicadoAttachments(Array(6).fill(valid[0])));
});

test('comunicado downloads inline only render safe image types', () => {
  assert.match(
    buildAttachmentDisposition({ nombre: 'imagen "segura".png', tipo: 'image/png' }),
    /^inline; filename="imagen _segura_.png";/,
  );
  assert.match(
    buildAttachmentDisposition({ nombre: 'Circular.pdf', tipo: 'application/pdf' }),
    /^attachment;/,
  );
});
