import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestPath(req) {
  const routePath = req.route?.path;
  if (typeof routePath !== 'string') return '/unmatched';

  return `${req.baseUrl || ''}${routePath}` || '/';
}

export function requestContext(req, res, next) {
  const suppliedId = req.get('x-request-id');
  req.requestId = suppliedId && REQUEST_ID_PATTERN.test(suppliedId)
    ? suppliedId
    : randomUUID();
  req.requestStartedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

export function accessLogger(req, res, next) {
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.requestStartedAt) / 1e6;
    logger.info('HTTP request', {
      requestId: req.requestId,
      method: req.method,
      path: requestPath(req),
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });
  next();
}
