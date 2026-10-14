import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import s from './ui.module.css';

/**
 * Button — primary | secondary | ghost | danger | accent.
 * Renders as <button>, or as a react-router <Link> when `to` is set
 * (keeps client-side navigation + keyboard focus), or as <a> when `href`.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size, to, href, className = '', children, ...rest },
  ref
) {
  const classes = [s.btn, s[`btn${cap(variant)}`], size === 'sm' && s.btnSm, className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} {...rest}>
      {children}
    </button>
  );
});

function cap(v) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default Button;

