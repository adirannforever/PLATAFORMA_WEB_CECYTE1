import { z } from '../config/zod.js';

// Query para GET /api/public/avisos — límite acotado, sin búsqueda libre
// (evita superficie LIKE/scrape; el controlador blanquea campos y adjuntos).
export const avisosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
}).strict();

// Query para GET /api/public/resumen — sin parámetros.
export const resumenQuerySchema = z.object({}).strict();
