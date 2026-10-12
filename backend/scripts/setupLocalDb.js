import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const databaseUrl = process.env.LOCAL_DATABASE_URL;
if (!databaseUrl) {
  console.error('Set LOCAL_DATABASE_URL to a local PostgreSQL database before applying the schema.');
  process.exit(1);
}

let databaseHost;
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase();
} catch {
  console.error('LOCAL_DATABASE_URL must be a valid PostgreSQL connection URL.');
  process.exit(1);
}

if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(databaseHost)) {
  console.error(`Refusing to apply the local schema to non-local host "${databaseHost}".`);
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
});
const schemaPath = fileURLToPath(new URL('../src/db/schema.sql', import.meta.url));

try {
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Local database schema applied successfully.');
} catch (error) {
  console.error('Failed to apply the local database schema:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
