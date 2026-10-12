import 'dotenv/config';
import assert from 'node:assert/strict';

const apiBaseUrl = (process.env.E2E_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const targetUserId = Number(process.env.E2E_TARGET_USER_ID);

if (!adminEmail || !adminPassword || !Number.isSafeInteger(targetUserId) || targetUserId < 1) {
  console.error(
    'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_TARGET_USER_ID before running this test.'
  );
  process.exit(1);
}

let cookie;
let targetUser;
let restoreTarget = false;
let adminUserId;

async function request(path, { method = 'GET', body, expectedStatus = 200 } = {}) {
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const responseCookie = response.headers.get('set-cookie');
  const token = responseCookie?.match(/(?:^|,\s*)token=([^;,]+)/)?.[1];
  if (token) cookie = `token=${token}`;

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  assert.equal(
    response.status,
    expectedStatus,
    `${method} ${path}: expected HTTP ${expectedStatus}, received ${response.status} (${text.slice(0, 300)})`
  );
  return data;
}

async function login(password = adminPassword) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password },
  });
  assert.equal(result.success, true, 'Login response should indicate success');
  assert.equal(result.usuario?.rol, 'administrador', 'E2E credentials must belong to an administrator');
  adminUserId = result.usuario.id;
  assert.ok(cookie, 'Login response should set the session cookie');
}

async function updateTarget(fields) {
  return request(`/api/usuarios/${targetUserId}`, {
    method: 'PATCH',
    body: fields,
  });
}

async function logout() {
  await request('/api/auth/logout', { method: 'POST' });
  cookie = undefined;
}

async function restoreOriginalUser() {
  if (!restoreTarget || !targetUser) return;
  if (!cookie) await login();
  await updateTarget({ nombre: targetUser.nombre });
  restoreTarget = false;
}

async function waitForAuditLogs() {
  let logs = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await request('/api/auditoria?limit=500');
    logs = response.data;
    const hasFailedLogin = logs.some(
      (log) => log.accion === 'LOGIN_FALLIDO' && log.status === 401
    );
    const hasUpdate = logs.some((log) =>
      log.accion === 'UPDATE'
      && String(log.registro_id) === String(targetUserId)
      && log.datos_nuevos?.nombre === testName
      && log.metodo === 'PATCH'
      && log.status === 200
    );
    const hasExport = logs.some(
      (log) => log.accion === 'EXPORT' && log.status === 200
    );
    const hasLogout = logs.some(
      (log) => log.accion === 'LOGOUT' && log.status === 200
    );

    if (hasFailedLogin && hasUpdate && hasExport && hasLogout) return logs;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  assert.fail(
    `Audit log did not contain all expected records (received ${logs.length} rows)`
  );
}

let testName;

async function run() {
  console.log(`Running audit E2E checks against ${apiBaseUrl}`);

  await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: `${adminPassword}-invalid` },
    expectedStatus: 401,
  });
  console.log('✔ Invalid login returns HTTP 401');

  await login();
  const userResponse = await request(`/api/usuarios/${targetUserId}`);
  targetUser = userResponse.usuario;
  assert.ok(targetUser, 'Target user should exist');
  assert.notEqual(
    String(targetUser.id),
    String(adminUserId),
    'The target user must not be the administrator running the test'
  );
  assert.notEqual(
    targetUser.email.toLowerCase(),
    adminEmail.toLowerCase(),
    'The target user must not be the administrator running the test'
  );

  testName = `E2E ${targetUserId} ${Date.now()}`;
  restoreTarget = true;
  await updateTarget({ nombre: testName });
  console.log('✔ Updating a user succeeds');

  const exportResponse = await request('/api/reportes/estadisticas');
  assert.ok(exportResponse, 'Statistics endpoint should return a response');
  console.log('✔ Statistics endpoint responds successfully');

  await restoreOriginalUser();
  console.log('✔ Target user name restored');

  await logout();
  console.log('✔ Logout succeeds');

  await login();
  const logs = await waitForAuditLogs();
  assert.ok(Array.isArray(logs), 'Audit endpoint should return a data array');
  console.log('✔ Audit records contain failed login, update, export, and logout');

  await logout();
}

try {
  await run();
  console.log('Audit E2E checks passed.');
} catch (error) {
  console.error('Audit E2E checks failed:', error.message);
  process.exitCode = 1;
} finally {
  try {
    await restoreOriginalUser();
  } catch (error) {
    console.error('Could not restore the target user:', error.message);
    process.exitCode = 1;
  }

  if (cookie) {
    try {
      await logout();
    } catch (error) {
      console.error('Could not close the test session:', error.message);
      process.exitCode = 1;
    }
  }
}
