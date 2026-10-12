/**
 * Migración idempotente de auditoría en vivo.
 * Agrega las columnas metodo, ruta y status a auditoria_logs.
 * (schema.sql ya las incluye; este script es para BDs existentes.)
 *
 * Uso: node scripts/migrarAuditoria.mjs
 */
import pool from '../src/config/db.js';

const COLUMNAS = [
  ['metodo', 'VARCHAR(10)'],
  ['ruta', 'VARCHAR(255)'],
  ['status', 'INTEGER'],
];

try {
  for (const [nombre, tipo] of COLUMNAS) {
    await pool.query(
      `ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS ${nombre} ${tipo}`
    );
    console.log(`  columna "${nombre}" verificada/agregada`);
  }
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'auditoria_logs' ORDER BY ordinal_position"
  );
  console.log('COLUMNAS auditoria_logs:', r.rows.map((x) => x.column_name).join(', '));
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
