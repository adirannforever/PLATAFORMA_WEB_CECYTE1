import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { incidenciasService, usuariosService, catalogosService } from '../services/api';
import { Plus, Edit, Trash2, X, Search, Filter, CheckCircle, User } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './IncidenciasPage.module.css';

const TIPO_INCIDENCIA = {
  conducta: 'Conducta',
  academica: 'Académica',
  asistencia: 'Asistencia',
  citatorio_tutor: 'Citatorio a tutor',
  felicitacion: 'Felicitación',
  otro: 'Otro',
};

const SUBTIPOS_POR_TIPO = {
  conducta: [
    'Falta de respeto',
    'Agresividad',
    'Incumplimiento de normas',
    'Bullying',
    'Uso inadecuado de dispositivos',
  ],
  academica: [
    'Bajo rendimiento',
    'Faltas de entrega de trabajos',
    'Plagio',
    'Participación insuficiente',
    'Dificultad en la materia',
  ],
  asistencia: [
    'Faltas injustificadas',
    'Retardos',
    'Salida anticipada',
    'Inasistencia recurrente',
  ],
  citatorio_tutor: [
    'Por bajo rendimiento',
    'Por conducta',
    'Por asistencia',
    'Por seguimiento académico',
  ],
  felicitacion: [
    'Excelente rendimiento',
    'Participación destacada',
    'Mejora significativa',
    'Compañerismo',
  ],
  otro: ['General'],
};

const TIPO_COLORS = {
  conducta: '#b91c1c',
  academica: '#dc2626',
  asistencia: '#f59e0b',
  citatorio_tutor: '#3b82f6',
  felicitacion: '#10b981',
  otro: '#6b7280',
};

const ITEMS_PER_PAGE = 10;

