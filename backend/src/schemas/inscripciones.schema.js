import { z } from '../config/zod.js';

const optionalTrimmedText = (max) => z.string().trim().max(max).optional().or(z.literal(''));

export const reinscripcionSchema = z.object({
  alumno_id: z.coerce.number().int().positive().optional(),
  grupo_id: z.coerce.number().int().positive().optional(),
  direccion: z.string().trim().min(1).max(250),
  telefono_personal: optionalTrimmedText(20),
  nombre_tutor: z.string().trim().min(1).max(150),
  telefono_tutor: z.string().trim().min(1).max(20),
  curp_tutor: optionalTrimmedText(18),
}).strict();
