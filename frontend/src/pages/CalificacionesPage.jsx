import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calificacionesService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './CalificacionesPage.module.css';

// Iconos SVG (lápiz y guardar)
const IconPencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const PARCIALES = [1, 2, 3];
const COLOR_CALIF = (c) => {
  if (c >= 8) return '#1A6B35';
  if (c >= 6) return '#F37238';
  return '#b91c1c';
};

const validarCalificacion = (valor) => {
  const trimmed = valor.trim();
  if (trimmed === '') return { valido: false, mensaje: 'Ingresa un valor.' };
  if (!/^-?\d*\.?\d*$/.test(trimmed)) {
    return { valido: false, mensaje: 'Solo se permiten números (ej: 8.5).' };
  }
  const num = parseFloat(trimmed);
  if (isNaN(num)) return { valido: false, mensaje: 'Ingresa un número válido.' };
  if (num < 0) return { valido: false, mensaje: 'La calificación no puede ser negativa.' };
  if (num > 10) return { valido: false, mensaje: 'La calificación no puede superar 10.' };
  return { valido: true, valor: num };
};

export default function CalificacionesPage() {
  const { usuario } = useAuth();
  const { materia_grupo_id } = useParams();
  const navigate = useNavigate();
  const esAlumno = usuario.rol === 'alumno';
  const esAdmin = usuario.rol === 'administrador';

  const [datos, setDatos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [toast, setToast] = useState('');

  // Edición individual
  const [editando, setEditando] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [valorNuevo, setValorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [inputError, setInputError] = useState('');

  // Edición por columna
  const [modoColumna, setModoColumna] = useState(false);
  const [parcialSeleccionado, setParcialSeleccionado] = useState(null);
  const [calificacionesTemp, setCalificacionesTemp] = useState({});
  const [guardandoColumna, setGuardandoColumna] = useState(false);
  const [camposVacios, setCamposVacios] = useState({});

  const cargar = async () => {
    setCargando(true);
    try {
      if (esAlumno) {
        const res = await calificacionesService.misCalificaciones();
        setDatos(res.calificaciones || []);
      } else {
        const res = await calificacionesService.porMateria(materia_grupo_id);
        setDatos(res.calificaciones || []);
      }
    } catch (e) {
      console.error('Error cargando calificaciones:', e);
      setDatos([]);
    } finally {
      setCargando(false);
    }
  };

  const cargarPeriodos = async () => {
    if (esAlumno || !materia_grupo_id) return;
    try {
      const res = await calificacionesService.getPeriodosEvaluacion(materia_grupo_id);
      setPeriodos(res.periodos || []);
    } catch (e) {
      console.error('Error cargando períodos:', e);
      setPeriodos([]);
    }
  };

  useEffect(() => {
    if (!esAlumno && !materia_grupo_id) {
      navigate(-1);
      return;
    }
    cargar();
    cargarPeriodos();
  }, [materia_grupo_id]);

  const isParcialEditable = (parcial) => {
    if (esAlumno) return false;
    if (esAdmin) return true;
    const periodo = periodos.find(p => p.parcial === parcial);
    if (!periodo) return false;
    const hoy = new Date();
    const inicio = new Date(periodo.fecha_inicio);
    const fin = new Date(periodo.fecha_fin);
    hoy.setHours(0, 0, 0, 0);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return hoy >= inicio && hoy <= fin;
  };

  const handleVolver = () => navigate(-1);

  // ── Vista alumno (sin cambios) ──
  if (esAlumno) {
    const porMateria = datos.reduce((acc, c) => {
      const key = c.materia;
      if (!acc[key]) acc[key] = { materia: c.materia, ciclo: c.ciclo_escolar, parciales: {} };
      acc[key].parciales[c.parcial] = c.calificacion;
      return acc;
    }, {});

    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={handleVolver}>← Volver</button>
          <div>
            <h1 className={styles.title}>Mis Calificaciones</h1>
            <p className={styles.subtitle}>Ciclo escolar actual</p>
          </div>
        </div>
        {cargando ? (
          <div className={styles.skeletonContainer}>
            {[1, 2].map(n => (
              <div key={n} className={styles.card}>
                <div className={styles.cardHead}>
                  <Skeleton width="200px" height="22px" variant="text" />
                  <Skeleton width="100px" height="16px" variant="text" />
                </div>
                <div className={styles.parcialesRow}>
                  {[1, 2, 3, 4].map(p => (
                    <div key={p} className={styles.parcialBox}>
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
          Object.values(porMateria).map(m => (
            <div key={m.materia} className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{m.materia}</h2>
                <span className={styles.ciclo}>{m.ciclo}</span>
              </div>
              <div className={styles.parcialesRow}>
                {PARCIALES.map(p => {
                  const cal = m.parciales[p];
                  return (
                    <div key={p} className={styles.parcialBox}>
                      <span className={styles.parcialLabel}>Parcial {p}</span>
                      <span className={styles.parcialValor} style={{ color: cal != null ? COLOR_CALIF(cal) : '#94a3b8' }}>
                        {cal != null ? cal : '—'}
                      </span>
                    </div>
                  );
                })}
                <div className={styles.parcialBox}>
                  <span className={styles.parcialLabel}>Promedio</span>
                  <span className={styles.parcialValor} style={{ color: '#1A6B35' }}>
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

  // ── Vista docente/admin ──
  const porAlumno = {};
  datos.forEach(row => {
    const key = row.alumno_id;
    if (!porAlumno[key]) {
      porAlumno[key] = {
        alumno_id: row.alumno_id,
        usuario_id: row.usuario_id,
        nombre: `${row.apellidos}, ${row.nombre}`,
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
  const alumnosList = Object.values(porAlumno).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ── Edición individual ──
  const handleInputChange = (e) => {
    const value = e.target.value;
    setValorNuevo(value);
    setInputError('');
    if (value !== '') {
      const result = validarCalificacion(value);
      if (!result.valido) setInputError(result.mensaje);
    }
  };

  const handleGuardarIndividual = async () => {
    const result = validarCalificacion(valorNuevo);
    if (!result.valido) {
      setInputError(result.mensaje);
      setError(result.mensaje);
      return;
    }
    setInputError('');
    setError('');
    setGuardando(true);
    try {
      const parcial = registrando?.parcial || editando?.parcial;
      if (!esAdmin && !isParcialEditable(parcial)) {
        setError(`El Parcial ${parcial} no está en período de edición.`);
        setGuardando(false);
        return;
      }
      if (editando) {
        await calificacionesService.actualizar(editando.id, result.valor);
      } else if (registrando) {
        //  Enviar alumno_id (el que viene del objeto registrando)
        const payload = {
          alumno_id: registrando.alumno_id,
          materia_grupo_id: parseInt(materia_grupo_id),
          parcial: registrando.parcial,
          calificacion: result.valor,
        };
        await calificacionesService.registrar(payload);
      }
      setEditando(null);
      setRegistrando(null);
      setValorNuevo('');
      setExito(' Calificación guardada correctamente.');
      setTimeout(() => setExito(''), 3000);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarIndividual = () => {
    setEditando(null);
    setRegistrando(null);
    setValorNuevo('');
    setError('');
    setInputError('');
  };

  const handleClicCelda = (alumnoId, parcial, cal) => {
    if (!esAdmin && !isParcialEditable(parcial)) {
      setError(`El Parcial ${parcial} no está en período de edición.`);
      return;
    }
    if (modoColumna) {
      setError('Ya estás en modo edición por columna. Finaliza o cancela primero.');
      return;
    }
    setError('');
    setInputError('');
    if (cal) {
      setEditando({ id: cal.id, parcial });
      setRegistrando(null);
      setValorNuevo(cal.valor);
    } else {
      //  Asegurar que alumnoId es el ID de la tabla alumnos (debe ser un número)
      setRegistrando({ alumno_id: alumnoId, parcial });
      setEditando(null);
      setValorNuevo('');
    }
  };

  const isEditingIndividual = editando !== null || registrando !== null;

  // ── Edición por columna ──
  const activarModoColumna = (parcial) => {
    if (!esAdmin && !isParcialEditable(parcial)) {
      setError(`El Parcial ${parcial} no está en período de edición.`);
      return;
    }
    if (isEditingIndividual) {
      setError('Primero cancela la edición individual actual.');
      return;
    }
    setError('');
    setExito('');
    setParcialSeleccionado(parcial);
    setModoColumna(true);
    setCamposVacios({});
    const temp = {};
    alumnosList.forEach(alumno => {
      const cal = alumno.calificaciones[parcial];
      temp[alumno.alumno_id] = cal ? cal.valor : '';
    });
    setCalificacionesTemp(temp);
    setToast(`️ Modo edición activo: Parcial ${parcial} – Ingresa calificaciones para todos los alumnos`);
    setTimeout(() => setToast(''), 4000);
  };

  const handleTempChange = (alumnoId, value) => {
    setCalificacionesTemp(prev => ({ ...prev, [alumnoId]: value }));
    setCamposVacios(prev => ({ ...prev, [alumnoId]: false }));
  };

  const guardarColumna = async () => {
    const vacios = [];
    const errores = [];
    
    for (const alumno of alumnosList) {
      const val = calificacionesTemp[alumno.alumno_id]?.trim();
      if (!val) {
        vacios.push(alumno.nombre);
        setCamposVacios(prev => ({ ...prev, [alumno.alumno_id]: true }));
      } else {
        const result = validarCalificacion(val);
        if (!result.valido) {
          errores.push(`${alumno.nombre}: ${result.mensaje}`);
        }
      }
    }
    
    if (vacios.length > 0) {
      setError(` Faltan calificaciones para: ${vacios.join(', ')}`);
      return;
    }
    
    if (errores.length > 0) {
      setError(` Errores: ${errores.join('; ')}`);
      return;
    }

    setGuardandoColumna(true);
    setError('');
    try {
      const promises = alumnosList.map(async (alumno) => {
        const valor = parseFloat(calificacionesTemp[alumno.alumno_id]);
        const calExistente = alumno.calificaciones[parcialSeleccionado];
        if (calExistente) {
          await calificacionesService.actualizar(calExistente.id, valor);
        } else {
          //  Enviar alumno_id
          const payload = {
            alumno_id: alumno.alumno_id,
            materia_grupo_id: parseInt(materia_grupo_id),
            parcial: parcialSeleccionado,
            calificacion: valor,
          };
          console.log(' Enviando (columna):', payload);
          await calificacionesService.registrar(payload);
        }
      });
      await Promise.all(promises);
      setExito(` Calificaciones del Parcial ${parcialSeleccionado} guardadas correctamente.`);
      setTimeout(() => setExito(''), 3000);
      setModoColumna(false);
      setParcialSeleccionado(null);
      setCalificacionesTemp({});
      setCamposVacios({});
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar las calificaciones.');
    } finally {
      setGuardandoColumna(false);
    }
  };

  const cancelarColumna = () => {
    setModoColumna(false);
    setParcialSeleccionado(null);
    setCalificacionesTemp({});
    setCamposVacios({});
    setError('');
  };

  const parcialesEditables = PARCIALES.filter(p => esAdmin || isParcialEditable(p));

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.pageHeader}>
        <button className={styles.btnVolver} onClick={handleVolver}>← Volver</button>
        <div>
          <h1 className={styles.title}>Calificaciones</h1>
          <p className={styles.subtitle}>
            {modoColumna 
              ? `️ Editando Parcial ${parcialSeleccionado} (todos los alumnos)` 
              : 'Haz clic en una celda o en el ️ del encabezado para edición masiva'}
          </p>
        </div>
      </div>

      {(error || inputError) && <div className={styles.errorMsg}>{error || inputError}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      {isEditingIndividual && (
        <div className={styles.inputRow}>
          <span className={styles.inputLabel}>
            {editando ? `Editando Parcial ${editando.parcial}` : `Registrando Parcial ${registrando?.parcial}`}
          </span>
          <div className={styles.inputWrapper}>
            <input
              className={`${styles.calInput} ${inputError ? styles.calInputError : ''}`}
              type="text"
              inputMode="decimal"
              value={valorNuevo}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleGuardarIndividual(); }
                if (e.key === 'Escape') handleCancelarIndividual();
              }}
              autoFocus
              placeholder="0-10"
            />
            {inputError && <span className={styles.inputErrorText}>{inputError}</span>}
          </div>
          <button className={styles.btnPrimary} onClick={handleGuardarIndividual} disabled={guardando || !!inputError}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button className={styles.btnSecondary} onClick={handleCancelarIndividual}>Cancelar</button>
        </div>
      )}

      {modoColumna && (
        <div className={styles.columnaActions}>
          <span className={styles.columnaLabel}>️ Editando Parcial {parcialSeleccionado} – {alumnosList.length} alumnos</span>
          <button className={styles.btnPrimary} onClick={guardarColumna} disabled={guardandoColumna}>
            <IconSave /> {guardandoColumna ? 'Guardando...' : 'Guardar todos'}
          </button>
          <button className={styles.btnSecondary} onClick={cancelarColumna}>Cancelar</button>
        </div>
      )}

      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                {PARCIALES.map(p => (
                  <th key={p} className={styles.th}>
                    Parcial {p}
                    {!modoColumna && parcialesEditables.includes(p) && (
                      <button 
                        className={styles.btnEditarColumna}
                        onClick={() => activarModoColumna(p)}
                        title={`Editar Parcial ${p} para todos los alumnos`}
                      >
                        <IconPencil />
                      </button>
                    )}
                  </th>
                ))}
                <th className={styles.th}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4].map(row => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.tdNombre}><Skeleton width="180px" height="18px" variant="text" /></td>
                  {PARCIALES.map(p => (
                    <td key={p} className={styles.tdCal}><Skeleton width="28px" height="20px" variant="text" style={{ margin: '0 auto' }} /></td>
                  ))}
                  <td className={styles.tdCal}><Skeleton width="28px" height="20px" variant="text" style={{ margin: '0 auto' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : alumnosList.length === 0 ? (
        <div className={styles.empty}>No hay alumnos inscritos en esta materia.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Alumno</th>
                {PARCIALES.map(p => (
                  <th key={p} className={styles.th}>
                    Parcial {p}
                    {!modoColumna && parcialesEditables.includes(p) && (
                      <button 
                        className={styles.btnEditarColumna}
                        onClick={() => activarModoColumna(p)}
                        title={`Editar Parcial ${p} para todos los alumnos`}
                      >
                        <IconPencil />
                      </button>
                    )}
                  </th>
                ))}
                <th className={styles.th}>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {alumnosList.map(alumno => {
                const vals = Object.values(alumno.calificaciones).map(c => parseFloat(c.valor));
                const prom = vals.length > 0 ? vals.reduce((x,y) => x+y,0)/vals.length : null;
                return (
                  <tr key={alumno.alumno_id} className={styles.tr}>
                    <td className={styles.tdNombre}>{alumno.nombre}</td>
                    {PARCIALES.map(p => {
                      const cal = alumno.calificaciones[p];
                      if (modoColumna && p === parcialSeleccionado) {
                        const valor = calificacionesTemp[alumno.alumno_id] || '';
                        const isEmpty = valor.trim() === '';
                        const isError = camposVacios[alumno.alumno_id];
                        return (
                          <td key={p} className={styles.tdCal}>
                            <input
                              className={`${styles.calInputColumna} ${isEmpty ? styles.calInputColumnaVacio : ''} ${isError ? styles.calInputColumnaError : ''}`}
                              type="text"
                              inputMode="decimal"
                              value={valor}
                              onChange={(e) => handleTempChange(alumno.alumno_id, e.target.value)}
                              placeholder="0-10"
                            />
                          </td>
                        );
                      }
                      const clickeable = !modoColumna && !isEditingIndividual && parcialesEditables.includes(p);
                      return (
                        <td
                          key={p}
                          className={`${styles.tdCal} ${clickeable ? styles.tdCalClickable : ''}`}
                          onClick={() => {
                            if (clickeable) {
                              handleClicCelda(alumno.alumno_id, p, cal);
                            }
                          }}
                          style={{ 
                            cursor: clickeable ? 'pointer' : 'default',
                            opacity: clickeable ? 1 : 0.6
                          }}
                        >
                          <span className={styles.calCell} style={{ color: cal ? COLOR_CALIF(cal.valor) : '#94a3b8' }}>
                            {cal ? cal.valor : '+'}
                          </span>
                        </td>
                      );
                    })}
                    <td className={styles.tdCal}>
                      <span style={{ fontWeight: 700, color: prom ? COLOR_CALIF(prom) : '#94a3b8' }}>
                        {prom !== null ? prom.toFixed(1) : '—'}
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