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
        message: 'Datos inválidos',
        errors: parsed.error.issues,
      });
    }
    req[target] = parsed.data;
    next();
  } catch (err) {
    next(err);
  }
};
