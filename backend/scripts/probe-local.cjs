// Helper probe: connect to a local PostgreSQL and run a list of queries.
// Usage: node scripts/probe-local.cjs <connstring> <query>...
const pg = require('pg');
const { URL } = require('url');

const connString = process.argv[2];
if (!connString) {
  console.error('Usage: node scripts/probe-local.cjs <connstring> <query>...');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: connString, max: 2 });

const args = process.argv.slice(3);
if (args.length === 0) {
  args.push('SELECT 1 AS ok');
}

const results = [];
for (const q of args) {
  const start = Date.now();
  try {
    const res = pool.query(q);
    res.then(r => {
      results.push({ query: q, ok: true, durationMs: Date.now() - start, rowCount: r.rowCount, rows: r.rows });
      console.log(`\n[OK] ${q} (${r.rowCount} rows, ${results.length})`);
      if (r.rows.length <= 5) console.log(JSON.stringify(r.rows, null, 2));
    }).catch(err => {
      results.push({ query: q, ok: false, durationMs: Date.now() - start, error: err.message });
      console.error(`\n[ERR] ${q}\n  -> ${err.message}`);
    });
  } catch (err) {
    results.push({ query: q, ok: false, durationMs: Date.now() - start, error: err.message });
    console.error(`\n[ERR] ${q}\n  -> ${err.message}`);
  }
}

// Wait for async queries to finish (max 10s) then summarize.
setTimeout(() => {
  console.log('\n=== Probe summary: ' + results.filter(r => r.ok).length + ' ok / ' + results.filter(r => !r.ok).length + ' failed ===');
  pool.end().then(() => process.exit(results.some(r => !r.ok) ? 1 : 0)).catch(() => process.exit(1));
}, 2000);
