import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { horariosService, catalogosService, usuariosService } from '../services/api';
import { 
  Settings, Users, User, FlaskConical, RefreshCw, 
  Download, FileText, Upload, Edit2, Trash2, X, 
  Plus, Filter, CheckCircle, AlertCircle, Save,
  Clock
} from 'lucide-react';
import styles from './HorariosPage.module.css';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function HorariosPage() {
  const { usuario } = useAuth();
  const { isAdmin, isDocente, isAlumno } = usePermissions();

  // ===== ESTADOS BÁSICOS =====
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // ===== ADMIN: estados completos =====
  const [tabActiva, setTabActiva] = useState('grupos');
  const [ciclos, setCiclos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [semestreActual, setSemestreActual] = useState({ semestres: [2, 4, 6] });
  const [cicloSeleccionado, setCicloSeleccionado] = useState(null);

  const [filtros, setFiltros] = useState({
    turno: 'todos',
    ciclo_id: '',
    semestre: '',
    grupo_letra: '',
    especialidad_id: '',
    search: '',
  });

  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [contadorFaltantes, setContadorFaltantes] = useState({ total: 0, subidos: 0, faltantes: 0, porcentaje: 0 });

  // ===== ADMIN: modales =====
  const [modalUploadOpen, setModalUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    nombre: '',
    semestre: '',
    letra: '',
    ciclo_id: '',
    especialidad_id: '',
    turno_id: '',
    tipo_horario: 'grupo',
    descripcion: '',
  });
  const [grupoEncontrado, setGrupoEncontrado] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const [modalBatchOpen, setModalBatchOpen] = useState(false);
  const [batchItems, setBatchItems] = useState([]);
  const [batchForm, setBatchForm] = useState({
    semestre: '',
    letra: '',
    ciclo_id: '',
    especialidad_id: '',
    turno_id: '',
    tipo_horario: 'grupo',
    descripcion: '',
    archivos: [],
  });
  const [batchGrupoEncontrado, setBatchGrupoEncontrado] = useState(null);
  const [batchSubiendo, setBatchSubiendo] = useState(false);

  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({
    semestre: '',
    letra: '',
    ciclo_id: '',
    especialidad_id: '',
    turno_id: '',
    tipo_horario: '',
    descripcion: '',
  });
  const [editGrupoEncontrado, setEditGrupoEncontrado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

  // ===== ESTADOS PARA VISTA DE DOCENTE/ALUMNO =====
  const [horariosUsuario, setHorariosUsuario] = useState([]);
  const [cargandoUsuario, setCargandoUsuario] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState('');

  // ===== SOLO ADMIN: cargar datos =====
  useEffect(() => {
    if (!isAdmin) return;

    const cargarSemestreActual = async () => {
      try {
        const res = await horariosService.getSemestreActual();
        if (res.success) {
          setSemestreActual(res.data);
        }
      } catch (e) {
        console.error('Error cargando semestre actual:', e);
      }
    };
    cargarSemestreActual();

    const cargarCatalogos = async () => {
      try {
        const [ciclosRes, espRes, turnRes, gruposRes, docentesRes, labsRes] = await Promise.all([
          catalogosService.getCiclos(),
          catalogosService.getEspecialidades(),
          catalogosService.getTurnos(),
          catalogosService.getGrupos(),
          usuariosService.getAll({ rol: 'docente' }),
          catalogosService.getAulas(),
        ]);
        setCiclos(ciclosRes.data || []);
        setEspecialidades(espRes.data || []);
        setTurnos(turnRes.data || []);
        setGrupos(gruposRes.data || []);
        setDocentes(docentesRes.usuarios || []);
        setLaboratorios(labsRes.data || []);

        const activo = ciclosRes.data?.find(c => c.activo);
        if (activo) {
          setCicloSeleccionado(activo);
          setFiltros(prev => ({ ...prev, ciclo_id: String(activo.id) }));
        }
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        setError('No se pudieron cargar los datos');
      }
    };
    cargarCatalogos();
  }, [isAdmin]);

  // ===== HELPERS DE ESPECIALIDAD -> LETRA (solo admin) =====
  const getLetrasPorEspecialidad = useCallback((especialidadId) => {
    if (!especialidadId) return ['A', 'B', 'C', 'D'];
    const especialidad = especialidades.find(e => e.id === parseInt(especialidadId));
    if (!especialidad) return ['A', 'B', 'C', 'D'];
    const clave = especialidad.clave?.toUpperCase() || '';
    if (clave === 'DGD') return ['A', 'B'];
    if (clave === 'ELEC') return ['C'];
    if (clave === 'PIA') return ['D'];
    return ['A', 'B', 'C', 'D'];
  }, [especialidades]);

  const getLetraDefault = useCallback((especialidadId) => {
    if (!especialidadId) return '';
    const especialidad = especialidades.find(e => e.id === parseInt(especialidadId));
    if (!especialidad) return '';
    const clave = especialidad.clave?.toUpperCase() || '';
    if (clave === 'ELEC') return 'C';
    if (clave === 'PIA') return 'D';
    return '';
  }, [especialidades]);

  // ===== BUSCAR GRUPO (solo admin) =====
  const buscarGrupo = (semestre, letra, turno_id, ciclo_id) => {
    if (!semestre || !letra || !turno_id || !ciclo_id) return null;
    return grupos.find(
      g => g.semestre === parseInt(semestre) &&
           g.letra === letra.toUpperCase() &&
           g.turno_id === parseInt(turno_id) &&
           g.ciclo_id === parseInt(ciclo_id)
    ) || null;
  };

  // ===== EFECTOS DE AUTOSELECCIÓN (solo admin) =====
  useEffect(() => {
    if (!isAdmin) return;
    const letras = getLetrasPorEspecialidad(uploadForm.especialidad_id);
    const defaultLetra = getLetraDefault(uploadForm.especialidad_id);
    if (uploadForm.letra && !letras.includes(uploadForm.letra)) {
      setUploadForm(prev => ({ ...prev, letra: defaultLetra || '' }));
    }
    if (!uploadForm.letra && letras.length === 1) {
      setUploadForm(prev => ({ ...prev, letra: letras[0] }));
    }
  }, [uploadForm.especialidad_id, getLetrasPorEspecialidad, getLetraDefault, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const letras = getLetrasPorEspecialidad(batchForm.especialidad_id);
    const defaultLetra = getLetraDefault(batchForm.especialidad_id);
    if (batchForm.letra && !letras.includes(batchForm.letra)) {
      setBatchForm(prev => ({ ...prev, letra: defaultLetra || '' }));
    }
    if (!batchForm.letra && letras.length === 1) {
      setBatchForm(prev => ({ ...prev, letra: letras[0] }));
    }
  }, [batchForm.especialidad_id, getLetrasPorEspecialidad, getLetraDefault, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const letras = getLetrasPorEspecialidad(editForm.especialidad_id);
    const defaultLetra = getLetraDefault(editForm.especialidad_id);
    if (editForm.letra && !letras.includes(editForm.letra)) {
      setEditForm(prev => ({ ...prev, letra: defaultLetra || '' }));
    }
    if (!editForm.letra && letras.length === 1) {
      setEditForm(prev => ({ ...prev, letra: letras[0] }));
    }
  }, [editForm.especialidad_id, getLetrasPorEspecialidad, getLetraDefault, isAdmin]);

  // ===== EFECTOS PARA BUSCAR GRUPO (solo admin) =====
  useEffect(() => {
    if (!isAdmin) return;
    const grupo = buscarGrupo(
      uploadForm.semestre,
      uploadForm.letra,
      uploadForm.turno_id,
      uploadForm.ciclo_id
    );
    setGrupoEncontrado(grupo);
  }, [uploadForm.semestre, uploadForm.letra, uploadForm.turno_id, uploadForm.ciclo_id, grupos, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const grupo = buscarGrupo(
      batchForm.semestre,
      batchForm.letra,
      batchForm.turno_id,
      batchForm.ciclo_id
    );
    setBatchGrupoEncontrado(grupo);
  }, [batchForm.semestre, batchForm.letra, batchForm.turno_id, batchForm.ciclo_id, grupos, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const grupo = buscarGrupo(
      editForm.semestre,
      editForm.letra,
      editForm.turno_id,
      editForm.ciclo_id
    );
    setEditGrupoEncontrado(grupo);
  }, [editForm.semestre, editForm.letra, editForm.turno_id, editForm.ciclo_id, grupos, isAdmin]);

  // ===== CARGAR HORARIOS (solo admin) =====
  const cargarHorarios = useCallback(async () => {
    if (!isAdmin) return;
    setCargando(true);
    try {
      const params = {};
      if (filtros.ciclo_id) params.ciclo_id = filtros.ciclo_id;
      if (filtros.semestre) params.semestre = filtros.semestre;
      if (filtros.grupo_letra) params.grupo_letra = filtros.grupo_letra;
      if (filtros.especialidad_id) params.especialidad_id = filtros.especialidad_id;
      if (filtros.search) params.search = filtros.search;
      if (filtros.turno === 'matutino') params.turno_id = 1;
      else if (filtros.turno === 'vespertino') params.turno_id = 2;

      const tipoMap = { grupos: 'grupo', maestros: 'maestro', laboratorios: 'laboratorio' };
      params.tipo = tipoMap[tabActiva] || 'grupo';

      const res = await horariosService.listarHorarios(params);
      if (res.success) {
        setArchivosSubidos(res.data || []);
      } else {
        setArchivosSubidos([]);
      }
    } catch (e) {
      console.error('Error cargando horarios:', e);
      setArchivosSubidos([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, tabActiva, isAdmin]);

  const cargarContadorFaltantes = useCallback(async () => {
    if (!isAdmin) return;
    if (!filtros.ciclo_id || !filtros.semestre) return;
    try {
      const res = await horariosService.contarFaltantes(filtros.ciclo_id, filtros.semestre);
      if (res.success) {
        setContadorFaltantes(res.data);
      }
    } catch (e) {
      console.error('Error cargando contador:', e);
    }
  }, [filtros.ciclo_id, filtros.semestre, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      cargarHorarios();
      cargarContadorFaltantes();
    }
  }, [cargarHorarios, cargarContadorFaltantes, isAdmin]);

  // ===== CARGAR HORARIOS PARA DOCENTE/ALUMNO =====
  useEffect(() => {
    if (isAdmin) return;

    const cargarHorariosUsuario = async () => {
      setCargandoUsuario(true);
      setErrorUsuario('');
      try {
        const params = {};
        if (isDocente) {
          params.docente_id = usuario.id;
        } else if (isAlumno) {
          const grupoId = usuario.grupo_actual_id;
          if (grupoId) {
            params.grupo_id = grupoId;
          } else {
            setErrorUsuario('No tienes un grupo asignado');
            setCargandoUsuario(false);
            return;
          }
        }
        const res = await horariosService.listarHorarios(params);
        if (res.success) {
          setHorariosUsuario(res.data || []);
        } else {
          setErrorUsuario('No se pudieron cargar los horarios');
        }
      } catch (e) {
        console.error('Error cargando horarios del usuario:', e);
        setErrorUsuario('Error al cargar horarios');
      } finally {
        setCargandoUsuario(false);
      }
    };
    cargarHorariosUsuario();
  }, [isAdmin, isDocente, isAlumno, usuario]);

  // ===== HANDLERS (solo admin) =====
  const abrirModalUpload = () => {
    if (!isAdmin) return;
    setUploadForm({
      nombre: '',
      semestre: filtros.semestre || '',
      letra: '',
      ciclo_id: filtros.ciclo_id || '',
      especialidad_id: '',
      turno_id: '',
      tipo_horario: tabActiva === 'grupos' ? 'grupo' : tabActiva === 'maestros' ? 'maestro' : 'laboratorio',
      descripcion: '',
    });
    setGrupoEncontrado(null);
    setArchivoSeleccionado(null);
    setModalUploadOpen(true);
    setError('');
  };

  const handleUpload = async (e) => {
    if (!isAdmin) return;
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

    setArchivoSeleccionado(file);
    setUploadForm(prev => ({ ...prev, nombre: file.name }));
    e.target.value = '';
  };

  const handleSubmitUpload = async () => {
    if (!isAdmin) return;
    if (!archivoSeleccionado) {
      setError('Selecciona un archivo');
      return;
    }
    if (!uploadForm.semestre || !uploadForm.letra || !uploadForm.ciclo_id || !uploadForm.turno_id) {
      setError('Semestre, letra, ciclo y turno son requeridos');
      return;
    }
    if (!grupoEncontrado) {
      setError('No existe un grupo con esa combinación');
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      const grupo_id = grupoEncontrado.id;
      const res = await horariosService.solicitarUpload(
        uploadForm.nombre,
        archivoSeleccionado.type,
        grupo_id,
        parseInt(uploadForm.semestre),
        parseInt(uploadForm.ciclo_id),
        uploadForm.especialidad_id ? parseInt(uploadForm.especialidad_id) : null,
        parseInt(uploadForm.turno_id),
        uploadForm.tipo_horario || 'grupo',
        uploadForm.descripcion || null
      );
      if (!res.success) throw new Error(res.message || 'Error al solicitar subida');

      const uploadRes = await horariosService.subirArchivo(res.data.uploadUrl, archivoSeleccionado);
      if (!uploadRes.ok) throw new Error(`Error al subir archivo: ${uploadRes.status}`);

      setExito('Horario subido correctamente');
      setModalUploadOpen(false);
      cargarHorarios();
      cargarContadorFaltantes();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
    }
  };

  const abrirModalEditar = (horario) => {
    if (!isAdmin) return;
    const grupo = grupos.find(g => g.id === horario.grupo_id);
    setEditando(horario);
    setEditandoId(horario.id);
    setEditForm({
      semestre: String(grupo?.semestre || ''),
      letra: grupo?.letra || '',
      ciclo_id: String(horario.ciclo_id || ''),
      especialidad_id: String(horario.especialidad_id || ''),
      turno_id: String(horario.turno_id || ''),
      tipo_horario: horario.tipo_horario || 'grupo',
      descripcion: horario.descripcion || '',
    });
    setEditGrupoEncontrado(grupo || null);
    setModalEditOpen(true);
    setError('');
  };

  const handleSubmitEditar = async () => {
    if (!isAdmin) return;
    if (!editForm.semestre || !editForm.letra || !editForm.ciclo_id || !editForm.turno_id) {
      setError('Semestre, letra, ciclo y turno son requeridos');
      return;
    }
    if (!editGrupoEncontrado) {
      setError('No existe un grupo con esa combinación');
      return;
    }

    const data = {
      grupo_id: editGrupoEncontrado.id,
      semestre: parseInt(editForm.semestre),
      ciclo_id: parseInt(editForm.ciclo_id),
      especialidad_id: editForm.especialidad_id ? parseInt(editForm.especialidad_id) : null,
      turno_id: parseInt(editForm.turno_id),
      tipo_horario: editForm.tipo_horario,
      descripcion: editForm.descripcion || null,
    };

    setSubiendo(true);
    setError('');
    try {
      const res = await horariosService.actualizarHorario(editandoId, data);
      if (res.success) {
        setExito('Horario actualizado correctamente');
        setModalEditOpen(false);
        cargarHorarios();
        cargarContadorFaltantes();
        setTimeout(() => setExito(''), 5000);
      } else {
        setError(res.message || 'Error al actualizar');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setSubiendo(false);
    }
  };

  // ===== HANDLE ELIMINAR (mejorado) =====
  const handleEliminar = (id, nombre) => {
    if (!isAdmin) return;
    const idNumerico = Number(id);
    if (isNaN(idNumerico) || idNumerico <= 0) {
      setError('ID de horario inválido');
      return;
    }
    setConfirmModal({
      open: true,
      message: `¿Eliminar el horario "${nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          const res = await horariosService.eliminar(idNumerico);
          if (res.success) {
            setExito('Horario eliminado correctamente');
            cargarHorarios();
            cargarContadorFaltantes();
            setTimeout(() => setExito(''), 5000);
          } else {
            const msg = res.message || 'Error al eliminar (respuesta sin éxito)';
            setError(msg);
            console.error('Error al eliminar horario (res.success=false):', res);
          }
        } catch (err) {
          // Captura el error completo y muestra el mensaje más específico
          const errorMsg = err.response?.data?.message || err.message || 'Error al eliminar';
          setError(`❌ ${errorMsg}`);
          console.error('Error al eliminar horario:', err);
          if (err.response) {
            console.error('Detalles del error (response):', err.response.data);
          }
        }
        setConfirmModal({ open: false, message: '', onConfirm: null });
      },
    });
  };

  const abrirModalBatch = () => {
    if (!isAdmin) return;
    setBatchItems([]);
    setBatchForm({
      semestre: filtros.semestre || '',
      letra: '',
      ciclo_id: filtros.ciclo_id || '',
      especialidad_id: '',
      turno_id: '',
      tipo_horario: tabActiva === 'grupos' ? 'grupo' : tabActiva === 'maestros' ? 'maestro' : 'laboratorio',
      descripcion: '',
      archivos: [],
    });
    setBatchGrupoEncontrado(null);
    setModalBatchOpen(true);
    setError('');
  };

  const handleBatchFileChange = (e) => {
    if (!isAdmin) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const validFiles = files.filter(f => {
      const tiposPermitidos = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      return tiposPermitidos.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    if (validFiles.length !== files.length) {
      setError('Algunos archivos no son válidos (formato o tamaño)');
    }
    setBatchForm(prev => ({ ...prev, archivos: [...prev.archivos, ...validFiles] }));
    e.target.value = '';
  };

  const generarBatchItems = () => {
    if (!isAdmin) return;
    if (batchForm.archivos.length === 0) {
      setError('Selecciona al menos un archivo');
      return;
    }
    if (!batchForm.semestre || !batchForm.letra || !batchForm.ciclo_id || !batchForm.turno_id) {
      setError('Semestre, letra, ciclo y turno son requeridos');
      return;
    }
    if (!batchGrupoEncontrado) {
      setError('No existe un grupo con esa combinación');
      return;
    }

    const grupo_id = batchGrupoEncontrado.id;
    const items = batchForm.archivos.map(file => ({
      nombre: file.name,
      tipo_mime: file.type,
      grupo_id,
      semestre: parseInt(batchForm.semestre),
      ciclo_id: parseInt(batchForm.ciclo_id),
      especialidad_id: batchForm.especialidad_id ? parseInt(batchForm.especialidad_id) : null,
      turno_id: parseInt(batchForm.turno_id),
      tipo_horario: batchForm.tipo_horario || 'grupo',
      descripcion: batchForm.descripcion || null,
      archivo: file,
      _tempId: Date.now() + Math.random() * 1000,
    }));

    setBatchItems(prev => [...prev, ...items]);
    setBatchForm(prev => ({ ...prev, archivos: [] }));
    setError('');
  };

  const eliminarItemBatch = (tempId) => {
    if (!isAdmin) return;
    setConfirmModal({
      open: true,
      message: '¿Eliminar este elemento de la lista?',
      onConfirm: () => {
        setBatchItems(prev => prev.filter(item => item._tempId !== tempId));
        setConfirmModal({ open: false, message: '', onConfirm: null });
      },
    });
  };

  const guardarBatch = async () => {
    if (!isAdmin) return;
    if (batchItems.length === 0) {
      setError('No hay elementos para guardar');
      return;
    }

    setBatchSubiendo(true);
    setError('');
    try {
      const resultados = [];
      const errores = [];

      for (const item of batchItems) {
        try {
          const res = await horariosService.solicitarUpload(
            item.nombre,
            item.tipo_mime,
            item.grupo_id,
            item.semestre,
            item.ciclo_id,
            item.especialidad_id,
            item.turno_id,
            item.tipo_horario,
            item.descripcion
          );
          if (!res.success) {
            errores.push({ nombre: item.nombre, error: res.message || 'Error al solicitar subida' });
            continue;
          }

          const uploadRes = await horariosService.subirArchivo(res.data.uploadUrl, item.archivo);
          if (!uploadRes.ok) {
            errores.push({ nombre: item.nombre, error: `Error al subir archivo: ${uploadRes.status}` });
            continue;
          }

          resultados.push({ nombre: item.nombre, success: true });
        } catch (err) {
          errores.push({ nombre: item.nombre, error: err.message });
        }
      }

      if (errores.length > 0) {
        setError(`${errores.length} archivos fallaron. Revisa los logs.`);
      } else {
        setExito(`${resultados.length} horarios subidos correctamente`);
      }

      setModalBatchOpen(false);
      cargarHorarios();
      cargarContadorFaltantes();
      setTimeout(() => setExito(''), 5000);
    } catch (err) {
      setError(err.message || 'Error al guardar batch');
    } finally {
      setBatchSubiendo(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      turno: 'todos',
      ciclo_id: cicloSeleccionado?.id ? String(cicloSeleccionado.id) : '',
      semestre: '',
      grupo_letra: '',
      especialidad_id: '',
      search: '',
    });
  };

  const handleDescargar = async (key, nombre) => {
    try {
      const res = await horariosService.solicitarDescarga(key);
      if (!res.success) throw new Error(res.message || 'Error al obtener URL de descarga');
      window.open(res.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Error al descargar:', err);
      setError(err.message || 'Error al descargar el archivo');
    }
  };

  // ===== RENDER MODAL DE CONFIRMACIÓN =====
  const renderConfirmModal = () => {
    if (!confirmModal.open) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>
        <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Confirmar</h3>
            <button className={styles.modalClose} onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>
              <X size={18} />
            </button>
          </div>
          <div className={styles.confirmBody}>
            <p>{confirmModal.message}</p>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.btnSecondary} onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>
              Cancelar
            </button>
            <button className={styles.btnDanger} onClick={confirmModal.onConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER MODAL DE SUBIDA INDIVIDUAL =====
  const renderUploadModal = () => {
    if (!modalUploadOpen || !isAdmin) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setModalUploadOpen(false)}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Subir horario</h3>
            <button className={styles.modalClose} onClick={() => setModalUploadOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Archivo *</label>
              <div className={styles.fileInputWrapper}>
                <label className={styles.btnFile}>
                  <Upload size={16} /> Seleccionar archivo
                  <input type="file" accept=".pdf,.xlsx,.xls" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
                {archivoSeleccionado && (
                  <span className={styles.fileName}>{archivoSeleccionado.name}</span>
                )}
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Semestre *</label>
                <select
                  className={styles.select}
                  value={uploadForm.semestre}
                  onChange={e => setUploadForm({ ...uploadForm, semestre: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {[1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select
                  className={styles.select}
                  value={uploadForm.especialidad_id}
                  onChange={e => setUploadForm({ ...uploadForm, especialidad_id: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Letra *</label>
                <select
                  className={styles.select}
                  value={uploadForm.letra}
                  onChange={e => setUploadForm({ ...uploadForm, letra: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {getLetrasPorEspecialidad(uploadForm.especialidad_id).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar *</label>
                <select
                  className={styles.select}
                  value={uploadForm.ciclo_id}
                  onChange={e => setUploadForm({ ...uploadForm, ciclo_id: e.target.value })}
                >
                  <option value="">Seleccionar ciclo...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.activo ? '(Activo)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Turno *</label>
              <select
                className={styles.select}
                value={uploadForm.turno_id}
                onChange={e => setUploadForm({ ...uploadForm, turno_id: e.target.value })}
              >
                <option value="">Seleccionar turno...</option>
                {turnos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {uploadForm.semestre && uploadForm.letra && uploadForm.turno_id && uploadForm.ciclo_id && (
              <div className={styles.grupoStatus}>
                {grupoEncontrado ? (
                  <span className={styles.grupoOk}> Asignando horario al grupo: {grupoEncontrado.nombre}</span>
                ) : (
                  <span className={styles.grupoError}> No existe un grupo con esa combinación</span>
                )}
              </div>
            )}

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo de horario</label>
                <select
                  className={styles.select}
                  value={uploadForm.tipo_horario}
                  onChange={e => setUploadForm({ ...uploadForm, tipo_horario: e.target.value })}
                >
                  <option value="grupo">Grupo</option>
                  <option value="maestro">Maestro</option>
                  <option value="laboratorio">Laboratorio</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  value={uploadForm.descripcion}
                  onChange={e => setUploadForm({ ...uploadForm, descripcion: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setModalUploadOpen(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleSubmitUpload} disabled={subiendo || !grupoEncontrado}>
                {subiendo ? 'Subiendo...' : 'Subir horario'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER MODAL DE EDICIÓN =====
  const renderEditModal = () => {
    if (!modalEditOpen || !isAdmin) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setModalEditOpen(false)}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Editar horario</h3>
            <button className={styles.modalClose} onClick={() => setModalEditOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.form}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Semestre</label>
                <select
                  className={styles.select}
                  value={editForm.semestre}
                  onChange={e => setEditForm({ ...editForm, semestre: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {[1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select
                  className={styles.select}
                  value={editForm.especialidad_id}
                  onChange={e => setEditForm({ ...editForm, especialidad_id: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Letra</label>
                <select
                  className={styles.select}
                  value={editForm.letra}
                  onChange={e => setEditForm({ ...editForm, letra: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {getLetrasPorEspecialidad(editForm.especialidad_id).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar</label>
                <select
                  className={styles.select}
                  value={editForm.ciclo_id}
                  onChange={e => setEditForm({ ...editForm, ciclo_id: e.target.value })}
                >
                  <option value="">Seleccionar ciclo...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Turno</label>
              <select
                className={styles.select}
                value={editForm.turno_id}
                onChange={e => setEditForm({ ...editForm, turno_id: e.target.value })}
              >
                <option value="">Seleccionar turno...</option>
                {turnos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {editForm.semestre && editForm.letra && editForm.turno_id && editForm.ciclo_id && (
              <div className={styles.grupoStatus}>
                {editGrupoEncontrado ? (
                  <span className={styles.grupoOk}> Grupo encontrado: {editGrupoEncontrado.nombre}</span>
                ) : (
                  <span className={styles.grupoError}> No existe un grupo con esa combinación</span>
                )}
              </div>
            )}

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo de horario</label>
                <select
                  className={styles.select}
                  value={editForm.tipo_horario}
                  onChange={e => setEditForm({ ...editForm, tipo_horario: e.target.value })}
                >
                  <option value="grupo">Grupo</option>
                  <option value="maestro">Maestro</option>
                  <option value="laboratorio">Laboratorio</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  value={editForm.descripcion}
                  onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setModalEditOpen(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleSubmitEditar} disabled={subiendo || !editGrupoEncontrado}>
                {subiendo ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER MODAL DE SUBIDA MASIVA =====
  const renderBatchModal = () => {
    if (!modalBatchOpen || !isAdmin) return null;
    return (
      <div className={styles.modalOverlay} onClick={() => setModalBatchOpen(false)}>
        <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Subida masiva de horarios</h3>
            <button className={styles.modalClose} onClick={() => setModalBatchOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.batchForm}>
            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Semestre *</label>
                <select
                  className={styles.select}
                  value={batchForm.semestre}
                  onChange={e => setBatchForm({ ...batchForm, semestre: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {[1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s}°</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Especialidad</label>
                <select
                  className={styles.select}
                  value={batchForm.especialidad_id}
                  onChange={e => setBatchForm({ ...batchForm, especialidad_id: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {especialidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Letra *</label>
                <select
                  className={styles.select}
                  value={batchForm.letra}
                  onChange={e => setBatchForm({ ...batchForm, letra: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {getLetrasPorEspecialidad(batchForm.especialidad_id).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo *</label>
                <select
                  className={styles.select}
                  value={batchForm.ciclo_id}
                  onChange={e => setBatchForm({ ...batchForm, ciclo_id: e.target.value })}
                >
                  <option value="">Seleccionar ciclo...</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Turno *</label>
              <select
                className={styles.select}
                value={batchForm.turno_id}
                onChange={e => setBatchForm({ ...batchForm, turno_id: e.target.value })}
              >
                <option value="">Seleccionar turno...</option>
                {turnos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {batchForm.semestre && batchForm.letra && batchForm.turno_id && batchForm.ciclo_id && (
              <div className={styles.grupoStatus}>
                {batchGrupoEncontrado ? (
                  <span className={styles.grupoOk}> Grupo encontrado: {batchGrupoEncontrado.nombre}</span>
                ) : (
                  <span className={styles.grupoError}> No existe un grupo con esa combinación</span>
                )}
              </div>
            )}

            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Tipo</label>
                <select
                  className={styles.select}
                  value={batchForm.tipo_horario}
                  onChange={e => setBatchForm({ ...batchForm, tipo_horario: e.target.value })}
                >
                  <option value="grupo">Grupo</option>
                  <option value="maestro">Maestro</option>
                  <option value="laboratorio">Laboratorio</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descripción</label>
                <textarea
                  className={styles.textarea}
                  value={batchForm.descripcion}
                  onChange={e => setBatchForm({ ...batchForm, descripcion: e.target.value })}
                  placeholder="Descripción general para todos los horarios..."
                  rows={2}
                />
              </div>
            </div>

            <div className={styles.batchRow}>
              <div className={styles.field}>
                <label className={styles.label}>Archivos</label>
                <div className={styles.fileInputWrapper}>
                  <label className={styles.btnFile}>
                    <Upload size={16} /> Seleccionar archivos
                    <input type="file" accept=".pdf,.xlsx,.xls" multiple onChange={handleBatchFileChange} style={{ display: 'none' }} />
                  </label>
                  <span className={styles.fileCount}>{batchForm.archivos.length} archivo(s) pendientes</span>
                </div>
              </div>
              <button className={styles.btnPrimary} onClick={generarBatchItems} disabled={!batchGrupoEncontrado} style={{ alignSelf: 'flex-end' }}>
                <Plus size={16} /> Generar
              </button>
            </div>
          </div>

          {batchItems.length > 0 && (
            <div className={styles.batchPreview}>
              <h4>Vista previa ({batchItems.length} elementos)</h4>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Archivo</th>
                      <th>Grupo</th>
                      <th>Semestre</th>
                      <th>Tipo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.map((item, idx) => {
                      const grupo = grupos.find(g => g.id === item.grupo_id);
                      return (
                        <tr key={item._tempId}>
                          <td>{idx + 1}</td>
                          <td>{item.nombre}</td>
                          <td>{grupo ? grupo.nombre : '—'}</td>
                          <td>{item.semestre}°</td>
                          <td>{item.tipo_horario}</td>
                          <td>
                            <button className={styles.btnEliminar} onClick={() => eliminarItemBatch(item._tempId)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.batchActions}>
                <button className={styles.btnSecondary} onClick={() => setBatchItems([])}>Vaciar</button>
                <button className={styles.btnPrimary} onClick={guardarBatch} disabled={batchSubiendo}>
                  {batchSubiendo ? 'Guardando...' : `Guardar ${batchItems.length} horario(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER FILTROS (solo admin) =====
  const renderFiltros = () => {
    if (!isAdmin) return null;
    return (
      <div className={styles.filtrosContainer}>
        <div className={styles.filtrosTurno}>
          <button
            className={`${styles.btnTurno} ${filtros.turno === 'todos' ? styles.btnTurnoActive : ''}`}
            onClick={() => setFiltros({ ...filtros, turno: 'todos' })}
          >
            Todos
          </button>
          <button
            className={`${styles.btnTurno} ${filtros.turno === 'matutino' ? styles.btnTurnoActive : ''}`}
            onClick={() => setFiltros({ ...filtros, turno: 'matutino' })}
          >
            Matutino
          </button>
          <button
            className={`${styles.btnTurno} ${filtros.turno === 'vespertino' ? styles.btnTurnoActive : ''}`}
            onClick={() => setFiltros({ ...filtros, turno: 'vespertino' })}
          >
            Vespertino
          </button>
        </div>

        <div className={styles.filtrosGrid}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Ciclo</label>
            <select
              className={styles.select}
              value={filtros.ciclo_id}
              onChange={e => setFiltros({ ...filtros, ciclo_id: e.target.value })}
            >
              <option value="">Todos</option>
              {ciclos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.activo ? '(Activo)' : ''}</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Semestre</label>
            <select
              className={styles.select}
              value={filtros.semestre}
              onChange={e => setFiltros({ ...filtros, semestre: e.target.value })}
            >
              <option value="">Todos</option>
              {[1,2,3,4,5,6].map(s => (
                <option key={s} value={s}>{s}°</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Grupo (letra)</label>
            <select
              className={styles.select}
              value={filtros.grupo_letra}
              onChange={e => setFiltros({ ...filtros, grupo_letra: e.target.value })}
            >
              <option value="">Todos</option>
              {['A','B','C','D'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className={styles.filtroGroup}>
            <label className={styles.label}>Especialidad</label>
            <select
              className={styles.select}
              value={filtros.especialidad_id}
              onChange={e => setFiltros({ ...filtros, especialidad_id: e.target.value })}
            >
              <option value="">Todas</option>
              {especialidades.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filtrosActions}>
          <button className={styles.btnLimpiarFiltros} onClick={limpiarFiltros}>
            <Filter size={14} /> Limpiar filtros
          </button>
        </div>
      </div>
    );
  };

  // ===== CONTADOR DE HORARIOS FALTANTES =====
  const renderContador = () => {
    if (!isAdmin) return null;
    if (!filtros.ciclo_id || !filtros.semestre) return null;
    const { total, subidos, faltantes, porcentaje } = contadorFaltantes;
    return (
      <div className={styles.contadorContainer}>
        <div className={styles.contadorInfo}>
          <span className={styles.contadorTotal}>Total: {total} grupos</span>
          <span className={styles.contadorSubidos}>Subidos: {subidos}</span>
          <span className={faltantes > 0 ? styles.contadorFaltantes : styles.contadorCompleto}>
            {faltantes > 0 ? `Faltan: ${faltantes}` : ' Completo'}
          </span>
        </div>
        <div className={styles.contadorBarra}>
          <div
            className={styles.contadorBarraFill}
            style={{ width: `${porcentaje}%`, backgroundColor: porcentaje === 100 ? '#1A6B35' : '#F37238' }}
          />
        </div>
        <span className={styles.contadorPorcentaje}>{porcentaje}%</span>
      </div>
    );
  };

  // ===== VISTA PARA DOCENTES Y ALUMNOS =====
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mi Horario</h1>
            <p className={styles.subtitle}>
              {isDocente ? 'Consulta tu horario de clases' : 'Consulta el horario de tu grupo'}
            </p>
          </div>
        </div>

        {errorUsuario && <div className={styles.errorMsg}>{errorUsuario}</div>}

        {cargandoUsuario ? (
          <div className={styles.loading}>Cargando tu horario...</div>
        ) : horariosUsuario.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={32} />
            <p>No hay horario disponible para ti</p>
            <p className={styles.emptySub}>
              {isDocente
                ? 'Aún no se ha subido el horario de tus grupos.'
                : 'Aún no se ha subido el horario de tu grupo.'}
            </p>
          </div>
        ) : (
          <div className={styles.archivosGrid}>
            {horariosUsuario.map((archivo) => (
              <div key={archivo.id} className={styles.archivoCard}>
                <div className={styles.archivoInfo}>
                  <FileText size={20} />
                  <div className={styles.archivoDetails}>
                    <span className={styles.archivoNombre}>{archivo.nombre}</span>
                    <span className={styles.archivoMeta}>
                      {archivo.grupo_nombre || 'Sin grupo'} • {archivo.semestre}° • {archivo.especialidad_nombre || '—'} • {archivo.turno_nombre || '—'}
                    </span>
                    <span className={styles.archivoFecha}>
                      {new Date(archivo.fecha).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.archivoActions}>
                  <button
                    className={styles.btnDescargar}
                    onClick={() => handleDescargar(archivo.key, archivo.nombre)}
                    title="Descargar"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== VISTA COMPLETA PARA ADMIN =====
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
          <button className={styles.btnPrimary} onClick={abrirModalUpload}>
            <Upload size={16} /> Subir horario
          </button>
          <button className={styles.btnSecondary} onClick={abrirModalBatch}>
            <Plus size={16} /> Subida masiva
          </button>
          <button className={styles.btnSecondary} onClick={() => { cargarHorarios(); cargarContadorFaltantes(); }}>
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

      {renderFiltros()}
      {renderContador()}

      <div className={styles.horariosSection}>
        <h3 className={styles.sectionTitle}>Horarios subidos ({archivosSubidos.length})</h3>
        {cargando ? (
          <div className={styles.loading}>Cargando horarios...</div>
        ) : archivosSubidos.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={32} />
            <p>No hay horarios subidos</p>
            <p className={styles.emptySub}>Haz clic en "Subir horario" para agregar un archivo</p>
          </div>
        ) : (
          <div className={styles.archivosGrid}>
            {archivosSubidos.map((archivo) => (
              <div key={archivo.id} className={styles.archivoCard}>
                <div className={styles.archivoInfo}>
                  <FileText size={20} />
                  <div className={styles.archivoDetails}>
                    <span className={styles.archivoNombre}>{archivo.nombre}</span>
                    <span className={styles.archivoMeta}>
                      {archivo.grupo_nombre || 'Sin grupo'} • {archivo.semestre}° • {archivo.especialidad_nombre || '—'} • {archivo.turno_nombre || '—'}
                    </span>
                    <span className={styles.archivoFecha}>
                      {new Date(archivo.fecha).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.archivoActions}>
                  <button
                    className={styles.btnDescargar}
                    onClick={() => handleDescargar(archivo.key, archivo.nombre)}
                    title="Descargar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className={styles.btnEditarArchivo}
                    onClick={() => abrirModalEditar(archivo)}
                    title="Editar metadatos"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className={styles.btnEliminarArchivo}
                    onClick={() => handleEliminar(archivo.id, archivo.nombre)}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {renderUploadModal()}
      {renderEditModal()}
      {renderBatchModal()}
      {renderConfirmModal()}
    </div>
  );
}