export default function IncidenciasPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [incidencias, setIncidencias] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSubtipo, setFiltroSubtipo] = useState('');
  const [filtroResuelta, setFiltroResuelta] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditando, setModalEditando] = useState(null);
  const [form, setForm] = useState({
    alumno_id: '',
    ciclo_id: '',
    tipo: '',
    subtipo: '',
    descripcion: '',
    fecha: '',
  });
  const [enviando, setEnviando] = useState(false);

  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);

  const [resolverModal, setResolverModal] = useState({ open: false, id: null });
  const [resolucion, setResolucion] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

  const letrasUnicas = useMemo(() => {
    const letras = grupos.map(g => g.letra).filter(Boolean);
    return [...new Set(letras)].sort();
  }, [grupos]);

  const abrirConfirmacion = (message, onConfirm) => {
    setConfirmModal({
      open: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ open: false, message: '', onConfirm: null });
      },
    });
  };

  const cerrarConfirmacion = () => {
    setConfirmModal({ open: false, message: '', onConfirm: null });
  };

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [alumnosRes, gruposRes, espRes, ciclosRes] = await Promise.all([
          usuariosService.getAll({ rol: 'alumno' }),
          catalogosService.getGrupos(),
          catalogosService.getEspecialidades(),
          catalogosService.getCiclos(),
        ]);
        setAlumnos(alumnosRes.usuarios || []);
        setGrupos(gruposRes.data || []);
        setEspecialidades(espRes.data || []);
        setCiclos(ciclosRes.data || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  const cargarIncidencias = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {
        page: pagina,
        limit: ITEMS_PER_PAGE,
      };
      if (filtroAlumno) params.alumno_id = filtroAlumno;
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroSubtipo) params.subtipo = filtroSubtipo;
      if (filtroResuelta !== '') params.resuelta = filtroResuelta;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;
      if (busqueda) params.search = busqueda;
      if (filtroGrupo) params.grupo_letra = filtroGrupo;

      const res = await incidenciasService.getAll(params);
      setIncidencias(res.data || []);
      setTotalRegistros(res.pagination?.total || 0);
      setTotalPaginas(res.pagination?.pages || 1);
    } catch (e) {
      console.error('Error cargando incidencias:', e);
      setError('No se pudieron cargar las incidencias.');
    } finally {
      setCargando(false);
    }
  }, [
    pagina,
    filtroAlumno,
    filtroTipo,
    filtroSubtipo,
    filtroResuelta,
    filtroFechaDesde,
    filtroFechaHasta,
    busqueda,
    filtroGrupo,
  ]);

  useEffect(() => {
    cargarIncidencias();
  }, [cargarIncidencias]);

  const buscarAlumnos = useCallback(async () => {
    setBuscandoAlumnos(true);
    try {
      const params = { rol: 'alumno' };
      if (busquedaAlumno) params.search = busquedaAlumno;
      if (filtroGrupo) params.grupo_letra = filtroGrupo;
      if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
      if (filtroSemestre) params.semestre = filtroSemestre;
      const res = await usuariosService.getAll(params);
      setAlumnosFiltrados(res.usuarios || []);
    } catch (e) {
      console.error('Error buscando alumnos:', e);
    } finally {
      setBuscandoAlumnos(false);
    }
  }, [busquedaAlumno, filtroGrupo, filtroEspecialidad, filtroSemestre]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (modalAbierto && (busquedaAlumno || filtroGrupo || filtroEspecialidad || filtroSemestre)) {
        buscarAlumnos();
      } else if (modalAbierto) {
        setAlumnosFiltrados([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [busquedaAlumno, filtroGrupo, filtroEspecialidad, filtroSemestre, modalAbierto, buscarAlumnos]);

  const seleccionarAlumno = (alumno) => {
    setForm({ ...form, alumno_id: String(alumno.alumno_id || alumno.id) });
    setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombre} (${alumno.matricula || 'sin matrícula'})`);
    setAlumnosFiltrados([]);
  };

  const handleAbrirCrear = () => {
    setModalEditando(null);
    setForm({
      alumno_id: '',
      ciclo_id: '',
      tipo: '',
      subtipo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setBusquedaAlumno('');
    setAlumnosFiltrados([]);
    setModalAbierto(true);
    setError('');
  };

  const handleAbrirEditar = (incidencia) => {
    setModalEditando(incidencia);
    setForm({
      alumno_id: String(incidencia.alumno_id),
      ciclo_id: incidencia.ciclo_id || '',
      tipo: incidencia.tipo,
      subtipo: incidencia.subtipo || '',
      descripcion: incidencia.descripcion,
      fecha: incidencia.fecha,
    });
    const alumno = alumnos.find((a) => (a.alumno_id || a.id) === incidencia.alumno_id);
    if (alumno) {
      setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombre} (${alumno.matricula || 'sin matrícula'})`);
    }
    setAlumnosFiltrados([]);
    setModalAbierto(true);
    setError('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      if (!form.alumno_id || !form.tipo || !form.descripcion) {
        setError('Alumno, tipo y descripción son obligatorios');
        setEnviando(false);
        return;
      }
      if (modalEditando) {
        await incidenciasService.actualizar(modalEditando.id, form);
        setExito('Incidencia actualizada correctamente');
      } else {
        await incidenciasService.crear(form);
        setExito('Incidencia creada correctamente');
      }
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
      cargarIncidencias();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = (id) => {
    abrirConfirmacion(
      '¿Estás seguro de eliminar esta incidencia? Esta acción no se puede deshacer.',
      async () => {
        try {
          await incidenciasService.eliminar(id);
          setExito('Incidencia eliminada correctamente');
          setTimeout(() => setExito(''), 4000);
          cargarIncidencias();
        } catch (err) {
          setError(err.response?.data?.message || 'Error al eliminar');
        }
      }
    );
  };

  const handleAbrirResolver = (id) => {
    setResolverModal({ open: true, id });
    setResolucion('');
    setError('');
  };

  const handleResolver = async (e) => {
    e.preventDefault();
    if (!resolucion.trim()) {
      setError('La resolución es requerida');
      return;
    }
    setResolviendo(true);
    setError('');
    try {
      await incidenciasService.resolver(resolverModal.id, resolucion);
      setExito('Incidencia resuelta correctamente');
      setResolverModal({ open: false, id: null });
      setTimeout(() => setExito(''), 4000);
      cargarIncidencias();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resolver');
    } finally {
      setResolviendo(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAlumno('');
    setFiltroTipo('');
    setFiltroSubtipo('');
    setFiltroResuelta('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroGrupo('');
    setPagina(1);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getColorTipo = (tipo) => TIPO_COLORS[tipo] || '#6b7280';
  const getSubtitulos = (tipo) => SUBTIPOS_POR_TIPO[tipo] || [];

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Incidencias</h1>
          <p className={styles.subtitle}>{totalRegistros} registro(s)</p>
        </div>
        {esAdmin && (
          <button className={styles.btnPrimary} onClick={handleAbrirCrear}>
            <Plus size={18} /> Nueva incidencia
          </button>
        )}
      </div>

      <div className={styles.filtrosContainer}>
        <div className={styles.filtrosGrid}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Buscar</label>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.inputSearch}
                placeholder="Buscar por alumno o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Alumno</label>
            <select
              className={styles.select}
              value={filtroAlumno}
              onChange={(e) => setFiltroAlumno(e.target.value)}
            >
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.alumno_id || a.id}>
                  {a.apellidos}, {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Grupo</label>
            <select
              className={styles.select}
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
            >
              <option value="">Todos los grupos</option>
              {letrasUnicas.map((letra) => (
                <option key={letra} value={letra}>
                  Grupo {letra}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Tipo</label>
            <select
              className={styles.select}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(TIPO_INCIDENCIA).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Subtipo</label>
            <select
              className={styles.select}
              value={filtroSubtipo}
              onChange={(e) => setFiltroSubtipo(e.target.value)}
            >
              <option value="">Todos</option>
              {filtroTipo ? (
                getSubtitulos(filtroTipo).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <option value="">Selecciona un tipo primero</option>
              )}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Estado</label>
            <select
              className={styles.select}
              value={filtroResuelta}
              onChange={(e) => setFiltroResuelta(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="false">Pendiente</option>
              <option value="true">Resuelta</option>
            </select>
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

      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Semestre</th>
                <th>Grupo</th>
                <th>Tipo</th>
                <th>Subtipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((n) => (
                <tr key={n}>
                  <td><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="50px" height="16px" variant="text" /></td>
                  <td><Skeleton width="60px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="200px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="24px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : incidencias.length === 0 ? (
        <div className={styles.empty}>No hay incidencias registradas.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Semestre</th>
                <th>Grupo</th>
                <th>Tipo</th>
                <th>Subtipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incidencias.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.alumno_apellidos}, {i.alumno_nombre}
                  </td>
                  <td>{i.matricula || '—'}</td>
                  <td>{i.semestre ? `${i.semestre}°` : '—'}</td>
                  <td>{i.grupo_letra || '—'}</td>
                  <td>
                    <span
                      className={styles.tipoBadge}
                      style={{ backgroundColor: getColorTipo(i.tipo), color: '#fff' }}
                    >
                      {TIPO_INCIDENCIA[i.tipo] || i.tipo}
                    </span>
                  </td>
                  <td>{i.subtipo || '—'}</td>
                  <td className={styles.descripcionCell}>
                    <div className={styles.descripcionText}>{i.descripcion}</div>
                    {i.resuelta && i.resolucion && (
                      <div className={styles.resolucionText}>
                        <strong>Resolución:</strong> {i.resolucion}
                      </div>
                    )}
                  </td>
                  <td>{formatDate(i.fecha)}</td>
                  <td>
                    <span className={i.resuelta ? styles.estadoResuelto : styles.estadoPendiente}>
                      {i.resuelta ? ' Resuelta' : ' Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      {esAdmin && !i.resuelta && (
                        <button
                          className={styles.btnResolver}
                          onClick={() => handleAbrirResolver(i.id)}
                          title="Resolver"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {esAdmin && (
                        <>
                          <button
                            className={styles.btnEditar}
                            onClick={() => handleAbrirEditar(i)}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className={styles.btnEliminar}
                            onClick={() => handleEliminar(i.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalEditando ? 'Editar incidencia' : 'Nueva incidencia'}
              </h3>
              <button className={styles.modalClose} onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleGuardar} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Alumno *</label>
                <div className={styles.alumnoSearchContainer}>
                  <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.inputSearch}
                      placeholder="Buscar alumno por nombre, matrícula..."
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                      onFocus={() => {
                        if (busquedaAlumno || filtroGrupo || filtroEspecialidad || filtroSemestre) {
                          buscarAlumnos();
                        }
                      }}
                    />
                  </div>
                  <div className={styles.filtrosAlumno}>
                    <select
                      className={styles.selectSmall}
                      value={filtroGrupo}
                      onChange={(e) => setFiltroGrupo(e.target.value)}
                    >
                      <option value="">Todos los grupos</option>
                      {letrasUnicas.map((letra) => (
                        <option key={letra} value={letra}>
                          Grupo {letra}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.selectSmall}
                      value={filtroEspecialidad}
                      onChange={(e) => setFiltroEspecialidad(e.target.value)}
                    >
                      <option value="">Todas las especialidades</option>
                      {especialidades.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.selectSmall}
                      value={filtroSemestre}
                      onChange={(e) => setFiltroSemestre(e.target.value)}
                    >
                      <option value="">Todos los semestres</option>
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <option key={s} value={s}>
                          {s}°
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.btnBuscarAlumnos}
                      onClick={buscarAlumnos}
                      disabled={buscandoAlumnos}
                    >
                      {buscandoAlumnos ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {alumnosFiltrados.length > 0 && (
                    <div className={styles.resultadosAlumnos}>
                      {alumnosFiltrados.map((a) => (
                        <div
                          key={a.id}
                          className={styles.resultadoAlumno}
                          onClick={() => seleccionarAlumno(a)}
                        >
                          <span>
                            <strong>
                              {a.apellidos}, {a.nombre}
                            </strong>
                          </span>
                          <span className={styles.resultadoDetalle}>
                            {a.matricula || 'sin matrícula'} •{' '}
                            {a.semestre ? `${a.semestre}° Ssemestre` : '—'} •{' '}
                            {a.grupo_letra ? `Grupo ${a.grupo_letra}` : 'sin grupo'} •{' '}
                            {a.especialidad_nombre || 'sin especialidad'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.alumno_id && !busquedaAlumno && (
                    <div className={styles.alumnoSeleccionado}>
                      <User size={16} />
                      <span>
                        Alumno seleccionado:{' '}
                        <strong>{busquedaAlumno || 'ID: ' + form.alumno_id}</strong>
                      </span>
                      <button
                        type="button"
                        className={styles.btnQuitarAlumno}
                        onClick={() => {
                          setForm({ ...form, alumno_id: '' });
                          setBusquedaAlumno('');
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Tipo *</label>
                  <select
                    className={styles.select}
                    value={form.tipo}
                    onChange={(e) => {
                      const newTipo = e.target.value;
                      setForm({ ...form, tipo: newTipo, subtipo: '' });
                    }}
                    required
                  >
                    <option value="">Seleccionar tipo...</option>
                    {Object.entries(TIPO_INCIDENCIA).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Subtipo</label>
                  <select
                    className={styles.select}
                    value={form.subtipo}
                    onChange={(e) => setForm({ ...form, subtipo: e.target.value })}
                    disabled={!form.tipo}
                  >
                    <option value="">Sin subtipo</option>
                    {form.tipo &&
                      getSubtitulos(form.tipo).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Ciclo escolar</label>
                  <select
                    className={styles.select}
                    value={form.ciclo_id}
                    onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
                  >
                    <option value="">Sin ciclo</option>
                    {ciclos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Fecha</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Descripción *</label>
                <textarea
                  className={styles.textarea}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Describe la incidencia..."
                  rows={4}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalAbierto(false)}
                >
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

      {resolverModal.open && (
        <div className={styles.modalOverlay} onClick={() => setResolverModal({ open: false, id: null })}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Resolver incidencia</h3>
              <button
                className={styles.modalClose}
                onClick={() => setResolverModal({ open: false, id: null })}
              >
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleResolver} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Resolución *</label>
                <textarea
                  className={styles.textarea}
                  value={resolucion}
                  onChange={(e) => setResolucion(e.target.value)}
                  placeholder="Describe cómo se resolvió la incidencia..."
                  rows={4}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setResolverModal({ open: false, id: null })}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={resolviendo}>
                  {resolviendo ? 'Resolviendo...' : 'Resolver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className={styles.modalOverlay} onClick={cerrarConfirmacion}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirmar</h3>
              <button className={styles.modalClose} onClick={cerrarConfirmacion}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.confirmBody}>
              <p>{confirmModal.message}</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={cerrarConfirmacion}>
                Cancelar
              </button>
              <button className={styles.btnDanger} onClick={confirmModal.onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}