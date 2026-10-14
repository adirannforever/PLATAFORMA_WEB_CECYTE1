import s from './ui.module.css';

/** Badge / StatusPill. tone: success | warning | danger | info | neutral */
export default function Badge({ tone = 'neutral', dot = false, children, className = '' }) {
  const toneClass = { success: s.badgeSuccess, warning: s.badgeWarning, danger: s.badgeDanger, info: s.badgeInfo, neutral: s.badgeNeutral }[tone] || s.badgeNeutral;
  return (
    <span className={[s.badge, toneClass, className].filter(Boolean).join(' ')}>
      {dot && <span className={s.badgeDot} aria-hidden="true" />}
      {children}
    </span>
  );
}
