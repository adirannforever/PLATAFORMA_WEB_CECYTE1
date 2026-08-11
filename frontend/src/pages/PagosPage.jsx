import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { pagosService, usuariosService, catalogosService } from '../services/api';
import { Plus, Eye, ArrowLeft, X } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './PagosPage.module.css';

const ITEMS_PER_PAGE = 10;
const GRUPO_LETRAS = ['A', 'B', 'C', 'D'];
const SEMESTRES = [1, 2, 3, 4, 5, 6];

export default function PagosPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';

  const [alumnos, setAlumnos] = useState([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [vista, setVista] = useState('lista');

  // Filtros de pagos (solo aplican en vista detalle)
  const [filtroConcepto, setFiltroConcepto] = useState('');
  const [filtroCiclo, setFiltroCiclo] = useState('');

  // Filtros de alumnos (vista lista)
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroMatricula, setFiltroMatricula] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroLetra, setFiltroLetra] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');

  const [paginaActual, setPaginaActual] = useState(1);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    alumno_id: '',
    concepto_id: '',
    ciclo_id: '',
    monto: '',
    folio_recibo: '',
    observaciones: '',
  });
  const [enviando, setEnviando] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [alumnosRes, conceptosRes, ciclosRes, espRes, turnRes] = await Promise.all([
          usuariosService.getAll({ rol: 'alumno' }),
          pagosService.getConceptos(),
          catalogosService.getCiclos(),
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
        ]);
        setAlumnos(alumnosRes.usuarios || []);
        setConceptos(conceptosRes.data || []);
        setCiclos(ciclosRes.data || []);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        setError('Error al cargar datos iniciales.');
      } finally {
        setCargando(false);
      }
    };
    cargarCatalogos();
  }, []);

  // Función para extraer la letra del grupo
  const extraerLetra = (grupoNombre) => {
    if (!grupoNombre) return '';
    const match = grupoNombre.match(/([A-D])/);
    return match ? match[1] : '';
  };

  // Filtrar alumnos
  const alumnosFiltrados = useMemo(() => {
    return alumnos.filter(a => {
      // Filtro por nombre o apellido (búsqueda libre)
      if (filtroNombre) {
        const term = filtroNombre.toLowerCase().trim();
        const fullName = `${a.nombre} ${a.apellidos}`.toLowerCase();
        if (!fullName.includes(term) && !`${a.apellidos} ${a.nombre}`.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Filtro por matrícula (búsqueda libre)
      if (filtroMatricula) {
        const term = filtroMatricula.toLowerCase().trim();
        if (!a.matricula?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Filtro por semestre
      if (filtroSemestre) {
        if (a.semestre !== parseInt(filtroSemestre)) {
          return false;
        }
      }

      // Filtro por letra del grupo
      if (filtroLetra) {
        const letra = extraerLetra(a.grupo_nombre);
        if (letra !== filtroLetra) {
          return false;
        }
      }

      // Filtro por especialidad
      if (filtroEspecialidad) {
        if (a.especialidad_id !== parseInt(filtroEspecialidad)) {
          return false;
        }
      }

      // Filtro por turno
      if (filtroTurno) {
        if (a.turno_id !== parseInt(filtroTurno)) {
          return false;
        }
      }

      return true;
    });
  }, [alumnos, filtroNombre, filtroMatricula, filtroSemestre, filtroLetra, filtroEspecialidad, filtroTurno]);

  const alumnosPaginados = useMemo(() => {
    const start = (paginaActual - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return alumnosFiltrados.slice(start, end);
  }, [alumnosFiltrados, paginaActual]);

  const totalPaginas = Math.ceil(alumnosFiltrados.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroNombre, filtroMatricula, filtroSemestre, filtroLetra, filtroEspecialidad, filtroTurno]);

  // Cargar pagos del alumno seleccionado
  const cargarPagos = async (alumnoId) => {
    if (!alumnoId) {
      setPagos([]);
      return;
    }
    setCargandoPagos(true);
    try {
      const res = await pagosService.getPorAlumno(alumnoId);
      let pagosData = res.data || [];
      if (filtroConcepto) {
        pagosData = pagosData.filter(p => p.concepto_id === parseInt(filtroConcepto));
      }
      if (filtroCiclo) {
        pagosData = pagosData.filter(p => p.ciclo_id === parseInt(filtroCiclo));
      }
      setPagos(pagosData);
    } catch (e) {
      console.error('Error cargando pagos:', e);
      setError('No se pudieron cargar los pagos.');
      setPagos([]);
    } finally {
      setCargandoPagos(false);
    }
  };

  useEffect(() => {
    if (alumnoSeleccionado) {
      cargarPagos(alumnoSeleccionado.alumno_id || alumnoSeleccionado.id);
    } else {
      setPagos([]);
    }
  }, [alumnoSeleccionado, filtroConcepto, filtroCiclo]);

  const handleVerPagos = (alumno) => {
    setAlumnoSeleccionado(alumno);
    setVista('detalle');
    setError('');
  };

  const handleVolverLista = () => {
    setAlumnoSeleccionado(null);
    setVista('lista');
    setPagos([]);
    setError('');
  };

  const handleAbrirModal = () => {
    setForm({
      alumno_id: alumnoSeleccionado ? String(alumnoSeleccionado.alumno_id || alumnoSeleccionado.id) : '',
      concepto_id: '',
      ciclo_id: '',
      monto: '',
      folio_recibo: '',
      observaciones: '',
    });
    setModalAbierto(true);
    setError('');
  };

  const handleConceptoChange = (conceptoId) => {
    const concepto = conceptos.find(c => c.id === parseInt(conceptoId));
    if (concepto) {
      setForm({ ...form, concepto_id: conceptoId, monto: concepto.precio });
    } else {
      setForm({ ...form, concepto_id: conceptoId, monto: '' });
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    if (!form.alumno_id || !form.concepto_id || !form.monto) {
      setError('Alumno, concepto y monto son obligatorios.');
      setEnviando(false);
      return;
    }

    try {
      await pagosService.registrar({
        alumno_id: parseInt(form.alumno_id),
        concepto_id: parseInt(form.concepto_id),
        ciclo_id: form.ciclo_id ? parseInt(form.ciclo_id) : null,
        monto: parseFloat(form.monto),
        folio_recibo: form.folio_recibo || null,
        observaciones: form.observaciones || null,
      });
      setExito(' Pago registrado correctamente.');
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
      if (alumnoSeleccionado) {
        cargarPagos(alumnoSeleccionado.alumno_id || alumnoSeleccionado.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el pago.');
    } finally {
      setEnviando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroNombre('');
    setFiltroMatricula('');
    setFiltroSemestre('');
    setFiltroLetra('');
    setFiltroEspecialidad('');
    setFiltroTurno('');
    setPaginaActual(1);
  };

  const limpiarFiltrosPagos = () => {
    setFiltroConcepto('');
    setFiltroCiclo('');
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPaginaActual(nuevaPagina);
  };

  // Vista de lista de alumnos
  if (vista === 'lista') {
    return (
      <div className={styles.page}>
        {error && <div className={styles.errorMsg}>{error}</div>}
        {exito && <div className={styles.successMsg}>{exito}</div>}

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Pagos</h1>
            <p className={styles.subtitle}>{alumnosFiltrados.length} alumno(s)</p>
          </div>
          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            Limpiar todos los filtros
          </button>
        </div>

        {/* Filtros */}
        <div className={styles.filtrosContainer}>
          <div className={styles.filtrosGrid}>
            {/* Buscar por nombre/apellido */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Nombre / Apellido</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Escribe nombre o apellido..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>

            {/* Buscar por matrícula */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Matrícula</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej: A2024001"
                value={filtroMatricula}
                onChange={(e) => setFiltroMatricula(e.target.value)}
              />
            </div>

            {/* Semestre (grado) */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Semestre (grado)</label>
              <select
                className={styles.select}
                value={filtroSemestre}
                onChange={(e) => setFiltroSemestre(e.target.value)}
              >
                <option value="">Todos</option>
                {SEMESTRES.map(s => (
                  <option key={s} value={s}>{s}°</option>
                ))}
              </select>
            </div>

            {/* Letra del grupo */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Grupo (letra)</label>
              <select
                className={styles.select}
                value={filtroLetra}
                onChange={(e) => setFiltroLetra(e.target.value)}
              >
                <option value="">Todos</option>
                {GRUPO_LETRAS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Especialidad */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Especialidad</label>
              <select
                className={styles.select}
                value={filtroEspecialidad}
                onChange={(e) => setFiltroEspecialidad(e.target.value)}
              >
                <option value="">Todas</option>
                {especialidades.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Turno</label>
              <select
                className={styles.select}
                value={filtroTurno}
                onChange={(e) => setFiltroTurno(e.target.value)}
              >
                <option value="">Todos</option>
                {turnos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Matrícula</th>
                <th>Grado</th>
                <th>Grupo</th>
                <th>Turno</th>
                <th>Especialidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    <Skeleton width="100%" height="30px" variant="text" />
                  </td>
                </tr>
              ) : alumnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    No hay alumnos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                alumnosPaginados.map((a) => (
                  <tr key={a.id}>
                    <td>{a.apellidos}, {a.nombre}</td>
                    <td>{a.matricula || '—'}</td>
                    <td>{a.semestre ? `${a.semestre}°` : '—'}</td>
                    <td>{extraerLetra(a.grupo_nombre) || '—'}</td>
                    <td>{a.turno_nombre || '—'}</td>
                    <td>{a.especialidad_nombre || '—'}</td>
                    <td>
                      <button
                        className={styles.btnVerPagos}
                        onClick={() => handleVerPagos(a)}
                      >
                        <Eye size={16} /> Ver pagos
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationBtn}
              onClick={() => cambiarPagina(paginaActual - 1)}
              disabled={paginaActual <= 1}
            >
              Anterior
            </button>
            <span className={styles.paginationInfo}>
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              className={styles.paginationBtn}
              onClick={() => cambiarPagina(paginaActual + 1)}
              disabled={paginaActual >= totalPaginas}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    );
  }

  // Vista de detalle de pagos de un alumno
  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Pagos</h1>
          <p className={styles.subtitle}>
            {alumnoSeleccionado?.apellidos}, {alumnoSeleccionado?.nombre}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnVolver} onClick={handleVolverLista}>
            <ArrowLeft size={16} /> Volver a lista
          </button>
          {esAdmin && (
            <button className={styles.btnPrimary} onClick={handleAbrirModal}>
              <Plus size={18} /> Nuevo pago
            </button>
          )}
        </div>
      </div>

      {alumnoSeleccionado && (
        <div className={styles.alumnoInfoPanel}>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Nombre:</span>
            <span className={styles.alumnoInfoValue}>
              {alumnoSeleccionado.apellidos}, {alumnoSeleccionado.nombre}
            </span>
          </div>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Matrícula:</span>
            <span className={styles.alumnoInfoValue}>
              {alumnoSeleccionado.matricula || 'Sin asignar'}
            </span>
          </div>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Grado:</span>
            <span className={styles.alumnoInfoValue}>
              {alumnoSeleccionado.semestre ? `${alumnoSeleccionado.semestre}°` : 'Sin asignar'}
            </span>
          </div>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Grupo:</span>
            <span className={styles.alumnoInfoValue}>
              {extraerLetra(alumnoSeleccionado.grupo_nombre) || 'Sin asignar'}
            </span>
          </div>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Turno:</span>
            <span className={styles.alumnoInfoValue}>
              {alumnoSeleccionado.turno_nombre || 'Sin asignar'}
            </span>
          </div>
          <div className={styles.alumnoInfoRow}>
            <span className={styles.alumnoInfoLabel}>Especialidad:</span>
            <span className={styles.alumnoInfoValue}>
              {alumnoSeleccionado.especialidad_nombre || 'Sin asignar'}
            </span>
          </div>
        </div>
      )}

      <div className={styles.filtrosContainer}>
        <div className={styles.filtros}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Concepto</label>
            <select
              className={styles.select}
              value={filtroConcepto}
              onChange={(e) => setFiltroConcepto(e.target.value)}
            >
              <option value="">Todos</option>
              {conceptos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} (${parseFloat(c.precio).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Ciclo</label>
            <select
              className={styles.select}
              value={filtroCiclo}
              onChange={(e) => setFiltroCiclo(e.target.value)}
            >
              <option value="">Todos</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <button className={styles.btnLimpiar} onClick={limpiarFiltrosPagos}>
            Limpiar
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Ciclo</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Folio</th>
              <th>Registrado por</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {cargandoPagos ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  <Skeleton width="100%" height="30px" variant="text" />
                </td>
              </tr>
            ) : pagos.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  {filtroConcepto || filtroCiclo ? (
                    'No hay pagos con los filtros aplicados.'
                  ) : (
                    'Este alumno no tiene pagos registrados.'
                  )}
                </td>
              </tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id}>
                  <td>{p.concepto_nombre}</td>
                  <td>{p.ciclo || '—'}</td>
                  <td>${parseFloat(p.monto).toFixed(2)}</td>
                  <td>{new Date(p.fecha_pago).toLocaleDateString('es-MX')}</td>
                  <td>{p.folio_recibo || '—'}</td>
                  <td>{p.registrado_por || '—'}</td>
                  <td>{p.observaciones || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Registrar pago</h3>
              <button className={styles.modalClose} onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleGuardar} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Alumno *</label>
                <select
                  className={styles.select}
                  value={form.alumno_id}
                  onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
                  required
                  disabled={!!alumnoSeleccionado}
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.alumno_id || a.id}>
                      {a.apellidos}, {a.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Concepto *</label>
                <select
                  className={styles.select}
                  value={form.concepto_id}
                  onChange={(e) => handleConceptoChange(e.target.value)}
                  required
                >
                  <option value="">Selecciona un concepto...</option>
                  {conceptos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} (${parseFloat(c.precio).toFixed(2)})
                    </option>
                  ))}
                </select>
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
                    readOnly={!!form.concepto_id}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Ciclo</label>
                  <select
                    className={styles.select}
                    value={form.ciclo_id}
                    onChange={(e) => setForm({ ...form, ciclo_id: e.target.value })}
                  >
                    <option value="">Sin ciclo</option>
                    {ciclos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Folio de recibo</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.folio_recibo}
                  onChange={(e) => setForm({ ...form, folio_recibo: e.target.value })}
                  placeholder="Ej: REC-001"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Observaciones</label>
                <textarea
                  className={styles.textarea}
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}