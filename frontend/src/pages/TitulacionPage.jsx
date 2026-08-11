import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { titulacionService, usuariosService, catalogosService, gruposService } from '../services/api';
import { Plus, Edit, Trash2, X, Search, AlertCircle, Info } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './TitulacionPage.module.css';

const ESTATUS_OPCIONES = ['en_proceso', 'tramite', 'titulado'];
const ESTATUS_ETIQUETA = {
  en_proceso: 'En proceso',
  tramite: 'Trámite',
  titulado: 'Titulado',
};

const OPCIONES_TITULACION = [
  'Tesis',
  'Memoria de estadísticas de trabajo',
  'Acreditación de competencias',
  'Experiencia laboral',
  'Curso de titulación',
  'Reporte de práctica profesional',
];

const ITEMS_PER_PAGE = 10;

export default function TitulacionPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';

  const [registros, setRegistros] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroGrupoLetra, setFiltroGrupoLetra] = useState('');

  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditando, setModalEditando] = useState(null);
  const [form, setForm] = useState({
    alumno_id: '',
    opcion_titulacion: '',
    estatus: 'en_proceso',
    observaciones: '',
  });
  const [enviando, setEnviando] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  const alumnosDisponibles = useMemo(() => {
    const idsConTitulo = new Set(registros.map(r => r.alumno_id));
    return alumnos.filter(a => !idsConTitulo.has(a.alumno_id || a.id));
  }, [alumnos, registros]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [alumnosRes, gruposRes, espRes, turnRes] = await Promise.all([
          usuariosService.getAll({ rol: 'alumno', semestre: 6 }),
          gruposService.getAll({ semestre: 6 }),
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
        ]);
        setAlumnos(alumnosRes.usuarios || []);
        setGrupos(gruposRes.data || []);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setBusquedaDebounced(busqueda), 500);
    return () => clearTimeout(handler);
  }, [busqueda]);

  const cargarRegistros = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = {
        page: pagina,
        limit: ITEMS_PER_PAGE,
      };
      if (filtroAlumno) params.alumno_id = filtroAlumno;
      if (filtroEstatus) params.estatus = filtroEstatus;
      if (busquedaDebounced) params.search = busquedaDebounced;
      if (filtroGrupo) params.grupo_id = filtroGrupo;
      if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
      if (filtroTurno) params.turno_id = filtroTurno;
      if (filtroGrupoLetra) params.grupo_letra = filtroGrupoLetra;

      const res = await titulacionService.getAll(params);
      setRegistros(res.data || []);
      setTotalRegistros(res.pagination?.total || 0);
      setTotalPaginas(res.pagination?.pages || 1);
    } catch (e) {
      console.error('Error cargando registros:', e);
      setError('No se pudieron cargar los registros.');
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, [pagina, filtroAlumno, filtroEstatus, busquedaDebounced, filtroGrupo, filtroEspecialidad, filtroTurno, filtroGrupoLetra]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  const handleAbrirCrear = () => {
    setModalEditando(null);
    setForm({
      alumno_id: '',
      opcion_titulacion: '',
      estatus: 'en_proceso',
      observaciones: '',
    });
    setModalAbierto(true);
    setError('');
  };

  const handleAbrirEditar = (registro) => {
    setModalEditando(registro);
    setForm({
      alumno_id: String(registro.alumno_id),
      opcion_titulacion: registro.opcion_titulacion,
      estatus: registro.estatus,
      observaciones: registro.observaciones || '',
    });
    setModalAbierto(true);
    setError('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    if (!form.alumno_id || !form.opcion_titulacion) {
      setError('Alumno y opción de titulación son obligatorios.');
      setEnviando(false);
      return;
    }

    try {
      let mensaje = '';
      if (modalEditando) {
        await titulacionService.actualizar(modalEditando.id, form);
        mensaje = 'Registro actualizado correctamente.';
      } else {
        const res = await titulacionService.crear(form);
        mensaje = res.advertencia
          ? `Registro creado con advertencias: ${res.advertencia}`
          : 'Registro creado correctamente.';
      }
      setExito(mensaje);
      setModalAbierto(false);
      setTimeout(() => setExito(''), 5000);
      cargarRegistros();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = (id) => {
    setConfirmModal({ open: true, id });
  };

  const confirmarEliminar = async () => {
    const { id } = confirmModal;
    try {
      await titulacionService.eliminar(id);
      setExito('Registro eliminado.');
      setTimeout(() => setExito(''), 4000);
      cargarRegistros();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar.');
    } finally {
      setConfirmModal({ open: false, id: null });
    }
  };

  const cancelarEliminar = () => {
    setConfirmModal({ open: false, id: null });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setBusquedaDebounced('');
    setFiltroAlumno('');
    setFiltroEstatus('');
    setFiltroGrupo('');
    setFiltroEspecialidad('');
    setFiltroTurno('');
    setFiltroGrupoLetra('');
    setPagina(1);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setPagina(nuevaPagina);
  };

  const letrasGrupo = ['A', 'B', 'C', 'D'];

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Titulación</h1>
          <p className={styles.subtitle}>{totalRegistros} registro(s)</p>
        </div>
        {esAdmin && (
          <button className={styles.btnPrimary} onClick={handleAbrirCrear}>
            <Plus size={18} /> Nuevo registro
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
                placeholder="Buscar por nombre, apellido o matrícula..."
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
            <label className={styles.label}>Estatus</label>
            <select
              className={styles.select}
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
            >
              <option value="">Todos</option>
              {ESTATUS_OPCIONES.map((s) => (
                <option key={s} value={s}>{ESTATUS_ETIQUETA[s]}</option>
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
              <option value="">Todos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Especialidad</label>
            <select
              className={styles.select}
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
            >
              <option value="">Todas</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Turno</label>
            <select
              className={styles.select}
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
            >
              <option value="">Todos</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Letra grupo</label>
            <select
              className={styles.select}
              value={filtroGrupoLetra}
              onChange={(e) => setFiltroGrupoLetra(e.target.value)}
            >
              <option value="">Todos</option>
              {letrasGrupo.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            Limpiar
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
                <th>Opción</th>
                <th>Estatus</th>
                <th>N° Título</th>
                <th>Cédula</th>
                <th>Grupo</th>
                <th>Requisitos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((n) => (
                <tr key={n}>
                  <td><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="140px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="24px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : registros.length === 0 ? (
        <div className={styles.empty}>No hay registros de titulación.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Opción</th>
                <th>Estatus</th>
                <th>N° Título</th>
                <th>Cédula</th>
                <th>Grupo</th>
                <th>Requisitos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{r.apellidos}, {r.nombre}</td>
                  <td>{r.matricula || '—'}</td>
                  <td>{r.opcion_titulacion}</td>
                  <td>
                    <span className={`${styles.estatusBadge} ${styles[`estatus_${r.estatus}`]}`}>
                      {ESTATUS_ETIQUETA[r.estatus] || r.estatus}
                    </span>
                  </td>
                  <td>{r.estatus === 'titulado' && r.numero_titulo ? r.numero_titulo : '—'}</td>
                  <td>{r.estatus === 'titulado' && r.cedula_profesional ? r.cedula_profesional : '—'}</td>
                  <td>{r.grupo_nombre || '—'}</td>
                  <td>
                    {r.servicio_social_completado && r.practicas_profesionales_completadas ? (
                      <span className={styles.requisitoOk}>Cumple</span>
                    ) : (
                      <span className={styles.requisitoFail}>
                        <AlertCircle size={14} />
                        {!r.servicio_social_completado && ' SS '}
                        {!r.practicas_profesionales_completadas && ' PP '}
                      </span>
                    )}
                  </td>
                  <td>
                    {esAdmin && (
                      <div className={styles.acciones}>
                        <button
                          className={styles.btnEditar}
                          onClick={() => handleAbrirEditar(r)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => handleEliminar(r.id)}
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
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalEditando ? 'Editar registro' : 'Nuevo registro'}
              </h3>
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
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnosDisponibles.map((a) => (
                    <option key={a.id} value={a.alumno_id || a.id}>
                      {a.apellidos}, {a.nombre}
                    </option>
                  ))}
                </select>
                {alumnosDisponibles.length === 0 && (
                  <small className={styles.helpText}>No hay alumnos disponibles (todos ya tienen registro de titulación).</small>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Opción de titulación *</label>
                <select
                  className={styles.select}
                  value={form.opcion_titulacion}
                  onChange={(e) => setForm({ ...form, opcion_titulacion: e.target.value })}
                  required
                >
                  <option value="">Selecciona una opción...</option>
                  {OPCIONES_TITULACION.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Estatus
                  <span className={styles.helpIcon} title="Al cambiar a 'Titulado' se generarán automáticamente el número de título y cédula profesional, siempre que el alumno cumpla con los requisitos (Servicio Social y Prácticas liberadas).">
                    <Info size={14} />
                  </span>
                </label>
                <select
                  className={styles.select}
                  value={form.estatus}
                  onChange={(e) => setForm({ ...form, estatus: e.target.value })}
                >
                  {ESTATUS_OPCIONES.map((s) => (
                    <option key={s} value={s}>{ESTATUS_ETIQUETA[s]}</option>
                  ))}
                </select>
                <small className={styles.helpText}>
                  <Info size={12} /> Al seleccionar <strong>"Titulado"</strong> se generarán automáticamente N° de Título y Cédula.
                </small>
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
                  {enviando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className={styles.modalOverlay} onClick={cancelarEliminar}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirmar eliminación</h3>
              <button className={styles.modalClose} onClick={cancelarEliminar}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.confirmBody}>
              <p>¿Estás seguro de que deseas eliminar este registro de titulación?</p>
              <p className={styles.confirmWarning}>Esta acción no se puede deshacer.</p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={cancelarEliminar}>
                Cancelar
              </button>
              <button type="button" className={styles.btnDanger} onClick={confirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}