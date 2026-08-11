import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportesService, catalogosService, usuariosService, gruposService } from '../services/api';
import { FileText, Download, Users, BarChart3, CheckCircle, Search, X } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './ReportesPage.module.css';

export default function ReportesPage() {
  const { usuario } = useAuth();
  const [tabActiva, setTabActiva] = useState('boleta');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Catálogos
  const [ciclos, setCiclos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);

  // Filtros comunes
  const [alumnoId, setAlumnoId] = useState('');
  const [cicloId, setCicloId] = useState('');

  // Búsqueda de alumnos para boleta/constancia
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [filtroGrupoAlumno, setFiltroGrupoAlumno] = useState('');
  const [filtroEspecialidadAlumno, setFiltroEspecialidadAlumno] = useState('');
  const [filtroSemestreAlumno, setFiltroSemestreAlumno] = useState('');
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);

  // Filtros listado
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  // Filtros estadísticas
  const [estadisticasCicloId, setEstadisticasCicloId] = useState('');
  const [estadisticasGrupoId, setEstadisticasGrupoId] = useState('');

  // Memo: letras únicas de grupos
  const letrasUnicas = useMemo(() => {
    const letras = grupos.map(g => g.letra).filter(Boolean);
    return [...new Set(letras)].sort();
  }, [grupos]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [ciclosRes, gruposRes, espRes, alumnosRes] = await Promise.all([
          catalogosService.getCiclos(),
          gruposService.getAll(),
          catalogosService.getEspecialidades(),
          usuariosService.getAll({ rol: 'alumno' }),
        ]);
        setCiclos(ciclosRes.data || []);
        setGrupos(gruposRes.data || []);
        setEspecialidades(espRes.data || []);
        setAlumnos(alumnosRes.usuarios || []);
        
        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo) {
          setCicloId(String(activo.id));
          setEstadisticasCicloId(String(activo.id));
        }
      } catch (e) {
        console.error('Error cargando catálogos:', e);
      }
    };
    cargarCatalogos();
  }, []);

  // Buscar alumnos con filtros (para boleta/constancia)
  const buscarAlumnos = useCallback(async () => {
    setBuscandoAlumnos(true);
    try {
      const params = { rol: 'alumno' };
      if (busquedaAlumno) params.search = busquedaAlumno;
      if (filtroGrupoAlumno) params.grupo_letra = filtroGrupoAlumno;
      if (filtroEspecialidadAlumno) params.especialidad_id = filtroEspecialidadAlumno;
      if (filtroSemestreAlumno) params.semestre = filtroSemestreAlumno;
      const res = await usuariosService.getAll(params);
      setAlumnosFiltrados(res.usuarios || []);
    } catch (e) {
      console.error('Error buscando alumnos:', e);
    } finally {
      setBuscandoAlumnos(false);
    }
  }, [busquedaAlumno, filtroGrupoAlumno, filtroEspecialidadAlumno, filtroSemestreAlumno]);

  // Debounce para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      if (busquedaAlumno || filtroGrupoAlumno || filtroEspecialidadAlumno || filtroSemestreAlumno) {
        buscarAlumnos();
      } else {
        setAlumnosFiltrados([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [busquedaAlumno, filtroGrupoAlumno, filtroEspecialidadAlumno, filtroSemestreAlumno, buscarAlumnos]);

  const seleccionarAlumno = (alumno) => {
    setAlumnoId(String(alumno.alumno_id || alumno.id));
    setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombre} (${alumno.matricula || 'sin matrícula'})`);
    setAlumnosFiltrados([]);
  };

  const handleDescargar = async (tipo, params, filename) => {
    setCargando(true);
    setError('');
    try {
      let blob;
      switch (tipo) {
        case 'boleta':
          blob = await reportesService.generarBoleta(params);
          break;
        case 'constancia':
          blob = await reportesService.generarConstancia(params);
          break;
        case 'listado':
          blob = await reportesService.generarListadoAlumnos(params);
          break;
        case 'estadisticas':
          blob = await reportesService.generarEstadisticas(params);
          break;
        default:
          throw new Error('Tipo de reporte inválido');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setExito('Reporte descargado correctamente');
      setTimeout(() => setExito(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  };

  const limpiarBusquedaAlumno = () => {
    setBusquedaAlumno('');
    setAlumnoId('');
    setFiltroGrupoAlumno('');
    setFiltroEspecialidadAlumno('');
    setFiltroSemestreAlumno('');
    setAlumnosFiltrados([]);
  };

  const tabs = [
    { id: 'boleta', label: 'Boleta', icon: <FileText size={16} /> },
    { id: 'constancia', label: 'Constancia', icon: <FileText size={16} /> },
    { id: 'listado', label: 'Listado de alumnos', icon: <Users size={16} /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: <BarChart3 size={16} /> },
  ];

  const renderBoleta = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        <div className={styles.field}>
          <label className={styles.label}>Buscar alumno <span className={styles.required}>*</span></label>
          <div className={styles.alumnoSearchContainer}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.inputSearch}
                placeholder="Buscar por nombre, apellido o matrícula..."
                value={busquedaAlumno}
                onChange={(e) => setBusquedaAlumno(e.target.value)}
              />
              {busquedaAlumno && (
                <button className={styles.clearBtn} onClick={limpiarBusquedaAlumno}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className={styles.filtrosAlumno}>
              <select
                className={styles.selectSmall}
                value={filtroGrupoAlumno}
                onChange={(e) => setFiltroGrupoAlumno(e.target.value)}
              >
                <option value="">Todos los grupos</option>
                {letrasUnicas.map((letra) => (
                  <option key={letra} value={letra}>Grupo {letra}</option>
                ))}
              </select>
              <select
                className={styles.selectSmall}
                value={filtroEspecialidadAlumno}
                onChange={(e) => setFiltroEspecialidadAlumno(e.target.value)}
              >
                <option value="">Todas las especialidades</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              <select
                className={styles.selectSmall}
                value={filtroSemestreAlumno}
                onChange={(e) => setFiltroSemestreAlumno(e.target.value)}
              >
                <option value="">Todos los semestres</option>
                {[1,2,3,4,5,6].map((s) => (
                  <option key={s} value={s}>{s}°</option>
                ))}
              </select>
              <button
                className={styles.btnBuscar}
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
                    <span><strong>{a.apellidos}, {a.nombre}</strong></span>
                    <span className={styles.resultadoDetalle}>
                      {a.matricula || 'sin matrícula'} • {a.semestre ? `${a.semestre}°` : '—'} • Grupo {a.grupo_letra || '—'} • {a.especialidad_nombre || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {alumnoId && busquedaAlumno && (
              <div className={styles.alumnoSeleccionado}>
                <span>Alumno seleccionado: <strong>{busquedaAlumno}</strong></span>
                <button className={styles.btnQuitar} onClick={limpiarBusquedaAlumno}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Ciclo escolar <span className={styles.required}>*</span></label>
          <select
            className={styles.select}
            value={cicloId}
            onChange={(e) => setCicloId(e.target.value)}
          >
            <option value="">Seleccionar ciclo...</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.activo ? '(Activo)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => handleDescargar('boleta', { alumno_id: alumnoId, ciclo_id: cicloId }, `boleta_${alumnoId}.pdf`)}
            disabled={!alumnoId || !cicloId || cargando}
          >
            <Download size={16} /> {cargando ? 'Generando...' : 'Generar PDF'}
          </button>
          {alumnoId && cicloId && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Listo para generar
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderConstancia = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        <div className={styles.field}>
          <label className={styles.label}>Buscar alumno <span className={styles.required}>*</span></label>
          <div className={styles.alumnoSearchContainer}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.inputSearch}
                placeholder="Buscar por nombre, apellido o matrícula..."
                value={busquedaAlumno}
                onChange={(e) => setBusquedaAlumno(e.target.value)}
              />
              {busquedaAlumno && (
                <button className={styles.clearBtn} onClick={limpiarBusquedaAlumno}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className={styles.filtrosAlumno}>
              <select
                className={styles.selectSmall}
                value={filtroGrupoAlumno}
                onChange={(e) => setFiltroGrupoAlumno(e.target.value)}
              >
                <option value="">Todos los grupos</option>
                {letrasUnicas.map((letra) => (
                  <option key={letra} value={letra}>Grupo {letra}</option>
                ))}
              </select>
              <select
                className={styles.selectSmall}
                value={filtroEspecialidadAlumno}
                onChange={(e) => setFiltroEspecialidadAlumno(e.target.value)}
              >
                <option value="">Todas las especialidades</option>
                {especialidades.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              <select
                className={styles.selectSmall}
                value={filtroSemestreAlumno}
                onChange={(e) => setFiltroSemestreAlumno(e.target.value)}
              >
                <option value="">Todos los semestres</option>
                {[1,2,3,4,5,6].map((s) => (
                  <option key={s} value={s}>{s}°</option>
                ))}
              </select>
              <button
                className={styles.btnBuscar}
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
                    <span><strong>{a.apellidos}, {a.nombre}</strong></span>
                    <span className={styles.resultadoDetalle}>
                      {a.matricula || 'sin matrícula'} • {a.semestre ? `${a.semestre}°` : '—'} • Grupo {a.grupo_letra || '—'} • {a.especialidad_nombre || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {alumnoId && busquedaAlumno && (
              <div className={styles.alumnoSeleccionado}>
                <span>Alumno seleccionado: <strong>{busquedaAlumno}</strong></span>
                <button className={styles.btnQuitar} onClick={limpiarBusquedaAlumno}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => handleDescargar('constancia', { alumno_id: alumnoId }, `constancia_${alumnoId}.pdf`)}
            disabled={!alumnoId || cargando}
          >
            <Download size={16} /> {cargando ? 'Generando...' : 'Generar PDF'}
          </button>
          {alumnoId && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Listo para generar
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderListado = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        <div className={styles.filtrosGrid}>
          <div className={styles.field}>
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
          <div className={styles.field}>
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
          <div className={styles.field}>
            <label className={styles.label}>Semestre</label>
            <select
              className={styles.select}
              value={filtroSemestre}
              onChange={(e) => setFiltroSemestre(e.target.value)}
            >
              <option value="">Todos</option>
              {[1,2,3,4,5,6].map((s) => (
                <option key={s} value={s}>{s}°</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Estatus</label>
            <select
              className={styles.select}
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="baja_temporal">Baja temporal</option>
              <option value="baja_definitiva">Baja definitiva</option>
              <option value="egresado">Egresado</option>
              <option value="irregular">Irregular</option>
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const params = {};
              if (filtroGrupo) params.grupo_id = filtroGrupo;
              if (filtroEspecialidad) params.especialidad_id = filtroEspecialidad;
              if (filtroSemestre) params.semestre = filtroSemestre;
              if (filtroEstatus) params.estatus = filtroEstatus;
              handleDescargar('listado', params, `listado_alumnos.xlsx`);
            }}
            disabled={cargando}
          >
            <Download size={16} /> {cargando ? 'Generando...' : 'Generar Excel'}
          </button>
          {(filtroGrupo || filtroEspecialidad || filtroSemestre || filtroEstatus) && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Filtros aplicados
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderEstadisticas = () => (
    <div className={styles.tabContent}>
      <div className={styles.reportCard}>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Ciclo escolar <span className={styles.required}>*</span></label>
            <select
              className={styles.select}
              value={estadisticasCicloId}
              onChange={(e) => setEstadisticasCicloId(e.target.value)}
            >
              <option value="">Seleccionar ciclo...</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.activo ? '(Activo)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Grupo (opcional)</label>
            <select
              className={styles.select}
              value={estadisticasGrupoId}
              onChange={(e) => setEstadisticasGrupoId(e.target.value)}
            >
              <option value="">Todos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const params = { ciclo_id: estadisticasCicloId };
              if (estadisticasGrupoId) params.grupo_id = estadisticasGrupoId;
              handleDescargar('estadisticas', params, `estadisticas.xlsx`);
            }}
            disabled={!estadisticasCicloId || cargando}
          >
            <Download size={16} /> {cargando ? 'Generando...' : 'Generar Excel'}
          </button>
          {estadisticasCicloId && (
            <span className={styles.helpText}>
              <CheckCircle size={14} /> Listo para generar
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>Selecciona el tipo de reporte y los filtros para generarlo</p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${tabActiva === tab.id ? styles.tabActive : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContentWrapper}>
        {tabActiva === 'boleta' && renderBoleta()}
        {tabActiva === 'constancia' && renderConstancia()}
        {tabActiva === 'listado' && renderListado()}
        {tabActiva === 'estadisticas' && renderEstadisticas()}
      </div>
    </div>
  );
}