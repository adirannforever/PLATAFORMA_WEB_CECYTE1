// frontend/src/pages/MisClasesDetallePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { gruposService } from '../services/api';
import Skeleton from '../components/Skeleton';
import styles from './MisClasesPage.module.css';
import MisClasesMaterias from './MisClasesMaterias';
import MisClasesAsistencias from './MisClasesAsistencias';
import MisClasesCalificaciones from './MisClasesCalificaciones';
import MisClasesIncidencias from './MisClasesIncidencias';

export default function MisClasesDetallePage() {
  const { grupoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [grupoActual, setGrupoActual] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!grupoId) {
      navigate('/mis-clases');
      return;
    }
    const cargarGrupo = async () => {
      setCargando(true);
      setError('');
      try {
        const res = await gruposService.getById(grupoId);
        setGrupoActual(res.grupo || null);
      } catch (e) {
        console.error('Error cargando grupo:', e);
        setError('No se pudo cargar la información del grupo.');
      } finally {
        setCargando(false);
      }
    };
    cargarGrupo();
  }, [grupoId, navigate]);

  if (cargando) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={() => navigate('/mis-clases')}>
            ← Volver
          </button>
          <div>
            <Skeleton width="200px" height="28px" variant="text" />
            <Skeleton width="150px" height="16px" variant="text" />
          </div>
        </div>
        <div className={styles.tabsContainer}>
          {['Materias', 'Asistencias', 'Calificaciones', 'Incidencias'].map((tab) => (
            <Skeleton key={tab} width="120px" height="40px" variant="rect" />
          ))}
        </div>
        <div className={styles.tabContent}>
          <Skeleton width="100%" height="400px" variant="rect" />
        </div>
      </div>
    );
  }

  if (error || !grupoActual) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.btnVolver} onClick={() => navigate('/mis-clases')}>
            ← Volver
          </button>
          <div>
            <h1 className={styles.title}>Grupo no encontrado</h1>
          </div>
        </div>
        <div className={styles.empty}>{error || 'El grupo que buscas no existe o no tienes acceso.'}</div>
      </div>
    );
  }

  // Determinar qué pestaña está activa
  const getTabActiva = () => {
    const path = location.pathname;
    if (path.includes('/materias')) return 'materias';
    if (path.includes('/asistencias')) return 'asistencias';
    if (path.includes('/calificaciones')) return 'calificaciones';
    if (path.includes('/incidencias')) return 'incidencias';
    return 'materias';
  };
  const tabActiva = getTabActiva();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.btnVolver} onClick={() => navigate('/mis-clases')}>
          ← Volver
        </button>
        <div>
          <h1 className={styles.title}>{grupoActual.nombre}</h1>
          <p className={styles.subtitle}>
            {grupoActual.especialidad_nombre || '—'} · {grupoActual.semestre}° · {grupoActual.turno_nombre || '—'}
          </p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <NavLink
          to={`/mis-clases/grupo/${grupoId}/materias`}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
          end
        >
          Materias
        </NavLink>
        <NavLink
          to={`/mis-clases/grupo/${grupoId}/asistencias`}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          Asistencias
        </NavLink>
        <NavLink
          to={`/mis-clases/grupo/${grupoId}/calificaciones`}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          Calificaciones
        </NavLink>
        <NavLink
          to={`/mis-clases/grupo/${grupoId}/incidencias`}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          Incidencias
        </NavLink>
      </div>

      <div className={styles.tabContent}>
        {tabActiva === 'materias' && <MisClasesMaterias grupoId={grupoId} />}
        {tabActiva === 'asistencias' && <MisClasesAsistencias grupoId={grupoId} />}
        {tabActiva === 'calificaciones' && <MisClasesCalificaciones grupoId={grupoId} />}
        {tabActiva === 'incidencias' && <MisClasesIncidencias grupoId={grupoId} />}
      </div>
    </div>
  );
}