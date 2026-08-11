import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportesService, catalogosService, usuariosService, gruposService } from '../services/api';
import { FileText, Download, Printer, Users, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
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

  // Filtros listado
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  // Filtros estadísticas
  const [estadisticasCicloId, setEstadisticasCicloId] = useState('');
  const [estadisticasGrupoId, setEstadisticasGrupoId] = useState('');

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
        
        // Seleccionar ciclo activo por defecto
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

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Alumno <span className={styles.required}>*</span></label>
            <select
              className={styles.select}
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
            >
              <option value="">Seleccionar alumno...</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.alumno_id || a.id}>
                  {a.apellidos}, {a.nombre} ({a.matricula || 'sin matrícula'})
                </option>
              ))}
            </select>
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
          <label className={styles.label}>Alumno <span className={styles.required}>*</span></label>
          <select
            className={styles.select}
            value={alumnoId}
            onChange={(e) => setAlumnoId(e.target.value)}
          >
            <option value="">Seleccionar alumno...</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.alumno_id || a.id}>
                {a.apellidos}, {a.nombre} ({a.matricula || 'sin matrícula'})
              </option>
            ))}
          </select>
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

      {/* Tabs */}
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

      {/* Contenido dinámico */}
      <div className={styles.tabContentWrapper}>
        {tabActiva === 'boleta' && renderBoleta()}
        {tabActiva === 'constancia' && renderConstancia()}
        {tabActiva === 'listado' && renderListado()}
        {tabActiva === 'estadisticas' && renderEstadisticas()}
      </div>
    </div>
  );
}