import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, X, Plus } from 'lucide-react';
import styles from './HorariosPage.module.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const ITEM_TYPE = 'BLOQUE';

// Asignar colores por materia
const getColorForMateria = (nombre) => {
  if (!nombre) return '#1A6B35';
  const hash = nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    '#1A6B35', '#2563eb', '#dc2626', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#d946ef', '#ef4444', '#22c55e', '#eab308'
  ];
  return colors[hash % colors.length];
};

// Componente Bloque individual (con drag y resize)
const Bloque = ({ bloque, idx, onMove, onResize, onDrop, configuracion }) => {
  const ref = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);

  // Drag
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: bloque.id || idx, idx, bloque },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (dropResult && onDrop) {
        onDrop(item.idx, dropResult.diaIndex, dropResult.horaIndex);
      }
    },
  });

  // Resize (simulado con mouse events)
  const handleMouseDown = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    const startY = e.clientY;
    const startH = bloque.altura || 1;

    const onMouseMove = (ev) => {
      const deltaY = ev.clientY - startY;
      const deltaRows = Math.round(deltaY / 10); // cada fila = 10px
      const newH = Math.max(1, startH + deltaRows);
      onResize(idx, newH);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const color = getColorForMateria(bloque.materia_nombre);
  const { duracion_bloque_minutos } = configuracion || { duracion_bloque_minutos: 50 };
  const horas = Math.ceil((bloque.h || 1) * duracion_bloque_minutos / 60);

  return (
    <div
      ref={drag}
      className={`${styles.bloque} ${isDragging ? styles.bloqueDragging : ''}`}
      style={{
        backgroundColor: color,
        color: '#fff',
        gridRow: `span ${bloque.h || 1}`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        position: 'relative',
        borderRadius: '2px',
        padding: '2px 4px',
        fontSize: '0.65rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '20px',
        width: '100%',
        height: '100%',
      }}
      title={`${bloque.materia_nombre || 'Sin materia'} (${bloque.hora_inicio} - ${bloque.hora_fin})`}
    >
      <div className={styles.bloqueContent}>
        <strong>{bloque.materia_clave || bloque.materia_nombre?.slice(0, 12) || 'Materia'}</strong>
        <span className={styles.bloqueHoras}>
          {bloque.hora_inicio} - {bloque.hora_fin}
        </span>
        {bloque.docente_apellidos && (
          <span className={styles.bloqueDocente}>{bloque.docente_apellidos}</span>
        )}
      </div>
      {/* Handle de redimension (borde inferior) */}
      <div
        className={styles.resizeHandle}
        onMouseDown={(e) => handleMouseDown(e, 'bottom')}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
          backgroundColor: 'rgba(255,255,255,0.2)',
        }}
      />
    </div>
  );
};

