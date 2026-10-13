// Rate limiting middleware - Lightweight, zero-dependency in-memory store
// Protects endpoints from brute-force and flood attacks

const stores = new Map();

export function createLimiter({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.',
  skipSuccessfulRequests = false,
}) {
  const store = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    let record = store.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      store.set(ip, record);
    }

    record.count++;

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: resetSeconds,
      });
    }

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && record.count > 0) {
          record.count--;
        }
      });
    }

    next();
  };
}

// Strict limiter for authentication attempts (10 attempts per 15 minutes)
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Demasiados intentos de acceso fallidos. Por seguridad, tu acceso ha sido pausado por 15 minutos.',
});

// General API protection (120 requests per minute)
export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Límite de solicitudes excedido. Por favor reduce la frecuencia de consultas.',
});
