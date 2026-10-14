// Stage-1 schema reconciliation: versioned SQL (schema.sql + RBAC migration)
// vs the Neon baseline snapshot. Produces an inventory of tables, the missing
// objects (view v_promedios_periodo, triggers) and a JSON report.
//
// Usage: node scripts/reconcile-schema.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  schema: readFileSync(join(root, 'src/db/schema.sql'), 'utf8'),
  migration: readFileSync(join(root, 'src/db/migrations/001_rbac_roles_permisos.sql'), 'utf8'),
  snapshot: readFileSync(join(root, 'src/db/snapshots/neon-baseline-2026-10-12.sql'), 'utf8'),
};

// `CREATE TABLE [IF NOT EXISTS] [schema.]name (`
// The last dotted identifier is the table name (handles schema-qualified names).
const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[A-Za-z_][A-Za-z0-9_]*\.)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1\s*\(/gi;

function extractTables(sql) {
  const tables = [];
  let m;
  while ((m = tableRegex.exec(sql)) !== null) {
    tables.push(m[2]);
  }
  return tables;
}

function countObject(sql, pattern) {
  const matches = sql.match(pattern) || [];
  return matches.length;
}

const schemaTables = extractTables(files.schema);
const migrationTables = extractTables(files.migration);
const snapshotTables = extractTables(files.snapshot);

const missingInVersioned = snapshotTables.filter(t => !schemaTables.includes(t));
const missingInMigration = migrationTables.filter(t => !schemaTables.includes(t));

const report = {
  schemaSql: { tables: schemaTables, count: schemaTables.length, bytes: files.schema.length },
  migration: { tables: migrationTables, count: migrationTables.length, bytes: files.migration.length },
  snapshot: { tables: snapshotTables, count: snapshotTables.length, bytes: files.snapshot.length },
  snapshotMissingFromVersioned: missingInVersioned,
  schemaFilesWithMigration: schemaTables.concat(migrationTables),
  viewNames: [...(files.snapshot.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1/gi) || [])].map(s => s.replace(/^.*VIEW\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1.*$/, '$2')),
  triggerNames: [...(files.snapshot.match(/CREATE\s+TRIGGER\s+(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1/gi) || [])].map(s => s.replace(/^.*TRIGGER\s+(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1.*$/, '$2')),
  functions: [...(files.snapshot.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1/gi) || [])].map(s => s.replace(/^.*FUNCTION\s+(?:[A-Za-z_][A-Za-z0-9_]*\.)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1.*$/, '$2')),
  migrationAddsColumn: [...(files.migration.match(/ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]+\s+ADD\s+COLUMN\s+(IF\s+NOT\s+EXISTS\s+)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\2/gi) || [])],
};

console.log('=== Schema reconciliation ===');
console.log(`schema.sql       : ${report.schemaSql.count} tables, ${report.schemaSql.bytes} bytes`);
console.log(`migration (001)  : ${report.migration.count} tables, ${report.migration.bytes} bytes`);
console.log(`neon-baseline    : ${report.snapshot.count} tables, ${report.snapshot.bytes} bytes`);
console.log(`snapshot tables missing from schema.sql : ${report.snapshotMissingFromVersioned.length}`);
if (report.snapshotMissingFromVersioned.length) {
  console.log('  e.g.: ' + report.snapshotMissingFromVersioned.join(', '));
}
console.log(`migration tables missing from schema.sql: ${missingInMigration.length}`);
if (missingInMigration.length) {
  console.log('  e.g.: ' + missingInMigration.join(', '));
}
console.log(`views in snapshot : ${report.viewNames.join(', ') || '(none)'}`);
console.log(`triggers in snapshot: ${report.triggerNames.join(', ') || '(none)'}`);
console.log(`functions in snapshot: ${report.functions.join(', ') || '(none)'}`);
console.log(`migration ADD COLUMN: ${report.migrationAddsColumn.map(c => c.match(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(["'`]?)([A-Za-z_][A-Za-z0-9_]*)\1/)?.[1] || c).join(', ') || '(none)'}`);

mkdirSync(join(root, 'scripts', 'reports'), { recursive: true });
writeFileSync(join(root, 'scripts', 'reports', 'reconcile-stage1.json'), JSON.stringify(report, null, 2));
console.log('\n[report written to scripts/reports/reconcile-stage1.json]');
