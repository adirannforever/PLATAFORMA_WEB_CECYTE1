import { z } from '../config/zod.js';

export const crearAspiranteSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellidos: z.string().trim().min(1).max(150),
  curp: z.string().trim().toUpperCase().length(18),
  email: z.string().trim().toLowerCase().email().max(254),
  telefono: z.string().trim().max(20).optional().or(z.literal('')),
  especialidad_id: z.coerce.number().int().positive(),
  turno_preferido_id: z.coerce.number().int().positive(),
  ciclo_id: z.coerce.number().int().positive(),
  folio: z.string().trim().max(30).optional().or(z.literal('')),
}).strict();

export const actualizarAspiranteEstatusSchema = z.object({
  estatus: z.enum([
    'registrado',
    'documentos_pendientes',
    'ficha_pagada',
    'examen_aprobado',
    'aceptado',
    'rechazado',
    'inscrito',
  ]),
}).strict();

export const convertirAspiranteSchema = z.object({
  aspirante_id: z.coerce.number().int().positive(),
  grupo_id: z.coerce.number().int().positive(),
}).strict();
