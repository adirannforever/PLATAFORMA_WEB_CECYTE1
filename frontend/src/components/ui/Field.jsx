import { forwardRef } from 'react';
import s from './ui.module.css';

/**
 * Field — labeled form control with error text.
 * `as`: 'input' | 'select' | 'textarea'. Renders label + control + help/error.
 */
const Field = forwardRef(function Field(
  { label, htmlFor, as = 'input', error, help, className = '', id, ...rest },
  ref
) {
  const controlId = id || htmlFor || rest.name;
  const Tag = as;
  const controlClass = [as === 'input' && s.input, as === 'select' && s.select, as === 'textarea' && s.textarea, error && (as === 'textarea' ? s.inputError : s.inputError)]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={[s.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={s.label} htmlFor={controlId}>
          {label}
        </label>
      )}
      <Tag ref={ref} id={controlId} className={controlClass} aria-invalid={error ? true : undefined} {...rest} />
      {error ? <span className={s.fieldError}>{error}</span> : help ? <span className={s.helpText}>{help}</span> : null}
    </div>
  );
});

export default Field;
