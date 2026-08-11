import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { gruposService, catalogosService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './GruposPage.module.css';
import { useNavigate } from 'react-router-dom';

export default function GruposPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
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

  //actualizacion

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

  // Filtros
  const [filtros, setFiltros] = useState({
    ciclo_id: '',
    semestre: '',
    turno_id: ''  
  });

  // Cargar filtros y datos iniciales
  useEffect(() => {
    const cargarInicial = async () => {
      try {
        const ciclosRes = await catalogosService.getCiclos();
        setCiclos(ciclosRes.data || []);
        // Por defecto, seleccionar ciclo activo
        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo) {
          setFiltros(prev => ({ ...prev, ciclo_id: String(activo.id) }));
        }
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarInicial();
  }, []);

  // Cargar grupos al cambiar filtros
  useEffect(() => {
    const cargarGrupos = async () => {
      setCargando(true);
      try {
        const params = {};
        if (filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
        if (filtros.semestre) params.semestre = filtros.semestre;
        if (filtros.turno_id) params.turno_id = filtros.turno_id;

        const res = await gruposService.getAll(params);
        setGrupos(res.grupos || []);
      } catch (e) {
        console.error('Error cargando grupos:', e);
        setGrupos([]);
      } finally {
        setCargando(false);
      }
    };
    cargarGrupos();
  }, [filtros]);

  const handleAbrirModalCrear = async () => {
    setErrorGrupo('');
    setFormGrupo({
      ciclo_id: filtros.ciclo_id || '', // usar el ciclo actual si está seleccionado
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
  // Cargar catálogos si no están cargados
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
      // Recargar grupos
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
    // Recargar grupos
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

  // Manejar expansión
  const handleToggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    setCargandoDetalle(true);

    try {
      // Cargar materias y alumnos en paralelo
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

  // Cambiar filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Renderizado de tarjeta de grupo
  const renderGrupo = (grupo) => {
    const isExpanded = expandedId === grupo.id;
    const materias = materiasDelGrupo[grupo.id] || [];
    const alumnos = alumnosDelGrupo[grupo.id] || [];

    return (
      <div key={grupo.id} className={styles.grupoCard}>
        {usuario.rol === 'administrador' && (
              <button 
                className={styles.btnEditar}
                onClick={(e) => {
                  e.stopPropagation(); // evitar expandir
                  handleAbrirEdicion(grupo);
                }}
              >
              Editar
              </button>
            )}
        {/* Cabecera del grupo (clic para expandir) */}
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

        {/* Detalle expandido */}
        {isExpanded && (
          <div className={styles.grupoDetalle}>
            {cargandoDetalle ? (
              <div className={styles.loadingDetalle}>Cargando detalles...</div>
            ) : (
              <>
                {/* Pestañas de materias */}
                <div className={styles.detalleSeccion}>
                  <h4 className={styles.detalleTitulo}> Materias</h4>
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
                              navigate(`/calificaciones/${m.id}`);
                            }}
                          >
                            Ver calificaciones →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pestaña de alumnos */}
                <div className={styles.detalleSeccion}>
                  <h4 className={styles.detalleTitulo}>‍ Alumnos</h4>
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
        {usuario.rol === 'administrador' && (
          <button className={styles.btnPrimary} onClick={handleAbrirModalCrear}>
            + Crear grupo
          </button>
        )}
      </div>

      {/* Filtros */}
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

      {/* Lista de grupos */}
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
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Crear nuevo grupo</h3>
            {errorGrupo && <div className={styles.errorMsg}>{errorGrupo}</div>}
            <form onSubmit={handleCrearGrupo} className={styles.form}>
              {/* Ciclo */}
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
              {/* Especialidad */}
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
              {/* Turno */}
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
              {/* Semestre */}
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
              {/* Letra */}
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
              {/* Tutor (opcional) */}
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
      {modalEdicionAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalEdicionAbierto(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Editar grupo</h3>
            {errorEdicion && <div className={styles.errorMsg}>{errorEdicion}</div>}
            <form onSubmit={handleEditarGrupo} className={styles.form}>
              {/* Mismos campos que en crear, pero con valores de formEdicion */}
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
    </div>
  );
}