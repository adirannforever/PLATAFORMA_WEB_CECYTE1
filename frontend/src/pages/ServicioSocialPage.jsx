import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { servicioSocialService, usuariosService } from '../services/api';
import { Plus, Edit, Trash2, X, Eye, CheckCircle, Circle } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import styles from './ServicioSocialPage.module.css';

const TIPOS = ['servicio_social', 'practicas_profesionales'];
const TIPOS_INSTITUCION = ['gubernamental', 'publica', 'privada_convenio'];
const ESTATUS = ['en_proceso', 'liberado', 'reprobado'];
const ESTATUS_ETIQUETA = {
  en_proceso: 'En proceso',
  liberado: 'Liberado',
  reprobado: 'Reprobado',
};

// Helper para calcular fechas automáticas
const calcularFechas = (tipo, fechaInicio = null) => {
  const hoy = new Date();
  const inicio = fechaInicio ? new Date(fechaInicio) : hoy;
  const fin = new Date(inicio);
  const meses = tipo === 'servicio_social' ? 6 : 4;
  fin.setMonth(fin.getMonth() + meses);
  return {
    fecha_inicio: inicio.toISOString().split('T')[0],
    fecha_fin: fin.toISOString().split('T')[0],
  };
};

export default function ServicioSocialPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';

  const [registros, setRegistros] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Filtros
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroSearch, setFiltroSearch] = useState('');
  const [filtroInstitucion, setFiltroInstitucion] = useState('');
  const [filtroConvenio, setFiltroConvenio] = useState('');

  // Modal de detalle de reportes
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);

  // Modal de creación/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditando, setModalEditando] = useState(null);
  const [form, setForm] = useState({
    alumno_id: '',
    tipo: 'servicio_social',
    institucion_empresa: '',
    asesor_externo: '',
    tipo_institucion: '',
    tiene_convenio: false,
    autorizacion_tutor: false,
    estatus: 'en_proceso',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });
  const [enviando, setEnviando] = useState(false);

  // Cargar alumnos
  useEffect(() => {
    const cargarAlumnos = async () => {
      try {
        const res = await usuariosService.getAll({ rol: 'alumno' });
        setAlumnos(res.usuarios || []);
      } catch (e) {
        console.error('Error cargando alumnos:', e);
      }
    };
    cargarAlumnos();
  }, []);

  // Cargar registros
  const cargarRegistros = async () => {
    setCargando(true);
    setError('');
    try {
      const params = {};
      if (filtroAlumno) params.alumno_id = filtroAlumno;
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroEstatus) params.estatus = filtroEstatus;
      if (filtroSearch) params.search = filtroSearch;
      if (filtroInstitucion) params.tipo_institucion = filtroInstitucion;
      if (filtroConvenio) params.tiene_convenio = filtroConvenio === 'true';

      const res = await servicioSocialService.getAll(params);
      setRegistros(res.data || []);
    } catch (e) {
      console.error('Error cargando registros:', e);
      setError('No se pudieron cargar los registros.');
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, [filtroAlumno, filtroTipo, filtroEstatus, filtroSearch, filtroInstitucion, filtroConvenio]);

  // Cargar reportes para el detalle
  const verDetalle = async (registro) => {
    setRegistroDetalle(registro);
    setDetalleAbierto(true);
    setCargandoReportes(true);
    try {
      const res = await servicioSocialService.getReportes(registro.id);
      setReportes(res.data || []);
    } catch (e) {
      console.error('Error cargando reportes:', e);
      setError('No se pudieron cargar los reportes.');
      setReportes([]);
    } finally {
      setCargandoReportes(false);
    }
  };

  // Marcar/desmarcar reporte
  const handleToggleReporte = async (reporteId, entregado) => {
    try {
      await servicioSocialService.toggleReporte(reporteId, !entregado);
      // Recargar reportes
      const res = await servicioSocialService.getReportes(registroDetalle.id);
      setReportes(res.data || []);
      // Recargar lista principal para actualizar contadores y estatus
      await cargarRegistros();
    } catch (e) {
      setError('Error al actualizar el reporte.');
    }
  };

  // Abrir modal crear con fechas automáticas
  const handleAbrirCrear = () => {
    const fechas = calcularFechas('servicio_social');
    setModalEditando(null);
    setForm({
      alumno_id: '',
      tipo: 'servicio_social',
      institucion_empresa: '',
      asesor_externo: '',
      tipo_institucion: '',
      tiene_convenio: false,
      autorizacion_tutor: false,
      estatus: 'en_proceso',
      fecha_inicio: fechas.fecha_inicio,
      fecha_fin: fechas.fecha_fin,
      observaciones: '',
    });
    setModalAbierto(true);
    setError('');
  };

  // Abrir modal editar (con fechas del registro)
  const handleAbrirEditar = (registro) => {
    setModalEditando(registro);
    setForm({
      alumno_id: String(registro.alumno_id),
      tipo: registro.tipo,
      institucion_empresa: registro.institucion_empresa,
      asesor_externo: registro.asesor_externo || '',
      tipo_institucion: registro.tipo_institucion || '',
      tiene_convenio: registro.tiene_convenio || false,
      autorizacion_tutor: registro.autorizacion_tutor || false,
      estatus: registro.estatus,
      fecha_inicio: registro.fecha_inicio || '',
      fecha_fin: registro.fecha_fin || '',
      observaciones: registro.observaciones || '',
    });
    setModalAbierto(true);
    setError('');
  };

  // Actualizar fechas automáticamente al cambiar el tipo
  const handleTipoChange = (tipo) => {
    const fechas = calcularFechas(tipo);
    setForm({
      ...form,
      tipo,
      fecha_inicio: fechas.fecha_inicio,
      fecha_fin: fechas.fecha_fin,
      tiene_convenio: tipo === 'practicas_profesionales' ? form.tiene_convenio : false,
      autorizacion_tutor: tipo === 'practicas_profesionales' ? form.autorizacion_tutor : false,
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);

    if (!form.alumno_id || !form.tipo || !form.institucion_empresa || !form.tipo_institucion) {
      setError('Alumno, tipo, institución y tipo de institución son obligatorios.');
      setEnviando(false);
      return;
    }

    // Validaciones según reglamento
    if (form.tipo === 'servicio_social' && !['gubernamental', 'publica'].includes(form.tipo_institucion)) {
      setError('El Servicio Social solo puede realizarse en instituciones gubernamentales o públicas.');
      setEnviando(false);
      return;
    }
    if (form.tipo === 'practicas_profesionales' && form.tipo_institucion !== 'privada_convenio') {
      setError('Las Prácticas Profesionales requieren una empresa privada con convenio.');
      setEnviando(false);
      return;
    }
    if (form.tipo === 'practicas_profesionales' && !form.tiene_convenio) {
      setError('La empresa debe tener un convenio vigente con el colegio.');
      setEnviando(false);
      return;
    }

    try {
      if (modalEditando) {
        await servicioSocialService.actualizar(modalEditando.id, {
          institucion_empresa: form.institucion_empresa,
          asesor_externo: form.asesor_externo,
          tipo_institucion: form.tipo_institucion,
          tiene_convenio: form.tiene_convenio,
          autorizacion_tutor: form.autorizacion_tutor,
          estatus: form.estatus,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
          observaciones: form.observaciones,
        });
        setExito(' Registro actualizado correctamente.');
      } else {
        await servicioSocialService.crear({
          alumno_id: parseInt(form.alumno_id),
          tipo: form.tipo,
          institucion_empresa: form.institucion_empresa,
          asesor_externo: form.asesor_externo,
          tipo_institucion: form.tipo_institucion,
          tiene_convenio: form.tiene_convenio,
          autorizacion_tutor: form.autorizacion_tutor,
          estatus: form.estatus,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
          observaciones: form.observaciones,
        });
        setExito(' Registro creado correctamente.');
      }
      setModalAbierto(false);
      setTimeout(() => setExito(''), 4000);
      cargarRegistros();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await servicioSocialService.eliminar(id);
      setExito(' Registro eliminado.');
      setTimeout(() => setExito(''), 4000);
      cargarRegistros();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar.');
    }
  };

  const limpiarFiltros = () => {
    setFiltroAlumno('');
    setFiltroTipo('');
    setFiltroEstatus('');
    setFiltroSearch('');
    setFiltroInstitucion('');
    setFiltroConvenio('');
  };

  const getProgreso = (registro) => {
    const total = registro.total_reportes || 0;
    const entregados = registro.reportes_entregados || 0;
    return total > 0 ? `${entregados}/${total}` : '0/0';
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {exito && <div className={styles.successMsg}>{exito}</div>}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Servicio Social</h1>
          <p className={styles.subtitle}>{registros.length} registro(s)</p>
        </div>
        {esAdmin && (
          <button className={styles.btnPrimary} onClick={handleAbrirCrear}>
            <Plus size={18} /> Nuevo registro
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className={styles.filtrosContainer}>
        <div className={styles.filtros}>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Alumno</label>
            <select
              className={styles.select}
              value={filtroAlumno}
              onChange={(e) => setFiltroAlumno(e.target.value)}
            >
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.alumno_id || a.id}>
                  {a.apellidos}, {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Tipo</label>
            <select
              className={styles.select}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t === 'servicio_social' ? 'Servicio Social' : 'Prácticas Profesionales'}</option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Estatus</label>
            <select
              className={styles.select}
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
            >
              <option value="">Todos</option>
              {ESTATUS.map((s) => (
                <option key={s} value={s}>{ESTATUS_ETIQUETA[s]}</option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Institución</label>
            <select
              className={styles.select}
              value={filtroInstitucion}
              onChange={(e) => setFiltroInstitucion(e.target.value)}
            >
              <option value="">Todos</option>
              {TIPOS_INSTITUCION.map((t) => (
                <option key={t} value={t}>{t === 'privada_convenio' ? 'Privada con convenio' : t}</option>
              ))}
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Convenio</label>
            <select
              className={styles.select}
              value={filtroConvenio}
              onChange={(e) => setFiltroConvenio(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Con convenio</option>
              <option value="false">Sin convenio</option>
            </select>
          </div>
          <div className={styles.filtroGroup}>
            <label className={styles.label}>Buscar</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Nombre o matrícula..."
              value={filtroSearch}
              onChange={(e) => setFiltroSearch(e.target.value)}
            />
          </div>
          <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Tipo</th>
                <th>Institución</th>
                <th>Progreso</th>
                <th>Estatus</th>
                <th>Fecha inicio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3].map((n) => (
                <tr key={n}>
                  <td><Skeleton width="150px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="120px" height="16px" variant="text" /></td>
                  <td><Skeleton width="60px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="16px" variant="text" /></td>
                  <td><Skeleton width="100px" height="16px" variant="text" /></td>
                  <td><Skeleton width="80px" height="24px" variant="text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : registros.length === 0 ? (
        <div className={styles.empty}>No hay registros de servicio social.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Tipo</th>
                <th>Institución</th>
                <th>Progreso</th>
                <th>Estatus</th>
                <th>Fecha inicio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{r.alumno_nombre}</td>
                  <td>{r.tipo === 'servicio_social' ? 'Servicio Social' : 'Prácticas Profesionales'}</td>
                  <td>{r.institucion_empresa}</td>
                  <td>{getProgreso(r)}</td>
                  <td>
                    <span className={`${styles.estatusBadge} ${styles[`estatus_${r.estatus}`]}`}>
                      {ESTATUS_ETIQUETA[r.estatus] || r.estatus}
                    </span>
                  </td>
                  <td>{r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString('es-MX') : '—'}</td>
                  <td>
                    {esAdmin && (
                      <div className={styles.acciones}>
                        <button
                          className={styles.btnDetalle}
                          onClick={() => verDetalle(r)}
                          title="Ver reportes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className={styles.btnEditar}
                          onClick={() => handleAbrirEditar(r)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => handleEliminar(r.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalle de reportes */}
      {detalleAbierto && registroDetalle && (
        <div className={styles.modalOverlay} onClick={() => setDetalleAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Reportes - {registroDetalle.alumno_nombre}
                <span className={styles.modalSubtitle}>
                  {registroDetalle.tipo === 'servicio_social' ? 'Servicio Social' : 'Prácticas Profesionales'}
                </span>
              </h3>
              <button className={styles.modalClose} onClick={() => setDetalleAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {cargandoReportes ? (
              <div className={styles.loadingReportes}>Cargando reportes...</div>
            ) : reportes.length === 0 ? (
              <div className={styles.empty}>No hay reportes configurados.</div>
            ) : (
              <div className={styles.reportesList}>
                {reportes.map((rep) => (
                  <div key={rep.id} className={styles.reporteItem}>
                    <div className={styles.reporteInfo}>
                      <span className={styles.reporteNumero}>Reporte {rep.numero}</span>
                      <span className={styles.reporteLimite}>
                        Límite: {rep.fecha_limite ? new Date(rep.fecha_limite).toLocaleDateString('es-MX') : 'No definido'}
                      </span>
                      {rep.fecha_entrega && (
                        <span className={styles.reporteEntrega}>
                          Entregado: {new Date(rep.fecha_entrega).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                    <div className={styles.reporteAcciones}>
                      {esAdmin && (
                        <button
                          className={rep.entregado ? styles.btnEntregado : styles.btnPendiente}
                          onClick={() => handleToggleReporte(rep.id, rep.entregado)}
                          title={rep.entregado ? 'Marcar como pendiente' : 'Marcar como entregado'}
                        >
                          {rep.entregado ? <CheckCircle size={18} /> : <Circle size={18} />}
                          {rep.entregado ? 'Entregado' : 'Pendiente'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.modalFooter}>
              <span className={styles.progresoTotal}>
                {reportes.filter(r => r.entregado).length} / {reportes.length} reportes entregados
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de creación/edición */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalEditando ? 'Editar registro' : 'Nuevo registro'}
              </h3>
              <button className={styles.modalClose} onClick={() => setModalAbierto(false)}>
                <X size={18} />
              </button>
            </div>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleGuardar} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Alumno *</label>
                <select
                  className={styles.select}
                  value={form.alumno_id}
                  onChange={(e) => setForm({ ...form, alumno_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.alumno_id || a.id}>
                      {a.apellidos}, {a.nombre} (Semestre {a.semestre || '?'})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Tipo *</label>
                <select
                  className={styles.select}
                  value={form.tipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                >
                  <option value="servicio_social">Servicio Social</option>
                  <option value="practicas_profesionales">Prácticas Profesionales</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Institución / Empresa *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.institucion_empresa}
                  onChange={(e) => setForm({ ...form, institucion_empresa: e.target.value })}
                  placeholder="Nombre de la institución"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Asesor externo</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.asesor_externo}
                  onChange={(e) => setForm({ ...form, asesor_externo: e.target.value })}
                  placeholder="Nombre del asesor"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Tipo de institución *</label>
                <select
                  className={styles.select}
                  value={form.tipo_institucion}
                  onChange={(e) => setForm({ ...form, tipo_institucion: e.target.value })}
                  required
                >
                  <option value="">Selecciona...</option>
                  <option value="gubernamental">Gubernamental</option>
                  <option value="publica">Pública</option>
                  <option value="privada_convenio">Privada con convenio</option>
                </select>
                <span className={styles.helpText}>
                  {form.tipo === 'servicio_social' 
                    ? 'Solo gubernamental o pública' 
                    : 'Requiere privada con convenio'}
                </span>
              </div>

              {form.tipo === 'practicas_profesionales' && (
                <div className={styles.field}>
                  <label className={styles.label}>¿Tiene convenio?</label>
                  <select
                    className={styles.select}
                    value={form.tiene_convenio ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, tiene_convenio: e.target.value === 'true' })}
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              )}

              {form.tipo === 'practicas_profesionales' && (
                <div className={styles.field}>
                  <label className={styles.label}>Autorización del tutor</label>
                  <select
                    className={styles.select}
                    value={form.autorizacion_tutor ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, autorizacion_tutor: e.target.value === 'true' })}
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              )}

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Fecha inicio</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Fecha fin</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  />
                </div>
              </div>
              <span className={styles.helpText}>
                {form.tipo === 'servicio_social' 
                  ? 'Servicio Social: 6 meses (480 horas)'
                  : 'Prácticas Profesionales: 4 meses (240 horas)'}
              </span>

              <div className={styles.field}>
                <label className={styles.label}>Estatus</label>
                <select
                  className={styles.select}
                  value={form.estatus}
                  onChange={(e) => setForm({ ...form, estatus: e.target.value })}
                >
                  {ESTATUS.map((s) => (
                    <option key={s} value={s}>{ESTATUS_ETIQUETA[s]}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Observaciones</label>
                <textarea
                  className={styles.textarea}
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}