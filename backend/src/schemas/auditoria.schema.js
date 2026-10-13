import { z } from '../config/zod.js';

const optionalFilter = z.string().trim().max(100).optional();
const optionalDate = z.string().trim().max(40).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  'Fecha inválida',
).optional();

export const auditoriaQuerySchema = z.object({
  usuario_id: z.coerce.number().int().positive().optional(),
  accion: optionalFilter,
  tabla_afectada: optionalFilter,
  fecha_desde: optionalDate,
  fecha_hasta: optionalDate,
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
}).strict();
