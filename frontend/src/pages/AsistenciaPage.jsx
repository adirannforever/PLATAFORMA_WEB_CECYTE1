import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { asistenciaService, materiasService, catalogosService, reportesService } from '../services/api';
import Skeleton from '../components/Skeleton';
import { Clock, FileText, Calendar, User, BookOpen, CheckCircle, Download } from 'lucide-react';
import styles from './AsistenciaPage.module.css';

const ESTADOS = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'justificado', label: 'Justificado' },
  { value: 'tardanza', label: 'Tardanza' },
];

export default function AsistenciaPage() {
  const { usuario } = useAuth();
  const { isAdmin, isDocente, isAlumno } = usePermissions();

  // Estados generales
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Estados para admin/docente (registro)
  const [materias, setMaterias] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);

  // Estados para alumno (historial)
  const [historialAsistencias, setHistorialAsistencias] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ===== Cargar materias según rol =====
  useEffect(() => {
    const cargarMaterias = async () => {
      setCargando(true);
      try {
        let res;
        if (isAdmin) {
          res = await materiasService.getAll();
        } else if (isDocente) {
          res = await materiasService.getAll({ docente_id: usuario.id });
        } else {
          setMaterias([]);
          setCargando(false);
          return;
        }
        setMaterias(res.materias || []);
        if (res.materias?.length === 1) {
          setMateriaSeleccionada(String(res.materias[0].id));
        }
      } catch (e) {
        console.error('Error cargando materias:', e);
        setError('No se pudieron cargar las materias.');
      } finally {
        setCargando(false);
      }
    };
    if (isAdmin || isDocente) {
      cargarMaterias();
    } else {
      setCargando(false);
    }
  }, [isAdmin, isDocente, usuario.id]);

  // ===== Cargar asistencias al cambiar materia o fecha (admin/docente) =====
  useEffect(() => {
    if (!materiaSeleccionada || !(isAdmin || isDocente)) return;
    const cargarAsistencias = async () => {
      setCargandoAlumnos(true);
      setError('');
      try {
        const res = await asistenciaService.getAsistenciaClase({
          materia_grupo_id: materiaSeleccionada,
          fecha: fecha,
        });
        const alumnosData = res.data || [];
        setAlumnos(alumnosData);
        const initAsistencias = {};
        alumnosData.forEach((alumno) => {
          initAsistencias[alumno.alumno_id] = {
            estado: alumno.estado || 'ausente',
            justificacion: alumno.justificacion || '',
          };
        });
        setAsistencias(initAsistencias);
      } catch (e) {
        console.error('Error cargando asistencias:', e);
        if (e.response?.status === 404) {
          setError('No hay alumnos asignados a esta materia en el ciclo actual.');
        } else {
          setError('Error al cargar asistencias.');
        }
        setAlumnos([]);
        setAsistencias({});
      } finally {
        setCargandoAlumnos(false);
      }
    };
    cargarAsistencias();
  }, [materiaSeleccionada, fecha, isAdmin, isDocente]);

  // ===== Cargar historial de asistencias para alumno =====
  useEffect(() => {
    if (!isAlumno) return;
    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      setError('');
      try {
        const res = await asistenciaService.getHistorialAlumno();
        setHistorialAsistencias(res.data || []);
      } catch (e) {
        console.error('Error cargando historial:', e);
        setError('No se pudo cargar tu historial de asistencias.');
        setHistorialAsistencias([]);
      } finally {
        setCargandoHistorial(false);
      }
    };
    cargarHistorial();
  }, [isAlumno]);

  // ===== Handlers para admin/docente =====
  const handleEstadoChange = (alumnoId, value) => {
    setAsistencias((prev) => ({
      ...prev,
      [alumnoId]: {
        ...prev[alumnoId],
        estado: value,
      },
    }));
  };

  const handleJustificacionChange = (alumnoId, value) => {
    setAsistencias((prev) => ({
      ...prev,
      [alumnoId]: {
        ...prev[alumnoId],
        justificacion: value,
      },
    }));
  };

  const handleGuardar = async () => {
    const asistenciasArray = alumnos.map((alumno) => {
      const data = asistencias[alumno.alumno_id] || { estado: 'ausente', justificacion: '' };
      return {
        alumno_id: alumno.alumno_id,
        estado: data.estado,
        justificacion: data.justificacion,
      };
    });

    setGuardando(true);
    setError('');
    setExito('');

    try {
      await asistenciaService.guardarAsistenciasLote({
        materia_grupo_id: parseInt(materiaSeleccionada),
        fecha: fecha,
        asistencias: asistenciasArray,
      });
      setExito(' Asistencias guardadas correctamente.');
      // Recargar datos
      const res = await asistenciaService.getAsistenciaClase({
        materia_grupo_id: materiaSeleccionada,
        fecha: fecha,
      });
      const alumnosData = res.data || [];
      setAlumnos(alumnosData);
      const initAsistencias = {};
      alumnosData.forEach((alumno) => {
        initAsistencias[alumno.alumno_id] = {
          estado: alumno.estado || 'ausente',
          justificacion: alumno.justificacion || '',
        };
      });
      setAsistencias(initAsistencias);
      setTimeout(() => setExito(''), 4000);
    } catch (e) {
      console.error('Error guardando asistencias:', e);
      setError(e.response?.data?.message || 'Error al guardar asistencias.');
    } finally {
      setGuardando(false);
    }
  };

  // ===== Exportar a Excel =====
  const exportarExcel = async () => {
    if (!materiaSeleccionada || !fecha) return;
    setExportando(true);
    setError('');
    try {
      const blob = await reportesService.generarExcelAsistencias({
        materia_grupo_id: materiaSeleccionada,
        fecha: fecha,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asistencias_${materiaSeleccionada}_${fecha}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setExito(' Excel exportado correctamente.');
      setTimeout(() => setExito(''), 4000);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      setError(err.response?.data?.message || 'Error al exportar a Excel');
    } finally {
      setExportando(false);
    }
  };

  // ===== ESTADÍSTICAS PARA ALUMNO =====
  const estadisticasAlumno = useMemo(() => {
    const total = historialAsistencias.length;
    const presentes = historialAsistencias.filter(a => a.estado === 'presente').length;
    const ausentes = historialAsistencias.filter(a => a.estado === 'ausente').length;
    const justificados = historialAsistencias.filter(a => a.estado === 'justificado').length;
    const tardanzas = historialAsistencias.filter(a => a.estado === 'tardanza').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { total, presentes, ausentes, justificados, tardanzas, porcentaje };
  }, [historialAsistencias]);

  // ===== VISTA PARA ALUMNOS (historial) =====
  if (isAlumno && !isAdmin && !isDocente) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mi Historial de Asistencias</h1>
            <p className={styles.subtitle}>Consulta tu historial de asistencias</p>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Estadísticas rápidas */}
        <div className={styles.estadisticasContainer}>
          <div className={styles.estadisticaCard}>
            <span className={styles.estadisticaValor}>{estadisticasAlumno.total}</span>
            <span className={styles.estadisticaLabel}>Total clases</span>
          </div>
          <div className={styles.estadisticaCard} style={{ borderColor: '#1A6B35' }}>
            <span className={styles.estadisticaValor} style={{ color: '#1A6B35' }}>{estadisticasAlumno.presentes}</span>
            <span className={styles.estadisticaLabel}>Presentes</span>
          </div>
          <div className={styles.estadisticaCard} style={{ borderColor: '#F37238' }}>
            <span className={styles.estadisticaValor} style={{ color: '#F37238' }}>{estadisticasAlumno.ausentes}</span>
            <span className={styles.estadisticaLabel}>Ausentes</span>
          </div>
          <div className={styles.estadisticaCard} style={{ borderColor: '#2563eb' }}>
            <span className={styles.estadisticaValor} style={{ color: '#2563eb' }}>{estadisticasAlumno.justificados}</span>
            <span className={styles.estadisticaLabel}>Justificados</span>
          </div>
          <div className={styles.estadisticaCard} style={{ borderColor: '#8b5cf6' }}>
            <span className={styles.estadisticaValor} style={{ color: '#8b5cf6' }}>{estadisticasAlumno.tardanzas}</span>
            <span className={styles.estadisticaLabel}>Tardanzas</span>
          </div>
          <div className={styles.estadisticaCard} style={{ borderColor: '#1A6B35' }}>
            <span className={styles.estadisticaValor} style={{ color: '#1A6B35' }}>{estadisticasAlumno.porcentaje}%</span>
            <span className={styles.estadisticaLabel}>Asistencia</span>
          </div>
        </div>

        {/* Tabla de historial */}
        {cargandoHistorial ? (
          <div className={styles.skeletonContainer}>
            <Skeleton width="100%" height="40px" variant="text" />
            {[1,2,3,4,5].map(n => (
              <Skeleton key={n} width="100%" height="30px" variant="text" />
            ))}
          </div>
        ) : historialAsistencias.length === 0 ? (
          <div className={styles.empty}>
            <Calendar size={48} />
            <p>No tienes asistencias registradas.</p>
            <p className={styles.emptySub}>Aún no se ha tomado asistencia en tus clases.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Fecha</th>
                  <th className={styles.th}>Materia</th>
                  <th className={styles.th}>Estado</th>
                  <th className={styles.th}>Justificación</th>
                </tr>
              </thead>
              <tbody>
                {historialAsistencias.map((a) => (
                  <tr key={a.id} className={styles.tr}>
                    <td className={styles.td}>{new Date(a.fecha).toLocaleDateString('es-MX')}</td>
                    <td className={styles.td}>{a.materia_nombre}</td>
                    <td className={styles.td}>
                      <span className={`${styles.estadoBadge} ${styles['estado' + a.estado]}`}>
                        {ESTADOS.find(e => e.value === a.estado)?.label || a.estado}
                      </span>
                    </td>
                    <td className={styles.td}>{a.justificacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ===== VISTA PARA ADMIN Y DOCENTE (registro) =====
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Asistencia por Clase</h1>
          <p className={styles.subtitle}>
            {isAdmin 
              ? 'Administra la asistencia de todas las materias' 
              : 'Registra la asistencia de tus clases'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        <div className={styles.filtroGroup}>
          <label className={styles.label}>Materia</label>
          <select
            className={styles.select}
            value={materiaSeleccionada}
            onChange={(e) => setMateriaSeleccionada(e.target.value)}
            disabled={cargando}
          >
            <option value="">Selecciona una materia...</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} - {m.grupo_nombre} ({m.ciclo_escolar})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filtroGroup}>
          <label className={styles.label}>Fecha</label>
          <input
            type="date"
            className={styles.input}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={cargando}
          />
        </div>

        {materiaSeleccionada && !cargando && (isAdmin || isDocente) && (
          <>
            <button
              className={styles.btnPrimary}
              onClick={handleGuardar}
              disabled={guardando || alumnos.length === 0}
            >
              {guardando ? 'Guardando...' : 'Guardar todo'}
            </button>
            <button
              className={styles.btnExport}
              onClick={exportarExcel}
              disabled={exportando || alumnos.length === 0}
            >
              <Download size={16} /> {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </>
        )}
      </div>

      {(error || exito) && (
        <div className={error ? styles.errorMsg : styles.successMsg}>
          {error || exito}
        </div>
      )}

      {/* Tabla de alumnos */}
      {cargandoAlumnos ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                <th className={styles.th}>Matrícula</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Justificación</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.td}><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="100px" height="32px" variant="text" /></td>
                  <td className={styles.td}><Skeleton width="120px" height="16px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !materiaSeleccionada ? (
        <div className={styles.empty}>
          <BookOpen size={48} />
          <p>Selecciona una materia para comenzar</p>
        </div>
      ) : alumnos.length === 0 ? (
        <div className={styles.empty}>
          <User size={48} />
          <p>No hay alumnos en esta materia para la fecha seleccionada.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                <th className={styles.th}>Matrícula</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Justificación</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => {
                const asist = asistencias[alumno.alumno_id] || { estado: 'ausente', justificacion: '' };
                return (
                  <tr key={alumno.alumno_id} className={styles.tr}>
                    <td className={styles.td}>
                      {alumno.apellidos}, {alumno.nombre}
                    </td>
                    <td className={styles.td}>{alumno.matricula || 'N/A'}</td>
                    <td className={styles.td}>
                      <select
                        className={styles.selectEstado}
                        value={asist.estado}
                        onChange={(e) => handleEstadoChange(alumno.alumno_id, e.target.value)}
                      >
                        {ESTADOS.map((est) => (
                          <option key={est.value} value={est.value}>
                            {est.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <input
                        type="text"
                        className={styles.inputJustificacion}
                        value={asist.justificacion}
                        onChange={(e) => handleJustificacionChange(alumno.alumno_id, e.target.value)}
                        placeholder="Motivo (opcional)"
                        disabled={asist.estado !== 'justificado' && asist.estado !== 'tardanza'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}