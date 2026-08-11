import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, X, Plus } from 'lucide-react';
import styles from './HorariosPage.module.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPO_BLOQUE = 'BLOQUE_HORARIO';

export default function HorariosPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [tabActiva, setTabActiva] = useState('grupos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [configuracion, setConfiguracion] = useState(null);
  const [configModal, setConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({});

  const [grupos, setGrupos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [docenteSeleccionado, setDocenteSeleccionado] = useState('');
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState('');
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');

  const [bloques, setBloques] = useState([]);
  const [horasGrid, setHorasGrid] = useState([]);
  const [materiaGrupoMap, setMateriaGrupoMap] = useState({});

  const gridRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [configRes, gruposRes, docentesRes, labsRes] = await Promise.all([
          horariosService.getConfiguracion(),
          catalogosService.getGrupos(),
          usuariosService.getAll({ rol: 'docente' }),
          catalogosService.getAulas(),
        ]);
        setConfiguracion(configRes.data);
        setGrupos(gruposRes.data || []);
        setDocentes(docentesRes.usuarios || []);
        setLaboratorios(labsRes.data || []);
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  // Cargar materias disponibles para el grupo seleccionado
  useEffect(() => {
    const cargarMaterias = async () => {
      if (!grupoSeleccionado) return;
      try {
        const res = await catalogosService.getMaterias(); // o el endpoint que tengas
        const materias = res.data || [];
        setMateriasDisponibles(materias);
      } catch (e) {
        console.error('Error cargando materias:', e);
      }
    };
    cargarMaterias();
  }, [grupoSeleccionado]);

  // Generar horas del grid
  useEffect(() => {
    if (!configuracion) return;
    const { hora_inicio_turno, hora_fin_turno, duracion_bloque_minutos } = configuracion;
    const horas = [];
    let current = new Date(`2000-01-01T${hora_inicio_turno}`);
    const fin = new Date(`2000-01-01T${hora_fin_turno}`);
    const pasoMinutos = 10;

    while (current < fin) {
      horas.push({
        time: current.toTimeString().slice(0, 5),
        label: current.toTimeString().slice(0, 5),
        minute: current.getMinutes(),
        hour: current.getHours(),
      });
      current.setMinutes(current.getMinutes() + pasoMinutos);
    }
    setHorasGrid(horas);
  }, [configuracion]);

  // Cargar bloques del horario seleccionado
  const cargarBloques = useCallback(async () => {
    if (tabActiva === 'grupos' && !grupoSeleccionado) return;
    if (tabActiva === 'maestros' && !docenteSeleccionado) return;
    if (tabActiva === 'laboratorios' && !laboratorioSeleccionado) return;

    setCargando(true);
    try {
      let res;
      if (tabActiva === 'grupos') {
        res = await horariosService.getHorarioGrupo(grupoSeleccionado);
      } else if (tabActiva === 'maestros') {
        res = await horariosService.getHorarioMaestro(docenteSeleccionado);
      } else {
        res = await horariosService.getHorarioLaboratorio(laboratorioSeleccionado);
      }
      // Normalizar datos
      const bloquesData = (res.data || []).map(b => ({
        ...b,
        id: b.id || `temp-${Date.now()}-${Math.random()}`,
        dia_semana: b.dia_semana || 'Lunes',
        hora_inicio: b.hora_inicio || '07:00',
        hora_fin: b.hora_fin || '07:50',
        materia_grupo_id: b.materia_grupo_id || null,
        es_temporal: b.id ? false : true,
      }));
      setBloques(bloquesData);
    } catch (e) {
      console.error('Error cargando bloques:', e);
      setError('No se pudieron cargar los bloques');
    } finally {
      setCargando(false);
    }
  }, [tabActiva, grupoSeleccionado, docenteSeleccionado, laboratorioSeleccionado]);

  useEffect(() => {
    if (grupoSeleccionado || docenteSeleccionado || laboratorioSeleccionado) {
      cargarBloques();
    }
  }, [cargarBloques]);

  // Guardar horario
  const handleGuardar = async () => {
    setCargando(true);
    try {
      // Filtrar bloques temporales y preparar datos
      const bloquesParaGuardar = bloques
        .filter(b => !b.es_temporal)
        .map(b => ({
          materia_grupo_id: b.materia_grupo_id,
          dia_semana: b.dia_semana,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
        }));
      await horariosService.guardarHorarioGrupo(grupoSeleccionado, bloquesParaGuardar);
      setExito('Horario guardado correctamente');
      setTimeout(() => setExito(''), 4000);
      cargarBloques();
    } catch (e) {
      setError(e.response?.data?.message || 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  // Guardar configuración
  const handleGuardarConfiguracion = async () => {
    try {
      const res = await horariosService.actualizarConfiguracion(configForm);
      setConfiguracion(res.data);
      setConfigModal(false);
      setExito('Configuración actualizada');
      setTimeout(() => setExito(''), 4000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al guardar configuración');
    }
  };

  // ============================================================
  // LOGICA DE DRAG & DROP
  // ============================================================

  // Obtener coordenadas de un bloque en el grid
  const getBloqueCoords = (bloque) => {
    const diaIdx = DIAS.indexOf(bloque.dia_semana);
    const horaIdx = horasGrid.findIndex(h => h.time === bloque.hora_inicio);
    if (diaIdx === -1 || horaIdx === -1) return null;
    const duracionMinutos = (new Date(`2000-01-01T${bloque.hora_fin}`) - new Date(`2000-01-01T${bloque.hora_inicio}`)) / 60000;
    const altura = Math.round(duracionMinutos / 10);
    return { diaIdx, horaIdx, altura };
  };

  // Mover bloque a nueva posición
  const moverBloque = (bloqueId, nuevoDia, nuevaHoraInicio) => {
    setBloques(prev => {
      return prev.map(b => {
        if (b.id !== bloqueId) return b;
        // Calcular nueva hora_fin
        const duracionMinutos = (new Date(`2000-01-01T${b.hora_fin}`) - new Date(`2000-01-01T${b.hora_inicio}`)) / 60000;
        const fin = new Date(`2000-01-01T${nuevaHoraInicio}`);
        fin.setMinutes(fin.getMinutes() + duracionMinutos);
        const nuevaHoraFin = fin.toTimeString().slice(0, 5);
        return {
          ...b,
          dia_semana: nuevoDia,
          hora_inicio: nuevaHoraInicio,
          hora_fin: nuevaHoraFin,
        };
      });
    });
  };

  // Redimensionar bloque (cambiar duración)
  const redimensionarBloque = (bloqueId, nuevaDuracionMinutos) => {
    setBloques(prev => {
      return prev.map(b => {
        if (b.id !== bloqueId) return b;
        const nuevaHoraFin = new Date(`2000-01-01T${b.hora_inicio}`);
        nuevaHoraFin.setMinutes(nuevaHoraFin.getMinutes() + nuevaDuracionMinutos);
        return {
          ...b,
          hora_fin: nuevaHoraFin.toTimeString().slice(0, 5),
        };
      });
    });
  };

  // Crear nuevo bloque en celda
  const crearBloque = (dia, horaInicio) => {
    if (!materiaSeleccionada) {
      setError('Selecciona una materia primero');
      return;
    }
    const duracion = configuracion?.duracion_bloque_minutos || 50;
    const fin = new Date(`2000-01-01T${horaInicio}`);
    fin.setMinutes(fin.getMinutes() + duracion);
    const nuevoBloque = {
      id: `temp-${Date.now()}-${Math.random()}`,
      dia_semana: dia,
      hora_inicio: horaInicio,
      hora_fin: fin.toTimeString().slice(0, 5),
      materia_grupo_id: materiaSeleccionada,
      es_temporal: true,
      materia_nombre: materiasDisponibles.find(m => m.id === parseInt(materiaSeleccionada))?.nombre || 'Materia',
    };
    setBloques(prev => [...prev, nuevoBloque]);
  };

  // Eliminar bloque temporal
  const eliminarBloque = (bloqueId) => {
    setBloques(prev => prev.filter(b => b.id !== bloqueId));
  };

  // Validar conflictos (simplificado)
  const tieneConflictos = (bloque) => {
    // Verificar si otro bloque ocupa el mismo espacio
    const conflicto = bloques.some(b => {
      if (b.id === bloque.id) return false;
      if (b.dia_semana !== bloque.dia_semana) return false;
      const bInicio = b.hora_inicio;
      const bFin = b.hora_fin;
      const bloqueInicio = bloque.hora_inicio;
      const bloqueFin = bloque.hora_fin;
      return (bloqueInicio >= bInicio && bloqueInicio < bFin) ||
             (bloqueFin > bInicio && bloqueFin <= bFin);
    });
    return conflicto;
  };

  // ============================================================
  // COMPONENTES DE DRAG & DROP
  // ============================================================

  // Componente Celda (drop target)
  const CeldaDrop = ({ dia, hora, children }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: TIPO_BLOQUE,
      drop: (item, monitor) => {
        const delta = monitor.getDifferenceFromInitialOffset();
        if (delta) {
          // Mover bloque a esta celda
          const bloqueId = item.id;
          const nuevoDia = dia;
          const nuevaHora = hora;
          moverBloque(bloqueId, nuevoDia, nuevaHora);
        }
        return { dia, hora };
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }), [dia, hora]);

    return (
      <div
        ref={drop}
        className={`${styles.gridCell} ${isOver && canDrop ? styles.dropOver : ''}`}
        onClick={() => crearBloque(dia, hora)}
        data-dia={dia}
        data-hora={hora}
      >
        {children}
      </div>
    );
  };

  // Componente Bloque (drag source + resize)
  const BloqueDrag = ({ bloque }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: TIPO_BLOQUE,
      item: { id: bloque.id, dia: bloque.dia_semana, hora: bloque.hora_inicio },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }), [bloque]);

    const coords = getBloqueCoords(bloque);
    if (!coords) return null;

    const { diaIdx, horaIdx, altura } = coords;
    const conflicto = tieneConflictos(bloque);
    const esTemporal = bloque.es_temporal;

    // Calcular posición en el grid
    const top = horaIdx * 10; // 10px por cada 10 minutos
    const left = diaIdx * (100 / 5); // 20% por día

    return (
      <div
        ref={drag}
        className={`${styles.bloque} ${isDragging ? styles.dragging : ''} ${conflicto ? styles.conflicto : ''} ${esTemporal ? styles.temporal : ''}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: `${left}%`,
          width: `${100 / 5}%`,
          height: `${altura * 10}px`,
          backgroundColor: conflicto ? '#b91c1c' : esTemporal ? '#f59e0b' : '#1A6B35',
          color: '#fff',
          padding: '2px 4px',
          fontSize: '0.65rem',
          borderRadius: '2px',
          overflow: 'hidden',
          cursor: 'grab',
          zIndex: isDragging ? 100 : 10,
        }}
        title={`${bloque.materia_nombre || 'Materia'} ${conflicto ? '️ Conflicto' : ''}`}
      >
        <div className={styles.bloqueContent}>
          <strong>{bloque.materia_clave || bloque.materia_nombre?.slice(0, 15) || 'Materia'}</strong>
          {bloque.docente_apellidos && (
            <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>
              {bloque.docente_apellidos}
            </span>
          )}
          {esTemporal && (
            <button
              className={styles.btnEliminarBloque}
              onClick={(e) => {
                e.stopPropagation();
                eliminarBloque(bloque.id);
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* Resize handle (borde inferior) */}
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => {
            e.stopPropagation();
            const startY = e.clientY;
            const startHeight = altura * 10;
            const onMouseMove = (ev) => {
              const deltaY = ev.clientY - startY;
              const newHeight = Math.max(20, startHeight + deltaY);
              const newDuracionMinutos = Math.round(newHeight / 10) * 10;
              redimensionarBloque(bloque.id, newDuracionMinutos);
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        />
      </div>
    );
  };

  // ============================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================

  const renderGrid = () => {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className={styles.gridContainer} ref={gridRef}>
          <div className={styles.gridHeader}>
            <div className={styles.gridHeaderCell}>Hora</div>
            {DIAS.map((dia) => (
              <div key={dia} className={styles.gridHeaderCell}>{dia}</div>
            ))}
          </div>
          <div className={styles.gridBody} style={{ position: 'relative' }}>
            {horasGrid.map((hora, idx) => (
              <div key={idx} className={styles.gridRow}>
                <div className={styles.gridTimeCell}>{hora.label}</div>
                {DIAS.map((dia) => (
                  <CeldaDrop key={`${dia}-${idx}`} dia={dia} hora={hora.time}>
                    {/* Los bloques se renderizan en posición absoluta sobre el grid */}
                  </CeldaDrop>
                ))}
              </div>
            ))}
            {/* Renderizar bloques en posición absoluta */}
            {bloques.map((bloque) => (
              <BloqueDrag key={bloque.id} bloque={bloque} />
            ))}
          </div>
        </div>
      </DndProvider>
    );
  };

  // Modal de configuración
  const renderConfigModal = () => {
    if (!configModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setConfigModal(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Configuración de horarios</h3>
            <button className={styles.modalClose} onClick={() => setConfigModal(false)}>
              <X size={18} />
            </button>
          </div>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.field}>
              <label className={styles.label}>Duración de bloque (minutos)</label>
              <input
                type="number"
                className={styles.input}
                value={configForm.duracion_bloque_minutos || 50}
                onChange={(e) => setConfigForm({ ...configForm, duracion_bloque_minutos: parseInt(e.target.value) })}
              />
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Inicio de turno</label>
                <input
                  type="time"
                  className={styles.input}
                  value={configForm.hora_inicio_turno || '07:00'}
                  onChange={(e) => setConfigForm({ ...configForm, hora_inicio_turno: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fin de turno</label>
                <input
                  type="time"
                  className={styles.input}
                  value={configForm.hora_fin_turno || '13:00'}
                  onChange={(e) => setConfigForm({ ...configForm, hora_fin_turno: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Inicio de receso</label>
                <input
                  type="time"
                  className={styles.input}
                  value={configForm.receso_inicio || '09:30'}
                  onChange={(e) => setConfigForm({ ...configForm, receso_inicio: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Fin de receso</label>
                <input
                  type="time"
                  className={styles.input}
                  value={configForm.receso_fin || '10:00'}
                  onChange={(e) => setConfigForm({ ...configForm, receso_fin: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={configForm.receso_bloqueado || false}
                  onChange={(e) => setConfigForm({ ...configForm, receso_bloqueado: e.target.checked })}
                />
                Bloquear receso (no movible)
              </label>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setConfigModal(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.btnPrimary} onClick={handleGuardarConfiguracion}>
                Guardar configuración
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Selector de materia para crear bloques
  const renderMateriaSelector = () => {
    if (tabActiva !== 'grupos') return null;
    return (
      <div className={styles.materiaSelector}>
        <label className={styles.label}>Materia para nuevo bloque</label>
        <div className={styles.materiaSelectorRow}>
          <select
            className={styles.select}
            value={materiaSeleccionada}
            onChange={(e) => setMateriaSeleccionada(e.target.value)}
          >
            <option value="">Seleccionar materia...</option>
            {materiasDisponibles.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              if (!materiaSeleccionada) {
                setError('Selecciona una materia primero');
                return;
              }
              // Crear bloque en la primera celda disponible
              const dia = DIAS[0];
              const hora = horasGrid[0]?.time;
              if (hora) {
                crearBloque(dia, hora);
              }
            }}
            title="Crear bloque en la primera celda disponible"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Horarios</h1>
          <p className={styles.subtitle}>Gestión de horarios para grupos, maestros y laboratorios</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setConfigModal(true)}>
            <Settings size={16} /> Configuración
          </button>
          <button className={styles.btnSecondary} onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Regenerar automáticos
          </button>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${tabActiva === 'grupos' ? styles.tabActive : ''}`}
          onClick={() => setTabActiva('grupos')}
        >
          <Users size={16} /> Grupos
        </button>
        <button
          className={`${styles.tab} ${tabActiva === 'maestros' ? styles.tabActive : ''}`}
          onClick={() => setTabActiva('maestros')}
        >
          <User size={16} /> Maestros
        </button>
        <button
          className={`${styles.tab} ${tabActiva === 'laboratorios' ? styles.tabActive : ''}`}
          onClick={() => setTabActiva('laboratorios')}
        >
          <FlaskConical size={16} /> Laboratorios
        </button>
      </div>

      <div className={styles.selectorContainer}>
        {tabActiva === 'grupos' && (
          <select
            className={styles.select}
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar grupo...</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        )}
        {tabActiva === 'maestros' && (
          <select
            className={styles.select}
            value={docenteSeleccionado}
            onChange={(e) => setDocenteSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar maestro...</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
            ))}
          </select>
        )}
        {tabActiva === 'laboratorios' && (
          <select
            className={styles.select}
            value={laboratorioSeleccionado}
            onChange={(e) => setLaboratorioSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar laboratorio...</option>
            {laboratorios.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        )}
        {(grupoSeleccionado || docenteSeleccionado || laboratorioSeleccionado) && (
          <button className={styles.btnPrimary} onClick={handleGuardar} disabled={cargando}>
            <Save size={16} /> {cargando ? 'Guardando...' : 'Guardar horario'}
          </button>
        )}
      </div>

      {renderMateriaSelector()}

      <div className={styles.gridWrapper}>
        {cargando ? (
          <div className={styles.loading}>Cargando horario...</div>
        ) : (
          renderGrid()
        )}
      </div>

      <div className={styles.validationPanel}>
        <div className={styles.validationHeader}>
          <AlertCircle size={16} />
          <span>Validaciones</span>
        </div>
        <div className={styles.validationContent}>
          {bloques.some(b => tieneConflictos(b)) ? (
            <p className={styles.conflictoMsg}>️ Hay bloques en conflicto. Revisa las celdas marcadas en rojo.</p>
          ) : (
            <p> No hay conflictos detectados</p>
          )}
          {bloques.some(b => b.es_temporal) && (
            <p className={styles.temporalMsg}> Hay bloques temporales (naranja). Guarda el horario para confirmarlos.</p>
          )}
        </div>
      </div>

      {renderConfigModal()}
    </div>
  );
}