import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createLimiter } from '../middlewares/rateLimit.js';
import { avisosQuerySchema, preRegistroSchema, resumenQuerySchema } from '../schemas/public.schema.js';
import {
  descargarAdjuntoAvisoPublico,
  getAvisos,
  getCatalogosPublicos,
  getResumen,
  preRegistro,
} from '../controllers/public.controller.js';

const router = Router();

// Superficie pública: límite estricto (30/min por IP) además del apiLimiter global.
// Sin verifyToken a propósito — es el portal público.
const publicLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Límite de solicitudes excedido. Por favor intenta más tarde.',
});

// Escritura pública (pre-registro): límite mucho más duro que la lectura,
// para que el honeypot + rate limit juntos contengan scrapers/bots sin captcha.
const preRegistroLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiados pre-registros desde esta IP. Intenta de nuevo en unos minutos.',
});

router.get('/avisos', publicLimiter, validate(avisosQuerySchema, 'query'), getAvisos);
router.get('/avisos/:id/archivos/:index', publicLimiter, descargarAdjuntoAvisoPublico);
router.get('/resumen', publicLimiter, validate(resumenQuerySchema, 'query'), getResumen);
router.get('/catalogos', publicLimiter, getCatalogosPublicos);
router.post('/pre-registro', preRegistroLimiter, validate(preRegistroSchema), preRegistro);

export default router;
