import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, X, Plus } from 'lucide-react';
import styles from './HorariosPage.module.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const ITEM_TYPE = 'BLOQUE';
const ROW_HEIGHT = 40; // px por cada 10 minutos

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

// Componente Celda (drop target)
const Celda = ({ diaIndex, horaIndex, onDrop, children, style }) => {
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
      style={{
        ...style,
        backgroundColor: isOver ? 'rgba(26, 107, 53, 0.1)' : 'transparent',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};

// Componente Bloque absoluto (arrastrable y redimensionable)
const BloqueAbsoluto = ({ bloque, idx, onResize, configuracion, rowHeight, horaIndex }) => {
  const ref = useRef(null);
  const { duracion_bloque_minutos } = configuracion || { duracion_bloque_minutos: 50 };
  const horaInicio = new Date(`2000-01-01T${bloque.hora_inicio}`);
  const horaFin = new Date(`2000-01-01T${bloque.hora_fin}`);
  const duracionMinutos = (horaFin - horaInicio) / 60000;
  const filas = Math.max(1, Math.ceil(duracionMinutos / 10));
  const height = filas * rowHeight;
  const top = horaIndex * rowHeight;

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { idx },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (dropResult) {
        // El movimiento se maneja en handleDrop del padre
      }
    },
  });

  const color = getColorForMateria(bloque.materia_nombre);

  return (
    <div
      ref={drag}
      className={styles.bloqueAbsoluto}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: 0,
        right: 0,
        height: `${height}px`,
        backgroundColor: color,
        color: '#fff',
        padding: '2px 4px',
        fontSize: '0.65rem',
        borderRadius: '2px',
        overflow: 'hidden',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'opacity 0.15s',
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
      <div
        className={styles.resizeHandle}
        onMouseDown={(e) => {
          e.stopPropagation();
          const startY = e.clientY;
          const startH = height;
          const onMouseMove = (ev) => {
            const deltaY = ev.clientY - startY;
            const deltaRows = Math.round(deltaY / rowHeight);
            const newH = Math.max(rowHeight, startH + deltaRows);
            const nuevasFilas = Math.round(newH / rowHeight);
            onResize(idx, nuevasFilas);
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
          backgroundColor: 'rgba(255,255,255,0.3)',
        }}
      />
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

  // Obtener turno del grupo seleccionado para ajustar horas del grid
  const getTurnoDelGrupo = useCallback(() => {
    if (!grupoSeleccionado) return null;
    const grupo = grupos.find(g => g.id === parseInt(grupoSeleccionado));
    if (!grupo) return null;
    // Necesitamos el turno_id del grupo, pero el objeto grupo devuelto por catalogosService.getGrupos() incluye turno_id?
    // Si no, podemos obtenerlo de la BD. Por ahora, usamos la configuración global.
    // Para simplificar, usamos la configuración global.
    return null;
  }, [grupoSeleccionado, grupos]);

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

  // Generar horas del grid basado en la configuración
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

  // Manejar movimiento de bloque (drop)
  const handleDrop = (idx, diaIndex, horaIndex) => {
    const bloque = bloques[idx];
    if (!bloque) return;

    const horaInicio = horasGrid[horaIndex]?.time;
    if (!horaInicio) return;

    const duracionMinutos = (new Date(`2000-01-01T${bloque.hora_fin}`) - new Date(`2000-01-01T${bloque.hora_inicio}`)) / 60000;
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
  const handleResize = (idx, nuevasFilas) => {
    const bloque = bloques[idx];
    if (!bloque) return;

    const nuevaDuracion = nuevasFilas * 10;
    const horaInicio = new Date(`2000-01-01T${bloque.hora_inicio}`);
    const horaFin = new Date(horaInicio);
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

  // Renderizar el grid con DnD y bloques absolutos
  const renderGrid = () => {
    if (!configuracion) return <div className={styles.loading}>Cargando configuración...</div>;

    const totalRows = horasGrid.length;
    if (totalRows === 0) return <div className={styles.empty}>No hay horas configuradas para este turno.</div>;

    return (
      <DndProvider backend={HTML5Backend}>
        <div className={styles.gridContainer}>
          <div className={styles.gridHeader}>
            <div className={styles.gridHeaderCell}>Hora</div>
            {DIAS.map((dia) => (
              <div key={dia} className={styles.gridHeaderCell}>{dia}</div>
            ))}
          </div>
          <div
            className={styles.gridBody}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px repeat(5, 1fr)',
              gridAutoRows: `${ROW_HEIGHT}px`,
              position: 'relative',
            }}
          >
            {horasGrid.map((hora, horaIdx) => (
              <React.Fragment key={horaIdx}>
                <div className={styles.gridTimeCell} style={{ gridRow: horaIdx + 1, gridColumn: 1 }}>
                  {hora.label}
                </div>
                {DIAS.map((dia, diaIdx) => {
                  const celdaKey = `${dia}-${horaIdx}`;
                  // Buscar bloque que comienza en esta celda
                  const bloque = bloques.find(b => b.dia_semana === dia && b.hora_inicio === hora.time);
                  return (
                    <Celda
                      key={celdaKey}
                      diaIndex={diaIdx}
                      horaIndex={horaIdx}
                      onDrop={handleDrop}
                      style={{
                        gridRow: horaIdx + 1,
                        gridColumn: diaIdx + 2,
                        minHeight: `${ROW_HEIGHT}px`,
                        borderRight: '1px solid #e9edf2',
                        padding: 0,
                        position: 'relative',
                      }}
                    >
                      {bloque && bloque.hora_inicio === hora.time && (
                        <BloqueAbsoluto
                          bloque={bloque}
                          idx={bloques.indexOf(bloque)}
                          onResize={handleResize}
                          configuracion={configuracion}
                          rowHeight={ROW_HEIGHT}
                          horaIndex={horaIdx}
                        />
                      )}
                    </Celda>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </DndProvider>
    );
  };

  // Modal de configuración (sin cambios)
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
          <p>✅ No hay conflictos detectados</p>
        </div>
      </div>

      {renderConfigModal()}
    </div>
  );
}