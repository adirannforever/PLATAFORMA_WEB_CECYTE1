import { z } from '../config/zod.js';

// Query para GET /api/public/avisos — límite acotado, sin búsqueda libre
// (evita superficie LIKE/scrape; el controlador blanquea campos y adjuntos).
export const avisosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
}).strict();

// Query para GET /api/public/resumen — sin parámetros.
export const resumenQuerySchema = z.object({}).strict();

// Body para POST /api/public/pre-registro — pre-registro público de aspirantes.
// Espejo de crearAspiranteSchema SIN ciclo_id ni folio: ambos los resuelve el
// server (ciclo activo + folio autogenerado) para que el público no los envíe.
// `website` es un honeypot invisible para bots; los humanos nunca lo llenan.
export const preRegistroSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellidos: z.string().trim().min(1).max(150),
  curp: z.string().trim().toUpperCase().length(18),
  email: z.string().trim().toLowerCase().email().max(254),
  telefono: z.string().trim().max(20).optional().or(z.literal('')),
  especialidad_id: z.coerce.number().int().positive(),
  turno_preferido_id: z.coerce.number().int().positive(),
  website: z.string().max(200).optional().default(''),
}).strict();
