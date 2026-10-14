import { z } from '../config/zod.js';

/**
 * Middleware de validación con zod.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'|'headers'} target
 */
export const validate = (schema, target = 'body') => async (req, res, next) => {
  try {
    const parsed = await schema.safeParse(req[target]);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        requestId: req.requestId,
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        })),
      });
    }
    Object.defineProperty(req, target, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: parsed.data,
    });
    next();
  } catch (err) {
    next(err);
  }
};
