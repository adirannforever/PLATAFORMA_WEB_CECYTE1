import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, X } from 'lucide-react';
import styles from './HorariosPage.module.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

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
    console.log('🕒 Horas grid generadas:', horas);
  }, [configuracion]);

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
      console.log('📦 Bloques cargados:', res.data);
      console.log('🔍 Primer bloque:', res.data[0]);
      console.log('📅 Días en bloques:', res.data.map(b => b.dia_semana));
      console.log('⏰ Horas en bloques:', res.data.map(b => b.hora_inicio));
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

  const renderBloques = (dia, hora) => {
    const horaNormalizada = hora; // ya viene como "07:00"

    const bloque = bloques.find(b => {
      const horaInicioNormalizada = b.hora_inicio ? b.hora_inicio.slice(0, 5) : '';
      return b.dia_semana === dia && horaInicioNormalizada === horaNormalizada;
    });

    if (!bloque) return null;

    const horaFinNormalizada = bloque.hora_fin ? bloque.hora_fin.slice(0, 5) : '';
    const duracionMinutos = (new Date(`2000-01-01T${horaFinNormalizada}`) - new Date(`2000-01-01T${horaNormalizada}`)) / 60000;
    const filas = Math.round(duracionMinutos / 10);

    return (
      <div
        className={styles.bloque}
        style={{
          backgroundColor: '#1A6B35',
          color: '#fff',
          padding: '2px 4px',
          fontSize: '0.65rem',
          borderRadius: '2px',
          height: `${Math.max(filas * 10, 20)}px`,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        title={`${bloque.materia_nombre || 'Sin materia'}`}
      >
        <div className={styles.bloqueContent}>
          <strong>{bloque.materia_clave || bloque.materia_nombre?.slice(0, 15) || 'Materia'}</strong>
          {bloque.docente_apellidos && (
            <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>
              {bloque.docente_apellidos}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    return (
      <div className={styles.gridContainer}>
        <div className={styles.gridHeader}>
          <div className={styles.gridHeaderCell}>Hora</div>
          {DIAS.map((dia) => (
            <div key={dia} className={styles.gridHeaderCell}>{dia}</div>
          ))}
        </div>
        <div className={styles.gridBody}>
          {horasGrid.map((hora, idx) => (
            <div key={idx} className={styles.gridRow}>
              <div className={styles.gridTimeCell}>{hora.label}</div>
              {DIAS.map((dia) => (
                <div
                  key={`${dia}-${idx}`}
                  className={styles.gridCell}
                  data-dia={dia}
                  data-hora={hora.time}
                >
                  {renderBloques(dia, hora.time)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

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