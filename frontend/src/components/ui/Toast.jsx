import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import s from './ui.module.css';

const ToastContext = createContext(null);

let idSeq = 0;

/** ToastProvider — wrap the app (or layout) once; consume with useToast(). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((tone, message, ttl = 4000) => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, tone, message }]);
    if (ttl > 0) window.setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    success: (m, ttl) => push('success', m, ttl),
    error: (m, ttl) => push('error', m, ttl),
    info: (m, ttl) => push('info', m, ttl),
    remove,
  }), [push, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={s.toastStack} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={[s.toast, t.tone === 'success' && s.toastSuccess, t.tone === 'error' && s.toastError, t.tone === 'info' && s.toastInfo].filter(Boolean).join(' ')} role="status">
            <span aria-hidden="true" style={{ marginTop: 2, flexShrink: 0 }}>
              {t.tone === 'success' ? <CheckCircle2 size={16} color="var(--status-success)" /> : t.tone === 'error' ? <AlertCircle size={16} color="var(--status-danger)" /> : <Info size={16} color="var(--status-info)" />}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button type="button" onClick={() => remove(t.id)} aria-label="Cerrar notificación" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 0, display: 'inline-flex' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
