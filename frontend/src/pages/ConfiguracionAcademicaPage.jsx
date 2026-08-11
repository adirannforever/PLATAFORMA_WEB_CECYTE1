import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ciclosService,
  periodosService,
  materiasCatalogoService,
  especialidadesService,
  catalogosService,
} from '../services/api';
import { Plus, Edit, Trash2, X, RefreshCw, Filter, Layers, Calendar } from 'lucide-react';
import styles from './ConfiguracionAcademicaPage.module.css';

const TIPO_ETIQUETA = {
  preinscripcion: 'Preinscripción',
  inscripcion_nuevo_ingreso: 'Inscripción nuevo ingreso',
  reinscripcion: 'Reinscripción',
  inicio_semestre: 'Inicio de semestre',
  fin_semestre: 'Fin de semestre',
  evaluaciones_parciales: 'Evaluaciones parciales',
  evaluacion_recuperacion: 'Evaluación de recuperación',
  evaluacion_extraordinaria: 'Evaluación extraordinaria',
  curso_intersemestral: 'Curso intersemestral',
};

const TIPO_MATERIA_ETIQUETA = {
  troncal_general: 'Troncal general',
  troncal_especialidad: 'Troncal especialidad',
  modulo: 'Módulo',
};

const TIPO_PERIODO_OPCIONES = [
  'preinscripcion',
  'inscripcion_nuevo_ingreso',
  'reinscripcion',
  'inicio_semestre',
  'fin_semestre',
  'evaluaciones_parciales',
  'evaluacion_recuperacion',
  'evaluacion_extraordinaria',
  'curso_intersemestral',
];

const TIPO_EVALUACION_OPCIONES = [
  { value: 'parcial', label: 'Parcial' },
  { value: 'recuperacion', label: 'Recuperación' },
  { value: 'extraordinario', label: 'Extraordinario' },
];

const TIPO_EVALUACION_BADGE = {
  parcial: { label: 'Parcial', className: 'tipoParcial' },
  recuperacion: { label: 'Recuperación', className: 'tipoRecuperacion' },
  extraordinario: { label: 'Extraordinario', className: 'tipoExtraordinario' },
};

