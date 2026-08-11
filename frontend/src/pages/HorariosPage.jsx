import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { Users, User, FlaskConical, RefreshCw, AlertCircle, Download, FileText, Upload } from 'lucide-react';
import styles from './HorariosPage.module.css';

export default function HorariosPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const [tabActiva, setTabActiva] = useState('grupos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [grupos, setGrupos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [docenteSeleccionado, setDocenteSeleccionado] = useState('');
  const [laboratorioSeleccionado, setLaboratorioSeleccionado] = useState('');

  // Estado para subida de archivos
  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [gruposRes, docentesRes, labsRes] = await Promise.all([
          catalogosService.getGrupos(),
          usuariosService.getAll({ rol: 'docente' }),
          catalogosService.getAulas(),
        ]);
        setGrupos(gruposRes.data || []);
        setDocentes(docentesRes.usuarios || []);
        setLaboratorios(labsRes.data || []);
        
        // Cargar horarios subidos
        await cargarHorariosSubidos();
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  // Cargar lista de horarios subidos
  const cargarHorariosSubidos = async () => {
    try {
      const res = await horariosService.listarHorarios();
      setArchivosSubidos(res.data || []);
    } catch (e) {
      console.error('Error cargando horarios subidos:', e);
    }
  };

  // Subir archivo
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Formato no permitido. Solo PDF o Excel (.xlsx, .xls)');
      e.target.value = '';
      return;
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10 MB');
      e.target.value = '';
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      // 1. Solicitar presigned URL al backend
      const res = await horariosService.solicitarUpload(file.name, file.type);
      if (!res.success) {
        throw new Error(res.message || 'Error al solicitar subida');
      }

      // 2. Subir archivo directamente a S3 usando la presigned URL
      await horariosService.subirArchivo(res.data.uploadUrl, file);
      
      // 3. Recargar lista de horarios
      await cargarHorariosSubidos();
      
      setExito('Horario subido correctamente');
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
      e.target.value = ''; // reset input
    }
  };

  // Descargar archivo
  const handleDescargar = async (key, nombre) => {
    setDescargando(true);
    try {
      const res = await horariosService.solicitarDescarga(key);
      if (!res.success) {
        throw new Error(res.message || 'Error al obtener URL de descarga');
      }

      // Abrir en nueva pestaña
      window.open(res.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      setError(err.message || 'Error al descargar el archivo');
    } finally {
      setDescargando(false);
    }
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

      {/* Tabs */}
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

      {/* Selector de elemento (para visualización futura) */}
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

      {/* Lista de horarios subidos */}
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
    </div>
  );
}