import 'dotenv/config';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import tls from 'node:tls';
import { tmpdir } from 'node:os';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required to export the Neon schema.');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  process.exit(1);
}

if (!parsedUrl.hostname.toLowerCase().endsWith('.neon.tech')) {
  console.error('Refusing to export a database that is not hosted on Neon.');
  process.exit(1);
}

const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const requestedOutput = outputArgument?.slice('--output='.length);
if (!requestedOutput) {
  console.error('Pass --output=<path> to choose where the schema-only SQL dump is written.');
  process.exit(1);
}

const outputPath = resolve(requestedOutput);
const pgDumpCandidates = process.platform === 'win32'
  ? [
      process.env.PG_DUMP_PATH,
      'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'pg_dump.exe',
    ].filter(Boolean)
  : [process.env.PG_DUMP_PATH, 'pg_dump'].filter(Boolean);

let pgDumpPath;
for (const candidate of pgDumpCandidates) {
  try {
    await access(candidate);
    pgDumpPath = candidate;
    break;
  } catch {
    // Try the next standard installation path.
  }
}

if (!pgDumpPath) {
  console.error('pg_dump was not found. Install PostgreSQL client tools or set PG_DUMP_PATH.');
  process.exit(1);
}

let password;
try {
  password = decodeURIComponent(parsedUrl.password);
} catch {
  console.error('DATABASE_URL contains an invalidly encoded password.');
  process.exit(1);
}

const { DATABASE_URL: ignoredDatabaseUrl, ...childEnvironment } = process.env;
const environment = {
  ...childEnvironment,
  PGHOST: parsedUrl.hostname,
  PGPORT: parsedUrl.port || '5432',
  PGUSER: decodeURIComponent(parsedUrl.username),
  PGPASSWORD: password,
  PGDATABASE: decodeURIComponent(parsedUrl.pathname.slice(1)),
  PGSSLMODE: parsedUrl.searchParams.get('sslmode') || 'require',
  PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000',
  PGCONNECT_TIMEOUT: '8',
};
const channelBinding = parsedUrl.searchParams.get('channel_binding');
if (channelBinding) environment.PGCHANNELBINDING = channelBinding;
const sslRootCertificate = parsedUrl.searchParams.get('sslrootcert');
if (sslRootCertificate) environment.PGSSLROOTCERT = sslRootCertificate;
let trustBundlePath;
let trustDirectory;
let child;
let timedOut = false;
let outputCreated = false;
let copyOutput;
let stderr = '';
const timeout = setTimeout(() => {
  timedOut = true;
  child?.kill();
}, 60_000);

try {
  if (!sslRootCertificate && environment.PGSSLMODE === 'verify-full') {
    trustDirectory = await mkdtemp(join(tmpdir(), 'cecyte-neon-ca-'));
    trustBundlePath = join(trustDirectory, 'root-certificates.pem');
    await writeFile(trustBundlePath, `${tls.rootCertificates.join('\n')}\n`, { flag: 'wx' });
    environment.PGSSLROOTCERT = trustBundlePath;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const output = createWriteStream(outputPath, { flags: 'wx' });
  await new Promise((resolveOutput, rejectOutput) => {
    output.once('open', resolveOutput);
    output.once('error', rejectOutput);
  });
  outputCreated = true;
  child = spawn(
    pgDumpPath,
    [
      '--schema-only',
      '--schema=public',
      '--no-owner',
      '--no-privileges',
      '--no-password',
      '--format=plain',
      '--host', environment.PGHOST,
      '--port', environment.PGPORT,
      '--username', environment.PGUSER,
      '--dbname', environment.PGDATABASE,
    ],
    { env: environment, shell: false, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const exitCode = new Promise((resolveExit, rejectExit) => {
    child.once('error', rejectExit);
    child.once('close', resolveExit);
  });
  copyOutput = pipeline(child.stdout, output);
  const [, code] = await Promise.all([copyOutput, exitCode]);

  if (timedOut) {
    const error = new Error('timeout');
    error.code = 'timeout';
    throw error;
  }
  if (code !== 0) {
    const error = new Error('pg_dump_failed');
    error.code = `pg_dump_exit_${code}`;
    throw error;
  }

  console.log(`Schema-only SQL dump saved to ${outputPath}`);
} catch (error) {
  child?.kill();
  await copyOutput?.catch(() => {});
  if (outputCreated) {
    try {
      await unlink(outputPath);
    } catch {
      console.error('Could not remove the incomplete schema dump.');
    }
  }
  console.error(
    timedOut
      ? 'Schema export exceeded 60 seconds; no database changes were made.'
      : `Schema export failed; no database changes were made. Error code: ${error.code || 'unknown'}.`,
  );
  if (stderr.trim()) {
    const redactedValues = [
      parsedUrl.hostname,
      decodeURIComponent(parsedUrl.username),
      decodeURIComponent(parsedUrl.pathname.slice(1)),
      password,
    ].filter((value) => value.length > 2);
    let diagnostic = stderr.trim().split(/\r?\n/, 1)[0];
    for (const value of redactedValues) {
      diagnostic = diagnostic.split(value).join('[redacted]');
    }
    diagnostic = diagnostic
      .replace(/\b(host|database|user) "[^"]+"/gi, '$1 "[redacted]"')
      .slice(0, 240);
    console.error(`pg_dump diagnostic: ${diagnostic}`);
  }
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  if (trustBundlePath) {
    try {
      await unlink(trustBundlePath);
      await rmdir(trustDirectory);
    } catch {
      console.error('Could not remove the temporary public CA bundle.');
      process.exitCode = 1;
    }
  }
}
