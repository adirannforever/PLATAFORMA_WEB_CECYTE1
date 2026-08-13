// frontend/src/pages/MisClasesAsistencias.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { gruposService, asistenciaService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';

export default function MisClasesAsistencias({ grupoId }) {
  const { usuario } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cargar materias del grupo
  useEffect(() => {
    const cargarMaterias = async () => {
      setCargando(true);
      try {
        const res = await gruposService.getMaterias(grupoId);
        setMaterias(res.materias || []);
        if (res.materias?.length > 0) {
          setMateriaSeleccionada(String(res.materias[0].id));
        } else {
          setCargando(false);
        }
      } catch (e) {
        console.error('Error cargando materias:', e);
        setError('No se pudieron cargar las materias.');
        setCargando(false);
      }
    };
    cargarMaterias();
  }, [grupoId]);

  // Cargar asistencias al cambiar materia o fecha
  useEffect(() => {
    if (!materiaSeleccionada) return;
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
        // ✅ Manejo silencioso del 404 (sin mostrar error en consola)
        if (e.response?.status === 404) {
          setAlumnos([]);
          setAsistencias({});
          // No establecemos error, solo mostramos el mensaje de "No hay alumnos"
        } else {
          console.error('Error cargando asistencias:', e);
          setError('Error al cargar asistencias.');
          setAlumnos([]);
          setAsistencias({});
        }
      } finally {
        setCargando(false);
      }
    };
    cargarAsistencias();
  }, [materiaSeleccionada, fecha]);

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
      setTimeout(() => setExito(''), 4000);
    } catch (e) {
      console.error('Error guardando asistencias:', e);
      setError(e.response?.data?.message || 'Error al guardar asistencias.');
    } finally {
      setGuardando(false);
    }
  };

  // Si no hay materias (después de cargar)
  if (materias.length === 0 && !cargando) {
    return (
      <div className={styles.empty}>
        <p>No hay materias asignadas a este grupo.</p>
      </div>
    );
  }

  return (
    <div className={styles.asistenciasContainer}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.filtrosAsistencias}>
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
                {m.materia_nombre}
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

        {materiaSeleccionada && !cargando && (
          <button
            className={styles.btnPrimary}
            onClick={handleGuardar}
            disabled={guardando || alumnos.length === 0}
          >
            {guardando ? 'Guardando...' : 'Guardar todo'}
          </button>
        )}
      </div>

      {cargando ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={styles.skeletonRow}>
              <Skeleton width="150px" height="16px" variant="text" />
              <Skeleton width="100px" height="16px" variant="text" />
              <Skeleton width="100px" height="32px" variant="text" />
              <Skeleton width="120px" height="16px" variant="text" />
            </div>
          ))}
        </div>
      ) : alumnos.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay alumnos en esta materia para la fecha seleccionada.</p>
          <p className={styles.emptySub}>
            {materiaSeleccionada
              ? 'Aún no se ha registrado asistencia para esta clase.'
              : 'Selecciona una materia para ver las asistencias.'}
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Estado</th>
                <th>Justificación</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => {
                const asist = asistencias[alumno.alumno_id] || { estado: 'ausente', justificacion: '' };
                return (
                  <tr key={alumno.alumno_id}>
                    <td>{alumno.apellidos}, {alumno.nombre}</td>
                    <td>{alumno.matricula || 'N/A'}</td>
                    <td>
                      <select
                        className={styles.selectEstado}
                        value={asist.estado}
                        onChange={(e) => handleEstadoChange(alumno.alumno_id, e.target.value)}
                      >
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                        <option value="justificado">Justificado</option>
                        <option value="tardanza">Tardanza</option>
                      </select>
                    </td>
                    <td>
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