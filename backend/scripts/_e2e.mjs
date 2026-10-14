// Re-validate backend: boot the real server, login, hit the endpoint.
import { spawn } from 'node:child_process';
const PORT = 4098;
const BASE = `http://localhost:${PORT}`;
const backendDir = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const server = spawn('node', ['src/index.js'], { cwd: backendDir, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', () => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  let up = false;
  for (let i = 0; i < 30; i++) { try { if ((await fetch(`${BASE}/health`)).ok) { up = true; break; } } catch {} await sleep(500); }
  if (!up) { console.log('SERVER DID NOT START'); server.kill(); process.exit(1); }
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@cecyte.edu.mx', password: '123456' }) });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  const dash = await fetch(`${BASE}/api/dashboard/admin`, { headers: { Cookie: cookie } });
  const body = await dash.json();
  console.log('BACKEND OK:', dash.status === 200 && body.success, '| KPIs keys:', Object.keys(body.data?.kpis || {}).length, '| alerts:', (body.data?.alertas || []).length);
  server.kill();
  process.exit(0);
}
main();
