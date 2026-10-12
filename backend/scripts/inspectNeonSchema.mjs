import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required to inspect the Neon schema.');
  process.exit(1);
}

let databaseHost;
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase();
} catch {
  console.error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  process.exit(1);
}

if (!databaseHost.endsWith('.neon.tech')) {
  console.error('Refusing to inspect a database that is not hosted on Neon.');
  process.exit(1);
}

const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const requestedOutput = outputArgument?.slice('--output='.length);

if (!requestedOutput) {
  console.error('Pass --output=<path> to choose where the schema-only snapshot is written.');
  process.exit(1);
}

const outputPath = resolve(requestedOutput);
const client = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 8_000,
  application_name: 'cecyte-readonly-schema-inspection',
});
const timeout = setTimeout(() => {
  console.error('Schema inspection exceeded 40 seconds; no database changes were made.');
  process.exit(1);
}, 40_000);

const catalogQueries = {
  schemas: `
    SELECT nspname AS name
    FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%'
      AND nspname <> 'information_schema'
    ORDER BY nspname
  `,
  relations: `
    SELECT n.nspname AS schema, c.relname AS name,
      CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'p' THEN 'partitioned_table'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized_view'
        WHEN 'f' THEN 'foreign_table'
        WHEN 'S' THEN 'sequence'
        ELSE c.relkind::text
      END AS kind,
      c.relrowsecurity AS row_security_enabled,
      c.relforcerowsecurity AS row_security_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    ORDER BY n.nspname, c.relname
  `,
  sequences: `
    SELECT sequence_schema AS schema, sequence_name AS name,
      data_type, start_value, minimum_value, maximum_value,
      increment, cycle_option,
      tn.nspname AS owned_by_schema, tc.relname AS owned_by_relation,
      a.attname AS owned_by_column
    FROM information_schema.sequences s
    LEFT JOIN pg_namespace sn ON sn.nspname = s.sequence_schema
    LEFT JOIN pg_class sc ON sc.relnamespace = sn.oid
      AND sc.relname = s.sequence_name AND sc.relkind = 'S'
    LEFT JOIN pg_depend d ON d.objid = sc.oid AND d.deptype IN ('a', 'i')
    LEFT JOIN pg_class tc ON tc.oid = d.refobjid
    LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = d.refobjsubid
    WHERE sequence_schema NOT LIKE 'pg_%'
      AND sequence_schema <> 'information_schema'
    ORDER BY sequence_schema, sequence_name
  `,
  columns: `
    SELECT table_schema AS schema, table_name AS relation,
      ordinal_position, column_name, data_type, udt_schema, udt_name,
      is_nullable, column_default, character_maximum_length,
      numeric_precision, numeric_scale, datetime_precision,
      is_identity, identity_generation, is_generated, generation_expression
    FROM information_schema.columns
    WHERE table_schema NOT LIKE 'pg_%'
      AND table_schema <> 'information_schema'
    ORDER BY table_schema, table_name, ordinal_position
  `,
  constraints: `
    SELECT n.nspname AS schema, r.relname AS relation, con.conname AS name,
      CASE con.contype
        WHEN 'p' THEN 'primary_key'
        WHEN 'f' THEN 'foreign_key'
        WHEN 'u' THEN 'unique'
        WHEN 'c' THEN 'check'
        WHEN 'x' THEN 'exclusion'
        ELSE con.contype::text
      END AS kind,
      pg_get_constraintdef(con.oid, true) AS definition,
      rn.nspname AS referenced_schema, rr.relname AS referenced_relation
    FROM pg_constraint con
    JOIN pg_class r ON r.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    LEFT JOIN pg_class rr ON rr.oid = con.confrelid
    LEFT JOIN pg_namespace rn ON rn.oid = rr.relnamespace
    WHERE n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
    ORDER BY n.nspname, r.relname, con.conname
  `,
  indexes: `
    SELECT schemaname AS schema, tablename AS relation,
      indexname AS name, indexdef AS definition
    FROM pg_indexes
    WHERE schemaname NOT LIKE 'pg_%'
      AND schemaname <> 'information_schema'
    ORDER BY schemaname, tablename, indexname
  `,
  views: `
    SELECT schemaname AS schema, viewname AS name, definition
    FROM pg_views
    WHERE schemaname NOT LIKE 'pg_%'
      AND schemaname <> 'information_schema'
    ORDER BY schemaname, viewname
  `,
  materializedViews: `
    SELECT schemaname AS schema, matviewname AS name, definition, ispopulated
    FROM pg_matviews
    WHERE schemaname NOT LIKE 'pg_%'
      AND schemaname <> 'information_schema'
    ORDER BY schemaname, matviewname
  `,
  triggers: `
    SELECT n.nspname AS schema, c.relname AS relation, t.tgname AS name,
      pg_get_triggerdef(t.oid, true) AS definition, p.proname AS function_name,
      pg_get_functiondef(p.oid) AS function_definition
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
    ORDER BY n.nspname, c.relname, t.tgname
  `,
  routines: `
    SELECT n.nspname AS schema, p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS result, l.lanname AS language,
      p.prokind AS kind, p.prosecdef AS security_definer,
      p.provolatile AS volatility
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
      AND p.prokind IN ('f', 'p')
    ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  `,
  types: `
    SELECT n.nspname AS schema, t.typname AS name, t.typtype AS kind,
      CASE WHEN t.typtype = 'e' THEN (
        SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder)
        FROM pg_enum e WHERE e.enumtypid = t.oid
      ) ELSE NULL END AS enum_values,
      CASE WHEN t.typtype = 'd' THEN format_type(t.typbasetype, t.typtypmod)
        ELSE NULL END AS domain_base_type,
      CASE WHEN t.typtype = 'd' THEN pg_get_constraintdef(dc.oid, true)
        ELSE NULL END AS domain_constraint
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_constraint dc ON dc.contypid = t.oid
    WHERE n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
      AND t.typtype IN ('e', 'd')
    ORDER BY n.nspname, t.typname
  `,
  policies: `
    SELECT schemaname AS schema, tablename AS relation, policyname AS name,
      permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname NOT LIKE 'pg_%'
      AND schemaname <> 'information_schema'
    ORDER BY schemaname, tablename, policyname
  `,
  comments: `
    SELECT n.nspname AS schema, c.relname AS relation,
      CASE WHEN d.objsubid = 0 THEN NULL ELSE a.attname END AS column_name,
      d.description
    FROM pg_description d
    JOIN pg_class c ON c.oid = d.objoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
    WHERE d.classoid = 'pg_class'::regclass
      AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
    ORDER BY n.nspname, c.relname, d.objsubid
  `,
  extensions: `
    SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    ORDER BY e.extname
  `,
  schemaTrackingCandidates: `
    SELECT table_schema AS schema, table_name AS relation
    FROM information_schema.tables
    WHERE table_schema NOT LIKE 'pg_%'
      AND table_schema <> 'information_schema'
      AND table_name ~* '(migration|schema|version|changelog|knex|sequelize|prisma)'
    ORDER BY table_schema, table_name
  `,
};

