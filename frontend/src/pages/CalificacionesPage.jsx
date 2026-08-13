import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  calificacionesService,
  gruposService,
  catalogosService,
} from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './CalificacionesPage.module.css';


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


const calcularPromedioSeguro = (calificaciones) => {
  if (!calificaciones || calificaciones.length === 0) return null;
  const validas = calificaciones
    .map(c => {
      
      const val = typeof c === 'string' ? parseFloat(c.trim()) : Number(c);
      return isNaN(val) ? null : val;
    })
    .filter(v => v !== null && !isNaN(v));
  if (validas.length === 0) return null;
  const total = validas.reduce((a, b) => a + b, 0);
  return Math.round((total / validas.length) * 10) / 10;
};

export default function CalificacionesPage() {
  const { usuario } = useAuth();
  const { materia_grupo_id, grupo_id } = useParams();
  const navigate = useNavigate();
  const esAlumno = usuario.rol === 'alumno';
  const esAdmin = usuario.rol === 'administrador';
  const esDocente = usuario.rol === 'docente';

  
  const [datos, setDatos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [toast, setToast] = useState('');

  const [grupos, setGrupos] = useState([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [filtros, setFiltros] = useState({
    ciclo_id: '',
    semestre: '',
    turno_id: '',
  });
  const [ciclos, setCiclos] = useState([]);

  const [materiasGrupo, setMateriasGrupo] = useState([]);
  const [cargandoMaterias, setCargandoMaterias] = useState(false);
  const [materiaExpandida, setMateriaExpandida] = useState(null);

  const [busquedaAlumno, setBusquedaAlumno] = useState('');

  const [editando, setEditando] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [valorNuevo, setValorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [inputError, setInputError] = useState('');
  const [modoColumna, setModoColumna] = useState(false);
  const [parcialSeleccionado, setParcialSeleccionado] = useState(null);
  const [calificacionesTemp, setCalificacionesTemp] = useState({});
  const [guardandoColumna, setGuardandoColumna] = useState(false);
  const [camposVacios, setCamposVacios] = useState({});

  
  const porAlumno = useMemo(() => {
    const mapa = {};
    datos.forEach(row => {
      const key = row.alumno_id;
      if (!mapa[key]) {
        mapa[key] = {
          alumno_id: row.alumno_id,
          usuario_id: row.usuario_id,
          nombre: `${row.apellidos}, ${row.nombre}`,
          matricula: row.matricula || '',
          calificaciones: {},
        };
      }
      if (row.parcial) {
        mapa[key].calificaciones[row.parcial] = {
          id: row.calificacion_id,
          valor: row.calificacion,
        };
      }
    });
    return mapa;
  }, [datos]);

  const alumnosList = useMemo(() => {
    const lista = Object.values(porAlumno);
    if (!busquedaAlumno.trim()) return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const term = busquedaAlumno.toLowerCase().trim();
    return lista
      .filter(alumno =>
        alumno.nombre.toLowerCase().includes(term) ||
        (alumno.matricula && alumno.matricula.toLowerCase().includes(term))
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [porAlumno, busquedaAlumno]);

  
  useEffect(() => {
    if (esAlumno || materia_grupo_id || grupo_id) return;
    const cargarCiclos = async () => {
      try {
        const res = await catalogosService.getCiclos();
        setCiclos(res.data || []);
        const activo = res.data?.find(c => c.activo);
        if (activo) {
          setFiltros(prev => ({ ...prev, ciclo_id: String(activo.id) }));
        }
      } catch (e) {
        console.error('Error cargando ciclos:', e);
        setError('No se pudieron cargar los ciclos.');
      }
    };
    cargarCiclos();
  }, [esAlumno, materia_grupo_id, grupo_id]);

  const cargarGrupos = useCallback(async () => {
    if (esAlumno || materia_grupo_id || grupo_id) return;
    setCargandoGrupos(true);
    setError('');
    try {
      const params = {};
      if (esAdmin && filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
      if (filtros.semestre) params.semestre = filtros.semestre;
      if (filtros.turno_id) params.turno_id = filtros.turno_id;
      if (esDocente) params.docente_id = usuario.id;

      const res = await gruposService.getAll(params);
      setGrupos(res.data || []);
    } catch (e) {
      console.error('Error cargando grupos:', e);
      setError('Error al cargar los grupos.');
    } finally {
      setCargandoGrupos(false);
    }
  }, [filtros, esAlumno, materia_grupo_id, grupo_id, esDocente, usuario.id, esAdmin]);

  useEffect(() => {
    if (esAlumno || materia_grupo_id || grupo_id) return;
    cargarGrupos();
  }, [cargarGrupos, esAlumno, materia_grupo_id, grupo_id]);

  useEffect(() => {
    if (!grupo_id) return;
    const cargarMaterias = async () => {
      setCargandoMaterias(true);
      setError('');
      try {
        const res = await gruposService.getMaterias(grupo_id);
        setMateriasGrupo(res.materias || []);
      } catch (e) {
        console.error('Error cargando materias del grupo:', e);
        setError('No se pudieron cargar las materias del grupo.');
        setMateriasGrupo([]);
      } finally {
        setCargandoMaterias(false);
      }
    };
    cargarMaterias();
  }, [grupo_id]);

  const cargarCalificaciones = useCallback(async () => {
    if (!materia_grupo_id) return;
    setCargando(true);
    setError('');
    try {
      const res = await calificacionesService.porMateria(materia_grupo_id);
      setDatos(res.calificaciones || []);
    } catch (e) {
      console.error('Error cargando calificaciones:', e);
      setDatos([]);
      setError(e.response?.data?.message || 'Error al cargar calificaciones.');
    } finally {
      setCargando(false);
    }
  }, [materia_grupo_id]);

  const cargarPeriodos = useCallback(async () => {
    if (!materia_grupo_id) return;
    try {
      const res = await calificacionesService.getPeriodosEvaluacion(materia_grupo_id);
      setPeriodos(res.periodos || []);
    } catch (e) {
      console.error('Error cargando períodos:', e);
      setPeriodos([]);
    }
  }, [materia_grupo_id]);

  const cargarMisCalificaciones = useCallback(async () => {
    setCargando(true);
    try {
      const res = await calificacionesService.misCalificaciones();
      setDatos(res.calificaciones || []);
    } catch (e) {
      console.error('Error cargando mis calificaciones:', e);
      setDatos([]);
      setError('No se pudieron cargar tus calificaciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAlumno) {
      cargarMisCalificaciones();
      return;
    }
    if (materia_grupo_id) {
      cargarCalificaciones();
      cargarPeriodos();
    }
  }, [esAlumno, materia_grupo_id, cargarMisCalificaciones, cargarCalificaciones, cargarPeriodos]);

  
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limpiarFiltros = () => {
    const cicloActivo = ciclos.find(c => c.activo);
    setFiltros({
      ciclo_id: cicloActivo ? String(cicloActivo.id) : '',
      semestre: '',
      turno_id: '',
    });
  };

  const seleccionarGrupo = (id) => {
    navigate(`/calificaciones/grupo/${id}`);
  };

  const volverALista = () => {
    navigate('/calificaciones');
  };

  const verCalificacionesMateria = (materia_grupo_id) => {
    navigate(`/calificaciones/materia/${materia_grupo_id}`);
  };

  const toggleExpandirMateria = (id) => {
    setMateriaExpandida(materiaExpandida === id ? null : id);
  };

  
  const isParcialEditable = (parcial) => {
    if (esAlumno) return false;
    if (esAdmin) return true;
    const periodo = periodos.find(p => p.parcial === parcial);
    if (!periodo) {
      return esDocente;
    }
    const hoy = new Date();
    const inicio = new Date(periodo.fecha_inicio);
    const fin = new Date(periodo.fecha_fin);
    hoy.setHours(0, 0, 0, 0);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return hoy >= inicio && hoy <= fin;
  };

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
      await cargarCalificaciones();
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
      setRegistrando({ alumno_id: alumnoId, parcial });
      setEditando(null);
      setValorNuevo('');
    }
  };

  const isEditingIndividual = editando !== null || registrando !== null;

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
          const payload = {
            alumno_id: alumno.alumno_id,
            materia_grupo_id: parseInt(materia_grupo_id),
            parcial: parcialSeleccionado,
            calificacion: valor,
          };
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
      await cargarCalificaciones();
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

  
  if (esAlumno) {
    const primeraMateria = datos.length > 0 ? datos[0] : null;
    const grupoInfo = primeraMateria
      ? { grupo: primeraMateria.grupo, ciclo: primeraMateria.ciclo, semestre: primeraMateria.semestre }
      : { grupo: 'Sin grupo', ciclo: 'Sin ciclo', semestre: '' };

    const materiasConPromedio = datos.map(m => {
      const p1 = m.parciales[1] !== null && m.parciales[1] !== undefined ? parseFloat(m.parciales[1]) : null;
      const p2 = m.parciales[2] !== null && m.parciales[2] !== undefined ? parseFloat(m.parciales[2]) : null;
      const p3 = m.parciales[3] !== null && m.parciales[3] !== undefined ? parseFloat(m.parciales[3]) : null;
      const valores = [p1, p2, p3].filter(v => v !== null && !isNaN(v));
      const promedio = valores.length > 0
        ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10
        : null;
      return {
        ...m,
        parciales: { 1: p1, 2: p2, 3: p3 },
        promedio,
      };
    });

    let sumP1 = 0, sumP2 = 0, sumP3 = 0, countP1 = 0, countP2 = 0, countP3 = 0;
    let sumPromedios = 0, countPromedios = 0;
    materiasConPromedio.forEach(m => {
      if (m.parciales[1] !== null) { sumP1 += m.parciales[1]; countP1++; }
      if (m.parciales[2] !== null) { sumP2 += m.parciales[2]; countP2++; }
      if (m.parciales[3] !== null) { sumP3 += m.parciales[3]; countP3++; }
      if (m.promedio !== null) { sumPromedios += m.promedio; countPromedios++; }
    });

    const promedioParcial1 = countP1 > 0 ? Math.round((sumP1 / countP1) * 10) / 10 : null;
    const promedioParcial2 = countP2 > 0 ? Math.round((sumP2 / countP2) * 10) / 10 : null;
    const promedioParcial3 = countP3 > 0 ? Math.round((sumP3 / countP3) * 10) / 10 : null;
    const promedioGeneral = countPromedios > 0 ? Math.round((sumPromedios / countPromedios) * 10) / 10 : null;

    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={() => navigate(-1)}>← Volver</button>
          <div>
            <h1 className={styles.title}>Mis Calificaciones</h1>
            <p className={styles.subtitle}>
              {grupoInfo.grupo !== 'Sin grupo' ? `Grupo ${grupoInfo.grupo}` : 'Sin grupo'} · 
              {grupoInfo.semestre ? ` Semestre ${grupoInfo.semestre}°` : ' Sin semestre'} · 
              {grupoInfo.ciclo || 'Sin ciclo'}
            </p>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {exito && <div className={styles.successMsg}>{exito}</div>}

        {cargando ? (
          <div className={styles.skeletonContainer}>
            <div className={styles.card}>
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
          </div>
        ) : datos.length === 0 ? (
          <div className={styles.empty}>
            <p>No estás cursando materias en este momento.</p>
            <p className={styles.emptySub}>Contacta a la Coordinación Académica si crees que esto es un error.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Materia</th>
                  <th className={styles.th}>Parcial 1</th>
                  <th className={styles.th}>Parcial 2</th>
                  <th className={styles.th}>Parcial 3</th>
                  <th className={styles.th}>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {materiasConPromedio.map((m, idx) => (
                  <tr key={idx} className={styles.tr}>
                    <td className={styles.td}>{m.materia}</td>
                    {[1, 2, 3].map(p => {
                      const cal = m.parciales[p];
                      return (
                        <td key={p} className={styles.td} style={{ textAlign: 'center' }}>
                          {cal !== null && !isNaN(cal) ? (
                            <span style={{ color: COLOR_CALIF(cal), fontWeight: 700 }}>{cal}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className={styles.td} style={{ textAlign: 'center', fontWeight: 700 }}>
                      {m.promedio !== null && !isNaN(m.promedio) ? (
                        <span style={{ color: COLOR_CALIF(m.promedio) }}>{m.promedio.toFixed(1)}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className={styles.tr} style={{ background: '#e6f0ea', fontWeight: 'bold' }}>
                  <td className={styles.td} style={{ fontWeight: 700, color: '#1A6B35' }}>Promedio</td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    {promedioParcial1 !== null ? promedioParcial1 : '—'}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    {promedioParcial2 !== null ? promedioParcial2 : '—'}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    {promedioParcial3 !== null ? promedioParcial3 : '—'}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'center', fontWeight: 700, color: '#1A6B35' }}>
                    {promedioGeneral !== null ? promedioGeneral : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (grupo_id) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={volverALista}>← Volver a grupos</button>
          <div>
            <h1 className={styles.title}>Materias del Grupo</h1>
            <p className={styles.subtitle}>
              {cargandoMaterias ? 'Cargando materias...' : `${materiasGrupo.length} materias encontradas`}
            </p>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {cargandoMaterias ? (
          <div className={styles.skeletonContainer}>
            {[1, 2, 3].map(n => (
              <div key={n} className={styles.card} style={{ padding: '1rem' }}>
                <Skeleton width="200px" height="20px" variant="text" />
              </div>
            ))}
          </div>
        ) : materiasGrupo.length === 0 ? (
          <div className={styles.empty}>Este grupo no tiene materias asignadas.</div>
        ) : (
          <div className={styles.materiasLista}>
            {materiasGrupo.map((materia) => {
              const expandida = materiaExpandida === materia.id;
              return (
                <div key={materia.id} className={styles.materiaCard}>
                  <div className={styles.materiaCardHeader} onClick={() => toggleExpandirMateria(materia.id)}>
                    <span className={styles.materiaCardNombre}>{materia.materia_nombre}</span>
                    <span className={styles.materiaCardMeta}>
                      {materia.docente_nombre || 'Sin docente'} {materia.docente_apellidos || ''} • {materia.horas_semana || '—'} hrs
                    </span>
                    <span className={styles.materiaCardArrow}>{expandida ? '▲' : '▼'}</span>
                  </div>
                  {expandida && (
                    <div className={styles.materiaCardAcciones}>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => verCalificacionesMateria(materia.id)}
                      >
                        Ver calificaciones
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (materia_grupo_id) {
    return (
      <div className={styles.page}>
        {toast && <div className={styles.toast}>{toast}</div>}

        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={() => navigate(-1)}>← Volver</button>
          <div>
            <h1 className={styles.title}>Calificaciones</h1>
            <p className={styles.subtitle}>
              {modoColumna
                ? `️ Editando Parcial ${parcialSeleccionado} (todos los alumnos)`
                : 'Haz clic en una celda o en el ️ del encabezado para edición masiva'}
            </p>
          </div>
        </div>

        <div className={styles.busquedaAlumnoContainer}>
          <input
            type="text"
            className={styles.inputSearchAlumno}
            placeholder="Buscar alumno por nombre, apellido o matrícula..."
            value={busquedaAlumno}
            onChange={(e) => setBusquedaAlumno(e.target.value)}
          />
          {busquedaAlumno && (
            <span className={styles.resultadosCount}>
              {alumnosList.length} alumno(s) encontrado(s)
            </span>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {inputError && <div className={styles.errorMsg}>{inputError}</div>}
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
                {[1, 2, 3, 4].map(row => (
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
          <div className={styles.empty}>
            {busquedaAlumno ? 'No hay alumnos que coincidan con la búsqueda.' : 'No hay alumnos inscritos en esta materia.'}
          </div>
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
                  
                  const vals = Object.values(alumno.calificaciones)
                    .map(c => {
                      const val = typeof c.valor === 'string' 
                        ? parseFloat(c.valor.trim()) 
                        : Number(c.valor);
                      return isNaN(val) ? null : val;
                    })
                    .filter(v => v !== null && !isNaN(v));
                  const prom = vals.length > 0 
                    ? vals.reduce((x, y) => x + y, 0) / vals.length 
                    : null;

                  return (
                    <tr key={alumno.alumno_id} className={styles.tr}>
                      <td className={styles.tdNombre}>
                        {alumno.nombre}
                        {alumno.matricula && <span className={styles.matricula}>({alumno.matricula})</span>}
                      </td>
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
                              opacity: clickeable ? 1 : 0.6,
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
                          {prom !== null && !isNaN(prom) ? prom.toFixed(1) : '—'}
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

  
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Calificaciones</h1>
          <p className={styles.subtitle}>Filtra y selecciona un grupo para ver sus materias y calificaciones</p>
        </div>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      <div className={styles.filtrosContainer}>
        <div className={styles.filtrosGrid}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Ciclo</label>
            <select
              className={styles.select}
              name="ciclo_id"
              value={filtros.ciclo_id}
              onChange={handleFiltroChange}
              disabled={esDocente}
            >
              {esDocente ? (
                <option value={filtros.ciclo_id}>
                  {ciclos.find(c => c.id === parseInt(filtros.ciclo_id))?.nombre || 'Ciclo activo'}
                </option>
              ) : (
                <>
                  <option value="">Todos</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.activo ? '(Activo)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Semestre</label>
            <select
              className={styles.select}
              name="semestre"
              value={filtros.semestre}
              onChange={handleFiltroChange}
            >
              <option value="">Todos</option>
              {[1, 2, 3, 4, 5, 6].map(s => (
                <option key={s} value={s}>{s}°</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Turno</label>
            <select
              className={styles.select}
              name="turno_id"
              value={filtros.turno_id}
              onChange={handleFiltroChange}
            >
              <option value="">Todos</option>
              <option value="1">Matutino</option>
              <option value="2">Vespertino</option>
            </select>
          </div>

          <div className={styles.filtrosActions}>
            <button className={styles.btnLimpiarFiltros} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {cargandoGrupos ? (
        <div className={styles.loading}>Cargando grupos...</div>
      ) : grupos.length === 0 ? (
        <div className={styles.empty}>No se encontraron grupos con esos filtros.</div>
      ) : (
        <div className={styles.listaMaterias}>
          {grupos.map(g => (
            <div
              key={g.id}
              className={styles.materiaItem}
              onClick={() => seleccionarGrupo(g.id)}
            >
              <div className={styles.materiaInfo}>
                <span className={styles.materiaNombre}>{g.nombre}</span>
                <span className={styles.materiaDetalle}>
                  {g.especialidad_nombre || '—'} • {g.semestre}° • {g.turno_nombre || '—'}
                </span>
                <span className={styles.materiaCiclo}>{g.ciclo_nombre}</span>
              </div>
              <span className={styles.materiaArrow}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}