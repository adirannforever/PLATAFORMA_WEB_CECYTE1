// src/pages/MateriasPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { materiasService, usuariosService } from '../services/api';
import Skeleton from '../components/Skeleton'; // Importamos el componente Skeleton
import styles from './MateriasPage.module.css';

export default function MateriasPage() {
  const { usuario } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', ciclo_escolar: '2024-2025', docente_id: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const res = await materiasService.getAll();
      setMaterias(res.data.materias);
      if (usuario.rol === 'administrador') {
        const doc = await usuariosService.getAll('docente');
        setDocentes(doc.data.usuarios.filter(u => u.activo));
      }
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await materiasService.crear({ ...form, docente_id: parseInt(form.docente_id) });
      setForm({ nombre: '', descripcion: '', ciclo_escolar: '2024-2025', docente_id: '' });
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear materia.');
    } finally { setEnviando(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Materias</h1>
          <p className={styles.subtitle}>{materias.length} materia(s) registrada(s)</p>
        </div>
        {usuario.rol === 'administrador' && (
          <button className={styles.btnPrimary} onClick={() => setModalAbierto(true)}>
            + Nueva materia
          </button>
        )}
      </div>

      {cargando ? (
        <div className={styles.grid}>
          {/* Simulamos 4 tarjetas de materias cargando en forma de grid */}
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.cardTop} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Skeleton width="90px" height="16px" variant="text" />
                <Skeleton width="12px" height="12px" variant="circle" />
              </div>
              <Skeleton width="80%" height="22px" variant="text" style={{ marginTop: '4px' }} />
              <Skeleton width="100%" height="14px" variant="text" />
              <Skeleton width="60%" height="14px" variant="text" />
              <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                <Skeleton width="120px" height="16px" variant="text" />
              </div>
            </div>
          ))}
        </div>
      ) : materias.length === 0 ? (
        <div className={styles.empty}>No hay materias registradas aún.</div>
      ) : (
        <div className={styles.grid}>
          {materias.map((m) => (
            <div key={m.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.ciclo}>{m.ciclo_escolar}</div>
                <div className={`${styles.statusDot} ${m.activa ? styles.activa : styles.inactiva}`} />
              </div>
              <h3 className={styles.materiaName}>{m.nombre}</h3>
              {m.descripcion && <p className={styles.materiaDesc}>{m.descripcion}</p>}
              <div className={styles.docente}>
                ‍ {m.docente_nombre} {m.docente_apellidos}
              </div>
              <Link to={`/calificaciones/${m.id}`} className={styles.btnVerCalif}>
                Ver calificaciones →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Nueva materia</h3>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre de la materia</label>
                <input className={styles.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Matemáticas I" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descripción (opcional)</label>
                <input className={styles.input} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción breve" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Ciclo escolar</label>
                <input className={styles.input} value={form.ciclo_escolar} onChange={e => setForm({...form, ciclo_escolar: e.target.value})} required placeholder="2024-2025" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Docente responsable</label>
                <select className={styles.input} value={form.docente_id} onChange={e => setForm({...form, docente_id: e.target.value})} required>
                  <option value="">Selecciona un docente...</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={enviando}>{enviando ? 'Creando...' : 'Crear materia'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}