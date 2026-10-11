import { logger } from '../config/logger.js';
import redisClient from '../config/redis.js';

class LoggerService {
  constructor() {
    this.redisReady = false;
    this.setupRedisConnect();
  }

  setupRedisConnect() {
    redisClient.on('connect', () => {
      this.redisReady = true;
    });
    redisClient.on('error', (err) => {
      this.redisReady = false;
      logger.warn('Redis no disponible para logs extra, fallback a consola', {
        error: err.message,
      });
    });
  }

  log(level, message, meta = {}) {
    const payload = { ...meta, ts: new Date().toISOString(), service: 'cecyte-backend' };
    logger[level](message, payload);
    this.persistToRedis(level, message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  async persistToRedis(level, message, meta) {
    if (!this.redisReady) return;
    try {
      const entry = { level, message, meta, ts: new Date().toISOString() };
      await redisClient.rPush('app:log:entries', JSON.stringify(entry));
      await redisClient.lTrim('app:log:entries', 0, 999);
    } catch (err) {
      logger.warn('Redis log fallback (no bloquea la petición)', { error: err.message });
    }
  }
}

export const loggerService = new LoggerService();
