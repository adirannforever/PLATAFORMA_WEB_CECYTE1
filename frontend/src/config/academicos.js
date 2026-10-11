// ============================================================
// Constantes y helpers académicos compartidos (Frontend).
// Evitan duplicar listas de semestres / letras de grupo en cada página.
// Preferimos SIEMPRE derivar de los grupos reales (API); estos valores
// solo actúan como fallback mientras no hay datos cargados.
// ============================================================

// Fallback mientras se cargan los grupos desde la API.
export const SEMESTRES_FALLBACK = [1, 2, 3, 4, 5, 6];

// Número de parciales por defecto si el ciclo no define periodos de evaluación.
export const PARCIALES_FALLBACK = [1, 2, 3];

// Deriva la lista ordenada de semestres a partir de los grupos reales.
export function semestresDesdeGrupos(grupos = []) {
  const set = new Set(
    (grupos || []).map((g) => Number(g.semestre)).filter((n) => Number.isFinite(n) && n > 0)
  );
  if (set.size === 0) return SEMESTRES_FALLBACK;
  return [...set].sort((a, b) => a - b);
}

// Deriva la lista ordenada de letras de grupo a partir de los grupos reales.
export function letrasDesdeGrupos(grupos = []) {
  const set = new Set((grupos || []).map((g) => g.letra).filter(Boolean));
  if (set.size === 0) return [];
  return [...set].sort();
}

// Deriva los parciales evaluados a partir de los periodos de evaluación.
// `periodos` es el arreglo devuelto por getPeriodosEvaluacion (filas con .parcial).
export function parcialesDesdePeriodos(periodos = []) {
  const set = new Set(
    (periodos || []).map((p) => Number(p.parcial)).filter((n) => Number.isFinite(n) && n > 0)
  );
  if (set.size === 0) return PARCIALES_FALLBACK;
  return [...set].sort((a, b) => a - b);
}
