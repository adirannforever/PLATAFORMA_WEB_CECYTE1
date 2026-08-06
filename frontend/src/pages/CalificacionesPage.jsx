import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calificacionesService } from '../services/api';
import Skeleton from '../components/Skeleton'; // Importación del componente Skeleton
import styles from './CalificacionesPage.module.css';

const PARCIALES = [1, 2, 3];
const COLOR_CALIF = (c) => {
  if (c >= 8) return 'var(--color-primary)';
  if (c >= 6) return 'var(--color-warning)';
  return 'var(--color-error)';
};

export default function CalificacionesPage() {
  const { usuario } = useAuth();
  const { materiaId } = useParams(); // solo existe si viene de /calificaciones/:materiaId
  const esAlumno = usuario.rol === 'alumno';

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null); // { id, valor }
  const [registrando, setRegistrando] = useState(null); // { inscripcion_id, parcial }
  const [valorNuevo, setValorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      if (esAlumno) {
        const res = await calificacionesService.misCalificaciones();
        setDatos(res.data.calificaciones);
      } else {
        const res = await calificacionesService.porMateria(materiaId);
        setDatos(res.data.calificaciones);
      }
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [materiaId]);

  // ── Vista alumno — tabla por materia ───────────
  if (esAlumno) {
    // Agrupar por materia
    const porMateria = datos.reduce((acc, c) => {
      const key = c.materia;
      if (!acc[key]) acc[key] = { materia: c.materia, ciclo: c.ciclo_escolar, parciales: {} };
      acc[key].parciales[c.parcial] = c.calificacion;
      return acc;
    }, {});

    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Mis Calificaciones</h1>
          <p className={styles.subtitle}>Ciclo escolar actual</p>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Simulamos 2 tarjetas de materias cargando */}
            {[1, 2].map((n) => (
              <div key={n} className={styles.card}>
                <div className={styles.cardHead}>
                  <Skeleton width="200px" height="22px" variant="text" />
                  <Skeleton width="100px" height="16px" variant="text" />
                </div>
                <div className={styles.parcialesRow}>
                  {[1, 2, 3, 4].map((p) => (
                    <div key={p} className={styles.parcialBox} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Skeleton width="50px" height="12px" variant="text" />
                      <Skeleton width="30px" height="22px" variant="text" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(porMateria).length === 0 ? (
          <div className={styles.empty}>Aún no tienes calificaciones registradas.</div>
        ) : (
          Object.values(porMateria).map((m) => (
            <div key={m.materia} className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{m.materia}</h2>
                <span className={styles.ciclo}>{m.ciclo}</span>
              </div>
              <div className={styles.parcialesRow}>
                {PARCIALES.map((p) => {
                  const cal = m.parciales[p];
                  return (
                    <div key={p} className={styles.parcialBox}>
                      <span className={styles.parcialLabel}>Parcial {p}</span>
                      <span
                        className={styles.parcialValor}
                        style={{ color: cal != null ? COLOR_CALIF(cal) : 'var(--color-gray-400)' }}
                      >
                        {cal != null ? cal : '—'}
                      </span>
                    </div>
                  );
                })}
                {/* Promedio */}
                <div className={styles.parcialBox}>
                  <span className={styles.parcialLabel}>Promedio</span>
                  <span className={styles.parcialValor} style={{ color: 'var(--color-primary)' }}>
                    {Object.values(m.parciales).length > 0
                      ? (Object.values(m.parciales).reduce((a, b) => a + parseFloat(b), 0) / Object.values(m.parciales).length).toFixed(1)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ── Vista docente/admin — tabla editable ───────
  // Agrupa por alumno
  const porAlumno = {};
  datos.forEach((row) => {
    const key = row.alumno_id;
    if (!porAlumno[key]) {
      porAlumno[key] = {
        alumno_id: row.alumno_id,
        nombre: `${row.apellidos}, ${row.nombre}`,
        inscripcion_id: row.inscripcion_id,
        calificaciones: {},
      };
    }
    if (row.parcial) {
      porAlumno[key].calificaciones[row.parcial] = {
        id: row.calificacion_id,
        valor: row.calificacion,
      };
    }
  });

  const handleGuardar = async () => {
    if (valorNuevo === '' || isNaN(parseFloat(valorNuevo))) {
      setError('Ingresa un número válido entre 0 y 10.');
      return;
    }
    const num = parseFloat(valorNuevo);
    if (num < 0 || num > 10) { setError('La calificación debe estar entre 0 y 10.'); return; }
    setError('');
    setGuardando(true);
    try {
      if (editando) {
        await calificacionesService.actualizar(editando.id, num);
      } else if (registrando) {
        await calificacionesService.registrar({
          inscripcion_id: registrando.inscripcion_id,
          parcial: registrando.parcial,
          calificacion: num,
        });
      }
      setEditando(null); setRegistrando(null); setValorNuevo('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Calificaciones</h1>
        <p className={styles.subtitle}>Haz clic en cualquier celda para registrar o editar una calificación</p>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {(editando || registrando) && (
        <div className={styles.inputRow}>
          <span className={styles.inputLabel}>
            {editando ? 'Editar calificación' : `Registrar Parcial ${registrando?.parcial}`}
          </span>
          <input
            className={styles.calInput}
            type="number"
            min="0" max="10" step="0.1"
            value={valorNuevo}
            onChange={(e) => setValorNuevo(e.target.value)}
            autoFocus
            placeholder="Ej: 8.5"
          />
          <button className={styles.btnPrimary} onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button className={styles.btnSecondary} onClick={() => { setEditando(null); setRegistrando(null); setValorNuevo(''); setError(''); }}>
            Cancelar
          </button>
        </div>
      )}

      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                {PARCIALES.map(p => <th key={p} className={styles.th}>Parcial {p}</th>)}
                <th className={styles.th}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {/* Simulamos 4 filas de alumnos cargando */}
              {[1, 2, 3, 4].map((row) => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.tdNombre}>
                    <Skeleton width="180px" height="18px" variant="text" />
                  </td>
                  {PARCIALES.map(p => (
                    <td key={p} className={styles.tdCal}>
                      <Skeleton width="28px" height="20px" variant="text" style={{ margin: '0 auto' }} />
                    </td>
                  ))}
                  <td className={styles.tdCal}>
                    <Skeleton width="28px" height="20px" variant="text" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : Object.keys(porAlumno).length === 0 ? (
        <div className={styles.empty}>No hay alumnos inscritos en esta materia.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                {PARCIALES.map(p => <th key={p} className={styles.th}>Parcial {p}</th>)}
                <th className={styles.th}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(porAlumno).sort((a,b) => a.nombre.localeCompare(b.nombre)).map((a) => {
                const vals = Object.values(a.calificaciones).map(c => parseFloat(c.valor));
                const prom = vals.length > 0 ? (vals.reduce((x,y) => x+y,0)/vals.length).toFixed(1) : null;
                return (
                  <tr key={a.alumno_id} className={styles.tr}>
                    <td className={styles.tdNombre}>{a.nombre}</td>
                    {PARCIALES.map(p => {
                      const cal = a.calificaciones[p];
                      return (
                        <td key={p} className={styles.tdCal}
                          onClick={() => {
                            setError('');
                            if (cal) { setEditando({ id: cal.id }); setRegistrando(null); }
                            else { setRegistrando({ inscripcion_id: a.inscripcion_id, parcial: p }); setEditando(null); }
                            setValorNuevo(cal ? cal.valor : '');
                          }}
                        >
                          <span className={styles.calCell} style={{ color: cal ? COLOR_CALIF(cal.valor) : 'var(--color-gray-300)' }}>
                            {cal ? cal.valor : '+'}
                          </span>
                        </td>
                      );
                    })}
                    <td className={styles.tdCal}>
                      <span style={{ fontWeight: 700, color: prom ? COLOR_CALIF(prom) : 'var(--color-gray-400)' }}>
                        {prom ?? '—'}
                      </span>
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