import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { comunicadosService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './ComunicadosPage.module.css';
import { catalogosService } from '../services/api';
import { Plus } from 'lucide-react';

export default function ComunicadosPage() {
  const { usuario } = useAuth();
  const [grupos, setGrupos] = useState([]);
  const [comunicados, setComunicados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ 
  titulo: '', 
  contenido: '', 
  dirigido_a_rol: null, 
  dirigido_a_grupo: null 
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
  setCargando(true);
  try {
    const res = await comunicadosService.getAll();
    setComunicados(res.data || []);
  } catch (e) {
    console.error('Error al cargar comunicados:', e);
    setComunicados([]);
  } finally {
    setCargando(false); // Siempre se ejecuta
  }
};

useEffect(() => {
  if (usuario) {
    cargar();
  }
}, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await comunicadosService.crear(form);
      setForm({ titulo: '', contenido: '' });
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al publicar.');
    } finally {
      setEnviando(false);
    }
  };

  const handleArchivar = async (id) => {
    if (!confirm('¿Archivar este comunicado?')) return;
    try {
      await comunicadosService.actualizar(id, { activo: false });
      await cargar();
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
          <p className={styles.subtitle}>Avisos y noticias del CECyTE Plantel 1</p>
        </div>
        {usuario.rol === 'administrador' && (
          <button className={styles.btnPrimary} onClick={() => setModalAbierto(true)}>
              <Plus size={18} strokeWidth={6} style={{ marginRight: '6px' }} />
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
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
                {usuario.rol === 'administrador' && (
                  <button className={styles.btnArchivar} onClick={() => handleArchivar(c.id)}>
                    Archivar
                  </button>
                )}
              </div>
              <h2 className={styles.cardTitle}>{c.titulo}</h2>
              <p className={styles.cardContenido}>{c.contenido}</p>
              <div className={styles.cardFooter}>
                Publicado por: <strong>{c.autor_nombre} {c.autor_apellidos}</strong>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nuevo comunicado</h3>
            {error && <div className={styles.errorMsg}>{error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Título */}
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

              {/* Contenido */}
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

              {/*  Dirigido a (rol) */}
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
                      // Si cambia a otro rol que no sea 'alumno', limpia el grupo
                      dirigido_a_grupo: val === 'alumno' ? form.dirigido_a_grupo : null
                    });
                  }}
                >
                  <option value="">Todos (público)</option>
                  <option value="alumno">Alumnos</option>
                  <option value="docente">Docentes</option>
                  <option value="administrador">Administradores</option>
                </select>
              </div>

              {/*  Grupo específico (solo si rol = alumno) */}
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

              {/* Botones */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setModalAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>
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