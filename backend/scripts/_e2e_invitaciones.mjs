// TEMPORARY (deleted after use): full invitation-flow e2e against local Mailpit.
// Boots backend, admin invites a test aspirante, token harvested from Mailpit,
// account activated, aspirante logs in, then ALL side effects are reverted.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import pg from 'pg';

const PORT = 4098;
const BASE = `http://localhost:${PORT}`;
const MAILPIT = 'http://localhost:8025';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NEW_PASSWORD = 'InvitacionE2E!2026';
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
let server;

try {
  await db.connect();

  // 1) Choose target: prefer aspirante with no linked user, else linked+inactive.
  const rows = (await db.query(`
    SELECT a.id, a.email, a.usuario_id, u.activo AS user_activo
    FROM aspirantes a LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.id`)).rows;
  const target = rows.find((r) => r.usuario_id === null) || rows.find((r) => r.user_activo === false);
  if (!target) { console.error('NO TARGET aspirante available (all active)'); process.exit(2); }
  console.log(`target aspirante id=${target.id} email=${target.email} usuario_id=${target.usuario_id}`);

  const priorInvites = (await db.query('SELECT id, aspirante_id, token_hash, vence_en, usado_en, creado_por, creado_en FROM aspirante_invitaciones WHERE aspirante_id = $1', [target.id])).rows;
  const prior = { usuario_id: target.usuario_id, user_activo: target.user_activo };

  // 2) Boot server.
  const backendDir = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  server = spawn('node', ['src/index.js'], { cwd: backendDir, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stderr.on('data', () => {});
  let up = false;
  for (let i = 0; i < 30; i++) { try { if ((await fetch(`${BASE}/health`)).ok) { up = true; break; } } catch {} await sleep(500); }
  if (!up) throw new Error('server did not start');

  // 3) Admin login.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cecyte.edu.mx', password: '123456' }),
  });
  const loginBody = await loginRes.json();
  const adminCookie = (loginRes.headers.get('set-cookie') || '').match(/token=([^;]+)/)?.[1];
  check('admin login', loginRes.ok && loginBody.success === true && !!adminCookie);
  const adminToken = adminCookie;
  if (!adminToken) throw new Error('no admin session cookie');

  // 4) Create invitation.
  const invRes = await fetch(`${BASE}/api/aspirantes/${target.id}/invitacion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `token=${adminToken}` },
  });
  const invBody = await invRes.json().catch(() => ({}));
  check('POST invitacion', invRes.ok && invBody.success !== false, `status=${invRes.status}`);
  if (!invRes.ok) throw new Error('invitation failed: ' + JSON.stringify(invBody));

  // 5) Harvest token from Mailpit.
  let token = null;
  for (let i = 0; i < 20 && !token; i++) {
    await sleep(500);
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const match = (list.messages || []).find((m) => m.Subject === 'Activa tu acceso de aspirante');
    if (match) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${match.ID}`)).json();
      const m = (msg.Text || '').match(/activar-cuenta\?token=([A-Za-z0-9_-]+)/);
      if (m) token = m[1];
    }
  }
  check('mailpit delivered invitation email with token', !!token);
  if (!token) throw new Error('no token found in Mailpit');

  // 6) Activate.
  const actRes = await fetch(`${BASE}/api/auth/aspirantes/activar-cuenta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: NEW_PASSWORD }),
  });
  const actBody = await actRes.json().catch(() => ({}));
  check('activar-cuenta', actRes.ok && actBody.success !== false, `status=${actRes.status}`);

  // 7) Login as aspirante.
  const aspRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: target.email, password: NEW_PASSWORD }),
  });
  const aspBody = await aspRes.json().catch(() => ({}));
  check('aspirante login', aspRes.ok && aspBody.usuario?.rol === 'aspirante', `rol=${aspBody.usuario?.rol}`);

  // 8) EXACT RESTORE (delete all invitations for target, re-insert prior rows, revert user link/activo).
  await db.query('DELETE FROM aspirante_invitaciones WHERE aspirante_id = $1', [target.id]);
  for (const inv of priorInvites) {
    await db.query(
      'INSERT INTO aspirante_invitaciones (id, aspirante_id, token_hash, vence_en, usado_en, creado_por, creado_en) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [inv.id, inv.aspirante_id, inv.token_hash, inv.vence_en, inv.usado_en, inv.creado_por, inv.creado_en],
    );
  }
  if (prior.usuario_id === null) {
    await db.query('UPDATE aspirantes SET usuario_id = NULL WHERE id = $1', [target.id]);
    await db.query('DELETE FROM usuarios WHERE LOWER(email) = LOWER($1) AND rol = $2', [target.email, 'aspirante']);
  } else {
    await db.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [prior.user_activo, prior.usuario_id]);
  }
  const after = (await db.query('SELECT usuario_id FROM aspirantes WHERE id = $1', [target.id])).rows[0];
  check('db restored (usuario_id)', after.usuario_id === prior.usuario_id, `now=${after.usuario_id} prior=${prior.usuario_id}`);
  const nowInvites = (await db.query('SELECT count(*)::int c FROM aspirante_invitaciones WHERE aspirante_id = $1', [target.id])).rows[0].c;
  check('invitation rows restored', nowInvites === priorInvites.length, `now=${nowInvites} prior=${priorInvites.length}`);
} catch (e) {
  console.error('E2E ERROR:', e.message);
  process.exitCode = 1;
} finally {
  if (server) server.kill();
  try { await db.end(); } catch {}
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;