let transactionOpen = false;

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  transactionOpen = true;
  await client.query("SET LOCAL statement_timeout = '10s'");
  await client.query("SET LOCAL lock_timeout = '2s'");

  const catalog = {};
  for (const [name, query] of Object.entries(catalogQueries)) {
    catalog[name] = (await client.query(query)).rows;
  }

  await client.query('ROLLBACK');
  transactionOpen = false;

  const snapshot = {
    source: 'Neon PostgreSQL system catalogs',
    readOnly: true,
    capturedAt: new Date().toISOString(),
    counts: Object.fromEntries(
      Object.entries(catalog).map(([name, rows]) => [name, rows.length]),
    ),
    catalog,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  console.log(`Schema-only catalog snapshot saved to ${outputPath}`);
  console.log(JSON.stringify(snapshot.counts, null, 2));
} catch (error) {
  console.error(
    'Neon schema inspection failed; no database changes were made.',
    `Error code: ${error.code || 'unknown'}`,
  );
  if (transactionOpen) {
    try {
      await client.query('ROLLBACK');
    } catch {
      console.error('The read-only transaction closed with the connection.');
    }
  }
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  try {
    await client.end();
  } catch {
    console.error('Could not close the read-only database connection cleanly.');
    process.exitCode = 1;
  }
}
