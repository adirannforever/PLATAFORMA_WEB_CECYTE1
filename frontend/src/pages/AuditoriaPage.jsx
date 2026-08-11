import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditoriaService, usuariosService } from '../services/api';
import { Search, Filter, Eye, X } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './AuditoriaPage.module.css';

const ITEMS_PER_PAGE = 20;

const ACCIONES = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'
];

export default function AuditoriaPage() {
  const { usuario } = useAuth();
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Modal de detalle
  const [detalleModal, setDetalleModal] = useState({ open: false, log: null });

  // Cargar catálogos
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const res = await usuariosService.getAll({ rol: 'administrador' });
        setUsuarios(res.usuarios || []);
      } catch (e) {
        console.error('Error cargando usuarios:', e);
      }
    };
    cargarUsuarios();
  }, []);

  // Cargar logs
  const cargarLogs = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {
        page: pagina,
        limit: ITEMS_PER_PAGE,
      };
      if (filtroUsuario) params.usuario_id = filtroUsuario;
      if (filtroAccion) params.accion = filtroAccion;
      if (filtroTabla) params.tabla_afectada = filtroTabla;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;

      const res = await auditoriaService.getLogs(params);
      setLogs(res.data || []);
      setTotalRegistros(res.pagination?.total || 0);
      setTotalPaginas(res.pagination?.pages || 1);
    } catch (e) {
      console.error('Error cargando logs:', e);
      setError('No se pudieron cargar los logs.');
    } finally {
      setCargando(false);
    }
  }, [pagina, filtroUsuario, filtroAccion, filtroTabla, filtroFechaDesde, filtroFechaHasta]);

  useEffect(() => {
    cargarLogs();
  }, [cargarLogs]);

  const limpiarFiltros = () => {
    setFiltroUsuario('');
    setFiltroAccion('');
    setFiltroTabla('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setPagina(1);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccionBadge = (accion) => {
    const map = {
      CREATE: { className: 'accionCreate', label: 'Creación' },
      UPDATE: { className: 'accionUpdate', label: 'Actualización' },
      DELETE: { className: 'accionDelete', label: 'Eliminación' },
      LOGIN: { className: 'accionLogin', label: 'Inicio sesión' },
      LOGOUT: { className: 'accionLogout', label: 'Cierre sesión' },
      VIEW: { className: 'accionView', label: 'Vista' },
      EXPORT: { className: 'accionExport', label: 'Exportación' },
    };
    return map[accion] || { className: 'accionDefault', label: accion };
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Auditoría</h1>
          <p className={styles.subtitle}>{totalRegistros} registro(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtrosContainer}>
        <div className={styles.filtrosGrid}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Usuario</label>
            <select
              className={styles.select}
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.apellidos}, {u.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Acción</label>
            <select
              className={styles.select}
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
            >
              <option value="">Todas</option>
              {ACCIONES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Tabla</label>
            <input
              type="text"
              className={styles.input}
              placeholder="usuarios, grupos, etc."
              value={filtroTabla}
              onChange={(e) => setFiltroTabla(e.target.value)}
            />
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Fecha desde</label>
            <input
              type="date"
              className={styles.input}
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
            />
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Fecha hasta</label>
            <input
              type="date"
              className={styles.input}
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
            />
          </div>

          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            <Filter size={14} /> Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tabla</th>
                <th>Registro</th>
                <th>Fecha</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(n => (
                <tr key={n}>
                  <td><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="60px" height="16px" variant="text" /></td>
                  <td><Skeleton width="160px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="16px" variant="text" /></td>
                  <td><Skeleton width="40px" height="16px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.empty}>No hay logs registrados.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Tabla</th>
                <th>Registro</th>
                <th>Fecha</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const badge = getAccionBadge(log.accion);
                return (
                  <tr key={log.id}>
                    <td>
                      {log.usuario_nombre
                        ? `${log.usuario_apellidos}, ${log.usuario_nombre}`
                        : 'Sistema'}
                    </td>
                    <td>
                      <span className={`${styles.accionBadge} ${styles[badge.className]}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>{log.tabla_afectada || '—'}</td>
                    <td>{log.registro_id || '—'}</td>
                    <td>{formatDate(log.fecha)}</td>
                    <td>{log.ip || '—'}</td>
                    <td>
                      <button
                        className={styles.btnDetalle}
                        onClick={() => setDetalleModal({ open: true, log })}
                        title="Ver detalles"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => cambiarPagina(pagina - 1)}
            disabled={pagina <= 1}
          >
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={() => cambiarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de detalle */}
      {detalleModal.open && detalleModal.log && (
        <div className={styles.modalOverlay} onClick={() => setDetalleModal({ open: false, log: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalle del log</h3>
              <button
                className={styles.modalClose}
                onClick={() => setDetalleModal({ open: false, log: null })}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.detalleContent}>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Usuario:</span>
                <span>
                  {detalleModal.log.usuario_nombre
                    ? `${detalleModal.log.usuario_apellidos}, ${detalleModal.log.usuario_nombre}`
                    : 'Sistema'}
                </span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Acción:</span>
                <span>{detalleModal.log.accion}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Tabla:</span>
                <span>{detalleModal.log.tabla_afectada || '—'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Registro ID:</span>
                <span>{detalleModal.log.registro_id || '—'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>IP:</span>
                <span>{detalleModal.log.ip || '—'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>User Agent:</span>
                <span className={styles.detalleUserAgent}>{detalleModal.log.user_agent || '—'}</span>
              </div>
              <div className={styles.detalleRow}>
                <span className={styles.detalleLabel}>Fecha:</span>
                <span>{formatDate(detalleModal.log.fecha)}</span>
              </div>
              {detalleModal.log.datos_anteriores && (
                <div className={styles.detalleSection}>
                  <strong>Datos anteriores:</strong>
                  <pre className={styles.detalleJson}>
                    {JSON.stringify(detalleModal.log.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}
              {detalleModal.log.datos_nuevos && (
                <div className={styles.detalleSection}>
                  <strong>Datos nuevos:</strong>
                  <pre className={styles.detalleJson}>
                    {JSON.stringify(detalleModal.log.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnPrimary}
                onClick={() => setDetalleModal({ open: false, log: null })}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}