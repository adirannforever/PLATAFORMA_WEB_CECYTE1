import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createLimiter } from '../middlewares/rateLimit.js';
import { avisosQuerySchema, resumenQuerySchema } from '../schemas/public.schema.js';
import {
  descargarAdjuntoAvisoPublico,
  getAvisos,
  getResumen,
} from '../controllers/public.controller.js';

const router = Router();

// Superficie pública: límite estricto (30/min por IP) además del apiLimiter global.
// Sin verifyToken a propósito — es el portal público.
const publicLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Límite de solicitudes excedido. Por favor intenta más tarde.',
});

router.get('/avisos', publicLimiter, validate(avisosQuerySchema, 'query'), getAvisos);
router.get('/avisos/:id/archivos/:index', publicLimiter, descargarAdjuntoAvisoPublico);
router.get('/resumen', publicLimiter, validate(resumenQuerySchema, 'query'), getResumen);

export default router;
