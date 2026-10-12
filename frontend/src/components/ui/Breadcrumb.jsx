import { NavLink } from 'react-router-dom';
import s from './ui.module.css';

/** Breadcrumb — items: [{ to?, label }]; last item is current. */
export default function Breadcrumb({ items = [] }) {
  return (
    <nav className={s.breadcrumb} aria-label="Ruta de navegación">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={it.to || it.label} className={s.breadcrumbItem}>
            {it.to && !isLast ? (
              <NavLink to={it.to} className={s.breadcrumbLink}>{it.label}</NavLink>
            ) : (
              <span className={s.breadcrumbCurrent}>{it.label}</span>
            )}
            {!isLast && <span className={s.breadcrumbSep}> / </span>}
          </span>
        );
      })}
    </nav>
  );
}
