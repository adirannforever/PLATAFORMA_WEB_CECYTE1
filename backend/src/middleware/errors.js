import { logger } from '../config/logger.js';
import { requestPath } from './requestContext.js';

export function apiNotFound(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Ruta de API no encontrada.',
    code: 'NOT_FOUND',
    requestId: req.requestId,
  });
}

export function apiErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const requestedStatus = Number(err.status || err.statusCode);
  const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600
    ? requestedStatus
    : 500;
  const requestMeta = {
    requestId: req.requestId,
    method: req.method,
    path: requestPath(req),
    status,
    errorName: err.name,
    errorCode: err.code,
  };

  if (status >= 500) logger.error('Unhandled API error', requestMeta);
  else logger.warn('API request rejected', requestMeta);

  const malformedJson = err.type === 'entity.parse.failed';
  const payloadTooLarge = err.type === 'entity.too.large';
  const corsRejected = err.code === 'CORS_ORIGIN_DENIED';
  const responseStatus = malformedJson ? 400 : payloadTooLarge ? 413 : corsRejected ? 403 : status;

  let message = 'Error interno del servidor.';
  let code = 'INTERNAL_ERROR';
  if (malformedJson) {
    message = 'El cuerpo de la solicitud no contiene JSON válido.';
    code = 'INVALID_JSON';
  } else if (payloadTooLarge) {
    message = 'El cuerpo de la solicitud excede el tamaño permitido.';
    code = 'PAYLOAD_TOO_LARGE';
  } else if (corsRejected) {
    message = 'Origen no permitido por CORS.';
    code = 'CORS_ORIGIN_DENIED';
  } else if (responseStatus < 500) {
    message = 'Solicitud no válida.';
    code = err.code || 'REQUEST_ERROR';
  }

  return res.status(responseStatus).json({
    success: false,
    message,
    code,
    requestId: req.requestId,
  });
}
