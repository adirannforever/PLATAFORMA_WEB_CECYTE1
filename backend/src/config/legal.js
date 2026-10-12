// ============================================================
// CONFIGURACION LEGAL CENTRAL - BACKEND
// Plantilla educativa. Requiere revision legal antes de uso real.
// 
// ¿Por qué? Centraliza datos legales para emails, documentos PDF
// y respuestas API evitando duplicación.
// ============================================================

export const LEGAL_NOTES = {
  DISCLAIMER: 'Plantilla educativa. Requiere revision legal antes de uso real.',
};

export const INSTITUCION_LEGAL = {
  nombre: 'Plataforma CECyTE (proyecto academico, demo)',
  nombreCompleto: 'Plataforma CECyTE - Proyecto Académico de Aprendizaje (Demo)',
  contactoEmail: 'contacto@example.com',
  soporteEmail: 'soporte@example.com',
  privacidadEmail: 'privacidad@example.com',
  direccion: '[PENDIENTE: dato real]',
};

export const EMAIL_TEMPLATES = {
  asuntoBase: '[CECyTE Demo] ',
  footer: `
---
Este es un correo de demostración educativa.
Plantilla educativa. Requiere revision legal antes de uso real.
No utilizar con datos reales.
  `,
};
