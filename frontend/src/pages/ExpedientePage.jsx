import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expedienteService, catalogosService } from '../services/api';
import { Search, Edit, Save, X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './ExpedientePage.module.css';

export default function ExpedientePage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAdmin = usuario.rol === 'administrador';
  const esAlumno = usuario.rol === 'alumno';
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado general
  const [alumnoId, setAlumnoId] = useState(id ? parseInt(id) : null);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Estado para cambios pendientes
  const [cambiosPendientes, setCambiosPendientes] = useState({});

  // Modal de confirmación
  const [modalConfirm, setModalConfirm] = useState({ open: false, message: '', onConfirm: null });

  //  NOTIFICACIONES (toast)
  const [notificaciones, setNotificaciones] = useState([]);

  // Filtros y lista de alumnos
  const [filtroSearch, setFiltroSearch] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroAdeuda, setFiltroAdeuda] = useState('');
  const [listaAlumnos, setListaAlumnos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);

  // Estado del alumno
  const [alumnoEstatus, setAlumnoEstatus] = useState('');
  const [estadoAlumno, setEstadoAlumno] = useState(null);

  // Etapa seleccionada
  const etapaSeleccionada = searchParams.get('etapa') || '';

  // ── FUNCIONES DE NOTIFICACIONES ──
  const agregarNotificacion = (mensaje, tipo = 'success', duracion = 4000) => {
    const id = Date.now() + Math.random() * 1000;
    const nuevaNotificacion = {
      id,
      mensaje,
      tipo,
      duracion,
      progreso: 100,
    };
    setNotificaciones(prev => [...prev, nuevaNotificacion]);

    // Iniciar temporizador para eliminar
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    }, duracion + 300); // +300ms para la animación de salida

    // Actualizar progreso con intervalo
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duracion) * 100);
      setNotificaciones(prev =>
        prev.map(n =>
          n.id === id ? { ...n, progreso: remaining } : n
        )
      );
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);
  };

  // ── Sincronizar id de la URL con alumnoId ──
  useEffect(() => {
    if (id) {
      setAlumnoId(parseInt(id));
    } else {
      setAlumnoId(null);
    }
  }, [id]);

  // ── Cargar lista de alumnos ──
  useEffect(() => {
    if (!esAdmin) return;
    const cargarAlumnos = async () => {
      setCargandoAlumnos(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (filtroSearch) params.append('search', filtroSearch);
        if (filtroEtapa) params.append('etapa', filtroEtapa);
        if (filtroAdeuda) params.append('adeuda', filtroAdeuda);
        const res = await expedienteService.getAlumnosConExpediente(params.toString());
        setListaAlumnos(res.alumnos || []);
      } catch (e) {
        console.error('Error cargando alumnos:', e);
        setError('Error al cargar la lista de alumnos.');
        setListaAlumnos([]);
      } finally {
        setCargandoAlumnos(false);
      }
    };
    cargarAlumnos();
  }, [esAdmin, filtroSearch, filtroEtapa, filtroAdeuda]);

  // ── Cargar expediente y estado del alumno ──
  useEffect(() => {
    if (!alumnoId) return;
    const cargarExpediente = async () => {
      setCargando(true);
      setError('');
      try {
        const [expedienteRes, estadoRes] = await Promise.all([
          expedienteService.getByAlumnoId(alumnoId),
          expedienteService.getEstadoAlumno(alumnoId)
        ]);
        setDocumentos(expedienteRes.data || []);
        setEstadoAlumno(estadoRes.data || null);
        setCambiosPendientes({});
        if (esAdmin) {
          const alumnoInfo = listaAlumnos.find(a => a.alumno_id === alumnoId);
          setAlumnoEstatus(alumnoInfo?.alumno_estatus || 'activo');
        } else {
          setAlumnoEstatus('activo');
        }
      } catch (e) {
        console.error('Error cargando expediente:', e);
        setError('No se pudo cargar el expediente.');
        setDocumentos([]);
      } finally {
        setCargando(false);
      }
    };
    cargarExpediente();
  }, [alumnoId, esAdmin, listaAlumnos]);

  // ── Si es alumno y no tiene alumnoId, obtenerlo ──
  useEffect(() => {
    if (esAlumno && !alumnoId) {
      const obtenerAlumnoId = async () => {
        try {
          const res = await catalogosService.getAlumnos();
          const alumno = res.data?.find(a => a.usuario_id === usuario.id);
          if (alumno) {
            setAlumnoId(alumno.id);
          } else {
            setError('No se encontró tu perfil de alumno.');
          }
        } catch (e) {
          setError('Error al obtener tu información.');
        }
      };
      obtenerAlumnoId();
    }
  }, [esAlumno, usuario, alumnoId]);

  // ── Seleccionar alumno ──
  const handleSelectAlumno = (alumnoId) => {
    navigate(`/expediente/${alumnoId}`);
  };

  // ── MODO EDICIÓN ──
  const activarEdicion = () => {
    const inicial = {};
    documentos.forEach(doc => {
      inicial[doc.documento_id] = {
        entregado: doc.entregado,
        observaciones: doc.observaciones || '',
        modificado: false,
      };
    });
    setCambiosPendientes(inicial);
    setModoEdicion(true);
    setExito('');
    setError('');
  };

  const desactivarEdicion = (descartar = true) => {
    if (descartar) {
      const hayCambios = Object.values(cambiosPendientes).some(c => c.modificado);
      if (hayCambios) {
        setModalConfirm({
          open: true,
          message: 'Hay cambios sin guardar. ¿Seguro que quieres descartarlos?',
          onConfirm: () => {
            setModoEdicion(false);
            setCambiosPendientes({});
            setModalConfirm({ open: false, message: '', onConfirm: null });
          }
        });
        return;
      }
    }
    setModoEdicion(false);
    setCambiosPendientes({});
    setExito('');
  };

  const handleCambioLocal = (documentoId, campo, valor) => {
    setCambiosPendientes(prev => ({
      ...prev,
      [documentoId]: {
        ...prev[documentoId],
        [campo]: valor,
        modificado: true,
      }
    }));
  };

  const guardarCambios = async () => {
    const modificados = Object.entries(cambiosPendientes)
      .filter(([_, data]) => data.modificado)
      .map(([docId, data]) => ({
        documento_id: parseInt(docId),
        entregado: data.entregado,
        observaciones: data.observaciones,
      }));

    if (modificados.length === 0) {
      agregarNotificacion('No hay cambios pendientes para guardar.', 'error');
      return;
    }

    setActualizando(true);
    setError('');

    try {
      const promises = modificados.map(doc =>
        expedienteService.actualizarDocumento({
          alumno_id: alumnoId,
          documento_id: doc.documento_id,
          entregado: doc.entregado,
          observaciones: doc.observaciones,
        })
      );
      await Promise.all(promises);
      const mensaje = `Se guardaron ${modificados.length} cambio(s) correctamente.`;
      agregarNotificacion(mensaje, 'success');

      const res = await expedienteService.getByAlumnoId(alumnoId);
      setDocumentos(res.data || []);
      setCambiosPendientes({});
      setModoEdicion(false);
    } catch (e) {
      console.error('Error guardando cambios:', e);
      agregarNotificacion('Error al guardar los cambios. Intenta de nuevo.', 'error');
    } finally {
      setActualizando(false);
    }
  };

  // ── Cambiar etapa ──
  const handleCambiarEtapa = (etapa) => {
    setSearchParams({ etapa });
  };

  // ── Verificar si el alumno puede ver cierta etapa ──
  const puedeVerEtapa = (etapa) => {
    if (esAlumno) {
      if (etapa === 'preinscripcion') return false;
      if (etapa === 'inscripcion' && alumnoEstatus === 'activo') return true;
      if (etapa === 'reinscripcion' && alumnoEstatus === 'activo') return true;
      return false;
    }
    return true;
  };

  // ── Agrupar documentos ──
  const getDocumentosAgrupados = () => {
    const grupos = {};
    documentos.forEach(doc => {
      if (!puedeVerEtapa(doc.etapa)) return;
      if (!grupos[doc.etapa]) grupos[doc.etapa] = [];
      grupos[doc.etapa].push(doc);
    });
    return grupos;
  };

  const grupos = getDocumentosAgrupados();
  const etapasDisponibles = Object.keys(grupos);
  const etapaActual = etapaSeleccionada || etapasDisponibles[0] || '';

  // ── Obtener valor actual ──
  const getValorActual = (docId, campo) => {
    if (modoEdicion && cambiosPendientes[docId]) {
      return cambiosPendientes[docId][campo];
    }
    const doc = documentos.find(d => d.documento_id === docId);
    return doc ? doc[campo] : (campo === 'entregado' ? false : '');
  };

  const getDocumentoModificado = (docId) => {
    return modoEdicion && cambiosPendientes[docId]?.modificado;
  };

  // ── VISTA ADMIN SIN ALUMNO ──
  if (esAdmin && !alumnoId) {
    return (
      <div className={styles.page}>
        {/* Toast notifications */}
        <div className={styles.toastContainer}>
          {notificaciones.map((notif) => (
            <div
              key={notif.id}
              className={`${styles.toast} ${styles[`toast_${notif.tipo}`]}`}
              style={{ animationDuration: `${notif.duracion}ms` }}
            >
              <div className={styles.toastContent}>
                {notif.tipo === 'success' && <CheckCircle size={18} />}
                {notif.tipo === 'error' && <AlertCircle size={18} />}
                <span>{notif.mensaje}</span>
              </div>
              <div
                className={styles.toastProgress}
                style={{ width: `${notif.progreso}%` }}
              />
            </div>
          ))}
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Expediente</h1>
            <p className={styles.subtitle}>Selecciona un alumno para ver su expediente</p>
          </div>
          <button className={styles.btnVolver} onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>

        <div className={styles.filtrosContainer}>
          <div className={styles.filtros}>
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Buscar alumno</label>
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.inputSearch}
                  placeholder="Nombre, apellido o matrícula"
                  value={filtroSearch}
                  onChange={(e) => setFiltroSearch(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Etapa</label>
              <select
                className={styles.select}
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="preinscripcion">Preinscripción</option>
                <option value="inscripcion">Inscripción</option>
                <option value="reinscripcion">Reinscripción</option>
              </select>
            </div>
            <div className={styles.filtroGroup}>
              <label className={styles.label}>Adeudan documentos</label>
              <select
                className={styles.select}
                value={filtroAdeuda}
                onChange={(e) => setFiltroAdeuda(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {cargandoAlumnos ? (
          <div className={styles.skeletonContainer}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton width="200px" height="20px" variant="text" />
                <Skeleton width="150px" height="16px" variant="text" />
              </div>
            ))}
          </div>
        ) : listaAlumnos.length === 0 ? (
          <div className={styles.empty}>No se encontraron alumnos con los filtros aplicados.</div>
        ) : (
          <div className={styles.listaAlumnos}>
            {listaAlumnos.map((alumno) => (
              <div
                key={alumno.alumno_id}
                className={styles.alumnoCard}
                onClick={() => handleSelectAlumno(alumno.alumno_id)}
              >
                <div className={styles.alumnoInfo}>
                  <span className={styles.alumnoNombre}>
                    {alumno.apellidos}, {alumno.nombre}
                  </span>
                  <span className={styles.alumnoMatricula}>
                    {alumno.matricula || 'Sin matrícula'}
                  </span>
                </div>
                <div className={styles.alumnoEstado}>
                  {alumno.documentos_pendientes > 0 ? (
                    <span className={styles.pendientes}>
                      {alumno.documentos_pendientes} documento(s) pendiente(s)
                    </span>
                  ) : (
                    <span className={styles.completo}>Completo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmación */}
        {modalConfirm.open && (
          <div className={styles.modalOverlay} onClick={() => setModalConfirm({ open: false, message: '', onConfirm: null })}>
            <div className={styles.modalConfirm} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalConfirmIcon}>
                <AlertTriangle size={24} />
              </div>
              <h3 className={styles.modalConfirmTitle}>Confirmar</h3>
              <p className={styles.modalConfirmMessage}>{modalConfirm.message}</p>
              <div className={styles.modalConfirmActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setModalConfirm({ open: false, message: '', onConfirm: null })}
                >
                  Cancelar
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => {
                    if (modalConfirm.onConfirm) modalConfirm.onConfirm();
                  }}
                >
                  Descartar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── VISTA ALUMNO ──
  if (esAlumno) {
    return (
      <div className={styles.page}>
        {/* Toast notifications */}
        <div className={styles.toastContainer}>
          {notificaciones.map((notif) => (
            <div
              key={notif.id}
              className={`${styles.toast} ${styles[`toast_${notif.tipo}`]}`}
              style={{ animationDuration: `${notif.duracion}ms` }}
            >
              <div className={styles.toastContent}>
                {notif.tipo === 'success' && <CheckCircle size={18} />}
                {notif.tipo === 'error' && <AlertCircle size={18} />}
                <span>{notif.mensaje}</span>
              </div>
              <div
                className={styles.toastProgress}
                style={{ width: `${notif.progreso}%` }}
              />
            </div>
          ))}
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Mi Expediente</h1>
            <p className={styles.subtitle}>Documentos requeridos</p>
          </div>
          <button className={styles.btnVolver} onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {exito && <div className={styles.successMsg}>{exito}</div>}

        {cargando ? (
          <div className={styles.skeletonContainer}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeletonCard}>
                <Skeleton width="200px" height="20px" variant="text" />
                <Skeleton width="100%" height="16px" variant="text" />
                <Skeleton width="100%" height="16px" variant="text" />
              </div>
            ))}
          </div>
        ) : Object.keys(grupos).length === 0 ? (
          <div className={styles.empty}>No hay documentos disponibles para tu perfil.</div>
        ) : (
          <div className={styles.documentosContainer}>
            {Object.keys(grupos).map((etapa) => (
              <div key={etapa} className={styles.etapaSection}>
                <h2 className={styles.etapaTitulo}>
                  {etapa === 'preinscripcion' && 'Preinscripción'}
                  {etapa === 'inscripcion' && 'Inscripción'}
                  {etapa === 'reinscripcion' && 'Reinscripción'}
                </h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Documento</th>
                        <th className={styles.th}>Obligatorio</th>
                        <th className={styles.th}>Entregado</th>
                        <th className={styles.th}>Fecha</th>
                        <th className={styles.th}>Recibido por</th>
                        <th className={styles.th}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupos[etapa].map((doc) => (
                        <tr key={doc.documento_id} className={styles.tr}>
                          <td className={styles.td}>
                            <div className={styles.documentoNombre}>{doc.documento_nombre}</div>
                            <div className={styles.documentoClave}>{doc.clave}</div>
                          </td>
                          <td className={styles.td}>
                            {doc.obligatorio ? (
                              <span className={styles.obligatorio}>Sí</span>
                            ) : (
                              <span className={styles.noObligatorio}>No</span>
                            )}
                          </td>
                          <td className={styles.td}>
                            <span className={doc.entregado ? styles.entregado : styles.noEntregado}>
                              {doc.entregado ? 'Entregado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className={styles.td}>
                            {doc.fecha_entrega ? new Date(doc.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                          </td>
                          <td className={styles.td}>
                            {doc.recibido_por_nombre || '—'}
                          </td>
                          <td className={styles.td}>
                            {doc.observaciones || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── VISTA ADMIN CON ALUMNO SELECCIONADO ──
  return (
    <div className={styles.page}>
      {/*  Toast notifications */}
      <div className={styles.toastContainer}>
        {notificaciones.map((notif) => (
          <div
            key={notif.id}
            className={`${styles.toast} ${styles[`toast_${notif.tipo}`]}`}
          >
            <div className={styles.toastContent}>
              {notif.tipo === 'success' && <CheckCircle size={18} />}
              {notif.tipo === 'error' && <AlertCircle size={18} />}
              <span>{notif.mensaje}</span>
            </div>
            <div
              className={styles.toastProgress}
              style={{ width: `${notif.progreso}%` }}
            />
          </div>
        ))}
      </div>

      {/* Modal de confirmación */}
      {modalConfirm.open && (
        <div className={styles.modalOverlay} onClick={() => setModalConfirm({ open: false, message: '', onConfirm: null })}>
          <div className={styles.modalConfirm} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConfirmIcon}>
              <AlertTriangle size={24} />
            </div>
            <h3 className={styles.modalConfirmTitle}>Confirmar</h3>
            <p className={styles.modalConfirmMessage}>{modalConfirm.message}</p>
            <div className={styles.modalConfirmActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setModalConfirm({ open: false, message: '', onConfirm: null })}
              >
                Cancelar
              </button>
              <button
                className={styles.btnDanger}
                onClick={() => {
                  if (modalConfirm.onConfirm) modalConfirm.onConfirm();
                }}
              >
                Descartar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Expediente</h1>
          <p className={styles.subtitle}>
            Documentos de {listaAlumnos.find(a => a.alumno_id === alumnoId)?.nombre || 'alumno'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnVolver} onClick={() => navigate('/expediente')}>
            ← Cerrar
          </button>
        </div>
      </div>

      {/* Banner de estado */}
      {estadoAlumno && (
        <div className={estadoAlumno.esEditable ? styles.bannerEditable : styles.bannerNoEditable}>
          <p><strong>{estadoAlumno.mensaje}</strong></p>
          <p>Semestre: {estadoAlumno.semestre}° | Estado actual: {estadoAlumno.estado}</p>
          {estadoAlumno.periodos && estadoAlumno.periodos.length > 0 && (
            <div className={styles.periodosTags}>
              <span className={styles.periodosLabel}>Períodos:</span>
              {estadoAlumno.periodos.map(p => (
                <span key={p.tipo} className={styles.periodoTag}>
                  {p.tipo.replace(/_/g, ' ')}: {new Date(p.fecha_inicio).toLocaleDateString()} - {new Date(p.fecha_fin).toLocaleDateString()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botones de etapa */}
      {etapasDisponibles.length > 0 && (
        <div className={styles.etapasNav}>
          {etapasDisponibles.map((etapa) => (
            <button
              key={etapa}
              className={`${styles.etapaBtn} ${etapaActual === etapa ? styles.etapaBtnActive : ''}`}
              onClick={() => handleCambiarEtapa(etapa)}
            >
              {etapa === 'preinscripcion' && 'Preinscripción'}
              {etapa === 'inscripcion' && 'Inscripción'}
              {etapa === 'reinscripcion' && 'Reinscripción'}
            </button>
          ))}
        </div>
      )}

      {/* Panel de control de edición */}
      {etapaActual && grupos[etapaActual] && grupos[etapaActual].length > 0 && (
        <div className={styles.controlPanel}>
          <div className={styles.controlButtons}>
            {!modoEdicion ? (
              <button
                className={styles.btnEditar}
                onClick={activarEdicion}
                disabled={!estadoAlumno?.esEditable}
              >
                <Edit size={16} /> Habilitar edición
              </button>
            ) : (
              <>
                <button
                  className={styles.btnEditarActivo}
                  onClick={guardarCambios}
                  disabled={actualizando}
                >
                  <Save size={16} /> {actualizando ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  className={styles.btnDescartar}
                  onClick={() => desactivarEdicion(true)}
                  disabled={actualizando}
                >
                  <X size={16} /> Descartar
                </button>
              </>
            )}
          </div>
          {modoEdicion && (
            <div className={styles.controlInfo}>
              <span className={styles.infoEdicion}>
                ️ Modo edición activo – los cambios se guardarán al hacer clic en "Guardar cambios"
              </span>
            </div>
          )}
          {!estadoAlumno?.esEditable && (
            <div className={styles.controlInfo}>
              <span className={styles.infoNoEditable}>
                 El expediente no es editable en este momento (período cerrado o alumno egresado).
              </span>
            </div>
          )}
        </div>
      )}

      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Contenido de la etapa seleccionada */}
      {cargando ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <Skeleton width="200px" height="20px" variant="text" />
              <Skeleton width="100%" height="16px" variant="text" />
              <Skeleton width="100%" height="16px" variant="text" />
            </div>
          ))}
        </div>
      ) : etapaActual && grupos[etapaActual] && grupos[etapaActual].length > 0 ? (
        <div className={styles.etapaSection}>
          <h2 className={styles.etapaTitulo}>
            {etapaActual === 'preinscripcion' && 'Preinscripción'}
            {etapaActual === 'inscripcion' && 'Inscripción'}
            {etapaActual === 'reinscripcion' && 'Reinscripción'}
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Documento</th>
                  <th className={styles.th}>Obligatorio</th>
                  <th className={styles.th}>Entregado</th>
                  <th className={styles.th}>Fecha</th>
                  <th className={styles.th}>Recibido por</th>
                  <th className={styles.th}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {grupos[etapaActual].map((doc) => {
                  const docId = doc.documento_id;
                  const entregado = getValorActual(docId, 'entregado');
                  const observaciones = getValorActual(docId, 'observaciones');
                  const modificado = getDocumentoModificado(docId);

                  return (
                    <tr key={docId} className={`${styles.tr} ${modificado ? styles.trModificado : ''}`}>
                      <td className={styles.td}>
                        <div className={styles.documentoNombre}>{doc.documento_nombre}</div>
                        <div className={styles.documentoClave}>{doc.clave}</div>
                      </td>
                      <td className={styles.td}>
                        {doc.obligatorio ? (
                          <span className={styles.obligatorio}>Sí</span>
                        ) : (
                          <span className={styles.noObligatorio}>No</span>
                        )}
                      </td>
                      <td className={styles.td}>
                        {esAdmin && modoEdicion ? (
                          <div className={styles.edicionCheckbox}>
                            <input
                              type="checkbox"
                              checked={entregado}
                              onChange={(e) =>
                                handleCambioLocal(docId, 'entregado', e.target.checked)
                              }
                              disabled={actualizando}
                              className={styles.checkbox}
                            />
                            <span className={styles.checkboxLabel}>
                              {entregado ? 'Entregado' : 'Pendiente'}
                            </span>
                          </div>
                        ) : (
                          <span className={entregado ? styles.entregado : styles.noEntregado}>
                            {entregado ? 'Entregado' : 'Pendiente'}
                          </span>
                        )}
                      </td>
                      <td className={styles.td}>
                        {doc.fecha_entrega ? new Date(doc.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className={styles.td}>
                        {doc.recibido_por_nombre || '—'}
                      </td>
                      <td className={styles.td}>
                        {esAdmin && modoEdicion ? (
                          <input
                            type="text"
                            className={`${styles.inputObservacion} ${modificado ? styles.inputModificado : ''}`}
                            value={observaciones || ''}
                            onChange={(e) =>
                              handleCambioLocal(docId, 'observaciones', e.target.value)
                            }
                            placeholder="Observación"
                            disabled={actualizando}
                          />
                        ) : (
                          doc.observaciones || '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles.empty}>No hay documentos disponibles para esta etapa.</div>
      )}
    </div>
  );
}