import s from './ui.module.css';

/** Card — surface container. Props: title, subtitle, actions, padded, className, bodyClassName */
export default function Card({ title, subtitle, actions, padded = false, className = '', bodyClassName = '', children, ...rest }) {
  const hasHeader = title || actions;
  return (
    <section className={[s.card, className].filter(Boolean).join(' ')} {...rest}>
      {hasHeader && (
        <header className={s.cardHeader}>
          <div>
            {title && <h3 className={s.cardTitle}>{title}</h3>}
            {subtitle && <p className={s.cardSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={s.pageHeaderActions}>{actions}</div>}
        </header>
      )}
      <div className={[padded ? s.cardBody : '', bodyClassName].filter(Boolean).join(' ') || undefined}>{children}</div>
    </section>
  );
}
