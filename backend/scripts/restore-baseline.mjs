// Step 1.2 — Restore the Neon schema-only baseline into a DISPOSABLE local
// PostgreSQL database and compare the restored catalog against the snapshot.
//
// Safety:
//   * Refuses any non-local host (same guard as setupLocalDb.js).
//   * Operates only on a dedicated throwaway database (default: cecyte_baseline_check).
//   * Never touches the DATABASE_URL dev database or Neon.
//   * Strips psql meta-commands (\restrict/\unrestrict) and PG18-only
//     `SET transaction_timeout` so the file applies on PG16.
//
// Usage:
//   LOCAL_BASELINE_URL=postgres://user@localhost:5432/postgres node scripts/restore-baseline.mjs
//   LOCAL_BASELINE_URL=postgres://user@localhost:5432/postgres node scripts/restore-baseline.mjs --db=cecyte_baseline_check --keep
//
// Env:
//   LOCAL_BASELINE_URL  Required admin connection string (host must be local).
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(root, 'src/db/snapshots/neon-baseline-2026-10-12.sql');

const argDb = process.argv.find((a) => a.startsWith('--db='))?.slice('--db='.length);
const KEEP = process.argv.includes('--keep');
const TARGET_DB = argDb || 'cecyte_baseline_check';
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(TARGET_DB)) {
  console.error('The target database name must be a simple PostgreSQL identifier.');
  process.exit(1);
}

const adminUrl = process.env.LOCAL_BASELINE_URL;
if (!adminUrl) {
  console.error('Set LOCAL_BASELINE_URL to a local PostgreSQL admin connection string.');
  process.exit(1);
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
let adminHost;
try {
  adminHost = new URL(adminUrl).hostname.toLowerCase();
} catch {
  console.error('LOCAL_BASELINE_URL is not a valid PostgreSQL connection URL.');
  process.exit(1);
}
if (!LOCAL_HOSTS.includes(adminHost)) {
  console.error(`Refusing to run against non-local host "${adminHost}".`);
  process.exit(1);
}

const catalogQueries = {
  relations: `
    SELECT c.relkind AS kind, count(*)::int AS count
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S')
    GROUP BY c.relkind`,
  tables: `
    SELECT count(*)::int AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'`,
  columns: `
    SELECT count(*)::int AS count FROM information_schema.columns
    WHERE table_schema='public'`,
  constraints: `
    SELECT count(*)::int AS count FROM pg_constraint con
    JOIN pg_class r ON r.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname='public'`,
  indexes: `
    SELECT count(*)::int AS count FROM pg_indexes
    WHERE schemaname='public' AND indexname NOT LIKE '%_pkey'`,
  views: `
    SELECT count(*)::int AS count FROM pg_views WHERE schemaname='public'`,
  triggers: `
    SELECT count(*)::int AS count FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname='public'`,
  routines: `
    SELECT count(*)::int AS count FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prokind IN ('f','p')`,
};

function cleanSnapshot(sql) {
  return sql
    .replace(/^\\restrict\s+\S+\s*$/gm, '')
    .replace(/^\\unrestrict\s+\S+\s*$/gm, '')
    .replace(/^SET\s+transaction_timeout\s*=\s*0;\s*$/gm, '')
    .replace(/^CREATE\s+SCHEMA\s+public;\s*$/gim, 'CREATE SCHEMA IF NOT EXISTS public;');
}

async function introspect(client) {
  const result = {};
  for (const [name, query] of Object.entries(catalogQueries)) {
    if (name === 'relations') {
      const rows = (await client.query(query)).rows;
      result.relations = Object.fromEntries(rows.map((r) => [r.kind, r.count]));
    } else {
      result[name] = (await client.query(query)).rows[0].count;
    }
  }
  return result;
}

const admin = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 10_000 });
let target = null;

try {
  await admin.connect();
  console.log(`[restore] admin host=${adminHost} target_db=${TARGET_DB}`);

  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TARGET_DB],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${TARGET_DB}"`);
  await admin.query(`CREATE DATABASE "${TARGET_DB}"`);
  console.log(`[restore] created disposable database "${TARGET_DB}"`);

  const targetUrl = new URL(adminUrl);
  targetUrl.pathname = `/${TARGET_DB}`;
  target = new pg.Client({ connectionString: targetUrl.toString(), connectionTimeoutMillis: 10_000 });
  await target.connect();

  const snapshotSql = cleanSnapshot(readFileSync(SNAPSHOT, 'utf8'));
  await target.query('BEGIN');
  await target.query(snapshotSql);
  await target.query('COMMIT');
  console.log('[restore] snapshot applied successfully inside a transaction');

  const restored = await introspect(target);
  console.log('\n=== Restored catalog ===');
  console.log(JSON.stringify(restored, null, 2));

  mkdirSync(join(root, 'scripts', 'reports'), { recursive: true });
  writeFileSync(
    join(root, 'scripts', 'reports', 'restore-baseline.json'),
    `${JSON.stringify({ targetDb: TARGET_DB, adminHost, kept: KEEP, restored, snapshot: SNAPSHOT, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log('\n[report written to scripts/reports/restore-baseline.json]');
} catch (err) {
  console.error('[restore] FAILED:', err.message);
  process.exitCode = 1;
} finally {
  if (target) {
    try { await target.end(); } catch { /* ignore */ }
  }
  if (!KEEP) {
    try {
      await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [TARGET_DB],
      );
      await admin.query(`DROP DATABASE IF EXISTS "${TARGET_DB}"`);
      console.log(`[restore] dropped disposable database "${TARGET_DB}"`);
    } catch (e) {
      console.error('[restore] cleanup drop failed:', e.message);
    }
  } else {
    console.log(`[restore] --keep set: left "${TARGET_DB}" in place for inspection`);
  }
  try { await admin.end(); } catch { /* ignore */ }
}
