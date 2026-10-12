import s from './ui.module.css';

/** EmptyState — friendly placeholder when there is no data. */
export default function EmptyState({ icon, title = 'Sin datos', text, action }) {
  return (
    <div className={s.empty} role="status">
      {icon && <div className={s.emptyIcon} aria-hidden="true">{icon}</div>}
      <p className={s.emptyTitle}>{title}</p>
      {text && <p className={s.emptyText}>{text}</p>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}
