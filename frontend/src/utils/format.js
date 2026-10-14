// Spanish (MX) date/number helpers used across the UI.

const RTF = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' }) : null;

/** Relative date, e.g. "hace 3 días", "hace 2 horas". */
export function relativeDate(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (RTF) {
    if (abs < 60) return RTF.format(Math.round(diffSec), 'second');
    if (abs < 3600) return RTF.format(Math.round(diffSec / 60), 'minute');
    if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), 'hour');
    if (abs < 2592000) return RTF.format(Math.round(diffSec / 86400), 'day');
    if (abs < 31536000) return RTF.format(Math.round(diffSec / 2592000), 'month');
    return RTF.format(Math.round(diffSec / 31536000), 'year');
  }
  return new Date(value).toLocaleDateString('es-MX');
}

/** Long date, e.g. "12 de octubre de 2026". */
export function longDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Week label from an ISO date, e.g. "10 ago". */
export function weekLabel(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
