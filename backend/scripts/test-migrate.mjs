// End-to-end test of the migration runner against a DISPOSABLE local database.
//
// Flow:
//   1) create a uniquely named throwaway DB
//   2) apply src/db/schema.sql (base tables)
//   3) run scripts/migrate.mjs -> applies 001 + 002
//   4) verify status, idempotency, and migration immutability
//   5) drop the throwaway DB
//
// Local-only guard. Usage:
//   LOCAL_BASELINE_URL=postgres://user@localhost:5432/postgres node scripts/test-migrate.mjs
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = `cecyte_migrate_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const adminUrl = process.env.LOCAL_BASELINE_URL;
if (!adminUrl) {
  console.error('Set LOCAL_BASELINE_URL to a local PostgreSQL admin connection string.');
  process.exit(1);
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
let host;
try {
  host = new URL(adminUrl).hostname.toLowerCase();
} catch {
  console.error('LOCAL_BASELINE_URL is not a valid PostgreSQL connection URL.');
  process.exit(1);
}
if (!LOCAL_HOSTS.includes(host)) {
  console.error(`Refusing to test against non-local host "${host}".`);
  process.exit(1);
}

const targetUrl = new URL(adminUrl);
targetUrl.pathname = `/${DB}`;
const targetConn = targetUrl.toString();

function run(cmd, args, env = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root, env: { ...process.env, ...env } });
}

const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 10_000 });
let failures = 0;
function check(label, cond) {
  console.log(`${cond ? '  PASS' : '  FAIL'} — ${label}`);
  if (!cond) failures += 1;
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${DB}"`);
  console.log(`[test] created ${DB}`);

  const schemaSql = readFileSync(join(root, 'src/db/schema.sql'), 'utf8');
  const t = new pg.Client({ connectionString: targetConn });
  await t.connect();
  await t.query('BEGIN');
  await t.query(schemaSql);
  await t.query('COMMIT');

  const count = async (q) => (await t.query(q)).rows[0].n;
  const tablesBefore = await count(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
  check(`schema.sql applied (${tablesBefore} base tables)`, tablesBefore === 40);

  console.log('\n[test] running migrate (expect 001 + 002)...');
  run(process.execPath, ['scripts/migrate.mjs'], { LOCAL_DATABASE_URL: targetConn });

  const tablesAfter = await count(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'schema_migrations'`);
  check(`+3 RBAC tables (now ${tablesAfter}, excl. ledger)`, tablesAfter === 43);
  const viewCount = await count(`SELECT count(*)::int n FROM pg_views WHERE schemaname='public' AND viewname='v_promedios_periodo'`);
  check('view v_promedios_periodo created', viewCount === 1);
  const trigCount = await count(`SELECT count(*)::int n FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT tg.tgisinternal AND n.nspname='public'`);
  check('2 domain triggers created', trigCount === 2);
  const ledgerCount = await count('SELECT count(*)::int n FROM schema_migrations');
  check('ledger has 2 rows', ledgerCount === 2);
  await t.end();

  console.log('\n[test] running migrate again (expect no-op)...');
  run(process.execPath, ['scripts/migrate.mjs'], { LOCAL_DATABASE_URL: targetConn });
  const t2 = new pg.Client({ connectionString: targetConn });
  await t2.connect();
  const ledgerAfter = (await t2.query('SELECT count(*)::int n FROM schema_migrations')).rows[0].n;
  check('idempotent: ledger still 2 rows', ledgerAfter === 2);
  await t2.end();

  console.log('\n[test] tamper test (expect integrity error, exit 1)...');
  const tmp = mkdtempSync(join(tmpdir(), 'cecyte-mig-'));
  const mig002 = join(root, 'src/db/migrations/002_domain_view_triggers.sql');
  const original = readFileSync(mig002, 'utf8');
  try {
    writeFileSync(mig002, original + '\n-- tamper for integrity test\n');
    let threw = false;
    try {
      execFileSync(process.execPath, ['scripts/migrate.mjs'], {
        cwd: root,
        env: { ...process.env, LOCAL_DATABASE_URL: targetConn },
        stdio: 'pipe',
      });
    } catch {
      threw = true;
    }
    check('integrity guard fired on tampered migration', threw);
  } finally {
    writeFileSync(mig002, original);
    rmSync(tmp, { recursive: true, force: true });
  }
} catch (err) {
  console.error('[test] ERROR:', err.message);
  failures += 1;
} finally {
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`,
      [DB],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${DB}"`);
    console.log(`[test] dropped ${DB}`);
  } catch (e) {
    console.error('[test] cleanup failed:', e.message);
  }
  try { await admin.end(); } catch { /* ignore */ }
  console.log(`\n=== migrate test: ${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'} ===`);
  process.exit(failures === 0 ? 0 : 1);
}
