import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportesService, catalogosService, usuariosService, gruposService } from '../services/api';
import { FileText, Download, Printer, Users, BarChart3 } from 'lucide-react';
import styles from './ReportesPage.module.css';

export default function ReportesPage() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Catálogos para filtros
  const [ciclos, setCiclos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);

  // Filtros para listado
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  // Filtros para boleta
  const [alumnoId, setAlumnoId] = useState('');
  const [cicloId, setCicloId] = useState('');

  // Filtros para estadísticas
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

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>Generación y descarga de reportes académicos</p>
        </div>
      </div>

      {/* SECCIÓN 1: BOLETA DE CALIFICACIONES */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><FileText size={18} /> Boleta de calificaciones</h2>
        </div>
        <div className={styles.reportCard}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Alumno *</label>
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
              <label className={styles.label}>Ciclo escolar *</label>
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
          <button
            className={styles.btnPrimary}
            onClick={() => handleDescargar('boleta', { alumno_id: alumnoId, ciclo_id: cicloId }, `boleta_${alumnoId}.pdf`)}
            disabled={!alumnoId || !cicloId || cargando}
          >
            <Download size={16} /> Generar PDF
          </button>
        </div>
      </section>

      {/* SECCIÓN 2: CONSTANCIA DE ESTUDIOS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><FileText size={18} /> Constancia de estudios</h2>
        </div>
        <div className={styles.reportCard}>
          <div className={styles.field}>
            <label className={styles.label}>Alumno *</label>
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
          <button
            className={styles.btnPrimary}
            onClick={() => handleDescargar('constancia', { alumno_id: alumnoId }, `constancia_${alumnoId}.pdf`)}
            disabled={!alumnoId || cargando}
          >
            <Download size={16} /> Generar PDF
          </button>
        </div>
      </section>

      {/* SECCIÓN 3: LISTADO DE ALUMNOS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Users size={18} /> Listado de alumnos</h2>
        </div>
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
            <Download size={16} /> Generar Excel
          </button>
        </div>
      </section>

      {/* SECCIÓN 4: ESTADÍSTICAS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><BarChart3 size={18} /> Estadísticas de rendimiento</h2>
        </div>
        <div className={styles.reportCard}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Ciclo escolar *</label>
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
          <button
            className={styles.btnPrimary}
            onClick={() => {
              const params = { ciclo_id: estadisticasCicloId };
              if (estadisticasGrupoId) params.grupo_id = estadisticasGrupoId;
              handleDescargar('estadisticas', params, `estadisticas.xlsx`);
            }}
            disabled={!estadisticasCicloId || cargando}
          >
            <Download size={16} /> Generar Excel
          </button>
        </div>
      </section>
    </div>
  );
}