import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, Download, FileText, Upload } from 'lucide-react';
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

  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);

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
        setConfigForm(configRes.data || {});
        setGrupos(gruposRes.data || []);
        setDocentes(docentesRes.usuarios || []);
        setLaboratorios(labsRes.data || []);
        
        await cargarHorariosSubidos();
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  const cargarHorariosSubidos = async () => {
    try {
      const res = await horariosService.listarHorarios();
      if (res.success) {
        setArchivosSubidos(res.data || []);
      } else {
        setArchivosSubidos([]);
      }
    } catch (e) {
      console.error('Error cargando horarios subidos:', e);
      setArchivosSubidos([]);
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

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Formato no permitido. Solo PDF o Excel (.xlsx, .xls)');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10 MB');
      e.target.value = '';
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      const res = await horariosService.solicitarUpload(file.name, file.type);
      if (!res.success) {
        throw new Error(res.message || 'Error al solicitar subida');
      }

      const uploadRes = await horariosService.subirArchivo(res.data.uploadUrl, file);
      if (!uploadRes.ok) {
        throw new Error(`Error al subir archivo: ${uploadRes.status}`);
      }
      
      await cargarHorariosSubidos();
      setExito('Horario subido correctamente');
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  };

  const handleDescargar = async (key, nombre) => {
    setDescargando(true);
    try {
      const res = await horariosService.solicitarDescarga(key);
      if (!res.success) {
        throw new Error(res.message || 'Error al obtener URL de descarga');
      }
      window.open(res.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      setError(err.message || 'Error al descargar el archivo');
    } finally {
      setDescargando(false);
    }
  };

  const renderConfigModal = () => {
    if (!configModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setConfigModal(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Configuración de horarios</h3>
            <button className={styles.modalClose} onClick={() => setConfigModal(false)}>
              <span>×</span>
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
          <label className={styles.btnUpload}>
            <Upload size={16} />
            {subiendo ? 'Subiendo...' : 'Subir horario'}
            <input
              type="file"
              accept=".pdf,.xlsx,.xls"
              onChange={handleUpload}
              disabled={subiendo}
              style={{ display: 'none' }}
            />
          </label>
          <button className={styles.btnSecondary} onClick={cargarHorariosSubidos}>
            <RefreshCw size={16} /> Actualizar
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
      </div>

      <div className={styles.horariosSection}>
        <h3 className={styles.sectionTitle}>Horarios subidos</h3>
        {cargando ? (
          <div className={styles.loading}>Cargando horarios...</div>
        ) : archivosSubidos.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={32} />
            <p>No hay horarios subidos</p>
            <p className={styles.emptySub}>Haz clic en "Subir horario" para agregar un archivo PDF o Excel</p>
          </div>
        ) : (
          <div className={styles.archivosGrid}>
            {archivosSubidos.map((archivo) => (
              <div key={archivo.id} className={styles.archivoCard}>
                <div className={styles.archivoInfo}>
                  <FileText size={20} />
                  <span className={styles.archivoNombre}>{archivo.nombre}</span>
                  <span className={styles.archivoFecha}>
                    {new Date(archivo.fecha).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  className={styles.btnDescargar}
                  onClick={() => handleDescargar(archivo.key, archivo.nombre)}
                  disabled={descargando}
                  title="Descargar"
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderConfigModal()}
    </div>
  );
}