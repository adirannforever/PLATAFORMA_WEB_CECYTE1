// Spawns `node src/index.js`, waits for it to listen, then hits /health, /ready, /metrics over HTTP.
// Kills the server at the end. Usage: node scripts/probe-server.cjs [port]
const { spawn } = require('child_process');
const http = require('http');

const port = process.argv[2] || '4000';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['src/index.js'], {
  cwd: __dirname + '/..',
  stdio: ['ignore', 'pipe', 'pipe'],
});

let heard = false;
const timer = setInterval(() => {
  http.get(base + '/health', (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log(`\n[health] HTTP ${res.statusCode} ${data.slice(0, 160)}`);
      clearInterval(timer);
      heard = true;
      probe();
    });
  }).on('error', (e) => {
    // server not up yet
  });
}, 500);

function probe() {
  const endpoints = ['/ready', '/metrics'];
  let done = 0;
  endpoints.forEach((ep) => request(ep, (code, body) => {
    console.log(`[${ep.slice(1)}] HTTP ${code} ${body.slice(0, 120)}`);
    done += 1;
    if (done === endpoints.length) stop();
  }));
}

function request(path, cb) {
  http.get(base + path, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => cb(res.statusCode, data));
  }).on('error', (e) => cb(0, e.message));
}

function stop() {
  server.kill('SIGTERM');
  setTimeout(() => {
    console.log('\n=== Server probe finished ===');
    process.exit(0);
  }, 300);
}
