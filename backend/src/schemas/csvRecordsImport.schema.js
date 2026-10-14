import { z } from '../config/zod.js';

export const importarRegistrosCsvSchema = z.object({
  csv: z.string().min(1),
}).strict();
