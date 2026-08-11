import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { Settings, Users, User, FlaskConical, RefreshCw, Save, AlertCircle, Download, FileText, Upload, X, Plus } from 'lucide-react';
import styles from './HorariosPage.module.css';

export default function HorariosPage() {
  const { usuario } = useAuth();

  // Estados base
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Catálogos
  const [grupos, setGrupos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);

  // Tipo de horario (alumnos, maestros, laboratorios)
  const [tipoHorario, setTipoHorario] = useState('alumnos');

  // Filtros de turno
  const [filtroTurno, setFiltroTurno] = useState('todos'); // 'todos', '1', '2'

  // Filtros para listado
  const [filtros, setFiltros] = useState({
    tipo_horario: 'alumnos',
    ciclo_id: '',
    semestre: '',
    letra: '',
    especialidad_id: '',
    turno_id: '',
    docente_id: '',
    laboratorio_id: '',
  });

  // Archivos subidos
  const [archivosSubidos, setArchivosSubidos] = useState([]);

  // Modal de subida
  const [modalUploadOpen, setModalUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombre: '',
    tipo: '',
    tipo_horario: 'alumnos',
    ciclo_id: '',
    semestre: '',
    letra: '',
    especialidad_id: '',
    turno_id: '',
    docente_id: '',
    laboratorio_id: '',
    archivo: null,
  });
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [gruposRes, docentesRes, labsRes, ciclosRes, espRes, turnRes] = await Promise.all([
          catalogosService.getGrupos(),
          usuariosService.getAll({ rol: 'docente' }),
          catalogosService.getAulas(),
          catalogosService.getCiclos(),
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
        ]);
        setGrupos(gruposRes.data || []);
        setDocentes(docentesRes.usuarios || []);
        setLaboratorios(labsRes.data || []);
        setCiclos(ciclosRes.data || []);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        setError('No se pudieron cargar los catálogos');
      }
    };
    cargarCatalogos();
  }, []);

  // Cargar horarios con filtros
  const cargarHorarios = useCallback(async () => {
    setCargando(true);
    try {
      const params = { ...filtros };
      // Si el filtro de turno es 'todos', no enviar turno_id
      if (filtroTurno === 'todos') {
        delete params.turno_id;
      } else {
        params.turno_id = parseInt(filtroTurno);
      }
      // Limpiar filtros vacíos
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      const res = await horariosService.listarHorarios(params);
      if (res.success) {
        setArchivosSubidos(res.data || []);
      }
    } catch (e) {
      console.error('Error cargando horarios:', e);
      setError('No se pudieron cargar los horarios');
    } finally {
      setCargando(false);
    }
  }, [filtros, filtroTurno]);

  useEffect(() => {
    cargarHorarios();
  }, [cargarHorarios]);

  // Manejar cambios en filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Manejar click en botones de turno
  const handleTurnoClick = (turno) => {
    setFiltroTurno(turno);
  };

  // Abrir modal de subida
  const handleAbrirUpload = () => {
    setUploadForm({
      nombre: '',
      tipo: '',
      tipo_horario: tipoHorario,
      ciclo_id: '',
      semestre: '',
      letra: '',
      especialidad_id: '',
      turno_id: '',
      docente_id: '',
      laboratorio_id: '',
      archivo: null,
    });
    setModalUploadOpen(true);
    setError('');
  };

  // Subir archivo
  const handleUpload = async (e) => {
    e.preventDefault();
    const file = uploadForm.archivo;
    if (!file) {
      setError('Selecciona un archivo');
      return;
    }

    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Formato no permitido. Solo PDF o Excel (.xlsx, .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10 MB');
      return;
    }

    // Validar campos según tipo_horario
    const { tipo_horario, ciclo_id, semestre, letra, especialidad_id, turno_id, docente_id, laboratorio_id } = uploadForm;
    if (tipo_horario === 'alumnos' && (!ciclo_id || !semestre || !letra || !especialidad_id || !turno_id)) {
      setError('Para horario de alumnos, completa ciclo, semestre, letra, especialidad y turno');
      return;
    }
    if (tipo_horario === 'maestros' && (!ciclo_id || !docente_id)) {
      setError('Para horario de maestros, completa ciclo y docente');
      return;
    }
    if (tipo_horario === 'laboratorios' && (!ciclo_id || !laboratorio_id)) {
      setError('Para horario de laboratorios, completa ciclo y laboratorio');
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      const data = {
        nombre: file.name,
        tipo: file.type,
        tipo_horario: uploadForm.tipo_horario,
        ciclo_id: uploadForm.ciclo_id || null,
        semestre: uploadForm.semestre || null,
        letra: uploadForm.letra || null,
        especialidad_id: uploadForm.especialidad_id || null,
        turno_id: uploadForm.turno_id || null,
        docente_id: uploadForm.docente_id || null,
        laboratorio_id: uploadForm.laboratorio_id || null,
      };

      const res = await horariosService.solicitarUpload(data);
      if (!res.success) {
        throw new Error(res.message || 'Error al solicitar subida');
      }

      const uploadRes = await horariosService.subirArchivo(res.data.uploadUrl, file);
      if (!uploadRes.ok) {
        throw new Error(`Error al subir archivo: ${uploadRes.status}`);
      }

      setModalUploadOpen(false);
      await cargarHorarios();
      setExito('Horario subido correctamente');
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      console.error('Error al subir archivo:', err);
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
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
      window.open(res.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      setError(err.message || 'Error al descargar el archivo');
    } finally {
      setDescargando(false);
    }
  };

  // Renderizar semestres según ciclo actual
  const getSemestresParaCiclo = () => {
    // Esto podría ser dinámico según el ciclo seleccionado
    // Por simplicidad, mostramos 1-6
    return [1, 2, 3, 4, 5, 6];
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
          <button className={styles.btnUpload} onClick={handleAbrirUpload}>
            <Upload size={16} /> Subir horario
          </button>
          <button className={styles.btnSecondary} onClick={cargarHorarios}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabs: tipo de horario */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${tipoHorario === 'alumnos' ? styles.tabActive : ''}`}
          onClick={() => {
            setTipoHorario('alumnos');
            setFiltros(prev => ({ ...prev, tipo_horario: 'alumnos', docente_id: '', laboratorio_id: '' }));
          }}
        >
          <Users size={16} /> Alumnos
        </button>
        <button
          className={`${styles.tab} ${tipoHorario === 'maestros' ? styles.tabActive : ''}`}
          onClick={() => {
            setTipoHorario('maestros');
            setFiltros(prev => ({ ...prev, tipo_horario: 'maestros', letra: '', semestre: '', especialidad_id: '', turno_id: '', laboratorio_id: '' }));
          }}
        >
          <User size={16} /> Maestros
        </button>
        <button
          className={`${styles.tab} ${tipoHorario === 'laboratorios' ? styles.tabActive : ''}`}
          onClick={() => {
            setTipoHorario('laboratorios');
            setFiltros(prev => ({ ...prev, tipo_horario: 'laboratorios', letra: '', semestre: '', especialidad_id: '', turno_id: '', docente_id: '' }));
          }}
        >
          <FlaskConical size={16} /> Laboratorios
        </button>
      </div>

      {/* Botones de turno (Matutino, Vespertino, Todos) */}
      <div className={styles.turnoButtons}>
        <button
          className={`${styles.turnoBtn} ${filtroTurno === 'todos' ? styles.turnoBtnActive : ''}`}
          onClick={() => handleTurnoClick('todos')}
        >
          Todos
        </button>
        <button
          className={`${styles.turnoBtn} ${filtroTurno === '1' ? styles.turnoBtnActive : ''}`}
          onClick={() => handleTurnoClick('1')}
        >
          Matutino
        </button>
        <button
          className={`${styles.turnoBtn} ${filtroTurno === '2' ? styles.turnoBtnActive : ''}`}
          onClick={() => handleTurnoClick('2')}
        >
          Vespertino
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filtrosContainer}>
        <div className={styles.filtrosGrid}>
          {/* Ciclo */}
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Ciclo</label>
            <select
              className={styles.select}
              name="ciclo_id"
              value={filtros.ciclo_id}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {ciclos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Semestre (solo para alumnos) */}
          {tipoHorario === 'alumnos' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Semestre</label>
              <select
                className={styles.select}
                name="semestre"
                value={filtros.semestre}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {getSemestresParaCiclo().map(s => (
                  <option key={s} value={s}>{s}°</option>
                ))}
              </select>
            </div>
          )}

          {/* Letra (solo para alumnos) */}
          {tipoHorario === 'alumnos' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Grupo</label>
              <select
                className={styles.select}
                name="letra"
                value={filtros.letra}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          )}

          {/* Especialidad (solo para alumnos) */}
          {tipoHorario === 'alumnos' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Especialidad</label>
              <select
                className={styles.select}
                name="especialidad_id"
                value={filtros.especialidad_id}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                {especialidades.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Turno (solo para alumnos) */}
          {tipoHorario === 'alumnos' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Turno</label>
              <select
                className={styles.select}
                name="turno_id"
                value={filtros.turno_id}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="1">Matutino</option>
                <option value="2">Vespertino</option>
              </select>
            </div>
          )}

          {/* Docente (solo para maestros) */}
          {tipoHorario === 'maestros' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Docente</label>
              <select
                className={styles.select}
                name="docente_id"
                value={filtros.docente_id}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {docentes.map(d => (
                  <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Laboratorio (solo para laboratorios) */}
          {tipoHorario === 'laboratorios' && (
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Laboratorio</label>
              <select
                className={styles.select}
                name="laboratorio_id"
                value={filtros.laboratorio_id}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                {laboratorios.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <button className={styles.btnLimpiar} onClick={() => {
            setFiltros({
              tipo_horario: tipoHorario,
              ciclo_id: '',
              semestre: '',
              letra: '',
              especialidad_id: '',
              turno_id: '',
              docente_id: '',
              laboratorio_id: '',
            });
            setFiltroTurno('todos');
          }}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Lista de horarios */}
      <div className={styles.horariosSection}>
        <h3 className={styles.sectionTitle}>
          Horarios subidos ({archivosSubidos.length})
        </h3>
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
                  <div className={styles.archivoMeta}>
                    {archivo.tipo_horario === 'alumnos' && (
                      <span className={styles.metaBadge}>
                        {archivo.semestre}° {archivo.letra} - {archivo.especialidad_nombre || 'Sin especialidad'}
                      </span>
                    )}
                    {archivo.tipo_horario === 'maestros' && archivo.docente_nombre && (
                      <span className={styles.metaBadge}>
                        {archivo.docente_apellidos}, {archivo.docente_nombre}
                      </span>
                    )}
                    {archivo.tipo_horario === 'laboratorios' && archivo.laboratorio_nombre && (
                      <span className={styles.metaBadge}>
                        {archivo.laboratorio_nombre}
                      </span>
                    )}
                    <span className={styles.archivoFecha}>
                      {new Date(archivo.fecha).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
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

      {/* Modal de subida */}
      {modalUploadOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalUploadOpen(false)}>
          <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Subir horario</h3>
              <button className={styles.modalClose} onClick={() => setModalUploadOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleUpload} className={styles.form}>
              {/* Tipo de horario (fijo según la pestaña) */}
              <div className={styles.field}>
                <label className={styles.label}>Tipo de horario</label>
                <select
                  className={styles.select}
                  value={uploadForm.tipo_horario}
                  onChange={(e) => setUploadForm({ ...uploadForm, tipo_horario: e.target.value })}
                >
                  <option value="alumnos">Alumnos</option>
                  <option value="maestros">Maestros</option>
                  <option value="laboratorios">Laboratorios</option>
                </select>
              </div>

              {/* Archivo */}
              <div className={styles.field}>
                <label className={styles.label}>Archivo *</label>
                <input
                  type="file"
                  className={styles.fileInput}
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setUploadForm({ ...uploadForm, archivo: e.target.files[0] })}
                  required
                />
                {uploadForm.archivo && (
                  <span className={styles.fileName}>{uploadForm.archivo.name}</span>
                )}
              </div>

              {/* Ciclo */}
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar *</label>
                <select
                  className={styles.select}
                  value={uploadForm.ciclo_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, ciclo_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar ciclo...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Campos según tipo_horario */}
              {uploadForm.tipo_horario === 'alumnos' && (
                <>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Semestre *</label>
                      <select
                        className={styles.select}
                        value={uploadForm.semestre}
                        onChange={(e) => setUploadForm({ ...uploadForm, semestre: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {getSemestresParaCiclo().map(s => (
                          <option key={s} value={s}>{s}°</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Grupo (letra) *</label>
                      <select
                        className={styles.select}
                        value={uploadForm.letra}
                        onChange={(e) => setUploadForm({ ...uploadForm, letra: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Especialidad *</label>
                      <select
                        className={styles.select}
                        value={uploadForm.especialidad_id}
                        onChange={(e) => setUploadForm({ ...uploadForm, especialidad_id: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {especialidades.map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Turno *</label>
                      <select
                        className={styles.select}
                        value={uploadForm.turno_id}
                        onChange={(e) => setUploadForm({ ...uploadForm, turno_id: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        <option value="1">Matutino</option>
                        <option value="2">Vespertino</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {uploadForm.tipo_horario === 'maestros' && (
                <div className={styles.field}>
                  <label className={styles.label}>Docente *</label>
                  <select
                    className={styles.select}
                    value={uploadForm.docente_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, docente_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar docente...</option>
                    {docentes.map(d => (
                      <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {uploadForm.tipo_horario === 'laboratorios' && (
                <div className={styles.field}>
                  <label className={styles.label}>Laboratorio *</label>
                  <select
                    className={styles.select}
                    value={uploadForm.laboratorio_id}
                    onChange={(e) => setUploadForm({ ...uploadForm, laboratorio_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar laboratorio...</option>
                    {laboratorios.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalUploadOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={subiendo}>
                  {subiendo ? 'Subiendo...' : 'Subir horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}