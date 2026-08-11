import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { becasService, catalogosService, usuariosService } from '../services/api';
import { Search, ArrowLeft, Plus, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './BecasDetallePage.module.css';

const ESTATUS_PAGO_ETIQUETA = {
  cursando: 'Cursando',
  proceso_deposito: 'Proceso de depósito',
  depositado: 'Depositado',
};

const ESTATUS_PAGO_OPCIONES = [
  { value: 'cursando', label: 'Cursando' },
  { value: 'proceso_deposito', label: 'Proceso de depósito' },
  { value: 'depositado', label: 'Depositado' },
];

export default function BecasDetallePage() {
  const { nombre_beca } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';

  const [becaInfo, setBecaInfo] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState([]);
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Filtros de la tabla
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');
  const [filtroEstatusPago, setFiltroEstatusPago] = useState('');

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const limit = 10;

  // Modal de asignación
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [dropdownAlumnosAbierto, setDropdownAlumnosAbierto] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [formAsignar, setFormAsignar] = useState({
    alumno_id: '',
    ciclo_id: '',
    estatus_pago: 'cursando',
    comentarios: '',
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Debounce para búsqueda (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setBusquedaDebounced(busqueda);
    }, 500);
    return () => clearTimeout(handler);
  }, [busqueda]);

  // Cargar ciclos
  useEffect(() => {
    const cargarCiclos = async () => {
      try {
        const res = await catalogosService.getCiclos();
        setCiclos(res.data || []);
        const activo = res.data?.find(c => c.activo);
        if (activo && !filtroCiclo) {
          setFiltroCiclo(String(activo.id));
        }
      } catch (e) {
        console.error('Error cargando ciclos:', e);
      }
    };
    cargarCiclos();
  }, []);

  // Cargar detalle de la beca (con distinción entre carga inicial y recarga)
  useEffect(() => {
    if (!nombre_beca) return;

    const cargarDetalle = async () => {
      const esCargaInicial = cargandoInicial;
      if (!esCargaInicial) {
        setRecargando(true);
      }

      setError('');
      try {
        const params = {};
        if (busquedaDebounced) params.search = busquedaDebounced;
        if (filtroCiclo) params.ciclo_id = filtroCiclo;
        if (filtroEstatusPago) params.estatus_pago = filtroEstatusPago;
        params.page = pagina;
        params.limit = limit;

        const res = await becasService.getDetalle(nombre_beca, params);
        setBecaInfo(res.beca || { nombre_beca });
        setAlumnos(res.alumnos || []);
        setTotalPaginas(res.pagination?.pages || 1);
        setTotalRegistros(res.pagination?.total || 0);
      } catch (e) {
        console.error('Error cargando detalle:', e);
        setError('No se pudo cargar el detalle de la beca.');
        setAlumnos([]);
      } finally {
        if (esCargaInicial) {
          setCargandoInicial(false);
        } else {
          setRecargando(false);
        }
      }
    };

    cargarDetalle();
  }, [nombre_beca, busquedaDebounced, filtroCiclo, filtroEstatusPago, pagina]);

  // Cargar alumnos disponibles para asignar (solo cuando el modal se abre)
  useEffect(() => {
    if (!modalAsignarAbierto) {
      setAlumnosDisponibles([]);
      setAlumnosFiltrados([]);
      return;
    }

    const cargarAlumnos = async () => {
      try {
        const res = await usuariosService.getAll({ rol: 'alumno' });
        const alumnosConDatos = (res.usuarios || []).map(alumno => ({
          id: alumno.id,
          alumno_id: alumno.alumno_id,
          nombre: alumno.nombre,
          apellidos: alumno.apellidos,
          email: alumno.email,
          matricula: alumno.matricula || 'Sin matrícula',
          grupo: alumno.grupo_nombre || 'Sin grupo',
          semestre: alumno.semestre || null,
        }));
        setAlumnosDisponibles(alumnosConDatos);
        setAlumnosFiltrados(alumnosConDatos);
      } catch (e) {
        console.error('Error cargando alumnos:', e);
        setError('No se pudieron cargar los alumnos disponibles.');
      }
    };
    cargarAlumnos();
  }, [modalAsignarAbierto]);

  // Filtrar alumnos en el dropdown
  useEffect(() => {
    const term = busquedaAlumno.toLowerCase().trim();
    if (!term) {
      setAlumnosFiltrados(alumnosDisponibles);
      return;
    }
    const filtrados = alumnosDisponibles.filter(a =>
      `${a.apellidos} ${a.nombre}`.toLowerCase().includes(term) ||
      a.matricula?.toLowerCase().includes(term) ||
      a.email?.toLowerCase().includes(term)
    );
    setAlumnosFiltrados(filtrados);
  }, [busquedaAlumno, alumnosDisponibles]);

  const handleVolver = () => navigate('/becas');

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
  };

  const handleSelectAlumno = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setFormAsignar({
      ...formAsignar,
      alumno_id: String(alumno.alumno_id)
    });
    setDropdownAlumnosAbierto(false);
    setBusquedaAlumno('');
  };

  const handleAsignar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    if (!formAsignar.alumno_id || !formAsignar.ciclo_id) {
      setError('Alumno y ciclo son obligatorios.');
      setEnviando(false);
      return;
    }

    try {
      await becasService.asignar({
        alumno_id: parseInt(formAsignar.alumno_id),
        ciclo_id: parseInt(formAsignar.ciclo_id),
        nombre_beca: nombre_beca,
        estatus_pago: formAsignar.estatus_pago,
        comentarios: formAsignar.comentarios,
        fecha_inicio: formAsignar.fecha_inicio || null,
        fecha_fin: formAsignar.fecha_fin || null,
      });
      setExito(' Beca asignada correctamente.');
      setModalAsignarAbierto(false);
      setFormAsignar({ alumno_id: '', ciclo_id: '', estatus_pago: 'cursando', comentarios: '', fecha_inicio: '', fecha_fin: '' });
      setAlumnoSeleccionado(null);
      setTimeout(() => setExito(''), 4000);
      // Recargar la tabla sin perder el foco del input
      setRecargando(true);
      const params = {};
      if (busquedaDebounced) params.search = busquedaDebounced;
      if (filtroCiclo) params.ciclo_id = filtroCiclo;
      if (filtroEstatusPago) params.estatus_pago = filtroEstatusPago;
      params.page = pagina;
      params.limit = limit;
      const res = await becasService.getDetalle(nombre_beca, params);
      setAlumnos(res.alumnos || []);
      setTotalPaginas(res.pagination?.pages || 1);
      setTotalRegistros(res.pagination?.total || 0);
      setRecargando(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al asignar la beca.');
    } finally {
      setEnviando(false);
    }
  };

  const isConcluida = (estatusPago) => estatusPago === 'concluido';

  return (
    <div className={styles.page}>
      <button className={styles.btnVolver} onClick={handleVolver}>
        <ArrowLeft size={16} /> Volver a becas
      </button>

      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      {/* Carga inicial con Skeleton */}
      {cargandoInicial ? (
        <div className={styles.skeletonContainer}>
          <Skeleton width="100%" height="80px" variant="text" />
          <Skeleton width="100%" height="300px" variant="text" />
        </div>
      ) : (
        <>
          {/* Información de la beca */}
          {becaInfo && (
            <div className={styles.becaHeader}>
              <div className={styles.becaHeaderTop}>
                <h1 className={styles.becaNombre}>{becaInfo.nombre_beca}</h1>
                {esAdmin && (
                  <button
                    className={styles.btnAsignar}
                    onClick={() => setModalAsignarAbierto(true)}
                  >
                    <Plus size={18} /> Asignar a alumno
                  </button>
                )}
              </div>
              <div className={styles.becaInfoGrid}>
                <div className={styles.becaInfoItem}>
                  <span className={styles.becaInfoLabel}>Monto</span>
                  <span className={styles.becaInfoValue}>
                    ${parseFloat(becaInfo.monto || 0).toFixed(2)}
                  </span>
                </div>
                <div className={styles.becaInfoItem}>
                  <span className={styles.becaInfoLabel}>Periodicidad</span>
                  <span className={styles.becaInfoValue}>
                    {becaInfo.periodicidad || 'semestral'}
                  </span>
                </div>
                <div className={styles.becaInfoItem}>
                  <span className={styles.becaInfoLabel}>Ciclo</span>
                  <span className={styles.becaInfoValue}>
                    {becaInfo.ciclo_nombre || '—'}
                  </span>
                </div>
                <div className={styles.becaInfoItem}>
                  <span className={styles.becaInfoLabel}>Alumnos</span>
                  <span className={styles.becaInfoValue}>{totalRegistros}</span>
                </div>
                <div className={styles.becaInfoItem}>
                  <span className={styles.becaInfoLabel}>Descripción</span>
                  <span className={styles.becaInfoValue}>
                    {becaInfo.descripcion || 'Sin descripción'}
                  </span>
                </div>
              </div>
            </div>
          )}

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
                    placeholder="Buscar por nombre o matrícula..."
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
                <label className={styles.label}>Estatus de pago</label>
                <select
                  className={styles.select}
                  value={filtroEstatusPago}
                  onChange={(e) => {
                    setFiltroEstatusPago(e.target.value);
                    setPagina(1);
                  }}
                >
                  <option value="">Todos</option>
                  {ESTATUS_PAGO_OPCIONES.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de alumnos (con indicador de recarga) */}
          <div className={styles.tableContainer}>
            {recargando && (
              <div className={styles.recargandoOverlay}>
                <Loader2 size={24} className={styles.spinner} />
                <span className={styles.recargandoTexto}>Cargando alumnos...</span>
              </div>
            )}
            <div className={styles.tableWrapper} style={{ opacity: recargando ? 0.6 : 1 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Matrícula</th>
                    <th>Grupo</th>
                    <th>Ciclo</th>
                    <th>Monto</th>
                    <th>Periodicidad</th>
                    <th>Estatus de pago</th>
                    <th>Fecha inicio</th>
                    <th>Fecha fin</th>
                    <th>Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className={styles.emptyRow}>
                        {busquedaDebounced || filtroCiclo || filtroEstatusPago ? (
                          'No se encontraron alumnos con los filtros aplicados.'
                        ) : (
                          'No hay alumnos asignados a esta beca.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    alumnos.map((a) => {
                      const concluida = isConcluida(a.estatus_pago);
                      return (
                        <tr
                          key={a.id}
                          className={concluida ? styles.trConcluida : ''}
                          style={{ opacity: concluida ? 0.6 : 1 }}
                        >
                          <td>{a.apellidos}, {a.nombre}</td>
                          <td>{a.matricula || '—'}</td>
                          <td>{a.grupo_nombre || '—'}</td>
                          <td>{a.ciclo_nombre || '—'}</td>
                          <td>${parseFloat(a.monto).toFixed(2)}</td>
                          <td>{a.periodicidad || 'semestral'}</td>
                          <td>
                            <span className={`${styles.estatusPagoBadge} ${styles[`estatusPago_${a.estatus_pago}`]}`}>
                              {ESTATUS_PAGO_ETIQUETA[a.estatus_pago] || a.estatus_pago}
                            </span>
                          </td>
                          <td>{a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString('es-MX') : '—'}</td>
                          <td>{a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString('es-MX') : '—'}</td>
                          <td>{a.comentarios_alumno || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Modal de asignación */}
      {modalAsignarAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAsignarAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Asignar beca a alumno</h3>
              <button className={styles.modalClose} onClick={() => setModalAsignarAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleAsignar} className={styles.form}>
              {/* Campo: Alumno con dropdown */}
              <div className={styles.field}>
                <label className={styles.label}>Alumno *</label>
                <div className={styles.dropdownWrapper}>
                  <button
                    type="button"
                    className={styles.dropdownToggle}
                    onClick={() => setDropdownAlumnosAbierto(!dropdownAlumnosAbierto)}
                  >
                    <span>
                      {alumnoSeleccionado
                        ? `${alumnoSeleccionado.apellidos}, ${alumnoSeleccionado.nombre}`
                        : 'Selecciona un alumno...'}
                    </span>
                    {dropdownAlumnosAbierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {dropdownAlumnosAbierto && (
                    <div className={styles.dropdownMenu}>
                      <div className={styles.dropdownSearch}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                          type="text"
                          placeholder="Buscar alumno..."
                          value={busquedaAlumno}
                          onChange={(e) => setBusquedaAlumno(e.target.value)}
                          className={styles.searchInput}
                          autoFocus
                        />
                      </div>
                      <div className={styles.dropdownList}>
                        {alumnosFiltrados.length === 0 ? (
                          <div className={styles.dropdownEmpty}>No se encontraron alumnos</div>
                        ) : (
                          alumnosFiltrados.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              className={`${styles.dropdownItem} ${parseInt(formAsignar.alumno_id) === a.alumno_id ? styles.dropdownItemActive : ''}`}
                              onClick={() => handleSelectAlumno(a)}
                            >
                              <span className={styles.dropdownItemNombre}>
                                {a.apellidos}, {a.nombre}
                              </span>
                              <span className={styles.dropdownItemInfo}>
                                <span className={styles.matricula}>{a.matricula || 'Sin matrícula'}</span>
                                <span className={styles.grupo}>{a.grupo || 'Sin grupo'}</span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Resumen del alumno */}
                {alumnoSeleccionado && (
                  <div className={styles.alumnoResumen}>
                    <span className={styles.resumenItem}>
                      <strong>Matrícula:</strong> {alumnoSeleccionado.matricula || 'Sin asignar'}
                    </span>
                    <span className={styles.resumenItem}>
                      <strong>Grupo:</strong> {alumnoSeleccionado.grupo || 'Sin asignar'}
                    </span>
                    <span className={styles.resumenItem}>
                      <strong>Semestre:</strong> {alumnoSeleccionado.semestre ? `${alumnoSeleccionado.semestre}°` : 'Sin asignar'}
                    </span>
                  </div>
                )}
              </div>

              {/* Ciclo */}
              <div className={styles.field}>
                <label className={styles.label}>Ciclo *</label>
                <select
                  className={styles.select}
                  value={formAsignar.ciclo_id}
                  onChange={(e) => setFormAsignar({ ...formAsignar, ciclo_id: e.target.value })}
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

              {/* Fechas */}
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Fecha de inicio</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={formAsignar.fecha_inicio}
                    onChange={(e) => setFormAsignar({ ...formAsignar, fecha_inicio: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Fecha de fin</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={formAsignar.fecha_fin}
                    onChange={(e) => setFormAsignar({ ...formAsignar, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              {/* Estatus de pago */}
              <div className={styles.field}>
                <label className={styles.label}>Estatus de pago</label>
                <select
                  className={styles.select}
                  value={formAsignar.estatus_pago}
                  onChange={(e) => setFormAsignar({ ...formAsignar, estatus_pago: e.target.value })}
                >
                  {ESTATUS_PAGO_OPCIONES.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Comentarios */}
              <div className={styles.field}>
                <label className={styles.label}>Comentarios</label>
                <textarea
                  className={styles.textarea}
                  value={formAsignar.comentarios}
                  onChange={(e) => setFormAsignar({ ...formAsignar, comentarios: e.target.value })}
                  placeholder="Observaciones sobre la asignación..."
                  rows={3}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAsignarAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Asignando...' : 'Asignar beca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}