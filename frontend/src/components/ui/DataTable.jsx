import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import s from './ui.module.css';

/**
 * DataTable — generic, accessible table.
 * Props:
 *   columns: [{ key, header, render?(row), sortable?, align?, width? }]
 *   rows:    array of data
 *   rowKey:  (row, i) => string
 *   loading: bool -> shows skeleton rows
 *   empty:   node -> shown when rows.length === 0 and not loading
 *   pageSize?: number (0/omit = no pagination)
 */
export default function DataTable({ columns = [], rows = [], rowKey, loading = false, empty, pageSize = 0 }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const accessor = col?.sortValue || ((r) => r[sort.key]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), 'es-MX');
    });
    if (sort.dir === 'desc') copy.reverse();
    return copy;
  }, [rows, sort, columns]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages - 1);
  const visible = pageSize > 0 ? sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize) : sorted;

  const toggleSort = (col) => {
    if (!col.sortable) return;
    setSort((prev) => (prev.key === col.key ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }));
  };

  if (loading) {
    return (
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>{columns.map((c) => <th key={c.key} style={{ width: c.width }}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <span style={{ display: 'block', height: 14, borderRadius: 4, background: 'linear-gradient(90deg,#eef2f0,#f6f8f7,#eef2f0)', backgroundSize: '200% 100%', animation: 'dtShimmer 1.4s linear infinite' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <style>{`@keyframes dtShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion: reduce){[style*="dtShimmer"]{animation:none!important}}`}</style>
      </div>
    );
  }

  if (sorted.length === 0) {
    return empty || <div className={s.empty}>No hay registros.</div>;
  }

  return (
    <div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  className={col.sortable ? s.tableSortable : undefined}
                  onClick={() => toggleSort(col)}
                  aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  tabIndex={col.sortable ? 0 : undefined}
                  onKeyDown={(e) => { if (col.sortable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleSort(col); } }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && <ArrowUpDown size={12} aria-hidden="true" style={{ opacity: sort.key === col.key ? 1 : 0.4 }} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={rowKey ? rowKey(row, i) : i}>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className={s.tablePagination}>
          <span>
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} de {sorted.length}
          </span>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <button type="button" className={s.btn + ' ' + s.btnSecondary + ' ' + s.btnSm} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} aria-label="Página anterior">
              <ChevronLeft size={14} />
            </button>
            <button type="button" className={s.btn + ' ' + s.btnSecondary + ' ' + s.btnSm} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} aria-label="Página siguiente">
              <ChevronRight size={14} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
