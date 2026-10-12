import Redis from 'ioredis';

// ============================================================
// Redis opcional: si no hay REDIS_URL configurada, se exporta
// un stub deshabilitado que NO abre conexiones ni genera ruido
// en los logs. El sistema no depende de Redis para operar
// (cache de permisos = memoria, logs = winston/consola).
// ============================================================

const REDIS_URL = process.env.REDIS_URL;

const crearStubDeshabilitado = () => {
  const stub = {
    status: 'disabled',
    disabled: true,
    on: () => stub,          // compatible con EventEmitter para logger.service
    ping: async () => null,  // null = "sin redis" (jamás 'PONG')
    rPush: async () => null,
    lTrim: async () => null,
    get: async () => null,
    set: async () => null,
    del: async () => null,
    quit: async () => null,
    disconnect: () => {},
  };
  return stub;
};

let cliente;

if (!REDIS_URL) {
  console.log('[Redis] REDIS_URL no definida → cliente deshabilitado (modo stub).');
  cliente = crearStubDeshabilitado();
} else {
  const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    // Backoff acotado: reintenta cada 1s → máx. 30s. Nunca en bucle apretado.
    retryStrategy: (times) => Math.min(times * 1000, 30000),
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'TRYAGAIN', 'BUSY'];
      return targetErrors.some((t) => err.message.includes(t));
    },
  });

  let ultimoError = '';
  redisClient.on('connect', () => {
    console.log('[Redis] Conexión establecida');
    ultimoError = '';
  });

  // Log una sola vez por error distinto (evita spamear ECONNREFUSED cada reintento)
  redisClient.on('error', (err) => {
    if (err.message !== ultimoError) {
      ultimoError = err.message;
      console.error('[Redis] Error:', err.message);
    }
  });

  cliente = redisClient;
}

export default cliente;
