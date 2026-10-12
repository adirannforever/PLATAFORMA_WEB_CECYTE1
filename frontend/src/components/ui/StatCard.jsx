import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import s from './ui.module.css';

/**
 * StatCard (KPI) — icon, value, label, caption, optional delta badge.
 * Clickable and links to a module when `to` is set.
 * `tone`: green | orange | gold | info | gray -> sets accent + icon bg.
 */
const TONES = {
  green:  { accent: 'var(--color-primary)', bg: 'var(--green-50)' },
  orange: { accent: 'var(--orange-600)',    bg: 'var(--orange-50)' },
  gold:   { accent: 'var(--color-accent)',  bg: 'var(--color-accent-light)' },
  info:   { accent: 'var(--status-info)',   bg: 'var(--status-info-bg)' },
  gray:   { accent: 'var(--color-gray-600)',bg: 'var(--color-surface-subtle)' },
  danger: { accent: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
};

export default function StatCard({ icon, value, label, caption, delta, to, tone = 'green', loading = false }) {
  const t = TONES[tone] || TONES.green;
  const styleVars = { '--stat-accent': t.accent, '--stat-bg': t.bg };

  const inner = (
    <>
      <div className={s.statTop}>
        <span className={s.statLabel}>{label}</span>
        {icon && <span className={s.statIcon} aria-hidden="true">{icon}</span>}
      </div>
      <span className={s.statValue}>{loading ? '—' : value}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {typeof delta === 'number' && !loading && (
          <span className={[s.statDelta, delta === 0 && s.statDeltaFlat].filter(Boolean).join(' ')}>
            {delta > 0 && <TrendingUp size={12} aria-hidden="true" />}
            {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta} este mes
          </span>
        )}
        {caption && <span className={s.statCaption}>{caption}</span>}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={s.statCard} style={styleVars} aria-label={`${label}: ${value}`}>
        {inner}
      </Link>
    );
  }
  return <div className={s.statCard} style={styleVars}>{inner}</div>;
}
