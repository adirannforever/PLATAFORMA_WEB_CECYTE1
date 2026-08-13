import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { gruposService, catalogosService, materiasCatalogoService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './GruposPage.module.css';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Search } from 'lucide-react';

const TIPO_MATERIA_ETIQUETA = {
  troncal_general: 'Troncal general',
  troncal_especialidad: 'Troncal especialidad',
  modulo: 'Módulo',
};

export default function GruposPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { isAdmin, isDocente } = usePermissions();

  const [grupos, setGrupos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [materiasDelGrupo, setMateriasDelGrupo] = useState({});
  const [alumnosDelGrupo, setAlumnosDelGrupo] = useState({});

  const [modalAbierto, setModalAbierto] = useState(false);
  const [formGrupo, setFormGrupo] = useState({
    ciclo_id: '',
    especialidad_id: '',
    turno_id: '',
    semestre: '',
    letra: '',
    tutor_id: ''
  });
  const [enviandoGrupo, setEnviandoGrupo] = useState(false);
  const [errorGrupo, setErrorGrupo] = useState('');
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [docentes, setDocentes] = useState([]);

  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({
    ciclo_id: '',
    especialidad_id: '',
    turno_id: '',
    semestre: '',
    letra: '',
    tutor_id: '',
    activo: true
  });
  const [enviandoEdicion, setEnviandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  const [modalAsignarMaterias, setModalAsignarMaterias] = useState(false);
  const [grupoParaAsignar, setGrupoParaAsignar] = useState(null);
  const [cargandoMateriasDisponibles, setCargandoMateriasDisponibles] = useState(false);
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [materiasSeleccionadas, setMateriasSeleccionadas] = useState([]);
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [errorAsignacion, setErrorAsignacion] = useState('');
  const [exitoAsignacion, setExitoAsignacion] = useState('');
  const [enviandoAsignacion, setEnviandoAsignacion] = useState(false);

  const [filtros, setFiltros] = useState({
    ciclo_id: '',
    semestre: '',
    turno_id: ''  
  });

  // Cargar ciclos (solo para admin)
  useEffect(() => {
    const cargarCiclos = async () => {
      try {
        const res = await catalogosService.getCiclos();
        setCiclos(res.data || []);
        const activo = res.data?.find(c => c.activo);
        if (activo && isAdmin) {
          setFiltros(prev => ({ ...prev, ciclo_id: String(activo.id) }));
        }
      } catch (e) {
        console.error('Error cargando ciclos:', e);
      }
    };
    cargarCiclos();
  }, [isAdmin]);

  // Cargar grupos (con filtros)
  useEffect(() => {
    const cargarGrupos = async () => {
      setCargando(true);
      try {
        const params = {};
        // Solo admin envía ciclo_id
        if (isAdmin && filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
        if (filtros.semestre) params.semestre = filtros.semestre;
        if (filtros.turno_id) params.turno_id = filtros.turno_id;
        if (isDocente) params.docente_id = usuario.id;

        const res = await gruposService.getAll(params);
        setGrupos(res.data || []); // <--- Cambio: res.grupos -> res.data
      } catch (e) {
        console.error('Error cargando grupos:', e);
        setGrupos([]);
      } finally {
        setCargando(false);
      }
    };
    cargarGrupos();
  }, [filtros, isAdmin, isDocente, usuario.id]);

  const cargarMateriasDisponibles = async () => {
    if (!grupoParaAsignar) return;
    setCargandoMateriasDisponibles(true);
    setErrorAsignacion('');
    setExitoAsignacion('');
    try {
      const params = {};
      if (filtroSemestre) params.semestre = parseInt(filtroSemestre);
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroTipo === 'troncal_especialidad' && grupoParaAsignar?.especialidad_id) {
        params.especialidad_id = grupoParaAsignar.especialidad_id;
      }

      const res = await materiasCatalogoService.getAll(params);
      const catalogo = res.data || [];

      const materiasGrupoRes = await gruposService.getMaterias(grupoParaAsignar.id);
      const idsAsignadas = (materiasGrupoRes.materias || []).map(m => m.materia_catalogo_id || m.id);

      const disponibles = catalogo.filter(m => 
        m.activa !== false && !idsAsignadas.includes(m.id)
      );

      setMateriasDisponibles(disponibles);
      setMateriasSeleccionadas([]);
    } catch (e) {
      console.error('Error cargando materias disponibles:', e);
      setErrorAsignacion('No se pudieron cargar las materias');
    } finally {
      setCargandoMateriasDisponibles(false);
    }
  };

  const abrirModalAsignarMaterias = (grupo) => {
    setGrupoParaAsignar(grupo);
    setModalAsignarMaterias(true);
    setFiltroSemestre(grupo.semestre?.toString() || '');
    setFiltroTipo('');
    setMateriasSeleccionadas([]);
    cargarMateriasDisponibles();
  };

  useEffect(() => {
    if (modalAsignarMaterias && grupoParaAsignar) {
      cargarMateriasDisponibles();
    }
  }, [filtroSemestre, filtroTipo, modalAsignarMaterias, grupoParaAsignar]);

  const handleSeleccionarTodas = () => {
    setMateriasSeleccionadas(materiasDisponibles.map(m => m.id));
  };
  const handleDeseleccionarTodas = () => {
    setMateriasSeleccionadas([]);
  };
  const handleToggleMateria = (id) => {
    setMateriasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAsignarMaterias = async () => {
    if (materiasSeleccionadas.length === 0) {
      setErrorAsignacion('Selecciona al menos una materia');
      return;
    }
    setEnviandoAsignacion(true);
    setErrorAsignacion('');
    setExitoAsignacion('');
    try {
      await gruposService.asignarMaterias(grupoParaAsignar.id, materiasSeleccionadas);
      setExitoAsignacion(`${materiasSeleccionadas.length} materia(s) asignadas correctamente`);
      const materiasRes = await gruposService.getMaterias(grupoParaAsignar.id);
      setMateriasDelGrupo(prev => ({ ...prev, [grupoParaAsignar.id]: materiasRes.materias || [] }));
      setTimeout(() => {
        setModalAsignarMaterias(false);
        setExitoAsignacion('');
      }, 1500);
    } catch (e) {
      setErrorAsignacion(e.response?.data?.message || 'Error al asignar materias');
    } finally {
      setEnviandoAsignacion(false);
    }
  };

  const handleAbrirModalCrear = async () => {
    setErrorGrupo('');
    setFormGrupo({
      ciclo_id: filtros.ciclo_id || '',
      especialidad_id: '',
      turno_id: '',
      semestre: '',
      letra: '',
      tutor_id: ''
    });
    try {
      const [espRes, turnRes, docRes] = await Promise.all([
        catalogosService.getEspecialidades(),
        catalogosService.getTurnos(),
        catalogosService.getDocentes()
      ]);
      setEspecialidades(espRes.data || []);
      setTurnos(turnRes.data || []);
      setDocentes(docRes.data || []);
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    }
    setModalAbierto(true);
  };

  const handleAbrirEdicion = (grupo) => {
    setErrorEdicion('');
    setGrupoEditando(grupo);
    setFormEdicion({
      ciclo_id: String(grupo.ciclo_id || ''),
      especialidad_id: String(grupo.especialidad_id || ''),
      turno_id: String(grupo.turno_id || ''),
      semestre: String(grupo.semestre || ''),
      letra: grupo.letra || '',
      tutor_id: String(grupo.tutor_id || ''),
      activo: grupo.activo !== undefined ? grupo.activo : true
    });
    if (especialidades.length === 0 || turnos.length === 0 || docentes.length === 0) {
      Promise.all([
        catalogosService.getEspecialidades(),
        catalogosService.getTurnos(),
        catalogosService.getDocentes()
      ]).then(([espRes, turnRes, docRes]) => {
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
        setDocentes(docRes.data || []);
      }).catch(console.error);
    }
    setModalEdicionAbierto(true);
  };

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    setErrorGrupo('');
    setEnviandoGrupo(true);
    try {
      await gruposService.crear({
        ciclo_id: parseInt(formGrupo.ciclo_id),
        especialidad_id: parseInt(formGrupo.especialidad_id),
        turno_id: parseInt(formGrupo.turno_id),
        semestre: parseInt(formGrupo.semestre),
        letra: formGrupo.letra.toUpperCase(),
        tutor_id: formGrupo.tutor_id ? parseInt(formGrupo.tutor_id) : null
      });
      setModalAbierto(false);
      const params = {};
      if (filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
      if (filtros.semestre) params.semestre = filtros.semestre;
      const res = await gruposService.getAll(params);
      setGrupos(res.grupos || []);
    } catch (err) {
      setErrorGrupo(err.response?.data?.message || 'Error al crear grupo.');
    } finally {
      setEnviandoGrupo(false);
    }
  };

  const handleEditarGrupo = async (e) => {
    e.preventDefault();
    setErrorEdicion('');
    setEnviandoEdicion(true);
    try {
      await gruposService.actualizar(grupoEditando.id, {
        ciclo_id: parseInt(formEdicion.ciclo_id),
        especialidad_id: parseInt(formEdicion.especialidad_id),
        turno_id: parseInt(formEdicion.turno_id),
        semestre: parseInt(formEdicion.semestre),
        letra: formEdicion.letra.toUpperCase(),
        tutor_id: formEdicion.tutor_id ? parseInt(formEdicion.tutor_id) : null,
        activo: formEdicion.activo
      });
      setModalEdicionAbierto(false);
      const params = {};
      if (filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
      if (filtros.semestre) params.semestre = filtros.semestre;
      if (filtros.turno_id) params.turno_id = filtros.turno_id;
      const res = await gruposService.getAll(params);
      setGrupos(res.grupos || []);
    } catch (err) {
      setErrorEdicion(err.response?.data?.message || 'Error al actualizar grupo.');
    } finally {
      setEnviandoEdicion(false);
    }
  };

  const handleToggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setCargandoDetalle(true);
    try {
      const [materiasRes, alumnosRes] = await Promise.all([
        gruposService.getMaterias(id),
        gruposService.getAlumnos(id)
      ]);
      setMateriasDelGrupo(prev => ({ ...prev, [id]: materiasRes.materias || [] }));
      setAlumnosDelGrupo(prev => ({ ...prev, [id]: alumnosRes.alumnos || [] }));
    } catch (e) {
      console.error('Error cargando detalle del grupo:', e);
      setMateriasDelGrupo(prev => ({ ...prev, [id]: [] }));
      setAlumnosDelGrupo(prev => ({ ...prev, [id]: [] }));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const renderGrupo = (grupo) => {
    const isExpanded = expandedId === grupo.id;
    const materias = materiasDelGrupo[grupo.id] || [];
    const alumnos = alumnosDelGrupo[grupo.id] || [];

    return (
      <div key={grupo.id} className={styles.grupoCard}>
        {isAdmin && (
          <button 
            className={styles.btnEditar}
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirEdicion(grupo);
            }}
          >
            Editar
          </button>
        )}
        <div className={styles.grupoHeader} onClick={() => handleToggleExpand(grupo.id)}>
          <div className={styles.grupoInfo}>
            <h3 className={styles.grupoNombre}>{grupo.nombre}</h3>
            <div className={styles.grupoMeta}>
              <span className={styles.badge}>{grupo.especialidad_nombre}</span>
              <span className={styles.badge}>{grupo.turno_nombre}</span>
              <span className={styles.badge}>Ciclo: {grupo.ciclo_nombre}</span>
            </div>
          </div>
          <div className={styles.grupoTutor}>
            Tutor: {grupo.tutor_nombre ? `${grupo.tutor_nombre} ${grupo.tutor_apellidos}` : 'Sin asignar'}
          </div>
          <div className={styles.expandIcon}>
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>

        {isExpanded && (
          <div className={styles.grupoDetalle}>
            {cargandoDetalle ? (
              <div className={styles.loadingDetalle}>Cargando detalles...</div>
            ) : (
              <>
                <div className={styles.detalleSeccion}>
                  <div className={styles.detalleHeader}>
                    <h4 className={styles.detalleTitulo}> Materias</h4>
                    {isAdmin && (
                      <button
                        className={styles.btnAgregarMateria}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalAsignarMaterias(grupo);
                        }}
                      >
                        <Plus size={16} /> Añadir materias
                      </button>
                    )}
                  </div>
                  {materias.length === 0 ? (
                    <p className={styles.detalleVacio}>No hay materias asignadas a este grupo.</p>
                  ) : (
                    <div className={styles.materiasGrid}>
                      {materias.map((m) => (
                        <div key={m.id} className={styles.materiaItem}>
                          <span className={styles.materiaNombre}>{m.materia_nombre}</span>
                          <span className={styles.materiaDocente}>
                            {m.docente_nombre} {m.docente_apellidos}
                          </span>
                          <button
                            className={styles.btnVerCalif}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/calificaciones/materia/${m.id}`);
                            }}
                          >
                            Ver calificaciones →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.detalleSeccion}>
                  <h4 className={styles.detalleTitulo}> Alumnos</h4>
                  {alumnos.length === 0 ? (
                    <p className={styles.detalleVacio}>No hay alumnos en este grupo.</p>
                  ) : (
                    <div className={styles.alumnosTable}>
                      <table>
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Matrícula</th>
                            <th>Promedio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alumnos.map((a) => (
                            <tr key={a.alumno_id}>
                              <td>{a.nombre} {a.apellidos}</td>
                              <td>{a.matricula}</td>
                              <td>
                                <span className={a.promedio >= 8 ? styles.promedioAlto : styles.promedioBajo}>
                                  {a.promedio ? a.promedio.toFixed(2) : 'Sin calificaciones'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Grupos</h1>
          <p className={styles.subtitle}>
            {grupos.length} grupo(s) encontrado(s)
          </p>
        </div>
        {isAdmin && (
          <button className={styles.btnPrimary} onClick={handleAbrirModalCrear}>
            + Crear grupo
          </button>
        )}
      </div>

      <div className={styles.filtros}>
        <div className={styles.filtroGroup}>
          <label className={styles.label}>Ciclo</label>
          <select
            className={styles.input}
            name="ciclo_id"
            value={filtros.ciclo_id}
            onChange={handleFilterChange}
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
          <label className={styles.label}>Semestre</label>
          <select
            className={styles.input}
            name="semestre"
            value={filtros.semestre}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            {[1,2,3,4,5,6].map((s) => (
              <option key={s} value={s}>{s}° Semestre</option>
            ))}
          </select>
        </div>

        <div className={styles.filtroGroup}>
          <label className={styles.label}>Turno</label>
          <select
            className={styles.input}
            name="turno_id"
            value={filtros.turno_id}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            <option value="1">Matutino</option>
            <option value="2">Vespertino</option>
          </select>
        </div>
      </div>

      {cargando ? (
        <div className={styles.skeletonContainer}>
          {[1,2,3].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <Skeleton width="80%" height="24px" variant="text" />
              <Skeleton width="60%" height="16px" variant="text" />
              <Skeleton width="40%" height="16px" variant="text" />
            </div>
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <div className={styles.empty}>
          No hay grupos para los filtros seleccionados.
        </div>
      ) : (
        <div className={styles.gruposList}>
          {grupos.map(renderGrupo)}
        </div>
      )}

      {modalAbierto && isAdmin && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Crear nuevo grupo</h3>
            {errorGrupo && <div className={styles.errorMsg}>{errorGrupo}</div>}
            <form onSubmit={handleCrearGrupo} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar</label>
                <select
                  className={styles.input}
                  value={formGrupo.ciclo_id}
                  onChange={e => setFormGrupo({...formGrupo, ciclo_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select
                  className={styles.input}
                  value={formGrupo.especialidad_id}
                  onChange={e => setFormGrupo({...formGrupo, especialidad_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Turno</label>
                <select
                  className={styles.input}
                  value={formGrupo.turno_id}
                  onChange={e => setFormGrupo({...formGrupo, turno_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {turnos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Semestre</label>
                <select
                  className={styles.input}
                  value={formGrupo.semestre}
                  onChange={e => setFormGrupo({...formGrupo, semestre: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {[1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Grupo (letra)</label>
                <select
                  className={styles.input}
                  value={formGrupo.letra}
                  onChange={e => setFormGrupo({...formGrupo, letra: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {['A','B','C','D'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tutor (opcional)</label>
                <select
                  className={styles.input}
                  value={formGrupo.tutor_id}
                  onChange={e => setFormGrupo({...formGrupo, tutor_id: e.target.value})}
                >
                  <option value="">Sin tutor</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviandoGrupo}>
                  {enviandoGrupo ? 'Creando...' : 'Crear grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEdicionAbierto && isAdmin && (
        <div className={styles.modalOverlay} onClick={() => setModalEdicionAbierto(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Editar grupo</h3>
            {errorEdicion && <div className={styles.errorMsg}>{errorEdicion}</div>}
            <form onSubmit={handleEditarGrupo} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar</label>
                <select
                  className={styles.input}
                  value={formEdicion.ciclo_id}
                  onChange={e => setFormEdicion({...formEdicion, ciclo_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select
                  className={styles.input}
                  value={formEdicion.especialidad_id}
                  onChange={e => setFormEdicion({...formEdicion, especialidad_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Turno</label>
                <select
                  className={styles.input}
                  value={formEdicion.turno_id}
                  onChange={e => setFormEdicion({...formEdicion, turno_id: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {turnos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Semestre</label>
                <select
                  className={styles.input}
                  value={formEdicion.semestre}
                  onChange={e => setFormEdicion({...formEdicion, semestre: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {[1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Grupo (letra)</label>
                <select
                  className={styles.input}
                  value={formEdicion.letra}
                  onChange={e => setFormEdicion({...formEdicion, letra: e.target.value})}
                  required
                >
                  <option value="">Selecciona...</option>
                  {['A','B','C','D'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tutor (opcional)</label>
                <select
                  className={styles.input}
                  value={formEdicion.tutor_id}
                  onChange={e => setFormEdicion({...formEdicion, tutor_id: e.target.value})}
                >
                  <option value="">Sin tutor</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Activo</label>
                <select
                  className={styles.input}
                  value={formEdicion.activo ? 'true' : 'false'}
                  onChange={e => setFormEdicion({...formEdicion, activo: e.target.value === 'true'})}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalEdicionAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviandoEdicion}>
                  {enviandoEdicion ? 'Actualizando...' : 'Actualizar grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAsignarMaterias && grupoParaAsignar && isAdmin && (
        <div className={styles.modalOverlay} onClick={() => {
          if (!enviandoAsignacion) setModalAsignarMaterias(false);
        }}>
          <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Asignar materias al grupo {grupoParaAsignar.nombre}
              </h3>
              <button 
                className={styles.modalClose} 
                onClick={() => setModalAsignarMaterias(false)}
                disabled={enviandoAsignacion}
              >
                <X size={18} />
              </button>
            </div>

            {errorAsignacion && <div className={styles.errorMsg}>{errorAsignacion}</div>}
            {exitoAsignacion && <div className={styles.successMsg}>{exitoAsignacion}</div>}

            <div className={styles.filtrosContainer}>
              <div className={styles.filtrosGrid}>
                <div className={styles.filtroGroup}>
                  <label className={styles.label}>Semestre</label>
                  <select
                    className={styles.select}
                    value={filtroSemestre}
                    onChange={(e) => {
                      setFiltroSemestre(e.target.value);
                    }}
                  >
                    <option value="">Todos</option>
                    {[1,2,3,4,5,6].map(s => (
                      <option key={s} value={s}>{s}°</option>
                    ))}
                  </select>
                </div>
                <div className={styles.filtroGroup}>
                  <label className={styles.label}>Tipo</label>
                  <select
                    className={styles.select}
                    value={filtroTipo}
                    onChange={(e) => {
                      setFiltroTipo(e.target.value);
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="troncal_general">Troncal general</option>
                    <option value="troncal_especialidad">Troncal especialidad</option>
                  </select>
                </div>
                <button
                  className={styles.btnSecondary}
                  onClick={() => cargarMateriasDisponibles()}
                  disabled={cargandoMateriasDisponibles}
                >
                  <Search size={16} /> Buscar
                </button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={materiasSeleccionadas.length === materiasDisponibles.length && materiasDisponibles.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) handleSeleccionarTodas();
                          else handleDeseleccionarTodas();
                        }}
                      />
                    </th>
                    <th>Clave</th>
                    <th>Nombre</th>
                    <th>Semestre</th>
                    <th>Tipo</th>
                    <th>Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoMateriasDisponibles ? (
                    <tr><td colSpan="6" className={styles.emptyRow}>Cargando...</td></tr>
                  ) : materiasDisponibles.length === 0 ? (
                    <tr><td colSpan="6" className={styles.emptyRow}>No hay materias disponibles para asignar</td></tr>
                  ) : (
                    materiasDisponibles.map(m => (
                      <tr key={m.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={materiasSeleccionadas.includes(m.id)}
                            onChange={() => handleToggleMateria(m.id)}
                          />
                        </td>
                        <td>{m.clave || '—'}</td>
                        <td>{m.nombre}</td>
                        <td>{m.semestre}°</td>
                        <td>{TIPO_MATERIA_ETIQUETA[m.tipo] || m.tipo}</td>
                        <td>{m.horas_semana}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <div className={styles.batchActions}>
                <button className={styles.btnSecondary} onClick={handleSeleccionarTodas} disabled={cargandoMateriasDisponibles || materiasDisponibles.length === 0}>
                  Seleccionar todas
                </button>
                <button className={styles.btnSecondary} onClick={handleDeseleccionarTodas} disabled={cargandoMateriasDisponibles || materiasDisponibles.length === 0}>
                  Deseleccionar
                </button>
              </div>
              <div className={styles.modalActionsRight}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setModalAsignarMaterias(false)}
                  disabled={enviandoAsignacion}
                >
                  Cancelar
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleAsignarMaterias}
                  disabled={enviandoAsignacion || cargandoMateriasDisponibles || materiasSeleccionadas.length === 0}
                >
                  {enviandoAsignacion ? 'Asignando...' : `Asignar ${materiasSeleccionadas.length} materia(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}