// ============================================================
// Catálogo unificado de INCIDENCIAS (Frontend).
// Antes estaba duplicado entre IncidenciasPage y MisClasesIncidencias,
// lo que permitía que los dos módulos divergieran. Una sola fuente.
// ============================================================

export const TIPO_INCIDENCIA = {
  conducta: 'Conducta',
  academica: 'Académica',
  asistencia: 'Asistencia',
  citatorio_tutor: 'Citatorio a tutor',
  felicitacion: 'Felicitación',
  otro: 'Otro',
};

export const SUBTIPOS_POR_TIPO = {
  conducta: [
    'Falta de respeto',
    'Agresividad',
    'Incumplimiento de normas',
    'Bullying',
    'Uso inadecuado de dispositivos',
  ],
  academica: [
    'Bajo rendimiento',
    'Faltas de entrega de trabajos',
    'Plagio',
    'Participación insuficiente',
    'Dificultad en la materia',
  ],
  asistencia: [
    'Faltas injustificadas',
    'Retardos',
    'Salida anticipada',
    'Inasistencia recurrente',
  ],
  citatorio_tutor: [
    'Por bajo rendimiento',
    'Por conducta',
    'Por asistencia',
    'Por seguimiento académico',
  ],
  felicitacion: [
    'Excelente rendimiento',
    'Participación destacada',
    'Mejora significativa',
    'Compañerismo',
  ],
  otro: ['General'],
};

export const TIPO_COLORS = {
  conducta: '#b91c1c',
  academica: '#dc2626',
  asistencia: '#f59e0b',
  citatorio_tutor: '#3b82f6',
  felicitacion: '#10b981',
  otro: '#6b7280',
};

// Devuelve los subtipos de un tipo (o lista vacía si no existe).
export function getSubtipos(tipo) {
  return SUBTIPOS_POR_TIPO[tipo] || [];
}
