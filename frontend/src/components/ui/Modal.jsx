import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import s from './ui.module.css';

/**
 * Modal — accessible dialog: role=dialog, aria-modal, Esc to close,
 * click-outside to close, focus moved in on open and restored on close,
 * basic focus trap, body scroll lock.
 */
export default function Modal({ open, onClose, title, children, footer, labelledBy }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    // Focus first focusable element inside the modal.
    const focusables = node?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusables && focusables.length ? focusables[0] : node)?.focus?.();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'Tab' && node) {
        const items = Array.from(
          node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.disabled);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={s.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className={s.modal} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <header className={s.modalHeader}>
          <h2 className={s.modalTitle} id={labelledBy}>{title}</h2>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className={s.modalBody}>{children}</div>
        {footer && <footer className={s.modalFooter}>{footer}</footer>}
      </div>
    </div>
  );
}
