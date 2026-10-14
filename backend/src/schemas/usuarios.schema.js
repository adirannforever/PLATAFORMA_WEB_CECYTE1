import { z } from '../config/zod.js';
import { MAX_IMPORT_CSV_BYTES } from '../services/usuarios.service.js';

export const importarUsuariosSchema = z.object({
  csv: z.string().min(1).max(MAX_IMPORT_CSV_BYTES),
  defaultPassword: z.string().optional(),
}).strict();
