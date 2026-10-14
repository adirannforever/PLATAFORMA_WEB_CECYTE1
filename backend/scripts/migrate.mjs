// Ledger + runner de migraciones SQL inmutables.
//
// Diseño (simple, sin framework):
//   * Tabla ledger `schema_migrations(id, filename, checksum, applied_at)`.
//   * Cada migración se aplica UNA sola vez (por filename). El checksum detecta
//     que una migración ya aplicada fue modificada (inmutabilidad) y aborta.
//   * Cada migración corre en su propia transacción; si falla, se hace ROLLBACK
//     y no queda registrada.
//   * Orden: por nombre de archivo (001_*, 002_*, ...).
//
// Seguridad:
//   * Rechaza hosts no locales (igual que setupLocalDb.js / restore-baseline.mjs).
//   * NO está pensado para correr contra Neon sin backup + autorización explícita.
//
// Uso:
//   node scripts/migrate.mjs                 # aplica pendientes contra DATABASE_URL local
//   node scripts/migrate.mjs --status        # muestra aplicadas/pendientes, sin aplicar
//   LOCAL_DATABASE_URL=postgres://... node scripts/migrate.mjs
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(root, 'src/db/migrations');

const STATUS_ONLY = process.argv.includes('--status');
// Prefer LOCAL_DATABASE_URL; fall back to DATABASE_URL (dev local).
const dbUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Set LOCAL_DATABASE_URL or DATABASE_URL to a local PostgreSQL database.');
  process.exit(1);
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
let host;
try {
  host = new URL(dbUrl).hostname.toLowerCase();
} catch {
  console.error('The database URL is not a valid PostgreSQL connection URL.');
  process.exit(1);
}
if (!LOCAL_HOSTS.includes(host)) {
  console.error(
    `Refusing to run migrations against non-local host "${host}".\n` +
      'Running the ledger against a remote/existing database requires a backup and explicit authorization.',
  );
  process.exit(1);
}

const LEDGER_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         SERIAL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    checksum    VARCHAR(64)  NOT NULL,
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
  );
`;

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

const client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 10_000 });

try {
  await client.connect();
  await client.query(LEDGER_DDL);

  const applied = new Map(
    (await client.query('SELECT filename, checksum FROM schema_migrations')).rows.map((r) => [
      r.filename,
      r.checksum,
    ]),
  );

  const files = listMigrations();
  console.log(`[migrate] host=${host} migrations_found=${files.length} applied=${applied.size}`);

  // Verificar inmutabilidad: una migración ya aplicada no debe cambiar de contenido.
  let integrityOk = true;
  for (const [filename, checksum] of applied) {
    if (!files.includes(filename)) {
      console.warn(`[migrate] WARNING: applied migration "${filename}" no longer exists on disk.`);
      continue;
    }
    const current = sha256(readFileSync(join(MIGRATIONS_DIR, filename), 'utf8'));
    if (current !== checksum) {
      console.error(
        `[migrate] INTEGRITY ERROR: "${filename}" changed after being applied.\n` +
          '  Immutable migrations must not be edited. Add a new migration instead.',
      );
      integrityOk = false;
    }
  }
  if (!integrityOk) {
    process.exitCode = 1;
    throw new Error('Migration integrity check failed.');
  }

  const pending = files.filter((f) => !applied.has(f));
  console.log(`[migrate] pending=${pending.length}${pending.length ? ': ' + pending.join(', ') : ''}`);

  if (STATUS_ONLY) {
    process.exitCode = 0;
  } else {
    for (const filename of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
      const checksum = sha256(sql);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
        console.log(`[migrate] applied ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] FAILED ${filename}: ${err.message}`);
        throw err;
      }
    }
    console.log('[migrate] done.');
  }
} catch (err) {
  if (err.message !== 'Migration integrity check failed.') {
    console.error('[migrate] ERROR:', err.message);
  }
  process.exitCode = 1;
} finally {
  try {
    await client.end();
  } catch { /* ignore */ }
}