export default function ConfiguracionAcademicaPage() {
  const { usuario } = useAuth();

  const [tabActiva, setTabActiva] = useState('ciclos');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Ciclos
  const [ciclos, setCiclos] = useState([]);
  const [cargandoCiclos, setCargandoCiclos] = useState(false);

  // Períodos
  const [cicloSeleccionadoId, setCicloSeleccionadoId] = useState(null);
  const [periodosEscolares, setPeriodosEscolares] = useState([]);
  const [periodosEvaluacion, setPeriodosEvaluacion] = useState([]);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(false);
  const [filtroSemestrePeriodo, setFiltroSemestrePeriodo] = useState('');
  const [filtroEspecialidadPeriodo, setFiltroEspecialidadPeriodo] = useState('');

  // Especialidades
  const [especialidades, setEspecialidades] = useState([]);
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(false);

  // Materias
  const [materias, setMaterias] = useState([]);
  const [filtroEspMateria, setFiltroEspMateria] = useState('');
  const [filtroSemMateria, setFiltroSemMateria] = useState('');
  const [cargandoMaterias, setCargandoMaterias] = useState(false);

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [modalEditando, setModalEditando] = useState(null);
  const [form, setForm] = useState({});
  const [enviando, setEnviando] = useState(false);

  // Batch
  const [batchModalAbierto, setBatchModalAbierto] = useState(false);
  const [batchForm, setBatchForm] = useState({
    tipo: '',
    fecha_inicio: '',
    fecha_fin: '',
    rango_todos: true,
    semestre_desde: 1,
    semestre_hasta: 6,
  });
  const [batchItems, setBatchItems] = useState([]);
  const [batchEnviando, setBatchEnviando] = useState(false);

  // Confirmación
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

  const abrirConfirmacion = (message, onConfirm) => {
    setConfirmModal({
      open: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ open: false, message: '', onConfirm: null });
      }
    });
  };

  const cerrarConfirmacion = () => {
    setConfirmModal({ open: false, message: '', onConfirm: null });
  };

  // ── Cargar datos ──
  const cargarCiclos = useCallback(async () => {
    setCargandoCiclos(true);
    try {
      const res = await ciclosService.getAll();
      setCiclos(res.data || []);
      if (res.data?.length > 0 && !cicloSeleccionadoId) {
        const activo = res.data.find(c => c.activo);
        setCicloSeleccionadoId(activo ? activo.id : res.data[0].id);
      }
    } catch (e) {
      setError('Error al cargar ciclos');
      console.error(e);
    } finally {
      setCargandoCiclos(false);
    }
  }, []);

  const cargarEspecialidades = useCallback(async () => {
    setCargandoEspecialidades(true);
    try {
      const res = await catalogosService.getEspecialidades();
      setEspecialidades(res.data || []);
    } catch (e) {
      setError('Error al cargar especialidades');
      console.error(e);
    } finally {
      setCargandoEspecialidades(false);
    }
  }, []);

  const cargarPeriodos = useCallback(async () => {
    if (!cicloSeleccionadoId) return;
    setCargandoPeriodos(true);
    try {
      const params = { ciclo_id: cicloSeleccionadoId };
      if (filtroSemestrePeriodo) params.semestre = filtroSemestrePeriodo;
      if (filtroEspecialidadPeriodo) params.especialidad_id = filtroEspecialidadPeriodo;
      const [esc, eva] = await Promise.all([
        periodosService.getEscolares(params),
        periodosService.getEvaluacion({ ciclo_id: cicloSeleccionadoId }),
      ]);
      setPeriodosEscolares(esc.data || []);
      setPeriodosEvaluacion(eva.data || []);
    } catch (e) {
      setError('Error al cargar períodos');
      console.error(e);
    } finally {
      setCargandoPeriodos(false);
    }
  }, [cicloSeleccionadoId, filtroSemestrePeriodo, filtroEspecialidadPeriodo]);

  const cargarMaterias = useCallback(async () => {
    setCargandoMaterias(true);
    try {
      const params = {};
      if (filtroEspMateria) params.especialidad_id = filtroEspMateria;
      if (filtroSemMateria) params.semestre = filtroSemMateria;
      const res = await materiasCatalogoService.getAll(params);
      setMaterias(res.data || []);
    } catch (e) {
      setError('Error al cargar materias');
      console.error(e);
    } finally {
      setCargandoMaterias(false);
    }
  }, [filtroEspMateria, filtroSemMateria]);

  // ── Efectos ──
  useEffect(() => {
    cargarCiclos();
    cargarEspecialidades();
  }, []);

  useEffect(() => {
    if (tabActiva === 'periodos' && cicloSeleccionadoId) {
      cargarPeriodos();
    }
  }, [tabActiva, cicloSeleccionadoId, cargarPeriodos]);

  useEffect(() => {
    if (tabActiva === 'materias') {
      cargarMaterias();
    }
  }, [tabActiva, cargarMaterias]);

  // ── Handlers para modales individuales ──
  const abrirModalCrear = (tipo) => {
    setModalTipo(tipo);
    setModalEditando(null);
    setForm({});
    if (tipo === 'ciclo') {
      setForm({ nombre: '', fecha_inicio: '', fecha_fin: '', activo: false });
    } else if (tipo === 'periodo_escolar') {
      setForm({ semestre: 1, tipo: '', fecha_inicio: '', fecha_fin: '', activo: true });
    } else if (tipo === 'periodo_evaluacion') {
      setForm({ tipo: 'parcial', parcial: 1, fecha_inicio: '', fecha_fin: '', activo: true });
    } else if (tipo === 'especialidad') {
      setForm({ nombre: '', descripcion: '' });
    } else if (tipo === 'materia') {
      setForm({
        nombre: '',
        clave: '',
        semestre: 1,
        tipo: 'troncal_general',
        especialidad_id: '',
        horas_semana: 3,
        activa: true,
      });
    }
    setModalAbierto(true);
    setError('');
  };

  const abrirModalEditar = (tipo, item) => {
    setModalTipo(tipo);
    setModalEditando(item);
    setForm({ ...item });
    setModalAbierto(true);
    setError('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      let res;
      if (modalTipo === 'ciclo') {
        if (modalEditando) {
          res = await ciclosService.actualizar(modalEditando.id, form);
        } else {
          res = await ciclosService.crear(form);
        }
        await cargarCiclos();
      } else if (modalTipo === 'periodo_escolar') {
        if (modalEditando) {
          res = await periodosService.actualizarEscolar(modalEditando.id, form);
        } else {
          res = await periodosService.crearEscolar({
            ...form,
            ciclo_id: cicloSeleccionadoId,
          });
        }
        await cargarPeriodos();
      } else if (modalTipo === 'periodo_evaluacion') {
        const data = { ...form };
        // Si tipo no es 'parcial', no enviar parcial (o enviar 0)
        if (data.tipo !== 'parcial') {
          delete data.parcial;
        }
        if (modalEditando) {
          res = await periodosService.actualizarEvaluacion(modalEditando.id, data);
        } else {
          res = await periodosService.crearEvaluacion({
            ...data,
            ciclo_id: cicloSeleccionadoId,
          });
        }
        await cargarPeriodos();
      } else if (modalTipo === 'especialidad') {
        res = await especialidadesService.actualizar(modalEditando.id, form);
        await cargarEspecialidades();
      } else if (modalTipo === 'materia') {
        const data = { ...form };
        if (data.especialidad_id === '') data.especialidad_id = null;
        if (modalEditando) {
          res = await materiasCatalogoService.actualizar(modalEditando.id, data);
        } else {
          res = await materiasCatalogoService.crear(data);
        }
        await cargarMaterias();
      }
      setExito('Guardado correctamente');
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = (tipo, id) => {
    abrirConfirmacion('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.', async () => {
      try {
        if (tipo === 'ciclo') {
          await ciclosService.eliminar(id);
          await cargarCiclos();
        } else if (tipo === 'materia') {
          await materiasCatalogoService.eliminar(id);
          await cargarMaterias();
        }
        setExito('Eliminado correctamente');
        setTimeout(() => setExito(''), 4000);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al eliminar');
      }
    });
  };

  const handleRegenerarPeriodos = () => {
    abrirConfirmacion('¿Regenerar todos los períodos del ciclo seleccionado? Esto eliminará los períodos actuales.', async () => {
      try {
        await periodosService.regenerar(cicloSeleccionadoId);
        await cargarPeriodos();
        setExito('Períodos regenerados correctamente');
        setTimeout(() => setExito(''), 4000);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al regenerar');
      }
    });
  };

  // ── Batch ──
  const abrirBatchModal = () => {
    setBatchModalAbierto(true);
    setBatchForm({
      tipo: '',
      fecha_inicio: '',
      fecha_fin: '',
      rango_todos: true,
      semestre_desde: 1,
      semestre_hasta: 6,
    });
    setBatchItems([]);
    setError('');
  };

  const generarBatchItems = () => {
    const { tipo, fecha_inicio, fecha_fin, rango_todos, semestre_desde, semestre_hasta } = batchForm;
    if (!tipo || !fecha_inicio || !fecha_fin) {
      setError('Completa todos los campos (tipo y fechas)');
      return;
    }
    let semestres = [];
    if (rango_todos) {
      semestres = [1, 2, 3, 4, 5, 6];
    } else {
      const desde = parseInt(semestre_desde);
      const hasta = parseInt(semestre_hasta);
      if (desde < 1 || hasta > 6 || desde > hasta) {
        setError('Rango de semestres inválido (1-6)');
        return;
      }
      for (let i = desde; i <= hasta; i++) semestres.push(i);
    }
    const newItems = semestres.map(semestre => ({
      semestre,
      tipo,
      fecha_inicio,
      fecha_fin,
      activo: true,
      _tempId: Date.now() + Math.random() * 1000 + semestre,
    }));
    setBatchItems(prev => [...prev, ...newItems]);
    setError('');
  };

  const eliminarItemBatch = (tempId) => {
    abrirConfirmacion('¿Eliminar este período de la lista?', () => {
      setBatchItems(prev => prev.filter(item => item._tempId !== tempId));
    });
  };

  const guardarBatch = async () => {
    if (batchItems.length === 0) {
      setError('No hay períodos para guardar');
      return;
    }
    setBatchEnviando(true);
    setError('');
    try {
      const periodos = batchItems.map(({ semestre, tipo, fecha_inicio, fecha_fin, activo }) => ({
        semestre,
        tipo,
        fecha_inicio,
        fecha_fin,
        activo,
      }));
      const res = await periodosService.crearEscolarBatch({
        ciclo_id: cicloSeleccionadoId,
        periodos,
      });
      if (res.success) {
        const { creados, errores } = res.data;
        if (errores.length > 0) {
          setError(`${errores.length} períodos no se pudieron crear. Revisa duplicados.`);
        } else {
          setExito(`${creados.length} períodos creados correctamente`);
        }
        setBatchModalAbierto(false);
        await cargarPeriodos();
        setTimeout(() => setExito(''), 4000);
      } else {
        setError(res.message || 'Error al guardar');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setBatchEnviando(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Render tab content ──
  const renderTabContent = () => {
    switch (tabActiva) {
      case 'ciclos':
        return (
          <div>
            <div className={styles.tabHeader}>
              <h2 className={styles.sectionTitle}>Ciclos escolares</h2>
              <button className={styles.btnPrimary} onClick={() => abrirModalCrear('ciclo')}>
                <Plus size={16} /> Nuevo ciclo
              </button>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Nombre</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {ciclos.length === 0 ? (
                    <tr><td colSpan="5" className={styles.emptyRow}>No hay ciclos registrados</td></tr>
                  ) : (
                    ciclos.map(c => (
                      <tr key={c.id}>
                        <td>{c.nombre}</td>
                        <td>{formatDate(c.fecha_inicio)}</td>
                        <td>{formatDate(c.fecha_fin)}</td>
                        <td><span className={c.activo ? styles.activoBadge : styles.inactivoBadge}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <button className={styles.btnEditar} onClick={() => abrirModalEditar('ciclo', c)}><Edit size={16} /></button>
                          <button className={styles.btnEliminar} onClick={() => handleEliminar('ciclo', c.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'periodos':
        return (
          <div>
            <div className={styles.selectorContainer}>
              <label className={styles.label}>Ciclo escolar</label>
              <select
                className={styles.select}
                value={cicloSeleccionadoId || ''}
                onChange={(e) => setCicloSeleccionadoId(Number(e.target.value))}
              >
                {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button className={styles.btnSecondary} onClick={handleRegenerarPeriodos}>
                <RefreshCw size={16} /> Regenerar
              </button>
            </div>

            <div className={styles.filtrosPeriodos}>
              <div className={styles.filtroPeriodo}>
                <label className={styles.labelSmall}>Semestre</label>
                <select
                  className={styles.selectSmall}
                  value={filtroSemestrePeriodo}
                  onChange={(e) => setFiltroSemestrePeriodo(e.target.value)}
                >
                  <option value="">Todos</option>
                  {[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}°</option>)}
                </select>
              </div>
              <div className={styles.filtroPeriodo}>
                <label className={styles.labelSmall}>Especialidad</label>
                <select
                  className={styles.selectSmall}
                  value={filtroEspecialidadPeriodo}
                  onChange={(e) => setFiltroEspecialidadPeriodo(e.target.value)}
                >
                  <option value="">Todas</option>
                  {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <button className={styles.btnLimpiarSmall} onClick={() => { setFiltroSemestrePeriodo(''); setFiltroEspecialidadPeriodo(''); }}>
                Limpiar
              </button>
            </div>

            <div className={styles.tabHeader}>
              <h3 className={styles.subsectionTitle}>Períodos escolares</h3>
              <div className={styles.headerActions}>
                <button className={styles.btnPrimary} onClick={abrirBatchModal}>
                  <Layers size={16} /> Agregar múltiples
                </button>
                <button className={styles.btnPrimary} onClick={() => abrirModalCrear('periodo_escolar')}>
                  <Plus size={16} /> Nuevo período
                </button>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Semestre</th><th>Tipo</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {periodosEscolares.length === 0 ? (
                    <tr><td colSpan="6" className={styles.emptyRow}>
                      {filtroSemestrePeriodo || filtroEspecialidadPeriodo
                        ? 'No hay períodos para los filtros seleccionados'
                        : 'No hay períodos registrados. Crea uno con "Nuevo período" o usa "Agregar múltiples"'}
                    </td></tr>
                  ) : (
                    periodosEscolares.map(p => (
                      <tr key={p.id}>
                        <td>{p.semestre}°</td>
                        <td>{TIPO_ETIQUETA[p.tipo] || p.tipo}</td>
                        <td>{formatDate(p.fecha_inicio)}</td>
                        <td>{formatDate(p.fecha_fin)}</td>
                        <td><span className={p.activo ? styles.activoBadge : styles.inactivoBadge}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                          <button className={styles.btnEditar} onClick={() => abrirModalEditar('periodo_escolar', p)}><Edit size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.tabHeader}>
              <h3 className={styles.subsectionTitle}>Períodos de evaluación</h3>
              <button className={styles.btnPrimary} onClick={() => abrirModalCrear('periodo_evaluacion')}>
                <Plus size={16} /> Nuevo período
              </button>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Tipo</th><th>Parcial</th><th>Fecha inicio</th><th>Fecha fin</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {periodosEvaluacion.length === 0 ? (
                    <tr><td colSpan="6" className={styles.emptyRow}>No hay períodos de evaluación registrados</td></tr>
                  ) : (
                    periodosEvaluacion.map(p => {
                      const badge = TIPO_EVALUACION_BADGE[p.tipo] || TIPO_EVALUACION_BADGE.parcial;
                      return (
                        <tr key={p.id}>
                          <td><span className={`${styles.tipoBadge} ${styles[badge.className]}`}>{badge.label}</span></td>
                          <td>{p.tipo === 'parcial' ? `${p.parcial}°` : '—'}</td>
                          <td>{formatDate(p.fecha_inicio)}</td>
                          <td>{formatDate(p.fecha_fin)}</td>
                          <td><span className={p.activo ? styles.activoBadge : styles.inactivoBadge}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                          <td>
                            <button className={styles.btnEditar} onClick={() => abrirModalEditar('periodo_evaluacion', p)}><Edit size={16} /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'especialidades':
        return (
          <div>
            <div className={styles.tabHeader}>
              <h2 className={styles.sectionTitle}>Especialidades</h2>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Clave</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {especialidades.length === 0 ? (
                    <tr><td colSpan="4" className={styles.emptyRow}>Sin especialidades</td></tr>
                  ) : (
                    especialidades.map(e => (
                      <tr key={e.id}>
                        <td>{e.clave}</td>
                        <td>{e.nombre}</td>
                        <td>{e.descripcion || '—'}</td>
                        <td>
                          <button className={styles.btnEditar} onClick={() => abrirModalEditar('especialidad', e)}><Edit size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'materias':
        return (
          <div>
            <div className={styles.tabHeader}>
              <h2 className={styles.sectionTitle}>Catálogo de materias</h2>
              <button className={styles.btnPrimary} onClick={() => abrirModalCrear('materia')}>
                <Plus size={16} /> Nueva materia
              </button>
            </div>
            <div className={styles.filtrosContainer}>
              <div className={styles.filtrosGrid}>
                <div className={styles.filtroGroup}>
                  <label className={styles.label}>Especialidad</label>
                  <select
                    className={styles.select}
                    value={filtroEspMateria}
                    onChange={(e) => setFiltroEspMateria(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div className={styles.filtroGroup}>
                  <label className={styles.label}>Semestre</label>
                  <select
                    className={styles.select}
                    value={filtroSemMateria}
                    onChange={(e) => setFiltroSemMateria(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>{s}°</option>)}
                  </select>
                </div>
                <button className={styles.btnLimpiar} onClick={() => { setFiltroEspMateria(''); setFiltroSemMateria(''); }}>
                  <Filter size={14} /> Limpiar
                </button>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Nombre</th><th>Clave</th><th>Semestre</th><th>Tipo</th><th>Especialidad</th><th>Horas</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {materias.length === 0 ? (
                    <tr><td colSpan="8" className={styles.emptyRow}>Sin materias</td></tr>
                  ) : (
                    materias.map(m => {
                      const esp = especialidades.find(e => e.id === m.especialidad_id);
                      return (
                        <tr key={m.id}>
                          <td>{m.nombre}</td>
                          <td>{m.clave || '—'}</td>
                          <td>{m.semestre}°</td>
                          <td>{TIPO_MATERIA_ETIQUETA[m.tipo] || m.tipo}</td>
                          <td>{esp ? esp.nombre : '—'}</td>
                          <td>{m.horas_semana}</td>
                          <td><span className={m.activa ? styles.activoBadge : styles.inactivoBadge}>{m.activa ? 'Activa' : 'Inactiva'}</span></td>
                          <td>
                            <button className={styles.btnEditar} onClick={() => abrirModalEditar('materia', m)}><Edit size={16} /></button>
                            <button className={styles.btnEliminar} onClick={() => handleEliminar('materia', m.id)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Modales ──
  const renderModal = () => {
    if (!modalAbierto) return null;

    let titulo = '';
    let campos = [];

    if (modalTipo === 'ciclo') {
      titulo = modalEditando ? 'Editar ciclo' : 'Nuevo ciclo';
      campos = [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fecha_fin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ];
    } else if (modalTipo === 'periodo_escolar') {
      titulo = modalEditando ? 'Editar período escolar' : 'Nuevo período escolar';
      campos = [
        { name: 'semestre', label: 'Semestre', type: 'select', options: [1,2,3,4,5,6], required: true },
        { name: 'tipo', label: 'Tipo', type: 'select', options: TIPO_PERIODO_OPCIONES.map(t => ({ value: t, label: TIPO_ETIQUETA[t] })), required: true },
        { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fecha_fin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ];
    } else if (modalTipo === 'periodo_evaluacion') {
      titulo = modalEditando ? 'Editar período de evaluación' : 'Nuevo período de evaluación';
      campos = [
        { name: 'tipo', label: 'Tipo', type: 'select', options: TIPO_EVALUACION_OPCIONES, required: true },
        { name: 'parcial', label: 'Parcial (número)', type: 'number', depends: { field: 'tipo', value: 'parcial' }, required: true },
        { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fecha_fin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ];
    } else if (modalTipo === 'especialidad') {
      titulo = modalEditando ? 'Editar especialidad' : 'Nueva especialidad';
      campos = [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      ];
    } else if (modalTipo === 'materia') {
      titulo = modalEditando ? 'Editar materia' : 'Nueva materia';
      campos = [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'clave', label: 'Clave', type: 'text' },
        { name: 'semestre', label: 'Semestre', type: 'select', options: [1,2,3,4,5,6], required: true },
        { name: 'tipo', label: 'Tipo', type: 'select', options: ['troncal_general','troncal_especialidad','modulo'], required: true },
        { name: 'especialidad_id', label: 'Especialidad', type: 'select', options: especialidades.map(e => ({ value: e.id, label: e.nombre })), allowEmpty: true },
        { name: 'horas_semana', label: 'Horas semana', type: 'number' },
        { name: 'activa', label: 'Activa', type: 'checkbox' },
      ];
    }

    return (
      <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>{titulo}</h3>
            <button className={styles.modalClose} onClick={() => setModalAbierto(false)}><X size={18} /></button>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <form onSubmit={handleGuardar} className={styles.form}>
            {campos.map(campo => {
              if (campo.depends) {
                const depValue = form[campo.depends.field];
                if (depValue !== campo.depends.value) return null;
              }
              const value = form[campo.name] ?? '';
              return (
                <div className={styles.field} key={campo.name}>
                  <label className={styles.label}>{campo.label} {campo.required && '*'}</label>
                  {campo.type === 'select' ? (
                    <select
                      className={styles.select}
                      value={value}
                      onChange={e => setForm({ ...form, [campo.name]: e.target.value })}
                      required={campo.required}
                    >
                      {campo.allowEmpty && <option value="">Sin especialidad</option>}
                      {campo.options.map(opt => {
                        if (typeof opt === 'object') {
                          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                        }
                        return <option key={opt} value={opt}>{opt}</option>;
                      })}
                    </select>
                  ) : campo.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={!!value}
                      onChange={e => setForm({ ...form, [campo.name]: e.target.checked })}
                    />
                  ) : campo.type === 'textarea' ? (
                    <textarea className={styles.textarea} value={value} onChange={e => setForm({ ...form, [campo.name]: e.target.value })} rows={3} />
                  ) : campo.type === 'date' ? (
                    <div className={styles.dateInputWrapper}>
                      <Calendar className={styles.dateIcon} size={18} />
                      <input
                        className={styles.input}
                        type="date"
                        value={value}
                        onChange={e => setForm({ ...form, [campo.name]: e.target.value })}
                        required={campo.required}
                      />
                    </div>
                  ) : (
                    <input
                      className={styles.input}
                      type={campo.type}
                      value={value}
                      onChange={e => setForm({ ...form, [campo.name]: e.target.value })}
                      required={campo.required}
                    />
                  )}
                </div>
              );
            })}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                {enviando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ── Batch Modal ──
  const renderBatchModal = () => {
    if (!batchModalAbierto) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setBatchModalAbierto(false)}>
        <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Agregar múltiples períodos escolares</h3>
            <button className={styles.modalClose} onClick={() => setBatchModalAbierto(false)}><X size={18} /></button>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.batchForm}>
            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo de período *</label>
                <select
                  className={styles.select}
                  value={batchForm.tipo}
                  onChange={e => setBatchForm({ ...batchForm, tipo: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {TIPO_PERIODO_OPCIONES.map(t => (
                    <option key={t} value={t}>{TIPO_ETIQUETA[t]}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fecha inicio *</label>
                <div className={styles.dateInputWrapper}>
                  <Calendar className={styles.dateIcon} size={18} />
                  <input
                    type="date"
                    className={styles.input}
                    value={batchForm.fecha_inicio}
                    onChange={e => setBatchForm({ ...batchForm, fecha_inicio: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fecha fin *</label>
                <div className={styles.dateInputWrapper}>
                  <Calendar className={styles.dateIcon} size={18} />
                  <input
                    type="date"
                    className={styles.input}
                    value={batchForm.fecha_fin}
                    onChange={e => setBatchForm({ ...batchForm, fecha_fin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Semestres</label>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      checked={batchForm.rango_todos}
                      onChange={() => setBatchForm({ ...batchForm, rango_todos: true })}
                    /> Todos (1-6)
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={!batchForm.rango_todos}
                      onChange={() => setBatchForm({ ...batchForm, rango_todos: false })}
                    /> Rango
                  </label>
                </div>
              </div>
              {!batchForm.rango_todos && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Desde</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="1" max="6"
                      value={batchForm.semestre_desde}
                      onChange={e => setBatchForm({ ...batchForm, semestre_desde: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Hasta</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="1" max="6"
                      value={batchForm.semestre_hasta}
                      onChange={e => setBatchForm({ ...batchForm, semestre_hasta: parseInt(e.target.value) || 6 })}
                    />
                  </div>
                </>
              )}
              <button className={styles.btnPrimary} onClick={generarBatchItems} style={{ alignSelf: 'flex-end' }}>
                <Plus size={16} /> Generar
              </button>
            </div>
          </div>

          {batchItems.length > 0 && (
            <div className={styles.batchPreview}>
              <h4 className={styles.subsectionTitle}>Vista previa ({batchItems.length} períodos)</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Semestre</th><th>Tipo</th><th>Fecha inicio</th><th>Fecha fin</th><th>Activo</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {batchItems.map(item => (
                      <tr key={item._tempId}>
                        <td>{item.semestre}°</td>
                        <td>{TIPO_ETIQUETA[item.tipo]}</td>
                        <td>{formatDate(item.fecha_inicio)}</td>
                        <td>{formatDate(item.fecha_fin)}</td>
                        <td><span className={styles.activoBadge}>Activo</span></td>
                        <td>
                          <button className={styles.btnEliminar} onClick={() => eliminarItemBatch(item._tempId)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.batchActions}>
                <button className={styles.btnSecondary} onClick={() => setBatchItems([])}>Vaciar lista</button>
                <button className={styles.btnPrimary} onClick={guardarBatch} disabled={batchEnviando}>
                  {batchEnviando ? 'Guardando...' : `Guardar ${batchItems.length} períodos`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Configuración Académica</h1>
          <p className={styles.subtitle}>Administra ciclos, períodos, especialidades y materias</p>
        </div>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.tabsContainer}>
        {['ciclos', 'periodos', 'especialidades', 'materias'].map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${tabActiva === tab ? styles.tabActive : ''}`}
            onClick={() => setTabActiva(tab)}
          >
            {tab === 'ciclos' ? 'Ciclos' : tab === 'periodos' ? 'Períodos' : tab === 'especialidades' ? 'Especialidades' : 'Materias'}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>

      {renderModal()}
      {renderBatchModal()}

      {confirmModal.open && (
        <div className={styles.modalOverlay} onClick={cerrarConfirmacion}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirmar</h3>
              <button className={styles.modalClose} onClick={cerrarConfirmacion}><X size={18} /></button>
            </div>
            <div className={styles.confirmBody}>
              <p>{confirmModal.message}</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={cerrarConfirmacion}>Cancelar</button>
              <button className={styles.btnDanger} onClick={confirmModal.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}