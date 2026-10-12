import s from './ui.module.css';

/** Tabs — items: [{ key, label }]; value + onChange. */
export default function Tabs({ items = [], value, onChange, className = '' }) {
  return (
    <div className={[s.tabs, className].filter(Boolean).join(' ')} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={value === it.key}
          className={[s.tab, value === it.key && s.tabActive].filter(Boolean).join(' ')}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
