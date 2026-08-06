// src/pages/InscripcionesPage.jsx
import { useEffect, useState } from 'react';
import { inscripcionesService, usuariosService, materiasService } from '../services/api';
import styles from './InscripcionesPage.module.css';

export default function InscripcionesPage() {
  const [alumnos, setAlumnos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [form, setForm] = useState({ alumno_id: '', materia_id: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [alumnosMateria, setAlumnosMateria] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [a, m] = await Promise.all([
          usuariosService.getAll('alumno'),
          materiasService.getAll(),
        ]);
        setAlumnos(a.data.usuarios.filter(u => u.activo));
        setMaterias(m.data.materias.filter(m => m.activa));
      } catch (e) { console.error(e); }
      finally { setCargandoInicial(false); }
    };
    cargar();
  }, []);

  const verAlumnosMateria = async (materia) => {
    setMateriaSeleccionada(materia);
    setCargandoAlumnos(true);
    try {
      const res = await materiasService.getAlumnos(materia.id);
      setAlumnosMateria(res.data.alumnos);
    } catch (e) { console.error(e); }
    finally { setCargandoAlumnos(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setExito('');
    setEnviando(true);
    try {
      await inscripcionesService.inscribir({
        alumno_id: parseInt(form.alumno_id),
        materia_id: parseInt(form.materia_id),
      });
      setExito('Alumno inscrito correctamente.');
      setForm({ alumno_id: '', materia_id: '' });
      if (materiaSeleccionada && parseInt(form.materia_id) === materiaSeleccionada.id) {
        await verAlumnosMateria(materiaSeleccionada);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al inscribir.');
    } finally { setEnviando(false); }
  };

  const handleEliminar = async (inscripcionId) => {
    if (!confirm('¿Eliminar esta inscripción? También se borrarán sus calificaciones.')) return;
    try {
      await inscripcionesService.eliminar(inscripcionId);
      if (materiaSeleccionada) await verAlumnosMateria(materiaSeleccionada);
    } catch (e) { alert(e.response?.data?.message || 'Error.'); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Inscripciones</h1>
        <p className={styles.subtitle}>Gestiona qué alumnos están en qué materias</p>
      </div>

      <div className={styles.layout}>
        {/* Panel izquierdo — formulario */}
        <div className={styles.formPanel}>
          <h2 className={styles.panelTitle}>Inscribir alumno</h2>
          {error && <div className={styles.errorMsg}>{error}</div>}
          {exito && <div className={styles.successMsg}>{exito}</div>}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Alumno</label>
              <select className={styles.select} value={form.alumno_id} onChange={e => setForm({...form, alumno_id: e.target.value})} required disabled={cargandoInicial}>
                <option value="">{cargandoInicial ? 'Cargando alumnos...' : 'Selecciona un alumno...'}</option>
                {alumnos.map(a => (
                  <option key={a.id} value={a.id}>{a.apellidos}, {a.nombre}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Materia</label>
              <select className={styles.select} value={form.materia_id} onChange={e => setForm({...form, materia_id: e.target.value})} required disabled={cargandoInicial}>
                <option value="">{cargandoInicial ? 'Cargando materias...' : 'Selecciona una materia...'}</option>
                {materias.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.ciclo_escolar})</option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={enviando || cargandoInicial}>
              {enviando ? 'Inscribiendo...' : 'Inscribir alumno'}
            </button>
          </form>

          {/* Lista de materias para consultar */}
          <div className={styles.materiasListContainer}>
            <h3 className={styles.subTitle}>Ver alumnos por materia</h3>
            {cargandoInicial ? (
              <div className={styles.materiasList}>
                <div className={styles.skeletonButton} />
                <div className={styles.skeletonButton} />
                <div className={styles.skeletonButton} />
              </div>
            ) : (
              <div className={styles.materiasList}>
                {materias.map(m => (
                  <button
                    key={m.id}
                    className={`${styles.materiaBtn} ${materiaSeleccionada?.id === m.id ? styles.materiaBtnActive : ''}`}
                    onClick={() => verAlumnosMateria(m)}
                  >
                    {m.nombre}
                    <span className={styles.materiaInfo}>{m.ciclo_escolar}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho — alumnos en materia seleccionada */}
        <div className={styles.resultPanel}>
          {!materiaSeleccionada ? (
            <div className={styles.placeholder}>
              Selecciona una materia para ver sus alumnos inscritos.
            </div>
          ) : (
            <>
              <h2 className={styles.panelTitle}>{materiaSeleccionada.nombre}</h2>
              <p className={styles.panelSubtitle}>
                {cargandoAlumnos ? 'Actualizando...' : `${alumnosMateria.length} alumno(s) inscritos`}
              </p>
              {cargandoAlumnos ? (
                <div className={styles.alumnosList}>
                  <div className={styles.skeletonRow} />
                  <div className={styles.skeletonRow} />
                  <div className={styles.skeletonRow} />
                </div>
              ) : alumnosMateria.length === 0 ? (
                <div className={styles.emptyResult}>Sin alumnos inscritos en esta materia.</div>
              ) : (
                <div className={styles.alumnosList}>
                  {alumnosMateria.map(a => (
                    <div key={a.inscripcion_id} className={styles.alumnoRow}>
                      <div className={styles.alumnoInfo}>
                        <div className={styles.alumnoAvatar}>{a.nombre?.charAt(0)}{a.apellidos?.charAt(0)}</div>
                        <div>
                          <div className={styles.alumnoNombre}>{a.apellidos}, {a.nombre}</div>
                          <div className={styles.alumnoEmail}>{a.email}</div>
                        </div>
                      </div>
                      <button className={styles.btnEliminar} onClick={() => handleEliminar(a.inscripcion_id)}>
                        Eliminar
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