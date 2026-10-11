// ============================================================
// Fuente única de verdad de la identibilidad institucional (Backend).
// Usada por generadores de documentos (PDF/Excel) y health checks.
// ============================================================

export const INSTITUCION = Object.freeze({
  nombre: 'CECyTE Plantel 1',
  estado: 'Tabasco',
  sede: 'Poblado Aquiles Serdán, Macuspana',
  ciudad: 'Macuspana',
  lema: 'Orgullo Lince',
});

// Encabezado compacto para boletas / constancias.
export const INSTITUCION_HEADER = `${INSTITUCION.nombre} - ${INSTITUCION.sede}`;