// Componente Celda del grid (drop target)
const Celda = ({ diaIndex, horaIndex, children, onDrop }) => {
  const ref = useRef(null);
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: () => ({ diaIndex, horaIndex }),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`${styles.gridCell} ${isOver ? styles.gridCellHover : ''}`}
      data-dia={DIAS[diaIndex]}
      style={{
        minHeight: '40px',
        borderRight: '1px solid #e9edf2',
        padding: '2px',
        position: 'relative',
        verticalAlign: 'top',
        backgroundColor: isOver ? 'rgba(26, 107, 53, 0.1)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
};

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

  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [docenteSeleccionado, setDocenteSeleccionado] = useState('');
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState('');

  const [bloques, setBloques] = useState([]);
  const [horasGrid, setHorasGrid] = useState([]);
  const [materiasDisponibles, setMateriasDisponibles] = useState([]);

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
        setConfigForm(configRes.data || {});
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  // Generar horas del grid
  useEffect(() => {
    if (!configuracion) return;
    const { hora_inicio_turno, hora_fin_turno } = configuracion;
    const horas = [];
    let current = new Date(`2000-01-01T${hora_inicio_turno}`);
    const fin = new Date(`2000-01-01T${hora_fin_turno}`);
    const pasoMinutos = 10;

    while (current < fin) {
      horas.push({
        time: current.toTimeString().slice(0, 5),
        label: current.toTimeString().slice(0, 5),
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
      setBloques(res.data || []);
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

  // Manejar movimiento de bloque
  const handleDrop = (idx, diaIndex, horaIndex) => {
    const bloque = bloques[idx];
    if (!bloque) return;

    // Calcular nueva hora basada en el índice de fila
    const horaInicio = horasGrid[horaIndex]?.time;
    if (!horaInicio) return;

    const duracionMinutos = (new Date(`2000-01-01T${bloque.hora_fin}`) - new Date(`2000-01-01T${bloque.hora_inicio}`)) / 60000;
    const filasOcupadas = Math.ceil(duracionMinutos / 10);
    const horaFin = new Date(`2000-01-01T${horaInicio}`);
    horaFin.setMinutes(horaFin.getMinutes() + duracionMinutos);

    const nuevoBloque = {
      ...bloque,
      dia_semana: DIAS[diaIndex],
      hora_inicio: horaInicio,
      hora_fin: horaFin.toTimeString().slice(0, 5),
    };

    const nuevosBloques = [...bloques];
    nuevosBloques[idx] = nuevoBloque;
    setBloques(nuevosBloques);
  };

  // Manejar redimension de bloque
  const handleResize = (idx, newH) => {
    const bloque = bloques[idx];
    if (!bloque) return;

    const duracionBase = (new Date(`2000-01-01T${bloque.hora_fin}`) - new Date(`2000-01-01T${bloque.hora_inicio}`)) / 60000;
    const nuevaDuracion = Math.max(10, newH * 10);
    const horaInicio = bloque.hora_inicio;
    const horaFin = new Date(`2000-01-01T${horaInicio}`);
    horaFin.setMinutes(horaFin.getMinutes() + nuevaDuracion);

    const nuevoBloque = {
      ...bloque,
      hora_fin: horaFin.toTimeString().slice(0, 5),
    };

    const nuevosBloques = [...bloques];
    nuevosBloques[idx] = nuevoBloque;
    setBloques(nuevosBloques);
  };

  // Guardar horario
  const handleGuardar = async () => {
    setCargando(true);
    try {
      await horariosService.guardarHorarioGrupo(grupoSeleccionado, bloques);
      setExito('Horario guardado correctamente');
      setTimeout(() => setExito(''), 4000);
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

  // Renderizar el grid con DnD
  const renderGrid = () => {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className={styles.gridContainer}>
          <div className={styles.gridHeader}>
            <div className={styles.gridHeaderCell}>Hora</div>
            {DIAS.map((dia) => (
              <div key={dia} className={styles.gridHeaderCell}>{dia}</div>
            ))}
          </div>
          <div className={styles.gridBody}>
            {horasGrid.map((hora, horaIdx) => (
              <div key={horaIdx} className={styles.gridRow}>
                <div className={styles.gridTimeCell}>{hora.label}</div>
                {DIAS.map((dia, diaIdx) => {
                  // Buscar bloques en esta celda
                  const bloqueIdx = bloques.findIndex(b =>
                    b.dia_semana === dia && b.hora_inicio === hora.time
                  );
                  const bloque = bloqueIdx !== -1 ? bloques[bloqueIdx] : null;

                  return (
                    <Celda
                      key={`${dia}-${horaIdx}`}
                      diaIndex={diaIdx}
                      horaIndex={horaIdx}
                      onDrop={handleDrop}
                    >
                      {bloque && (
                        <Bloque
                          bloque={bloque}
                          idx={bloqueIdx}
                          onMove={() => {}}
                          onResize={handleResize}
                          onDrop={handleDrop}
                          configuracion={configuracion}
                        />
                      )}
                    </Celda>
                  );
                })}
              </div>
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
          <p> No hay conflictos detectados</p>
        </div>
      </div>

      {renderConfigModal()}
    </div>
  );
}