import s from './ui.module.css';

/** PageHeader — page title (with orange accent), optional subtitle and actions. */
export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className={s.pageHeader}>
      <div className={s.pageHeaderText}>
        <h1 className={s.pageHeaderTitle}>{title}</h1>
        {subtitle && <p className={s.pageHeaderSubtitle}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className={s.pageHeaderActions}>{actions}</div>}
    </div>
  );
}
