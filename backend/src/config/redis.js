import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'TRYAGAIN', 'BUSY'];
    return targetErrors.some((t) => err.message.includes(t));
  },
});

redisClient.on('connect', () => {
  console.log('[Redis] Conexión establecida');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

export default redisClient;
