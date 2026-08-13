import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { gruposService, calificacionesService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';


const calcularPromedioSeguro = (calificaciones) => {
  
  const valores = [1, 2, 3].map(p => {
    const val = calificaciones[p]?.valor;
    if (val === null || val === undefined || val === '') return null;
    
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  });
  const validos = valores.filter(v => v !== null);
  if (validos.length === 0) return null;
  const total = validos.reduce((a, b) => a + b, 0);
  return Math.round((total / validos.length) * 10) / 10;
};

export default function MisClasesCalificaciones({ grupoId }) {
  const { usuario } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [datos, setDatos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [editando, setEditando] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [valorNuevo, setValorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [inputError, setInputError] = useState('');

  
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

  
  useEffect(() => {
    if (!materiaSeleccionada) return;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await calificacionesService.porMateria(materiaSeleccionada);
        setDatos(res.calificaciones || []);
        const periodosRes = await calificacionesService.getPeriodosEvaluacion(materiaSeleccionada);
        setPeriodos(periodosRes.periodos || []);
      } catch (e) {
        console.error('Error cargando calificaciones:', e);
        setError('Error al cargar calificaciones.');
        setDatos([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [materiaSeleccionada]);

  const isParcialEditable = (parcial) => {
    if (usuario.rol === 'administrador') return true;
    const periodo = periodos.find(p => p.parcial === parcial);
    if (!periodo) return true;
    const hoy = new Date();
    const inicio = new Date(periodo.fecha_inicio);
    const fin = new Date(periodo.fecha_fin);
    hoy.setHours(0, 0, 0, 0);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return hoy >= inicio && hoy <= fin;
  };

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

  const alumnosList = Object.values(porAlumno).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const handleInputChange = (e) => {
    const value = e.target.value;
    setValorNuevo(value);
    setInputError('');
  };

  const handleGuardarIndividual = async () => {
    const calNum = parseFloat(valorNuevo);
    if (isNaN(calNum) || calNum < 0 || calNum > 10) {
      setInputError('Ingresa un número entre 0 y 10');
      return;
    }
    setInputError('');
    setError('');
    setGuardando(true);
    try {
      const parcial = registrando?.parcial || editando?.parcial;
      if (!isParcialEditable(parcial)) {
        setError(`El Parcial ${parcial} no está en período de edición.`);
        setGuardando(false);
        return;
      }
      if (editando) {
        await calificacionesService.actualizar(editando.id, calNum);
      } else if (registrando) {
        const payload = {
          alumno_id: registrando.alumno_id,
          materia_grupo_id: parseInt(materiaSeleccionada),
          parcial: registrando.parcial,
          calificacion: calNum,
        };
        await calificacionesService.registrar(payload);
      }
      setEditando(null);
      setRegistrando(null);
      setValorNuevo('');
      setExito(' Calificación guardada correctamente.');
      setTimeout(() => setExito(''), 3000);
      const res = await calificacionesService.porMateria(materiaSeleccionada);
      setDatos(res.calificaciones || []);
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
    if (!isParcialEditable(parcial)) {
      setError(`El Parcial ${parcial} no está en período de edición.`);
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
  const COLOR_CALIF = (c) => {
    if (c >= 8) return '#1A6B35';
    if (c >= 6) return '#F37238';
    return '#b91c1c';
  };

  if (cargando) {
    return (
      <div className={styles.skeletonContainer}>
        <div className={styles.skeletonTable}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={styles.skeletonRow}>
              <Skeleton width="180px" height="18px" variant="text" />
              <Skeleton width="40px" height="18px" variant="text" />
              <Skeleton width="40px" height="18px" variant="text" />
              <Skeleton width="40px" height="18px" variant="text" />
              <Skeleton width="40px" height="18px" variant="text" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!materiaSeleccionada) {
    return <div className={styles.empty}>Selecciona una materia para ver las calificaciones.</div>;
  }

  if (error) {
    return <div className={styles.errorMsg}>{error}</div>;
  }

  return (
    <div className={styles.calificacionesContainer}>
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.filtrosCalificaciones}>
        <div className={styles.filtroGroup}>
          <label className={styles.label}>Materia</label>
          <select
            className={styles.select}
            value={materiaSeleccionada}
            onChange={(e) => setMateriaSeleccionada(e.target.value)}
          >
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.materia_nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isEditingIndividual && (
        <div className={styles.inputRow}>
          <span className={styles.inputLabel}>
            {editando ? `Editando Parcial ${editando.parcial}` : `Registrando Parcial ${registrando?.parcial}`}
          </span>
          <div className={styles.inputWrapper}>
            <input
              className={`${styles.calInput} ${inputError ? styles.calInputError : ''}`}
              type="number"
              step="0.1"
              min="0"
              max="10"
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

      {alumnosList.length === 0 ? (
        <div className={styles.empty}>No hay alumnos en esta materia.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Parcial 1</th>
                <th>Parcial 2</th>
                <th>Parcial 3</th>
                <th>Promedio</th>
              </tr>
            </thead>
            <tbody>
              {alumnosList.map(alumno => {
                
                const prom = calcularPromedioSeguro(alumno.calificaciones);

                return (
                  <tr key={alumno.alumno_id}>
                    <td>{alumno.nombre}</td>
                    {[1, 2, 3].map(p => {
                      const cal = alumno.calificaciones[p];
                      const clickeable = !isEditingIndividual && isParcialEditable(p);
                      return (
                        <td
                          key={p}
                          className={clickeable ? styles.tdClickable : ''}
                          onClick={() => {
                            if (clickeable) {
                              handleClicCelda(alumno.alumno_id, p, cal);
                            }
                          }}
                          style={{ cursor: clickeable ? 'pointer' : 'default' }}
                        >
                          <span style={{ color: cal ? COLOR_CALIF(cal.valor) : '#94a3b8' }}>
                            {cal ? cal.valor : '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td>
                      <span style={{ fontWeight: 700, color: prom !== null ? COLOR_CALIF(prom) : '#94a3b8' }}>
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