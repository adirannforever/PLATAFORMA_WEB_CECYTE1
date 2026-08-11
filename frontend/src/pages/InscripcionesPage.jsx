import { useEffect, useState } from 'react';
import { inscripcionesService, catalogosService } from '../services/api';
import { Users, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './InscripcionesPage.module.css';

export default function InscripcionesPage() {
  const [alumnos, setAlumnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [alumnosEnGrupo, setAlumnosEnGrupo] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [form, setForm] = useState({ alumno_id: '', grupo_id: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoAlumnosGrupo, setCargandoAlumnosGrupo] = useState(false);
  const [cicloActivo, setCicloActivo] = useState(null);

  // Dropdown de alumnos (formulario)
  const [dropdownAlumnosAbierto, setDropdownAlumnosAbierto] = useState(false);
  const [busquedaAlumnos, setBusquedaAlumnos] = useState('');

  // Dropdown de grupos (formulario)
  const [dropdownGruposAbierto, setDropdownGruposAbierto] = useState(false);
  const [busquedaGrupos, setBusquedaGrupos] = useState('');

  // Búsqueda para la lista de grupos (debajo del formulario)
  const [busquedaGrupoLista, setBusquedaGrupoLista] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError('');
      try {
        const cicloRes = await catalogosService.getCicloActivo();
        setCicloActivo(cicloRes.data);

        const [alumnosRes, gruposRes] = await Promise.all([
          inscripcionesService.getAlumnosDisponibles(),
          inscripcionesService.getGruposDisponibles()
        ]);
        setAlumnos(alumnosRes.alumnos || []);
        setGrupos(gruposRes.grupos || []);
      } catch (e) {
        console.error('Error cargando datos:', e);
        let msg = 'No se pudieron cargar los datos. ';
        if (e.response?.data?.message) {
          msg += e.response.data.message;
        } else {
          msg += 'Revisa la conexión con el servidor.';
        }
        setError(msg);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  // Ver alumnos de un grupo
  const verAlumnosDeGrupo = async (grupo) => {
    setGrupoSeleccionado(grupo);
    setCargandoAlumnosGrupo(true);
    setError('');
    try {
      const res = await inscripcionesService.getAlumnosDeGrupo(grupo.id);
      setAlumnosEnGrupo(res.alumnos || []);
      setForm(prev => ({ ...prev, grupo_id: String(grupo.id) }));
    } catch (e) {
      console.error('Error cargando alumnos del grupo:', e);
      let msg = 'No se pudieron cargar los alumnos del grupo. ';
      if (e.response?.data?.message) {
        msg += e.response.data.message;
      } else {
        msg += 'Intenta de nuevo.';
      }
      setError(msg);
      setAlumnosEnGrupo([]);
    } finally {
      setCargandoAlumnosGrupo(false);
    }
  };

  // Inscribir alumno
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!form.alumno_id || !form.grupo_id) {
      setError('Por favor, selecciona un alumno y un grupo.');
      return;
    }

    setEnviando(true);

    try {
      const payload = {
        alumno_id: parseInt(form.alumno_id),
        grupo_id: parseInt(form.grupo_id)
      };
      await inscripcionesService.inscribir(payload);
      setExito('¡Alumno inscrito correctamente!');
      setForm({ alumno_id: '', grupo_id: '' });

      // Recargar alumnos disponibles
      const alumnosRes = await inscripcionesService.getAlumnosDisponibles();
      setAlumnos(alumnosRes.alumnos || []);

      // Actualizar lista de alumnos en el grupo seleccionado
      if (grupoSeleccionado && parseInt(form.grupo_id) === grupoSeleccionado.id) {
        await verAlumnosDeGrupo(grupoSeleccionado);
      }
    } catch (err) {
      console.error('Error al inscribir:', err);
      
      //  EXTRAER MENSAJE DEL BACKEND
      let msg = 'Error al inscribir. ';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      }

      //  SI HAY DOCUMENTOS FALTANTES, MOSTRAR LISTA
      if (err.response?.data?.documentos_faltantes) {
        const docs = err.response.data.documentos_faltantes;
        msg = ` Faltan ${docs.length} documento(s) obligatorio(s):\n\n`;
        msg += docs.map((d, i) => `  ${i+1}. ${d}`).join('\n');
        msg += '\n\nPor favor, entrega los documentos antes de inscribir.';
      }

      //  SI EL ERROR TIENE UN CÓDIGO ESPECÍFICO, AÑADIR MÁS CONTEXTO
      if (err.response?.data?.code) {
        const code = err.response.data.code;
        if (code === 'ALUMNO_YA_INSCRITO') {
          msg = 'Este alumno ya está inscrito en un grupo en el ciclo actual. Debes darlo de baja primero.';
        } else if (code === 'PERIODO_INACTIVO') {
          msg = 'El período de inscripción no está activo. Contacta al administrador.';
        } else if (code === 'DOCUMENTOS_FALTANTES') {
          // Ya lo manejamos arriba
        }
      }

      setError(msg);
    } finally {
      setEnviando(false);
    }
  };

  // Eliminar inscripción (dar de baja)
  const handleEliminar = async (historialId) => {
    if (!confirm('¿Dar de baja a este alumno del grupo?')) return;
    setError('');
    try {
      await inscripcionesService.eliminar(historialId);
      setExito('Alumno dado de baja correctamente.');
      if (grupoSeleccionado) {
        await verAlumnosDeGrupo(grupoSeleccionado);
        const alumnosRes = await inscripcionesService.getAlumnosDisponibles();
        setAlumnos(alumnosRes.alumnos || []);
      }
    } catch (e) {
      let msg = 'Error al eliminar. ';
      if (e.response?.data?.message) {
        msg = e.response.data.message;
      } else {
        msg += 'Intenta de nuevo.';
      }
      setError(msg);
    }
  };

  // Filtrar alumnos para el dropdown
  const alumnosFiltrados = busquedaAlumnos.trim() === ''
    ? alumnos
    : alumnos.filter(a =>
        `${a.apellidos} ${a.nombre}`.toLowerCase().includes(busquedaAlumnos.toLowerCase()) ||
        a.email?.toLowerCase().includes(busquedaAlumnos.toLowerCase()) ||
        a.matricula?.toLowerCase().includes(busquedaAlumnos.toLowerCase())
      );

  // Filtrar grupos para el dropdown
  const gruposFiltradosDropdown = busquedaGrupos.trim() === ''
    ? grupos
    : grupos.filter(g =>
        g.nombre.toLowerCase().includes(busquedaGrupos.toLowerCase()) ||
        g.especialidad.toLowerCase().includes(busquedaGrupos.toLowerCase()) ||
        g.turno.toLowerCase().includes(busquedaGrupos.toLowerCase())
      );

  // Filtrar grupos para la lista
  const gruposFiltradosLista = busquedaGrupoLista.trim() === ''
    ? grupos
    : grupos.filter(g =>
        g.nombre.toLowerCase().includes(busquedaGrupoLista.toLowerCase()) ||
        g.especialidad.toLowerCase().includes(busquedaGrupoLista.toLowerCase()) ||
        g.turno.toLowerCase().includes(busquedaGrupoLista.toLowerCase())
      );

  // Renderizado de carga
  if (cargando) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Inscripciones</h1>
            <p className={styles.subtitle}>Cargando datos...</p>
          </div>
        </div>
        <div className={styles.layout}>
          <div className={styles.formPanel}>
            <Skeleton width="100%" height="40px" variant="text" />
            <Skeleton width="100%" height="40px" variant="text" />
            <Skeleton width="100%" height="44px" variant="text" />
          </div>
          <div className={styles.resultPanel}>
            <Skeleton width="100%" height="200px" variant="text" />
          </div>
        </div>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Inscripciones</h1>
          <p className={styles.subtitle}>
            Ciclo activo: <span className={styles.cicloInfo}>{cicloActivo?.nombre || 'No definido'}</span>
            {' · '}
            {alumnos.length} alumno(s) disponibles · {grupos.length} grupo(s)
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Panel izquierdo — formulario + lista de grupos */}
        <div className={styles.formPanel}>
          <h2 className={styles.panelTitle}>Inscribir alumno</h2>

          {error && (
            <div className={error.includes('Faltan') ? styles.errorMsgDocs : styles.errorMsg}>
              {error.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < error.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          )}
          {exito && <div className={styles.successMsg}>{exito}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/*  DROPDOWN DE ALUMNOS */}
            <div className={styles.field}>
              <label className={styles.label}>Alumno</label>
              <div className={styles.dropdownWrapper}>
                <button
                  type="button"
                  className={styles.dropdownToggle}
                  onClick={() => setDropdownAlumnosAbierto(!dropdownAlumnosAbierto)}
                >
                  <span>
                    {form.alumno_id
                      ? alumnos.find(a => a.id === parseInt(form.alumno_id))?.apellidos + ', ' + alumnos.find(a => a.id === parseInt(form.alumno_id))?.nombre || 'Selecciona un alumno...'
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
                        value={busquedaAlumnos}
                        onChange={(e) => setBusquedaAlumnos(e.target.value)}
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
                            className={`${styles.dropdownItem} ${parseInt(form.alumno_id) === a.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => {
                              setForm({ ...form, alumno_id: String(a.id) });
                              setDropdownAlumnosAbierto(false);
                              setBusquedaAlumnos('');
                            }}
                          >
                            <span className={styles.dropdownItemNombre}>
                              {a.apellidos}, {a.nombre}
                            </span>
                            <span className={styles.dropdownItemInfo}>
                              <span className={styles.email}>{a.email}</span>
                              {a.matricula && <span className={styles.matricula}>{a.matricula}</span>}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {alumnos.length === 0 && (
                <span className={styles.helpText}>No hay alumnos disponibles para inscribir.</span>
              )}
            </div>

            {/*  DROPDOWN DE GRUPOS */}
            <div className={styles.field}>
              <label className={styles.label}>Grupo</label>
              <div className={styles.dropdownWrapper}>
                <button
                  type="button"
                  className={styles.dropdownToggle}
                  onClick={() => setDropdownGruposAbierto(!dropdownGruposAbierto)}
                >
                  <span>
                    {form.grupo_id
                      ? grupos.find(g => g.id === parseInt(form.grupo_id))?.nombre || 'Selecciona un grupo...'
                      : 'Selecciona un grupo...'}
                  </span>
                  {dropdownGruposAbierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {dropdownGruposAbierto && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownSearch}>
                      <Search size={16} className={styles.searchIcon} />
                      <input
                        type="text"
                        placeholder="Buscar grupo..."
                        value={busquedaGrupos}
                        onChange={(e) => setBusquedaGrupos(e.target.value)}
                        className={styles.searchInput}
                        autoFocus
                      />
                    </div>
                    <div className={styles.dropdownList}>
                      {gruposFiltradosDropdown.length === 0 ? (
                        <div className={styles.dropdownEmpty}>No se encontraron grupos</div>
                      ) : (
                        gruposFiltradosDropdown.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            className={`${styles.dropdownItem} ${parseInt(form.grupo_id) === g.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => {
                              setForm({ ...form, grupo_id: String(g.id) });
                              setDropdownGruposAbierto(false);
                              setBusquedaGrupos('');
                            }}
                          >
                            <span className={styles.dropdownItemNombre}>{g.nombre}</span>
                            <span className={styles.dropdownItemInfo}>
                              <span className={styles.especialidad}>{g.especialidad}</span>
                              <span className={styles.turno}>{g.turno}</span>
                            </span>
                            {g.alumnos_actuales > 0 && (
                              <span className={styles.dropdownItemAlumnos}>{g.alumnos_actuales} alumnos</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {grupos.length === 0 && (
                <span className={styles.helpText}>No hay grupos disponibles en el ciclo activo.</span>
              )}
            </div>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={enviando || alumnos.length === 0 || grupos.length === 0}
            >
              {enviando ? 'Inscribiendo...' : 'Inscribir alumno'}
            </button>
          </form>

          {/*  LISTA DE GRUPOS CON BÚSQUEDA Y SCROLL */}
          <div className={styles.gruposSection}>
            <div className={styles.gruposHeader}>
              <h3 className={styles.subTitle}>Ver alumnos por grupo</h3>
              <span className={styles.gruposCount}>{grupos.length} grupos</span>
            </div>

            <div className={styles.gruposSearch}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar grupo..."
                value={busquedaGrupoLista}
                onChange={(e) => setBusquedaGrupoLista(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.gruposListContainer}>
              {gruposFiltradosLista.length === 0 ? (
                <div className={styles.gruposEmpty}>No se encontraron grupos</div>
              ) : (
                <div className={styles.gruposList}>
                  {gruposFiltradosLista.map((g) => (
                    <button
                      key={g.id}
                      className={`${styles.grupoItem} ${grupoSeleccionado?.id === g.id ? styles.grupoItemActive : ''}`}
                      onClick={() => verAlumnosDeGrupo(g)}
                    >
                      <span className={styles.grupoItemNombre}>{g.nombre}</span>
                      <span className={styles.grupoItemInfo}>
                        <span className={styles.especialidad}>{g.especialidad}</span>
                        <span className={styles.turno}>{g.turno}</span>
                      </span>
                      {g.alumnos_actuales > 0 && (
                        <span className={styles.grupoItemAlumnos}>{g.alumnos_actuales} alumnos</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho — alumnos en grupo */}
        <div className={styles.resultPanel}>
          {!grupoSeleccionado ? (
            <div className={styles.placeholder}>
              <Users size={48} strokeWidth={1.5} className={styles.placeholderIcon} />
              <p>Selecciona un grupo de la lista para ver sus alumnos inscritos.</p>
            </div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{grupoSeleccionado.nombre}</h2>
                <button
                  className={styles.btnVolver}
                  onClick={() => { setGrupoSeleccionado(null); setAlumnosEnGrupo([]); setError(''); }}
                >
                  ← Limpiar
                </button>
              </div>
              <p className={styles.panelSubtitle}>
                {cargandoAlumnosGrupo ? 'Cargando...' : `${alumnosEnGrupo.length} alumno(s) inscritos`}
              </p>
              {cargandoAlumnosGrupo ? (
                <div className={styles.alumnosList}>
                  <div className={styles.skeletonRow} />
                  <div className={styles.skeletonRow} />
                  <div className={styles.skeletonRow} />
                </div>
              ) : alumnosEnGrupo.length === 0 ? (
                <div className={styles.emptyResult}>No hay alumnos en este grupo.</div>
              ) : (
                <div className={styles.alumnosList}>
                  {alumnosEnGrupo.map((a) => (
                    <div key={a.alumno_id} className={styles.alumnoRow}>
                      <div className={styles.alumnoInfo}>
                        <div className={styles.alumnoAvatar}>
                          {a.nombre?.charAt(0)}{a.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <div className={styles.alumnoNombre}>{a.apellidos}, {a.nombre}</div>
                          <div className={styles.alumnoEmail}>{a.email} · {a.matricula || 'sin matrícula'}</div>
                        </div>
                      </div>
                      <button
                        className={styles.btnEliminar}
                        onClick={() => handleEliminar(a.historial_id)}
                      >
                        Dar de baja
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}