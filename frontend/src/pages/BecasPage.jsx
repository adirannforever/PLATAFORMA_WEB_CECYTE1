import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { becasService, catalogosService } from '../services/api';
import { Plus, Edit, Trash2, Eye, Search, X } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './BecasPage.module.css';

const ESTATUS_OPCIONES = ['activo', 'suspendido', 'concluido'];
const ESTATUS_ETIQUETA = { activo: 'Activo', suspendido: 'Suspendido', concluido: 'Concluido' };

export default function BecasPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario.rol === 'administrador';

  const [becas, setBecas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const limit = 10;

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditando, setModalEditando] = useState(null);
  const [form, setForm] = useState({
    nombre_beca: '',
    descripcion: '',
    monto: '',
    periodicidad: 'semestral',
    ciclo_id: '',
    activo: true,
  });
  const [enviando, setEnviando] = useState(false);

  // Cargar catálogos (ciclos)
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const ciclosRes = await catalogosService.getCiclos();
        setCiclos(ciclosRes.data || []);
        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo && !filtroCiclo) {
          setFiltroCiclo(String(activo.id));
        }
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        setError('Error al cargar datos de catálogo.');
      }
    };
    cargarCatalogos();
  }, []);

  // Cargar becas
  const cargarBecas = async () => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      if (busqueda) params.search = busqueda;
      if (filtroCiclo) params.ciclo_id = filtroCiclo;
      if (filtroActivo !== '') params.estatus = filtroActivo;
      params.page = pagina;
      params.limit = limit;

      const res = await becasService.getAll(params);
      console.log(' Becas cargadas:', res.becas);
      console.log(' Total registros:', res.pagination?.total || 0);

      setBecas(res.becas || []);
      //  CORRECCIÓN: si el backend devuelve total 0 pero hay becas, usar becas.length
      const total = res.pagination?.total || 0;
      if (total === 0 && res.becas && res.becas.length > 0) {
        setTotalRegistros(res.becas.length);
        setTotalPaginas(Math.ceil(res.becas.length / limit));
      } else {
        setTotalRegistros(total);
        setTotalPaginas(res.pagination?.pages || 1);
      }
    } catch (e) {
      console.error('Error cargando becas:', e);
      setError('No se pudieron cargar las becas.');
      setBecas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBecas();
  }, [busqueda, filtroCiclo, filtroActivo, pagina]);

  // Ver detalle de beca
  const handleVerDetalle = (nombreBeca) => {
    navigate(`/becas/detalle/${encodeURIComponent(nombreBeca)}`);
  };

  // ── ABRIR MODAL PARA CREAR ──
  const handleAbrirCrear = () => {
    setModalEditando(null);
    setForm({
      nombre_beca: '',
      descripcion: '',
      monto: '',
      periodicidad: 'semestral',
      ciclo_id: filtroCiclo || '',
      activo: true,
    });
    setModalAbierto(true);
    setError('');
  };

  // ── ABRIR MODAL PARA EDITAR ──
  const handleAbrirEditar = (beca) => {
    setModalEditando(beca);
    setForm({
      nombre_beca: beca.nombre_beca,
      descripcion: beca.descripcion || '',
      monto: beca.monto,
      periodicidad: beca.periodicidad || 'semestral',
      ciclo_id: String(beca.ciclo_id),
      activo: beca.activo,
    });
    setModalAbierto(true);
    setError('');
  };

  // ── GUARDAR ──
  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    if (!form.nombre_beca || !form.monto || !form.ciclo_id) {
      setError('Nombre, monto y ciclo son obligatorios.');
      setEnviando(false);
      return;
    }

    try {
      if (modalEditando) {
        await becasService.actualizar(modalEditando.id, {
          nombre_beca: form.nombre_beca,
          descripcion: form.descripcion,
          monto: form.monto,
          periodicidad: form.periodicidad,
          ciclo_id: parseInt(form.ciclo_id),
          activo: form.activo,
        });
        setExito(' Beca actualizada correctamente.');
      } else {
        await becasService.crear({
          nombre_beca: form.nombre_beca,
          descripcion: form.descripcion,
          monto: form.monto,
          periodicidad: form.periodicidad,
          ciclo_id: parseInt(form.ciclo_id),
          activo: form.activo,
        });
        setExito(' Beca creada correctamente.');
      }
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
      //  Forzar recarga de becas
      await cargarBecas();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la beca.');
    } finally {
      setEnviando(false);
    }
  };

  // ── ELIMINAR ──
  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta beca? Esta acción no se puede deshacer.')) return;
    try {
      await becasService.eliminar(id);
      setExito(' Beca eliminada correctamente.');
      setTimeout(() => setExito(''), 4000);
      await cargarBecas();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar la beca.');
    }
  };

  // ── LIMPIAR FILTROS ──
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiclo('');
    setFiltroActivo('');
    setPagina(1);
  };

  // ── CAMBIAR PÁGINA ──
  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Becas</h1>
          <p className={styles.subtitle}>{totalRegistros} beca(s) registrada(s)</p>
        </div>
        {esAdmin && (
          <button className={styles.btnPrimary} onClick={handleAbrirCrear}>
            <Plus size={18} /> Nueva beca
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className={styles.filtrosContainer}>
        <div className={styles.filtros}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Buscar</label>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="Buscar por nombre de beca..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Ciclo</label>
            <select
              className={styles.select}
              value={filtroCiclo}
              onChange={(e) => {
                setFiltroCiclo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.activo ? '(Activo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Estado</label>
            <select
              className={styles.select}
              value={filtroActivo}
              onChange={(e) => {
                setFiltroActivo(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Beca</th>
                <th>Descripción</th>
                <th>Ciclo</th>
                <th>Monto</th>
                <th>Periodicidad</th>
                <th>Asignados</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((n) => (
                <tr key={n}>
                  <td><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td><Skeleton width="200px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="16px" variant="text" /></td>
                  <td><Skeleton width="60px" height="16px" variant="text" /></td>
                  <td><Skeleton width="70px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="24px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : becas.length === 0 ? (
        <div className={styles.empty}>No hay becas registradas con los filtros actuales.</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Beca</th>
                  <th>Descripción</th>
                  <th>Ciclo</th>
                  <th>Monto</th>
                  <th>Periodicidad</th>
                  <th>Asignados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {becas.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <button
                        className={styles.becaNombreBtn}
                        onClick={() => handleVerDetalle(b.nombre_beca)}
                        title="Ver alumnos asignados"
                      >
                        {b.nombre_beca}
                        <Eye size={14} className={styles.eyeIcon} />
                      </button>
                    </td>
                    <td>{b.descripcion || '—'}</td>
                    <td>{b.ciclo_nombre || '—'}</td>
                    <td>${parseFloat(b.monto).toFixed(2)}</td>
                    <td>
                      <span className={styles.periodicidadBadge}>
                        {b.periodicidad || 'semestral'}
                      </span>
                    </td>
                    <td>{b.alumnos_asignados || 0}</td>
                    <td>
                      <span className={`${styles.estatusBadge} ${b.activo ? styles.estatus_activo : styles.estatus_inactivo}`}>
                        {b.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      {esAdmin && (
                        <div className={styles.acciones}>
                          <button
                            className={styles.btnEditar}
                            onClick={() => handleAbrirEditar(b)}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className={styles.btnEliminar}
                            onClick={() => handleEliminar(b.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalEditando ? 'Editar beca' : 'Nueva beca'}
              </h3>
              <button className={styles.modalClose} onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleGuardar} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre de la beca *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.nombre_beca}
                  onChange={(e) => setForm({ ...form, nombre_beca: e.target.value })}
                  placeholder="Ej: Beca de Excelencia"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Describe el propósito de la beca..."
                  rows={3}
                />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Monto *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Periodicidad</label>
                  <select
                    className={styles.select}
                    value={form.periodicidad}
                    onChange={(e) => setForm({ ...form, periodicidad: e.target.value })}
                  >
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo *</label>
                <select
                  className={styles.select}
                  value={form.ciclo_id}
                  onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona un ciclo...</option>
                  {ciclos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.activo ? '(Activo)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Estado</label>
                <select
                  className={styles.select}
                  value={form.activo ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}