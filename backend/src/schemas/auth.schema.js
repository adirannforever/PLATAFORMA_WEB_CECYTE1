import { z } from '../config/zod.js';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const activateAccountSchema = z.object({
  token: z.string().trim().min(32).max(128),
  password: z.string().min(12).max(128),
}).strict();
