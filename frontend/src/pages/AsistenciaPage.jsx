import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { asistenciaService, catalogosService, materiasService } from '../services/api';
import Skeleton from '../components/Skeleton';
import { Clock, FileText } from 'lucide-react'; // ← AGREGADO
import styles from './AsistenciaPage.module.css';

const ESTADOS = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'justificado', label: 'Justificado' },
];

export default function AsistenciaPage() {
  const { usuario } = useAuth();
  const { isAdmin, isDocente, isAlumno } = usePermissions();

  const [materias, setMaterias] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // ===== Cargar materias según rol =====
  useEffect(() => {
    const cargarMaterias = async () => {
      setCargando(true);
      try {
        let res;
        if (isAdmin || isDocente) {
          res = await materiasService.getAll();
          setMaterias(res.materias || []);
        } else {
          setMaterias([]);
        }
      } catch (e) {
        console.error('Error cargando materias:', e);
        setError('No se pudieron cargar las materias.');
      } finally {
        setCargando(false);
      }
    };
    if (isAdmin || isDocente) cargarMaterias();
    else setCargando(false);
  }, [isAdmin, isDocente]);

  // ===== Cargar asistencias al cambiar materia o fecha =====
  useEffect(() => {
    if (!materiaSeleccionada || !(isAdmin || isDocente)) return;
    const cargarAsistencias = async () => {
      setCargando(true);
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
        setCargando(false);
      }
    };
    cargarAsistencias();
  }, [materiaSeleccionada, fecha, isAdmin, isDocente]);

  // ===== Handlers =====
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

  // ===== VISTA PARA ALUMNOS (solo consulta) =====
  if (isAlumno && !isAdmin && !isDocente) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mis Asistencias</h1>
            <p className={styles.subtitle}>Consulta tu historial de asistencias</p>
          </div>
        </div>
        <div className={styles.horarioInfoCard}>
          <div className={styles.horarioInfoIcon}>
            <Clock size={48} />
          </div>
          <div className={styles.horarioInfoContent}>
            <h2>Tu historial de asistencias está disponible</h2>
            <p>Puedes consultar tu historial de asistencias desde el módulo de Reportes o desde tu perfil.</p>
            <div className={styles.horarioInfoActions}>
              <button 
                className={styles.btnPrimary}
                onClick={() => window.location.href = '/reportes'}
              >
                <FileText size={16} /> Ir a Reportes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== VISTA PARA ADMIN Y DOCENTE =====
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
          <button
            className={styles.btnPrimary}
            onClick={handleGuardar}
            disabled={guardando || alumnos.length === 0}
          >
            {guardando ? 'Guardando...' : 'Guardar todo'}
          </button>
        )}
      </div>

      {(error || exito) && (
        <div className={error ? styles.errorMsg : styles.successMsg}>
          {error || exito}
        </div>
      )}

      {/* Tabla de alumnos */}
      {cargando ? (
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
      ) : alumnos.length === 0 ? (
        <div className={styles.empty}>
          {materiaSeleccionada
            ? 'No hay alumnos en esta materia para la fecha seleccionada.'
            : 'Selecciona una materia para comenzar.'}
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
                        disabled={asist.estado !== 'justificado'}
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