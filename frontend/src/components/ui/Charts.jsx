/**
 * Lightweight, dependency-free SVG charts (brand-colored).
 * No chart library added: these 3 compact charts cover the dashboard.
 * Each chart exposes an accessible text alternative (role="img" + aria-label)
 * and a native tooltip on hover/focus of bars.
 */

const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

/** Vertical bar chart. data: [{ etiqueta, valor }]. */
export function BarChart({ data = [], ariaLabel = 'Gráfica de barras', height = 180 }) {
  const max = Math.max(1, ...data.map((d) => d.valor));
  const width = Math.max(data.length * 48, 240);
  const summary = data.map((d) => `${d.etiqueta}: ${d.valor}`).join(', ');
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 34}`} width="100%" height={height + 34} role="img" aria-label={`${ariaLabel}. ${summary}`} preserveAspectRatio="xMidYMid meet">
        <title>{`${ariaLabel}. ${summary}`}</title>
        {/* baseline */}
        <line x1="8" x2={width - 8} y1={height} y2={height} stroke="var(--color-border)" />
        {data.map((d, i) => {
          const barW = 30;
          const gap = 48;
          const x = i * gap + (gap - barW) / 2 + 4;
          const h = max ? (d.valor / max) * (height - 16) : 0;
          const y = height - h;
          return (
            <g key={d.etiqueta}>
              <rect x={x} y={y} width={barW} height={Math.max(h, d.valor > 0 ? 2 : 0)} rx="4" fill={SERIES[i % SERIES.length]}>
                <title>{`${d.etiqueta}: ${d.valor}`}</title>
              </rect>
              <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">{d.etiqueta}</text>
              {d.valor > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text)">{d.valor}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Grouped bars (e.g. presentes vs ausentes por semana). data: [{ etiqueta, series: number[] }] */
export function GroupedBarChart({ data = [], seriesLabels = ['Presentes', 'Ausentes'], ariaLabel = 'Gráfica agrupada', height = 180 }) {
  const max = Math.max(1, ...data.flatMap((d) => d.series));
  const colors = [SERIES[0], SERIES[1]];
  const W = Math.max(data.length * 56, 240);
  const summary = data.map((d) => `${d.etiqueta}: ${d.series.join('/')}`).join(', ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height + 34}`} width="100%" height={height + 34} role="img" aria-label={`${ariaLabel}. ${summary}`} preserveAspectRatio="xMidYMid meet">
        <title>{`${ariaLabel}. ${summary}`}</title>
        <line x1="8" x2={W - 8} y1={height} y2={height} stroke="var(--color-border)" />
        {data.map((d, i) => {
          const groupW = 44;
          const gap = 56;
          const baseX = i * gap + (gap - groupW) / 2 + 4;
          const barW = (groupW - 4) / d.series.length;
          return (
            <g key={d.etiqueta}>
              {d.series.map((val, si) => {
                const h = max ? (val / max) * (height - 16) : 0;
                const x = baseX + si * (barW + 2);
                return (
                  <rect key={si} x={x} y={height - h} width={barW} height={Math.max(h, val > 0 ? 2 : 0)} rx="3" fill={colors[si % colors.length]}>
                    <title>{`${d.etiqueta} · ${seriesLabels[si]}: ${val}`}</title>
                  </rect>
                );
              })}
              <text x={baseX + groupW / 2} y={height + 16} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">{d.etiqueta}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Donut chart. data: [{ etiqueta, valor }] — shows percentages, legend rendered by caller. */
export function DonutChart({ data = [], ariaLabel = 'Gráfica de dona', size = 180 }) {
  const total = data.reduce((a, d) => a + d.valor, 0);
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const summary = data.map((d) => `${d.etiqueta}: ${d.valor} (${total ? Math.round((d.valor / total) * 100) : 0}%)`).join(', ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`${ariaLabel}. ${summary}`}>
      <title>{`${ariaLabel}. ${summary}`}</title>
      <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
        <circle r={r} fill="none" stroke="var(--color-surface-subtle)" strokeWidth="22" />
        {total > 0 && data.map((d, i) => {
          const frac = d.valor / total;
          const dash = frac * c;
          const seg = (
            <circle key={d.etiqueta} r={r} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="22" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} strokeLinecap="butt">
              <title>{`${d.etiqueta}: ${d.valor} (${Math.round(frac * 100)}%)`}</title>
            </circle>
          );
          offset += dash;
          return seg;
        })}
        <text x="0" y="4" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-primary-dark)" transform="rotate(90)">{total}</text>
        <text x="0" y="22" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)" transform="rotate(90)">total</text>
      </g>
    </svg>
  );
}

export const CHART_COLORS = SERIES;
