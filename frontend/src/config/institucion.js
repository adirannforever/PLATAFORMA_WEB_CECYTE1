// ============================================================
// Fuente única de verdad de la identidad institucional (Frontend).
// Todo texto del plantel (layout, landing, login, dashboard, PDFs)
// debe importar desde aquí para evitar desincronización.
// ============================================================

export const INSTITUCION = {
  nombre: 'CECyTE Plantel 1',
  estado: 'Tabasco',
  sede: 'Poblado Aquiles Serdán, Macuspana',
  ciudad: 'Macuspana',
  lema: 'Orgullo Lince',
  anioFundacion: 2026,
};

// Nombre completo para textos largos (footer, encabezados).
export const INSTITUCION_COMPLETA = `${INSTITUCION.nombre}`;

// Rango de semestres que ofrece la institución (fallback para filtros
// cuando aún no se han cargado los grupos reales desde la API).
export const SEMESTRES_INSTITUCION = [1, 2, 3, 4, 5, 6];
