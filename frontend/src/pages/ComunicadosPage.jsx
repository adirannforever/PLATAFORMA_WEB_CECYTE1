import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { comunicadosService, catalogosService } from '../services/api';
import { INSTITUCION } from '../config/institucion';
import Skeleton from '../components/Skeleton';
import ComunicadoAttachments from '../components/ComunicadoAttachments';
import styles from './ComunicadosPage.module.css';
import uiStyles from '../components/ui/ui.module.css';
import { FileText, Plus, X } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export default function ComunicadosPage() {
  const { usuario } = useAuth();
  const { isAdmin } = usePermissions(); // ← hook centralizado
  const [grupos, setGrupos] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    contenido: '',
    dirigido_a_rol: null,
    dirigido_a_grupo: null,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargarComunicados = async () => {
    setCargando(true);
    try {
      const res = await comunicadosService.getAll();
      setComunicados(res.data || []);
    } catch (e) {
      console.error('Error al cargar comunicados:', e);
      setComunicados([]);
    } finally {
      setCargando(false);
    }
  };

  const cargarGrupos = async () => {
    try {
      const res = await catalogosService.getGrupos();
      setGrupos(res.data || []);
    } catch (e) {
      console.error('Error al cargar grupos:', e);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarComunicados();
      cargarGrupos();
    }
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const upload = await comunicadosService.solicitarUploads(archivos);
      const subidas = await Promise.allSettled(
        upload.data.archivos.map((archivo, index) =>
          comunicadosService.subirArchivo(archivo.uploadUrl, archivos[index]),
        ),
      );
      const fallida = subidas.find((resultado) => resultado.status === 'rejected');
      if (fallida) throw fallida.reason;
      const uploaded = upload.data.archivos.map(({ key, nombre, tipo, size }) => ({
        key,
        nombre,
        tipo,
        size,
      }));
      await comunicadosService.crear({ ...form, archivos: uploaded });
      setArchivos([]);
      setForm({ titulo: '', contenido: '', dirigido_a_rol: null, dirigido_a_grupo: null });
      setModalAbierto(false);
      await cargarComunicados();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al publicar.');
    } finally {
      setEnviando(false);
    }
  };

  const handleFilesChange = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (archivos.length + selected.length > MAX_FILES) {
      setError(`Puedes adjuntar hasta ${MAX_FILES} archivos.`);
      return;
    }
    const invalidFile = selected.find((file) =>
      !ALLOWED_FILE_TYPES.has(file.type) || file.size > MAX_FILE_SIZE || file.size === 0,
    );
    if (invalidFile) {
      setError(`"${invalidFile.name}" no es un formato permitido o supera 10 MB.`);
      return;
    }
    setError('');
    setArchivos((current) => [...current, ...selected]);
  };

  const removeFile = (index) => {
    setArchivos((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleArchivar = async (id) => {
    if (!confirm('¿Archivar este comunicado?')) return;
    try {
      await comunicadosService.actualizar(id, { activo: false });
      await cargarComunicados();
    } catch (e) {
      console.error('Error al archivar:', e);
      alert('No se pudo archivar el comunicado.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Comunicados Institucionales</h1>
          <p className={styles.subtitle}>Avisos y noticias del {INSTITUCION.nombre}</p>
        </div>
        {isAdmin && (
          <button className={uiStyles.btnPrimary} onClick={() => setModalAbierto(true)}>
            <Plus size={18} aria-hidden="true" style={{ marginRight: '6px' }} />
            Nuevo comunicado
          </button>
        )}
      </div>

      {cargando ? (
        <div className={styles.list}>
          {[1, 2, 3].map((n) => (
            <article key={n} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Skeleton width="130px" height="22px" variant="text" />
                <Skeleton width="100px" height="16px" variant="text" />
              </div>
              <Skeleton width="75%" height="28px" variant="text" style={{ marginTop: '4px' }} />
              <Skeleton width="100%" height="16px" variant="text" />
              <Skeleton width="90%" height="16px" variant="text" />
              <div className={styles.cardFooter} style={{ marginTop: '8px' }}>
                <Skeleton width="40%" height="14px" variant="text" />
              </div>
            </article>
          ))}
        </div>
      ) : comunicados.length === 0 ? (
        <div className={styles.empty}>No hay comunicados publicados aún.</div>
      ) : (
        <div className={styles.list}>
          {comunicados.map((c) => (
            <article key={c.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardMeta}>
                  <span className={styles.badge}>Comunicado oficial</span>
                  <span className={styles.fecha}>
                    {new Date(c.fecha_publicacion).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  {c.dirigido_a_rol && (
                    <span className={styles.badgeDirigido}>
                      {c.dirigido_a_grupo
                        ? `Para: ${c.dirigido_a_rol} - Grupo ${c.dirigido_a_grupo}`
                        : `Para: ${c.dirigido_a_rol}s`}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button className={styles.btnArchivar} onClick={() => handleArchivar(c.id)}>
                    Archivar
                  </button>
                )}
              </div>
              <h2 className={styles.cardTitle}>{c.titulo}</h2>
              <p className={styles.cardContenido}>{c.contenido}</p>
              <ComunicadoAttachments comunicadoId={c.id} archivos={c.archivos} />
              <div className={styles.cardFooter}>
                Publicado por: <strong>{c.autor_nombre} {c.autor_apellidos}</strong>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => {
          if (!enviando) setModalAbierto(false);
        }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo comunicado</h3>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Título del comunicado"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Contenido</label>
                <textarea
                  className={styles.textarea}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  placeholder="Escribe el contenido del comunicado..."
                  rows={5}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="comunicado-archivos">
                  Adjuntar varios archivos (opcional)
                </label>
                <input
                  id="comunicado-archivos"
                  className={styles.fileInput}
                  type="file"
                  multiple
                  disabled={enviando}
                  accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFilesChange}
                />
                <small className={styles.fileHint}>
                  Selecciona varios archivos juntos (hasta {MAX_FILES}); imágenes o documentos de máximo 10 MB cada uno.
                </small>
                {archivos.length > 0 && (
                  <ul className={styles.selectedFiles}>
                    {archivos.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        <FileText size={16} aria-hidden="true" />
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className={styles.removeFile}
                          onClick={() => removeFile(index)}
                          aria-label={`Quitar ${file.name}`}
                          disabled={enviando}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Dirigido a</label>
                <select
                  className={styles.input}
                  value={form.dirigido_a_rol || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setForm({
                      ...form,
                      dirigido_a_rol: val,
                      dirigido_a_grupo: val === 'alumno' ? form.dirigido_a_grupo : null,
                    });
                  }}
                >
                  <option value="">Todos (público)</option>
                  <option value="alumno">Alumnos</option>
                  <option value="docente">Docentes</option>
                  <option value="administrador">Administradores</option>
                </select>
              </div>
              {form.dirigido_a_rol === 'alumno' && (
                <div className={styles.field}>
                  <label className={styles.label}>Grupo específico (opcional)</label>
                  <select
                    className={styles.input}
                    value={form.dirigido_a_grupo || ''}
                    onChange={(e) => setForm({ ...form, dirigido_a_grupo: e.target.value || null })}
                  >
                    <option value="">Todos los grupos</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre} (Semestre {g.semestre}° {g.letra})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={uiStyles.btnSecondary}
                  disabled={enviando}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={uiStyles.btnPrimary} disabled={enviando}>
                  {enviando ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}