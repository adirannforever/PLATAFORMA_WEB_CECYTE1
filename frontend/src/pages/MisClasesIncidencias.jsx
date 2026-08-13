// frontend/src/pages/MisClasesIncidencias.jsx
import { useEffect, useState, useCallback } from 'react';
import { gruposService, incidenciasService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';

export default function MisClasesIncidencias({ grupoId }) {
  const [incidencias, setIncidencias] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [alumnosIds, setAlumnosIds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    alumno_id: '',
    tipo: '',
    subtipo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [enviando, setEnviando] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [alumnosFiltrados, setAlumnosFiltrados] = useState([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);

  // Función para cargar datos
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      // Obtener alumnos del grupo
      const alumnosRes = await gruposService.getAlumnos(grupoId);
      const alumnosData = alumnosRes.alumnos || [];
      setAlumnos(alumnosData);
      const ids = alumnosData.map(a => a.alumno_id || a.id);
      setAlumnosIds(ids);

      // Obtener todas las incidencias (sin filtro de grupo_letra)
      const incidenciasRes = await incidenciasService.getAll();
      const todasIncidencias = incidenciasRes.data || [];

      // Filtrar incidencias por alumnos del grupo actual
      const incidenciasFiltradas = todasIncidencias.filter(inc => ids.includes(inc.alumno_id));
      setIncidencias(incidenciasFiltradas);
    } catch (e) {
      console.error('Error cargando datos:', e);
      setError('No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, [grupoId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Búsqueda de alumnos en modal
  const buscarAlumnos = useCallback(async () => {
    if (!busquedaAlumno.trim()) {
      setAlumnosFiltrados([]);
      return;
    }
    setBuscandoAlumnos(true);
    try {
      const filtered = alumnos.filter(a =>
        a.nombre.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
        a.apellidos.toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
        (a.matricula && a.matricula.includes(busquedaAlumno))
      );
      setAlumnosFiltrados(filtered);
    } catch (e) {
      console.error('Error buscando alumnos:', e);
    } finally {
      setBuscandoAlumnos(false);
    }
  }, [busquedaAlumno, alumnos]);

  useEffect(() => {
    const handler = setTimeout(buscarAlumnos, 300);
    return () => clearTimeout(handler);
  }, [busquedaAlumno, buscarAlumnos]);

  const seleccionarAlumno = (alumno) => {
    setForm({ ...form, alumno_id: String(alumno.alumno_id || alumno.id) });
    setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombre} (${alumno.matricula || 'sin matrícula'})`);
    setAlumnosFiltrados([]);
  };

  const handleAbrirCrear = () => {
    setForm({
      alumno_id: '',
      tipo: '',
      subtipo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setBusquedaAlumno('');
    setAlumnosFiltrados([]);
    setModalAbierto(true);
    setError('');
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.alumno_id || !form.tipo || !form.descripcion) {
      setError('Alumno, tipo y descripción son obligatorios');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await incidenciasService.crear({
        alumno_id: parseInt(form.alumno_id),
        tipo: form.tipo,
        subtipo: form.subtipo || null,
        descripcion: form.descripcion,
        fecha: form.fecha,
      });
      setExito('Incidencia creada correctamente');
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
      // Recargar datos para actualizar la lista
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  };

  const handleResolver = async (id) => {
    const resolucion = prompt('Describe la resolución:');
    if (!resolucion) return;
    try {
      await incidenciasService.resolver(id, resolucion);
      setExito('Incidencia resuelta correctamente');
      setTimeout(() => setExito(''), 4000);
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resolver');
    }
  };

  if (cargando) {
    return (
      <div className={styles.skeletonContainer}>
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.skeletonRow}>
            <Skeleton width="150px" height="16px" variant="text" />
            <Skeleton width="100px" height="16px" variant="text" />
            <Skeleton width="80px" height="16px" variant="text" />
            <Skeleton width="80px" height="16px" variant="text" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.incidenciasContainer}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.headerAcciones}>
        <button className={styles.btnPrimary} onClick={handleAbrirCrear}>
          + Nueva incidencia
        </button>
      </div>

      {incidencias.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay incidencias registradas para este grupo.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Tipo</th>
                <th>Subtipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incidencias.map((i) => (
                <tr key={i.id}>
                  <td>{i.alumno_apellidos}, {i.alumno_nombre}</td>
                  <td>{i.matricula || '—'}</td>
                  <td>{i.tipo}</td>
                  <td>{i.subtipo || '—'}</td>
                  <td>{i.descripcion}</td>
                  <td>{new Date(i.fecha).toLocaleDateString('es-MX')}</td>
                  <td>
                    <span className={i.resuelta ? styles.estadoResuelto : styles.estadoPendiente}>
                      {i.resuelta ? 'Resuelta' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    {!i.resuelta && (
                      <button className={styles.btnResolver} onClick={() => handleResolver(i.id)}>
                        Resolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nueva incidencia</h3>
              <button className={styles.modalClose} onClick={() => setModalAbierto(false)}>×</button>
            </div>
            <form onSubmit={handleGuardar} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Alumno *</label>
                <div className={styles.alumnoSearch}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Buscar alumno..."
                    value={busquedaAlumno}
                    onChange={(e) => setBusquedaAlumno(e.target.value)}
                  />
                  {alumnosFiltrados.length > 0 && (
                    <div className={styles.resultadosAlumnos}>
                      {alumnosFiltrados.map((a) => (
                        <div key={a.id} className={styles.resultadoAlumno} onClick={() => seleccionarAlumno(a)}>
                          <span>{a.apellidos}, {a.nombre}</span>
                          <span className={styles.resultadoDetalle}>{a.matricula || 'sin matrícula'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.alumno_id && busquedaAlumno && (
                    <div className={styles.alumnoSeleccionado}>
                      <span>Alumno: <strong>{busquedaAlumno}</strong></span>
                      <button
                        type="button"
                        className={styles.btnQuitar}
                        onClick={() => { setForm({ ...form, alumno_id: '' }); setBusquedaAlumno(''); }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Tipo *</label>
                  <select
                    className={styles.select}
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value, subtipo: '' })}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="conducta">Conducta</option>
                    <option value="academica">Académica</option>
                    <option value="asistencia">Asistencia</option>
                    <option value="citatorio_tutor">Citatorio a tutor</option>
                    <option value="felicitacion">Felicitación</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Subtipo</label>
                  <select
                    className={styles.select}
                    value={form.subtipo}
                    onChange={(e) => setForm({ ...form, subtipo: e.target.value })}
                    disabled={!form.tipo}
                  >
                    <option value="">Sin subtipo</option>
                    {form.tipo === 'conducta' && (
                      <>
                        <option>Falta de respeto</option>
                        <option>Agresividad</option>
                        <option>Incumplimiento de normas</option>
                      </>
                    )}
                    {form.tipo === 'academica' && (
                      <>
                        <option>Bajo rendimiento</option>
                        <option>Faltas de entrega de trabajos</option>
                        <option>Plagio</option>
                      </>
                    )}
                    {form.tipo === 'asistencia' && (
                      <>
                        <option>Faltas injustificadas</option>
                        <option>Retardos</option>
                      </>
                    )}
                    {form.tipo === 'citatorio_tutor' && (
                      <>
                        <option>Por bajo rendimiento</option>
                        <option>Por conducta</option>
                      </>
                    )}
                    {form.tipo === 'felicitacion' && (
                      <>
                        <option>Excelente rendimiento</option>
                        <option>Participación destacada</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Fecha</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Descripción *</label>
                <textarea
                  className={styles.textarea}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}