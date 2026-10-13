// ============================================================
// Catálogos de dominio compartidos (Backend).
// Fuente única de verdad para validación de entrada en los controllers.
//
// REGLA: estos valores DEBEN coincidir con:
//   - El frontend (src/config/*.js)
//   - Los CHECK constraints del schema (backend/src/db/schema.sql)
// Si se agrega/renombra un valor, actualizar los tres lados.
// ============================================================

// Roles válidos de usuario (coincide con ROLES en frontend/config/permissions.js)
export const ROLES_VALIDOS = [
  'alumno',
  'docente',
  'administrador',
  'control_escolar',
  'directivo',
  'tutor',
  'aspirante',
];

// Tipos de incidencia válidos (coincide con TIPO_INCIDENCIA en frontend/config/incidencias.js)
export const TIPOS_INCIDENCIA = [
  'conducta',
  'academica',
  'asistencia',
  'citatorio_tutor',
  'felicitacion',
  'otro',
];

// Tipos de servicio social / prácticas (coincide con el CHECK del schema)
export const TIPOS_SERVICIO_SOCIAL = ['servicio_social', 'practicas_profesionales'];
